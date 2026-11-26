import Stripe from "stripe";
import { describe, expect, it } from "vitest";
import { bindEnv, planFromPriceId, priceIdFor } from "./lib";

// Identifiants du compte Stripe KAZONLY, mode TEST (non secrets).
const PRIX_TEST: Record<string, string> = {
  STRIPE_PRICE_ESSENTIEL_MONTHLY: "price_1UfvNj8mMdKNLKBfW2NIc1Cm",
  STRIPE_PRICE_ESSENTIEL_YEARLY: "price_1UfvNm8mMdKNLKBf4nShlVdf",
  STRIPE_PRICE_PROPRIETAIRE_MONTHLY: "price_1UfvNq8mMdKNLKBf5UKLhods",
  STRIPE_PRICE_PROPRIETAIRE_YEARLY: "price_1UfvNu8mMdKNLKBfzNbQemoh",
  STRIPE_PRICE_INVESTISSEUR_MONTHLY: "price_1UfvNx8mMdKNLKBfDpdIzr0w",
  STRIPE_PRICE_INVESTISSEUR_YEARLY: "price_1UfvO48mMdKNLKBf3ErI6hHh",
  STRIPE_PRICE_ESSENTIEL_MONTHLY_XPF: "price_1UfvOH8mMdKNLKBfRGNGkRjH",
  STRIPE_PRICE_ESSENTIEL_YEARLY_XPF: "price_1UfvOL8mMdKNLKBfMHLwMhdS",
  STRIPE_PRICE_PROPRIETAIRE_MONTHLY_XPF: "price_1UfvOP8mMdKNLKBfDKOMjfXW",
  STRIPE_PRICE_PROPRIETAIRE_YEARLY_XPF: "price_1UfvOT8mMdKNLKBfnwQPEeXO",
  STRIPE_PRICE_INVESTISSEUR_MONTHLY_XPF: "price_1UfvOX8mMdKNLKBfcR6DtJgh",
  STRIPE_PRICE_INVESTISSEUR_YEARLY_XPF: "price_1UfvOb8mMdKNLKBfCEGw41sO",
};

describe("prix Stripe (mode test KAZONLY)", () => {
  it("chaque identifiant de prix correspond à la bonne formule et au bon intervalle", () => {
    bindEnv(PRIX_TEST);
    const cas: [string, "month" | "year", string | undefined, string][] = [
      ["essentiel", "month", undefined, "price_1UfvNj8mMdKNLKBfW2NIc1Cm"],
      ["essentiel", "year", undefined, "price_1UfvNm8mMdKNLKBf4nShlVdf"],
      ["proprietaire", "month", undefined, "price_1UfvNq8mMdKNLKBf5UKLhods"],
      ["proprietaire", "year", undefined, "price_1UfvNu8mMdKNLKBfzNbQemoh"],
      ["investisseur", "month", undefined, "price_1UfvNx8mMdKNLKBfDpdIzr0w"],
      ["investisseur", "year", undefined, "price_1UfvO48mMdKNLKBf3ErI6hHh"],
      ["essentiel", "month", "XPF", "price_1UfvOH8mMdKNLKBfRGNGkRjH"],
      ["essentiel", "year", "XPF", "price_1UfvOL8mMdKNLKBfMHLwMhdS"],
      ["proprietaire", "month", "XPF", "price_1UfvOP8mMdKNLKBfDKOMjfXW"],
      ["proprietaire", "year", "XPF", "price_1UfvOT8mMdKNLKBfnwQPEeXO"],
      ["investisseur", "month", "XPF", "price_1UfvOX8mMdKNLKBfcR6DtJgh"],
      ["investisseur", "year", "XPF", "price_1UfvOb8mMdKNLKBfCEGw41sO"],
    ];
    for (const [plan, intervalle, devise, attendu] of cas) {
      expect(priceIdFor(plan, intervalle, devise ?? "EUR")).toBe(attendu);
      expect(planFromPriceId(attendu)).toEqual({ plan, interval: intervalle });
    }
  });
  it("un identifiant inconnu n'est jamais accepté", () => {
    bindEnv(PRIX_TEST);
    expect(planFromPriceId("price_inconnu")).toBeNull();
  });
});

describe("signature du webhook (vérification réelle, sans réseau)", () => {
  const secret = "whsec_test_local";
  const payload = JSON.stringify({ id: "evt_test_1", object: "event", type: "customer.subscription.updated", data: { object: {} } });
  const stripe = new Stripe("sk_test_local_non_utilise");

  it("accepte une signature valide générée avec le secret de test", async () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const event = await stripe.webhooks.constructEventAsync(payload, header, secret, undefined, Stripe.createSubtleCryptoProvider());
    expect(event.id).toBe("evt_test_1");
  });
  it("refuse un corps modifié après signature", async () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const modifie = payload.replace("updated", "deleted");
    await expect(stripe.webhooks.constructEventAsync(modifie, header, secret, undefined, Stripe.createSubtleCryptoProvider())).rejects.toThrow();
  });
  it("refuse une signature faite avec un autre secret", async () => {
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_autre" });
    await expect(stripe.webhooks.constructEventAsync(payload, header, secret, undefined, Stripe.createSubtleCryptoProvider())).rejects.toThrow();
  });
});
