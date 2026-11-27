// Routage par hôte.
// - kazonly.com et www.kazonly.com : teaser (dossier _teaser du build), en HTTPS, avec en-têtes de sécurité.
// - *.pages.dev : site complet de test, non indexé.
// - API (/api/*) : toujours traitée par les fonctions.

const HOTES_TEASER = ["kazonly.com", "www.kazonly.com"];

export type Route = { mode: "teaser"; chemin: string } | { mode: "site" };

/** Décision de routage pure, testable. */
export function routeHote(host: string, pathname: string): Route {
  const h = host.split(":")[0].toLowerCase();
  if (!HOTES_TEASER.includes(h) || pathname.startsWith("/api/")) return { mode: "site" };
  return { mode: "teaser", chemin: `/_teaser${pathname}` };
}

/** En-têtes de sécurité appliqués au teaser (chiffrement obligatoire, pas d'intégration ni de script tiers hors liste). */
export function securiserTeaser(reponse: Response): Response {
  const copie = new Response(reponse.body, reponse);
  copie.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  copie.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests");
  copie.headers.set("X-Content-Type-Options", "nosniff");
  copie.headers.set("X-Frame-Options", "DENY");
  copie.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  copie.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()");
  return copie;
}

// Les adresses de test (*.pages.dev) ne doivent pas être indexées.
export function ajouterNoindex(host: string, reponse: Response): Response {
  if (!/(^|\.)pages\.dev$/i.test(host.split(":")[0])) return reponse;
  const copie = new Response(reponse.body, reponse);
  copie.headers.set("X-Robots-Tag", "noindex, nofollow");
  return copie;
}

type Actifs = { fetch(requete: Request): Promise<Response> };

export async function onRequest(ctx: { request: Request; env: { ASSETS?: Actifs }; next: () => Promise<Response> }): Promise<Response> {
  const url = new URL(ctx.request.url);
  const route = routeHote(url.host, url.pathname);
  if (route.mode === "teaser" && ctx.env.ASSETS) {
    const cible = new URL(url.toString());
    cible.pathname = route.chemin;
    const reponse = await ctx.env.ASSETS.fetch(new Request(cible.toString(), { method: ctx.request.method, headers: ctx.request.headers }));
    return securiserTeaser(reponse);
  }
  return ajouterNoindex(url.host, await ctx.next());
}
