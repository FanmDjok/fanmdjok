import { describe, expect, it } from "vitest";
import { onRequestPost as newsletter } from "../functions/api/newsletter";

const CONFIG = { BREVO_API_KEY: "x", BREVO_LIST_ID_VEILLE: "3", BREVO_DOI_TEMPLATE_ID: "7", TURNSTILE_SECRET_KEY: "s", TURNSTILE_HOSTNAMES: "kazonly.test", SITE_URL: "https://kazonly.test" };
const post = (corps: unknown) => new Request("https://kazonly.test/api/newsletter", { method: "POST", body: JSON.stringify(corps) });

describe("inscription à la veille", () => {
  it("refuse une adresse invalide", async () => {
    const r = await newsletter({ request: post({ email: "pas-un-email", consent: true, turnstileToken: "t" }), env: CONFIG });
    expect(r.status).toBe(400);
  });
  it("exige le consentement", async () => {
    const r = await newsletter({ request: post({ email: "a@b.co", consent: false, turnstileToken: "t" }), env: CONFIG });
    expect(r.status).toBe(400);
  });
  it("répond proprement tant que Brevo n'est pas configuré, sans rien envoyer", async () => {
    const r = await newsletter({ request: post({ email: "a@b.co", consent: true, turnstileToken: "t" }), env: {} });
    expect(r.status).toBe(503);
    expect((await r.json()).error).toBe("bientot_ouvert");
  });
  it("refuse sans vérification anti-robot, avant tout envoi", async () => {
    const r = await newsletter({ request: post({ email: "a@b.co", consent: true, turnstileToken: "" }), env: CONFIG });
    expect(r.status).toBe(403);
  });
});
