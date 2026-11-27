import { ipDeConfiance, type OptionsTurnstile, type Verdict } from "../../../server/turnstile";

// Inscription à la liste d'attente KAZONLY (teaser) : double opt-in Brevo.
// Aucune donnée n'est stockée par le teaser ; Brevo tient la liste. Les journaux ne contiennent jamais l'e-mail.

export const BREVO_DOI = "https://api.brevo.com/v3/contacts/doubleOptinConfirmation";
export const TERRITOIRES = [
  "guadeloupe", "martinique", "guyane", "reunion", "mayotte", "saint-martin", "saint-barthelemy",
  "spm", "nouvelle-caledonie", "polynesie", "wallis-futuna", "aucun",
] as const;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const LIMITE_PAR_MINUTE = 5;

export type Env = Record<string, string | undefined>;
export interface Dependances {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  verifierTurnstile: (o: OptionsTurnstile) => Promise<Verdict>;
  maintenant: () => number;
}

/** Compteur par IP en mémoire : limite best effort (chaque instance le tient à part). */
const compteurs = new Map<string, { debut: number; n: number }>();
export function depasseLimite(ip: string, maintenant: number): boolean {
  const c = compteurs.get(ip);
  if (!c || maintenant - c.debut >= 60_000) {
    compteurs.set(ip, { debut: maintenant, n: 1 });
    return false;
  }
  c.n += 1;
  return c.n > LIMITE_PAR_MINUTE;
}

export async function traiterInscription(req: Request, env: Env, deps: Dependances): Promise<Response> {
  const ip = ipDeConfiance(req.headers);
  if (ip && depasseLimite(ip, deps.maintenant())) return reponse({ error: "trop_de_demandes" }, 429);

  let b: { email?: unknown; territoire?: unknown; consent?: unknown; turnstileToken?: unknown };
  try { b = await req.json(); } catch { return reponse({ error: "requete_invalide" }, 400); }

  const email = typeof b.email === "string" ? b.email.trim().slice(0, 320) : "";
  if (!EMAIL.test(email)) return reponse({ error: "email_invalide" }, 400);
  if (b.consent !== true) return reponse({ error: "consentement_requis" }, 400);
  const territoire = typeof b.territoire === "string" && (TERRITOIRES as readonly string[]).includes(b.territoire) ? b.territoire : "aucun";

  // Sans clé ni liste ni modèle Brevo, rien n'est envoyé : message propre, aucune donnée conservée.
  const cle = env.BREVO_API_KEY, liste = Number(env.BREVO_WAITLIST_LIST_ID), modele = Number(env.BREVO_DOI_TEMPLATE_ID);
  if (!cle || !liste || !modele) return reponse({ error: "bientot_ouvert" }, 503);

  // Widget « guide » : action et hôtes vérifiés. Échec fermé : sans configuration ou sans réponse, rien n'est envoyé.
  const verdict = await deps.verifierTurnstile({
    jeton: b.turnstileToken, action: "guide", secret: env.TURNSTILE_SECRET_KEY, hostnames: env.TURNSTILE_HOSTNAMES, ip,
  });
  if (!verdict.ok) {
    if (verdict.motif === "configuration" || verdict.motif === "reseau") return reponse({ error: "verification_indisponible" }, 503);
    return reponse({ error: "verification_echouee" }, 403);
  }

  try {
    const r = await deps.fetch(BREVO_DOI, {
      method: "POST",
      headers: { "api-key": cle, "Content-Type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        email,
        includeListIds: [liste],
        templateId: modele,
        redirectionUrl: "https://kazonly.com/merci/",
        attributes: { TERRITOIRE: territoire, SOURCE: "teaser", CONSENT_DATE: new Date(deps.maintenant()).toISOString().slice(0, 10) },
      }),
    });
    if (!r.ok && r.status !== 204) {
      console.log(JSON.stringify({ evenement: "brevo_echec", statut: r.status }));
      return reponse({ error: "envoi_echoue" }, 502);
    }
  } catch {
    console.log(JSON.stringify({ evenement: "brevo_injoignable" }));
    return reponse({ error: "envoi_echoue" }, 502);
  }
  // Réponse identique dans tous les cas : on ne révèle pas si l'adresse est déjà inscrite.
  return reponse({ ok: true }, 200);
}

export function reponse(corps: unknown, statut: number): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
