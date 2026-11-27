// Route de la liste d'attente du teaser, servie sur kazonly.com (même projet que le site).
import { traiterInscription, verifierTurnstile, type Env } from "../../teaser/functions/lib/waitlist";

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  return traiterInscription(ctx.request, ctx.env, {
    fetch: (url, init) => fetch(url, init),
    verifierTurnstile,
    maintenant: () => Date.now(),
  });
}
