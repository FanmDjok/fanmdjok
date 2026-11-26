import { admin, bindEnv, json, requireUser, stripe, type Env } from "../../server/lib";
import { essaiEligible } from "../../server/essai";

/** Indique si le compte connecté peut bénéficier de l'essai de 14 jours. Authentifié, aucune donnée métier. */
async function handle(req: Request): Promise<Response> {
  const user = await requireUser(req);
  if (!user || !user.email) return json({ error: "non_authentifie" }, 401);
  const { data: sub } = await admin()
    .from("subscriptions")
    .select("essai_utilise, essai_fin, stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const dejaBase = Boolean(sub?.essai_utilise) || Boolean(sub?.essai_fin);
  const verif = await essaiEligible(stripe(), user.email, dejaBase, (sub?.stripe_customer_id as string | null) ?? null);
  return json({ essai: verif.essai, jours: 14 });
}

export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  bindEnv(ctx.env);
  return handle(ctx.request);
}
