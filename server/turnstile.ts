// Vérification côté serveur d'un jeton Cloudflare Turnstile.
// Documentation : https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: string, secret: string, ip: string | null): Promise<boolean> {
  if (!token || token.length > 2048) return false; // pas de jeton : aucune requête sortante
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const r = await fetch(TURNSTILE_VERIFY_URL, { method: "POST", body });
    if (!r.ok) return false;
    const j = (await r.json()) as { success?: boolean };
    return j.success === true;
  } catch {
    return false;
  }
}
