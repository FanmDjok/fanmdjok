import { describe, expect, it } from "vitest";
import { bindEnv, planFromPriceId, priceIdFor } from "./lib";
import { onRequestPost as checkout } from "../functions/api/create-checkout";
import { onRequestPost as portal } from "../functions/api/customer-portal";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook";

const post = (url: string, init: RequestInit = {}) => new Request(`https://kazonly.test${url}`, { method: "POST", ...init });

describe("prix Stripe", () => {
  it("renvoie le bon identifiant selon formule, intervalle et devise", () => {
    bindEnv({ STRIPE_PRICE_ESSENTIEL_MONTHLY: "price_a", STRIPE_PRICE_ESSENTIEL_YEARLY_XPF: "price_b" });
    expect(priceIdFor("essentiel", "month")).toBe("price_a");
    expect(priceIdFor("essentiel", "year", "XPF")).toBe("price_b");
    expect(priceIdFor("essentiel", "year")).toBeNull();
    expect(priceIdFor("inconnue", "month")).toBeNull();
    expect(planFromPriceId("price_b")).toEqual({ plan: "essentiel", interval: "year" });
    expect(planFromPriceId("price_inconnu")).toBeNull();
  });
});

describe("routes Stripe", () => {
  it("refuse la création de paiement sans session", async () => {
    const r = await checkout({ request: post("/api/create-checkout", { body: "{}" }), env: {} });
    expect(r.status).toBe(401);
  });
  it("refuse le portail client sans session", async () => {
    const r = await portal({ request: post("/api/customer-portal"), env: {} });
    expect(r.status).toBe(401);
  });
  it("refuse un webhook sans signature", async () => {
    const r = await webhook({ request: post("/api/stripe-webhook", { body: "{}" }), env: { STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_test" } });
    expect(r.status).toBe(400);
  });
  it("refuse un webhook à la signature invalide", async () => {
    const r = await webhook({
      request: post("/api/stripe-webhook", { body: "{}", headers: { "stripe-signature": "t=1,v1=0000" } }),
      env: { STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_test" },
    });
    expect(r.status).toBe(400);
  });
});
