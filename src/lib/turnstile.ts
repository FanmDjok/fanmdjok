// Widget Cloudflare Turnstile. Le script est chargé depuis challenges.cloudflare.com (autorisé dans la CSP).
// Sans clé TURNSTILE_SITE_KEY, le widget n'est pas affiché (mode local, développement).
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js";
export const TURNSTILE_SITE_KEY: string = (import.meta.env.TURNSTILE_SITE_KEY as string | undefined) ?? "";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
declare global { interface Window { turnstile?: TurnstileApi } }

let loading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = SCRIPT; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => { loading = null; reject(new Error("turnstile")); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** Affiche le widget dans `el` ; `onToken` reçoit le jeton (ou "" si expiré). */
export async function mountTurnstile(el: HTMLElement, onToken: (t: string) => void) {
  await loadScript();
  const api = window.turnstile!;
  const id = api.render(el, {
    sitekey: TURNSTILE_SITE_KEY,
    callback: (t: string) => onToken(t),
    "expired-callback": () => onToken(""),
    "error-callback": () => onToken(""),
  });
  return {
    reset: () => { onToken(""); api.reset(id); },
    cleanup: () => { try { api.remove(id); } catch { /* déjà retiré */ } },
  };
}
