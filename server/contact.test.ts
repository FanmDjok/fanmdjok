import { describe, expect, it } from "vitest";
import { bindEnv } from "./lib";
import { verifierTurnstile } from "./turnstile";
import { onRequestPost as contact } from "../functions/api/contact";

const ENV = { TURNSTILE_SECRET_KEY: "secret_test", TURNSTILE_HOSTNAMES: "kazonly.test", SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k" };
const post = (body: unknown) => new Request("https://kazonly.test/api/contact", { method: "POST", body: JSON.stringify(body) });
const valide = { name: "Marie", email: "marie@example.com", message: "Bonjour", turnstileToken: "" };

describe("formulaire de contact", () => {
  it("refuse un message sans jeton anti-robot, sans appeler Cloudflare", async () => {
    bindEnv(ENV);
    const r = await contact({ request: post(valide), env: ENV });
    expect(r.status).toBe(403);
  });
  it("accepte silencieusement le piège à robots rempli", async () => {
    const r = await contact({ request: post({ ...valide, website: "http://spam" }), env: ENV });
    expect(r.status).toBe(200);
  });
  it("refuse un e-mail invalide", async () => {
    const r = await contact({ request: post({ ...valide, email: "pas-un-email" }), env: ENV });
    expect(r.status).toBe(400);
  });
  it("refuse un corps trop volumineux", async () => {
    const r = await contact({ request: post({ ...valide, message: "x".repeat(9000) }), env: ENV });
    expect(r.status).toBe(413);
  });
  it("une vérification sans jeton est refusée sans requête sortante", async () => {
    expect(await verifierTurnstile({ jeton: "", action: "contact", secret: "secret", hostnames: "kazonly.test", ip: null })).toEqual({ ok: false, motif: "jeton" });
  });
  it("sans TURNSTILE_HOSTNAMES : 503, échec fermé", async () => {
    const sans = { ...ENV, TURNSTILE_HOSTNAMES: undefined };
    bindEnv(sans);
    const r = await contact({ request: post({ ...valide, turnstileToken: "jeton" }), env: sans });
    expect(r.status).toBe(503);
  });
});
