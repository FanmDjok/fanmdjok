import { admin, bindEnv, json, requireUser, type Env } from "../../server/lib";
import { aalDuJeton, jetonDuRequete } from "../../server/aal";

// Variables et secrets attendus. On ne renvoie que présent / absent : jamais une valeur.
const ATTENDUS = [
  "SITE_URL", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY",
  "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_ESSENTIEL_MONTHLY", "STRIPE_PRICE_ESSENTIEL_YEARLY", "STRIPE_PRICE_PROPRIETAIRE_MONTHLY", "STRIPE_PRICE_PROPRIETAIRE_YEARLY",
  "STRIPE_PRICE_INVESTISSEUR_MONTHLY", "STRIPE_PRICE_INVESTISSEUR_YEARLY", "STRIPE_PRICE_ESSENTIEL_MONTHLY_XPF", "STRIPE_PRICE_ESSENTIEL_YEARLY_XPF",
  "STRIPE_PRICE_PROPRIETAIRE_MONTHLY_XPF", "STRIPE_PRICE_PROPRIETAIRE_YEARLY_XPF", "STRIPE_PRICE_INVESTISSEUR_MONTHLY_XPF", "STRIPE_PRICE_INVESTISSEUR_YEARLY_XPF",
  "TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY", "BREVO_API_KEY",
];

/** Mode Stripe détecté à partir du préfixe de la clé secrète (jamais la clé elle-même). */
export function modeStripe(cle: string | undefined): "test" | "reel" | "absent" {
  if (!cle) return "absent";
  if (cle.startsWith("sk_test_") || cle.startsWith("rk_test_")) return "test";
  if (cle.startsWith("sk_live_") || cle.startsWith("rk_live_")) return "reel";
  return "absent";
}

async function handle(req: Request, env: Record<string, string | undefined>): Promise<Response> {
  const user = await requireUser(req);
  if (!user) return json({ error: "non_authentifie" }, 401);
  if (aalDuJeton(jetonDuRequete(req)) !== "aal2") return json({ error: "acces_refuse" }, 403);
  const { data } = await admin().from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!data) return json({ error: "acces_refuse" }, 403);

  return json({
    variables: ATTENDUS.map((nom) => ({ nom, presente: Boolean(env[nom]) })),
    stripe_mode: modeStripe(env.STRIPE_SECRET_KEY),
  });
}

export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  bindEnv(ctx.env);
  return handle(ctx.request, ctx.env);
}
