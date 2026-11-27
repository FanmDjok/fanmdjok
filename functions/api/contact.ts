import { admin, bindEnv, envOptionnel, json, readBounded, type Env } from "../../server/lib";
import { ipDeConfiance, statutRefus, verifierTurnstile } from "../../server/turnstile";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const clip = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function handle(req: Request): Promise<Response> {
  const raw = await readBounded(req, 8192);
  if (raw === null) return json({ error: "requete_trop_grande" }, 413);

  let b: Record<string, unknown>;
  try { b = JSON.parse(raw); } catch { return json({ error: "requete_invalide" }, 400); }

  // Piège à robots : un champ caché rempli ne déclenche rien, mais la réponse reste identique.
  if (clip(b.website, 200)) return json({ ok: true });

  const name = clip(b.name, 200);
  const email = clip(b.email, 320);
  const message = clip(b.message, 5000);
  const topic = clip(b.topic, 50) || "question";
  const territory = clip(b.territory, 50) || null;
  const rawProps = typeof b.properties === "number" ? b.properties : parseInt(clip(b.properties, 10).replace(/\D/g, ""), 10);
  const properties = Number.isFinite(rawProps) && rawProps >= 0 ? Math.min(rawProps, 100000) : null;

  if (!name || !EMAIL.test(email) || !message) return json({ error: "champs_invalides" }, 400);

  const verdict = await verifierTurnstile({ jeton: b.turnstileToken, action: "contact", secret: envOptionnel("TURNSTILE_SECRET_KEY"), hostnames: envOptionnel("TURNSTILE_HOSTNAMES"), ip: ipDeConfiance(req.headers) });
  if (!verdict.ok) { const r = statutRefus(verdict); return json({ error: r.erreur }, r.statut); }

  const { error } = await admin().from("contact_requests").insert({ name, email, topic, territory, properties, message });
  if (error) {
    if (error.message.includes("TROP_DE_DEMANDES")) return json({ error: "trop_de_demandes" }, 429);
    console.error("contact : enregistrement impossible", error.message);
    return json({ error: "enregistrement_echoue" }, 500);
  }
  return json({ ok: true });
}

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  bindEnv(ctx.env);
  return handle(ctx.request);
}
