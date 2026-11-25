import { admin, bindEnv, json, readBounded, requireUser, stripe, type Env } from "../../server/lib";

const DELAI_RETRACTATION_JOURS = 14;

async function handle(req: Request): Promise<Response> {
  const user = await requireUser(req);
  if (!user) return json({ error: "non_authentifie" }, 401);

  const raw = await readBounded(req, 512);
  if (raw === null) return json({ error: "requete_trop_grande" }, 413);
  let body: { action?: string };
  try { body = JSON.parse(raw); } catch { return json({ error: "requete_invalide" }, 400); }
  if (body.action !== "resilier" && body.action !== "retracter") return json({ error: "action_invalide" }, 400);

  const db = admin();
  const { data: row } = await db.from("subscriptions")
    .select("plan_code, statut, stripe_subscription_id, periode_fin").eq("user_id", user.id).maybeSingle();
  if (!row?.stripe_subscription_id || row.plan_code === "gratuit") return json({ error: "aucun_abonnement" }, 404);

  const s = stripe();

  if (body.action === "resilier") {
    // Résiliation à la fin de la période déjà payée. Idempotent : relancer ne change rien.
    const sub = await s.subscriptions.update(row.stripe_subscription_id, { cancel_at_period_end: true });
    const fin = sub.items?.data?.[0] ? (sub as unknown as { current_period_end?: number }).current_period_end : undefined;
    await db.from("subscriptions").update({ cancel_at_period_end: true }).eq("user_id", user.id);
    return json({ ok: true, fin: fin ? new Date(fin * 1000).toISOString() : row.periode_fin });
  }

  // Rétractation : possible pendant 14 jours calendaires après la souscription.
  const sub = await s.subscriptions.retrieve(row.stripe_subscription_id);
  const ecoule = (Date.now() / 1000 - sub.created) / 86400;
  if (ecoule > DELAI_RETRACTATION_JOURS) return json({ error: "delai_depasse" }, 409);

  // [À VALIDER] : montant remboursé. Ici : part non utilisée de la dernière facture payée, au prorata des jours.
  const factures = await s.invoices.list({ subscription: sub.id, limit: 1 });
  const facture = factures.data[0];
  let rembourse = 0;
  const paiement = facture ? (facture as unknown as { payment_intent?: string | null }).payment_intent : null;
  if (facture && facture.amount_paid > 0 && paiement) {
    const periodeJours = Math.max(1, (facture.period_end - facture.period_start) / 86400);
    const utilisees = Math.min(periodeJours, Math.max(0, (Date.now() / 1000 - facture.period_start) / 86400));
    rembourse = Math.round(facture.amount_paid * (1 - utilisees / periodeJours));
    if (rembourse > 0) {
      await s.refunds.create({ payment_intent: paiement, amount: rembourse }, { idempotencyKey: `retract-${sub.id}` });
    }
  }
  await s.subscriptions.cancel(sub.id, { prorate: false });
  await db.from("subscriptions").update({ plan_code: "gratuit", statut: "canceled", cancel_at_period_end: false }).eq("user_id", user.id);
  return json({ ok: true, rembourse_centimes: rembourse });
}

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  bindEnv(ctx.env);
  return handle(ctx.request);
}

