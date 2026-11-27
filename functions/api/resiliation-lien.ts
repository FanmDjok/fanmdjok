import { bindEnv, env, envOptionnel, json, readBounded, type Env } from "../../server/lib";
import { ipDeConfiance, statutRefus, verifierTurnstile } from "../../server/turnstile";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Envoie, si un compte existe, un lien de connexion qui ouvre directement la page de résiliation.
 *  La réponse est toujours la même : on ne révèle pas si une adresse est inscrite. */
async function handle(req: Request): Promise<Response> {
  const raw = await readBounded(req, 2048);
  if (raw === null) return json({ error: "requete_trop_grande" }, 413);
  let b: { email?: unknown; turnstileToken?: unknown };
  try { b = JSON.parse(raw); } catch { return json({ error: "requete_invalide" }, 400); }
  const email = typeof b.email === "string" ? b.email.trim().slice(0, 320) : "";
  if (!EMAIL.test(email)) return json({ error: "champs_invalides" }, 400);

  const verdict = await verifierTurnstile({ jeton: b.turnstileToken, action: "resiliation", secret: envOptionnel("TURNSTILE_SECRET_KEY"), hostnames: envOptionnel("TURNSTILE_HOSTNAMES"), ip: ipDeConfiance(req.headers) });
  if (!verdict.ok) { const r = statutRefus(verdict); return json({ error: r.erreur }, r.statut); }

  const base = env("SUPABASE_URL").replace(/\/$/, "");
  const cle = env("SUPABASE_SERVICE_ROLE_KEY");
  const redirect = `${env("SITE_URL").replace(/\/$/, "")}/app/?mode=resilier`;
  try {
    // create_user:false : aucun compte n'est créé par ce formulaire.
    await fetch(`${base}/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`, {
      method: "POST",
      headers: { apikey: cle, Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, create_user: false }),
    });
  } catch {
    // Volontairement silencieux : même réponse dans tous les cas.
  }
  return json({ ok: true });
}

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  bindEnv(ctx.env);
  return handle(ctx.request);
}
