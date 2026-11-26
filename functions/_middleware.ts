// Les adresses de test (*.pages.dev) ne doivent pas être indexées. kazonly.com n'est pas concerné.
export function ajouterNoindex(host: string, reponse: Response): Response {
  if (!/(^|\.)pages\.dev$/i.test(host.split(":")[0])) return reponse;
  const copie = new Response(reponse.body, reponse);
  copie.headers.set("X-Robots-Tag", "noindex, nofollow");
  return copie;
}

export async function onRequest(ctx: { request: Request; next: () => Promise<Response> }): Promise<Response> {
  const reponse = await ctx.next();
  return ajouterNoindex(new URL(ctx.request.url).host, reponse);
}
