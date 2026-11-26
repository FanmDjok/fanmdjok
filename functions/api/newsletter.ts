import { bindEnv, json, readBounded, type Env } from "../../server/lib";
import { verifyTurnstile } from "../../server/turnstile";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const BREVO_CONTACTS = "https://api.brevo.com/v3/contacts/doubleOptinConfirmation";

/** Inscription à la veille : double opt-in Brevo. Seuls l'e-mail et la date du consentement sont envoyés. */
async function handle(req: Request, env: Record<string, string | undefined>): Promise<Response> {
  const raw = await readBounded(req, 2048);
  if (raw === null) return json({ error: "requete_trop_grande" }, 413);
  let b: { email?: unknown; consent?: unknown; turnstileToken?: unknown };
  try { b = JSON.parse(raw); } catch { return json({ error: "requete_invalide" }, 400); }

  const email = typeof b.email === "string" ? b.email.trim().slice(0, 320) : "";
  if (!EMAIL.test(email)) return json({ error: "email_invalide" }, 400);
  if (b.consent !== true) return json({ error: "consentement_requis" }, 400);

  // Sans clé et sans liste ou modèle Brevo, l'inscription n'est pas encore ouverte : message propre, rien n'est stocké.
  const cle = env.BREVO_API_KEY, liste = Number(env.BREVO_LIST_ID_VEILLE), modele = Number(env.BREVO_DOI_TEMPLATE_ID);
  if (!cle || !liste || !modele) return json({ error: "bientot_ouvert" }, 503);

  const humain = await verifyTurnstile(typeof b.turnstileToken === "string" ? b.turnstileToken : "", env.TURNSTILE_SECRET_KEY ?? "", null);
  if (!humain) return json({ error: "verification_echouee" }, 403);

  try {
    const r = await fetch(BREVO_CONTACTS, {
      method: "POST",
      headers: { "api-key": cle, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        email,
        includeListIds: [liste],
        templateId: modele,
        redirectionUrl: `${(env.SITE_URL ?? "https://kazonly.com").replace(/\/$/, "")}/newsletter/confirme/`,
        attributes: { CONSENT_DATE: new Date().toISOString().slice(0, 10) },
      }),
    });
    if (!r.ok && r.status !== 204) return json({ error: "envoi_echoue" }, 502);
  } catch {
    return json({ error: "envoi_echoue" }, 502);
  }
  // Réponse identique dans tous les cas : on ne révèle pas si l'adresse était déjà inscrite.
  return json({ ok: true });
}

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  bindEnv(ctx.env);
  return handle(ctx.request, ctx.env as Record<string, string | undefined>);
}
