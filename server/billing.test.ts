import { describe, expect, it } from "vitest";
import { bindEnv, planFromPriceId, priceIdFor } from "./lib";
import { onRequestPost as checkout } from "../functions/api/create-checkout";
import { onRequestPost as portal } from "../functions/api/customer-portal";
import { onRequestPost as webhook } from "../functions/api/stripe-webhook";

const post = (url: string, init: RequestInit = {}) => new Request(`https://kazonly.test${url}`, { method: "POST", ...init });
const ENV = { STRIPE_SECRET_KEY: "sk_test_x", STRIPE_WEBHOOK_SECRET: "whsec_test" };

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
  it("lit INVESTISSEUR, avec PORTEFEUILLE en repli", () => {
    bindEnv({ STRIPE_PRICE_INVESTISSEUR_MONTHLY: "price_inv" });
    expect(priceIdFor("investisseur", "month")).toBe("price_inv");
    bindEnv({ STRIPE_PRICE_PORTEFEUILLE_YEARLY: "price_old" });
    expect(priceIdFor("investisseur", "year")).toBe("price_old");
  });
});

describe("routes Stripe", () => {
  it("refuse la création de paiement sans session", async () => {
    const r = await checkout({ request: post("/api/create-checkout", { body: "{}" }), env: ENV });
    expect(r.status).toBe(401);
  });
  it("refuse le portail client sans session", async () => {
    const r = await portal({ request: post("/api/customer-portal"), env: ENV });
    expect(r.status).toBe(401);
  });
  it("refuse un webhook sans signature", async () => {
    const r = await webhook({ request: post("/api/stripe-webhook", { body: "{}" }), env: ENV });
    expect(r.status).toBe(400);
  });
  it("refuse un webhook à la signature invalide", async () => {
    const r = await webhook({
      request: post("/api/stripe-webhook", { body: "{}", headers: { "stripe-signature": "t=1,v1=0000" } }),
      env: ENV,
    });
    expect(r.status).toBe(400);
  });
});
