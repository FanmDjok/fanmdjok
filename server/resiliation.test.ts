import { describe, expect, it } from "vitest";
import { bindEnv } from "./lib";
import { onRequestPost as resiliation } from "../functions/api/resiliation";
import { onRequestPost as lien } from "../functions/api/resiliation-lien";

const ENV = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k", TURNSTILE_SECRET_KEY: "s", SITE_URL: "https://kazonly.test" };
const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://kazonly.test${url}`, { method: "POST", body: JSON.stringify(body), headers });

describe("résiliation et rétractation", () => {
  it("refuse sans session", async () => {
    bindEnv(ENV);
    const r = await resiliation({ request: post("/api/resiliation", { action: "resilier" }), env: ENV });
    expect(r.status).toBe(401);
  });
});

describe("lien de résiliation sans compte", () => {
  it("refuse une adresse invalide", async () => {
    const r = await lien({ request: post("/api/resiliation-lien", { email: "nope", turnstileToken: "x" }), env: ENV });
    expect(r.status).toBe(400);
  });
  it("refuse sans vérification anti-robot, sans créer de lien", async () => {
    const r = await lien({ request: post("/api/resiliation-lien", { email: "a@b.co", turnstileToken: "" }), env: ENV });
    expect(r.status).toBe(403);
  });
});
