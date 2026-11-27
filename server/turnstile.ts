// Vérification côté serveur d'un jeton Cloudflare Turnstile.
// Documentation : https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Action posée par le widget (data-action) : 1 à 32 caractères, lettres, chiffres, _ ou -. */
const ACTION_VALIDE = /^[A-Za-z0-9_-]{1,32}$/;

/** Contrôles supplémentaires : l'action doit correspondre, et le nom d'hôte doit figurer dans la liste. */
export type ControleTurnstile = {
  action?: string;
  hostnames?: readonly string[];
};

/** Transforme la variable TURNSTILE_HOSTNAMES (valeurs séparées par des virgules) en liste. */
export function listeHostnames(brut: string | undefined): string[] {
  return (brut ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter((h) => h.length > 0);
}

export async function verifyTurnstile(
  token: string,
  secret: string,
  ip: string | null,
  controle: ControleTurnstile = {},
): Promise<boolean> {
  if (!token || token.length > 2048) return false; // pas de jeton : aucune requête sortante
  if (!secret) return false; // échec fermé : pas de secret, pas de vérification
  if (controle.action !== undefined && !ACTION_VALIDE.test(controle.action)) return false;
  if (controle.hostnames !== undefined && controle.hostnames.length === 0) return false; // liste vide = refus

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const r = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body });
    if (!r.ok) return false;
    const j = (await r.json()) as { success?: boolean; action?: unknown; hostname?: unknown };
    if (j.success !== true) return false;
    if (controle.action !== undefined && j.action !== controle.action) return false;
    if (controle.hostnames !== undefined) {
      if (typeof j.hostname !== "string" || !controle.hostnames.includes(j.hostname.toLowerCase())) return false;
    }
    return true;
  } catch {
    return false;
  }
}
