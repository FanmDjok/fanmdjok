// Vérification côté serveur d'un jeton Cloudflare Turnstile (widget existant, mode Managed).
// Documentation : https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
// Règles : échec fermé. Un jeton n'est accepté que si siteverify répond success, avec l'action attendue
// pour la route et un hôte présent dans TURNSTILE_HOSTNAMES. Le secret ne sort jamais de ce module.

export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const TIMEOUT_MS = 10_000;
export const JETON_MAX = 2048;

export type Verdict =
  | { ok: true }
  | { ok: false; motif: "configuration" | "jeton" | "rejet" | "reseau" };

export interface OptionsTurnstile {
  jeton: unknown;                 // valeur brute du corps de requête : vérifiée ici (type et longueur)
  action: string;                 // action attendue pour cette route (ex. "contact")
  secret: string | undefined;     // TURNSTILE_SECRET_KEY (secret)
  hostnames: string | undefined;  // TURNSTILE_HOSTNAMES (liste séparée par des virgules, non secrète)
  ip: string | null;              // IP client de confiance (cf-connecting-ip), jamais une valeur saisie
  fetchImpl?: typeof fetch;       // injectable pour les tests
}

/** Liste d'hôtes autorisés : virgules, espaces ignorés, minuscules, sans joker. */
export function listeHotes(texte: string | undefined): string[] {
  return (texte ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter((h) => h.length > 0 && !h.includes("*"));
}

/** IP client issue de cf-connecting-ip, posée par le réseau Cloudflare. Toute autre valeur est ignorée. */
export function ipDeConfiance(headers: Headers): string | null {
  const ip = headers.get("cf-connecting-ip")?.trim() ?? "";
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const ipv6 = /^[0-9a-fA-F:]{2,45}$/;
  if (ipv4.test(ip)) return ip.split(".").every((o) => Number(o) <= 255) ? ip : null;
  return ipv6.test(ip) && ip.includes(":") ? ip : null;
}

export async function verifierTurnstile(o: OptionsTurnstile): Promise<Verdict> {
  const hotes = listeHotes(o.hostnames);
  if (!o.secret || hotes.length === 0) return { ok: false, motif: "configuration" };
  if (typeof o.jeton !== "string" || o.jeton.length === 0 || o.jeton.length > JETON_MAX) {
    return { ok: false, motif: "jeton" };
  }

  const corps = new URLSearchParams({ secret: o.secret, response: o.jeton });
  if (o.ip) corps.set("remoteip", o.ip);
  const controle = new AbortController();
  const minuterie = setTimeout(() => controle.abort(), TIMEOUT_MS);
  try {
    const f = o.fetchImpl ?? fetch;
    const r = await f(TURNSTILE_VERIFY_URL, { method: "POST", body: corps, signal: controle.signal });
    if (!r.ok) return { ok: false, motif: "reseau" };
    const j = (await r.json()) as { success?: unknown; action?: unknown; hostname?: unknown };
    if (j.success !== true) return { ok: false, motif: "rejet" };
    if (j.action !== o.action) return { ok: false, motif: "rejet" };
    if (typeof j.hostname !== "string" || !hotes.includes(j.hostname.toLowerCase())) return { ok: false, motif: "rejet" };
    return { ok: true };
  } catch {
    return { ok: false, motif: "reseau" };
  } finally {
    clearTimeout(minuterie);
  }
}

/** Traduction d'un refus en réponse HTTP : configuration ou réseau → 503 (échec fermé), sinon 403. */
export function statutRefus(v: Extract<Verdict, { ok: false }>): { statut: number; erreur: string } {
  return v.motif === "configuration" || v.motif === "reseau"
    ? { statut: 503, erreur: "verification_indisponible" }
    : { statut: 403, erreur: "verification_echouee" };
}
