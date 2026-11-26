// Lit le niveau de confiance (aal) d'un jeton Supabase, sans le vérifier : la signature est vérifiée par requireUser.
export function aalDuJeton(token: string): string {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.aal === "string" ? json.aal : "";
  } catch {
    return "";
  }
}

export function jetonDuRequete(req: Request): string {
  const auth = req.headers.get("authorization") ?? "";
  return auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
}
