import { describe, expect, it } from "vitest";
import { bindEnv, planFromPriceId, priceIdFor } from "./lib";
import { paramsSessionCheckout, TEXTE_CGV } from "./checkout";

const PRIX: Record<string, string> = {
  ESSENTIEL_MONTHLY: "price_1UfvNj8mMdKNLKBfW2NIc1Cm", ESSENTIEL_YEARLY: "price_1UfvNm8mMdKNLKBf4nShlVdf",
  PROPRIETAIRE_MONTHLY: "price_1UfvNq8mMdKNLKBf5UKLhods", PROPRIETAIRE_YEARLY: "price_1UfvNu8mMdKNLKBfzNbQemoh",
  INVESTISSEUR_MONTHLY: "price_1UfvNx8mMdKNLKBfDpdIzr0w", INVESTISSEUR_YEARLY: "price_1UfvO48mMdKNLKBf3ErI6hHh",
  ESSENTIEL_MONTHLY_XPF: "price_1UfvOH8mMdKNLKBfRGNGkRjH", ESSENTIEL_YEARLY_XPF: "price_1UfvOL8mMdKNLKBfMHLwMhdS",
  PROPRIETAIRE_MONTHLY_XPF: "price_1UfvOP8mMdKNLKBfDKOMjfXW", PROPRIETAIRE_YEARLY_XPF: "price_1UfvOT8mMdKNLKBfnwQPEeXO",
  INVESTISSEUR_MONTHLY_XPF: "price_1UfvOX8mMdKNLKBfcR6DtJgh", INVESTISSEUR_YEARLY_XPF: "price_1UfvOb8mMdKNLKBfCEGw41sO",
};
const base = { userId: "u-1", customer: "cus_1", base: "https://kazonly.pages.dev" };

describe("12 combinaisons formule × intervalle × devise", () => {
  bindEnv(Object.fromEntries(Object.entries(PRIX).map(([k, v]) => [`STRIPE_PRICE_${k}`, v])));
  const combos: [string, "month" | "year", "EUR" | "XPF"][] = [];
  for (const f of ["essentiel", "proprietaire", "investisseur"]) for (const i of ["month", "year"] as const) for (const c of ["EUR", "XPF"] as const) combos.push([f, i, c]);
  for (const [f, i, c] of combos) {
    it(`${f} ${i} ${c} mène au bon prix`, () => {
      const attendu = PRIX[`${f.toUpperCase()}_${i === "month" ? "MONTHLY" : "YEARLY"}${c === "XPF" ? "_XPF" : ""}`];
      expect(priceIdFor(f, i, c)).toBe(attendu);
      expect(planFromPriceId(attendu)).toEqual({ plan: f, interval: i });
    });
  }
});

describe("paramètres de la session Checkout", () => {
  const p = paramsSessionCheckout({ ...base, price: PRIX.ESSENTIEL_MONTHLY, plan: "essentiel", interval: "month", currency: "EUR" });
  it("mode abonnement, page hébergée, français, adresse obligatoire", () => {
    expect(p.mode).toBe("subscription");
    expect(p.ui_mode).toBe("hosted_page");
    expect(p.locale).toBe("fr");
    expect(p.billing_address_collection).toBe("required");
  });
  it("collecte du nom facultative (particulier ou entreprise), carte toujours demandée, sauvegarde activée", () => {
    expect(p.name_collection.individual).toEqual({ enabled: true, optional: true });
    expect(p.name_collection.business).toEqual({ enabled: true, optional: true });
    expect(p.payment_method_collection).toBe("always");
    expect(p.saved_payment_method_options.payment_method_save).toBe("enabled");
    expect(p.allow_promotion_codes).toBe(true);
  });
  it("CGV obligatoires avec le texte sur la rétractation, pas de collecte de promotions", () => {
    expect(p.consent_collection).toEqual({ terms_of_service: "required" });
    expect(p.custom_text.terms_of_service_acceptance.message).toBe(TEXTE_CGV);
    expect(TEXTE_CGV).toContain("droit de rétractation de 14 jours");
    expect(p.consent_collection).not.toHaveProperty("promotions");
  });
  it("identifiant utilisateur, e-mail hors session, métadonnées plan/intervalle/devise", () => {
    expect(p.client_reference_id).toBe("u-1");
    expect(p.customer).toBe("cus_1");
    expect(p).not.toHaveProperty("customer_email");
    expect(p.metadata).toMatchObject({ user_id: "u-1", plan: "essentiel", interval: "month", currency: "EUR" });
    expect(p.subscription_data.metadata).toEqual(p.metadata);
  });
  it("retours vers la page de merci et vers les tarifs", () => {
    expect(p.success_url).toBe("https://kazonly.pages.dev/app/abonnement/merci/?session_id={CHECKOUT_SESSION_ID}");
    expect(p.cancel_url).toBe("https://kazonly.pages.dev/tarifs/");
  });
});
