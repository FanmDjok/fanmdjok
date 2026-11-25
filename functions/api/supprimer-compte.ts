import { admin, bindEnv, json, readBounded, requireUser, stripe, type Env } from "../../server/lib";

async function handle(req: Request): Promise<Response> {
  const user = await requireUser(req);
  if (!user) return json({ error: "non_authentifie" }, 401);

  const raw = await readBounded(req, 256);
  if (raw === null) return json({ error: "requete_trop_grande" }, 413);
  let body: { confirmation?: string };
  try { body = JSON.parse(raw); } catch { return json({ error: "requete_invalide" }, 400); }
  if (body.confirmation !== "SUPPRIMER") return json({ error: "confirmation_requise" }, 400);

  const db = admin();
  const { data: abo } = await db.from("subscriptions").select("stripe_subscription_id").eq("user_id", user.id).maybeSingle();
  if (abo?.stripe_subscription_id) {
    // Arrêt immédiat de l'abonnement : aucun prélèvement après la suppression.
    try { await stripe().subscriptions.cancel(abo.stripe_subscription_id); } catch (e) {
      // Déjà annulé côté Stripe : on poursuit la suppression.
      console.error("suppression : annulation Stripe", (e as Error).message);
    }
  }
  // Suppression en cascade : profil, abonnement, biens, locataires, baux, mouvements, échéances.
  // [À VALIDER] : les factures et paiements conservés par Stripe (obligations comptables) ne sont pas supprimés.
  const { error } = await db.auth.admin.deleteUser(user.id);
  if (error) return json({ error: "suppression_impossible" }, 500);
  return json({ ok: true });
}

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  bindEnv(ctx.env);
  return handle(ctx.request);
}
