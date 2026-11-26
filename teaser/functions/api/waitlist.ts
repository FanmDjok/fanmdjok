import { traiterInscription, verifierTurnstile, type Env } from "../lib/waitlist";

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  return traiterInscription(ctx.request, ctx.env, {
    fetch: (url, init) => fetch(url, init),
    verifierTurnstile,
    maintenant: () => Date.now(),
  });
}
