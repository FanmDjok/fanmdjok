import { admin, bindEnv, json, priceIdFor, readBounded, requireUser, siteUrl, stripe, type Env } from "../../server/lib";
import plans from "../../shared/plans.json";

async function handle(req: Request): Promise<Response> {
  const user = await requireUser(req);
  if (!user || !user.email) return json({ error: "non_authentifie" }, 401);

  const raw = await readBounded(req, 2048);
  if (raw === null) return json({ error: "requete_trop_grande" }, 413);
  let body: { plan?: string; interval?: string; currency?: string; startNow?: boolean };
  try { body = JSON.parse(raw); } catch { return json({ error: "requete_invalide" }, 400); }
  // Consentement exprès à commencer tout de suite (non pré-coché côté interface) : sans lui, pas de souscription.
  if (body.startNow !== true) return json({ error: "consentement_requis" }, 400);

  const price = priceIdFor(String(body.plan), String(body.interval), body.currency === "XPF" ? "XPF" : "EUR");
  if (!price) return json({ error: "formule_invalide" }, 400);

  const db = admin();
  const s = stripe();

  // Une ligne par utilisateur (créée à l'inscription, formule Gratuite par défaut).
  const { data: sub } = await db
    .from("subscriptions")
    .select("plan_code, statut, essai_fin, stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Un abonnement payant déjà actif ? On renvoie vers le portail plutôt que d'en créer un second.
  if (sub && sub.plan_code !== "gratuit" && ["trialing", "active", "past_due"].includes(sub.statut)) {
    return json({ error: "abonnement_existant" }, 409);
  }

  let customerId = sub?.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    const customer = await s.customers.create({ email: user.email, metadata: { user_id: user.id } });
    customerId = customer.id;
    await db.from("subscriptions").upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
  }

  // Un seul essai par utilisateur : on le considère consommé dès qu'un essai a commencé.
  const trialUsed = Boolean(sub?.essai_fin);
  const base = siteUrl();
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    locale: "fr",
    allow_promotion_codes: true,
    payment_method_collection: "always",
    client_reference_id: user.id,
    metadata: { user_id: user.id },
    subscription_data: {
      metadata: { user_id: user.id },
      ...(trialUsed ? {} : {
        trial_period_days: plans.trialDays,
        trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
      }),
    },
    success_url: `${base}/app/?abonnement=ok`,
    cancel_url: `${base}/app/?abonnement=annule`,
  });

  return json({ url: session.url });
}

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  bindEnv(ctx.env);
  return handle(ctx.request);
}
