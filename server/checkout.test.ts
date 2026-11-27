import { describe, expect, it } from "vitest";
import { PRIX_EUR, ESSAI_JOURS, paramsSessionCheckout, resoudrePrix, TEXTE_CGV, validerDemandePublique } from "./checkout";

const base = { userId: "u-1", customer: "cus_1", base: "https://kazonly.pages.dev" };
const ATTENDUS: [string, "month" | "year", string][] = [
  ["essentiel", "month", "price_1UfvNj8mMdKNLKBfW2NIc1Cm"], ["essentiel", "year", "price_1UfvNm8mMdKNLKBf4nShlVdf"],
  ["proprietaire", "month", "price_1UfvNq8mMdKNLKBf5UKLhods"], ["proprietaire", "year", "price_1UfvNu8mMdKNLKBfzNbQemoh"],
  ["investisseur", "month", "price_1UfvNx8mMdKNLKBfDpdIzr0w"], ["investisseur", "year", "price_1UfvO48mMdKNLKBf3ErI6hHh"],
];

describe("prix EUR : 3 formules × mensuel/annuel", () => {
  for (const [plan, interval, id] of ATTENDUS) {
    it(`${plan} ${interval} mène à ${id}`, () => {
      expect(resoudrePrix(plan, interval, {})).toEqual({ ok: true, price: id });
    });
  }
  it("une variable STRIPE_PRICE_* identique est acceptée", () => {
    expect(resoudrePrix("essentiel", "month", { STRIPE_PRICE_ESSENTIEL_MONTHLY: "price_1UfvNj8mMdKNLKBfW2NIc1Cm" })).toEqual({ ok: true, price: "price_1UfvNj8mMdKNLKBfW2NIc1Cm" });
  });
  it("une variable qui ne correspond pas aux identifiants attendus est refusée", () => {
    expect(resoudrePrix("essentiel", "month", { STRIPE_PRICE_ESSENTIEL_MONTHLY: "price_autre" })).toEqual({ ok: false, erreur: "configuration_incoherente" });
  });
  it("la variable héritée PORTEFEUILLE reste reconnue pour l'Investisseur", () => {
    expect(resoudrePrix("investisseur", "year", { STRIPE_PRICE_PORTEFEUILLE_YEARLY: "price_1UfvO48mMdKNLKBf3ErI6hHh" })).toEqual({ ok: true, price: "price_1UfvO48mMdKNLKBf3ErI6hHh" });
  });
  it("formule inconnue refusée", () => {
    expect(resoudrePrix("gratuit", "month", {})).toEqual({ ok: false, erreur: "formule_invalide" });
  });
  it("aucun identifiant XPF n'est utilisé", () => {
    for (const plan of Object.keys(PRIX_EUR)) for (const i of ["month", "year"] as const) {
      expect(PRIX_EUR[plan][i]).toMatch(/^price_/);
    }
    expect(JSON.stringify(PRIX_EUR)).not.toMatch(/XPF/i);
  });
});

describe("paramètres de la session Checkout", () => {
  const p = paramsSessionCheckout({ ...base, price: PRIX_EUR.essentiel.month, plan: "essentiel", interval: "month", currency: "EUR", essai: true });
  it("mode abonnement, page hébergée, français, adresse obligatoire", () => {
    expect(p.mode).toBe("subscription");
    expect(p.ui_mode).toBe("hosted_page");
    expect(p.locale).toBe("fr");
    expect(p.billing_address_collection).toBe("required");
  });
  it("essai de 14 jours, carte collectée dès l'inscription, annulation si la carte manque à la fin", () => {
    expect(ESSAI_JOURS).toBe(14);
    expect(p.subscription_data.trial_period_days).toBe(14);
    expect(p.subscription_data.trial_settings?.end_behavior.missing_payment_method).toBe("cancel");
    expect(p.payment_method_collection).toBe("always");
  });
  it("compte ayant déjà eu un abonnement : aucun essai, paiement immédiat", () => {
    const sansEssai = paramsSessionCheckout({ ...base, price: PRIX_EUR.essentiel.month, plan: "essentiel", interval: "month", currency: "EUR", essai: false });
    expect(sansEssai.subscription_data).not.toHaveProperty("trial_period_days");
    expect(sansEssai.subscription_data).not.toHaveProperty("trial_settings");
    expect(sansEssai.payment_method_collection).toBe("always");
  });
  it("aucun code promo, aucun consentement marketing ; CGV obligatoires", () => {
    expect(p.allow_promotion_codes).toBe(false);
    expect(p.consent_collection).toEqual({ terms_of_service: "required" });
    expect(p.consent_collection).not.toHaveProperty("promotions");
    expect(p.custom_text.terms_of_service_acceptance.message).toBe(TEXTE_CGV);
  });
  it("collecte du nom facultative et sauvegarde du moyen de paiement", () => {
    expect(p.name_collection.individual).toEqual({ enabled: true, optional: true });
    expect(p.saved_payment_method_options.payment_method_save).toBe("enabled");
  });
  it("identifiant utilisateur, client, métadonnées EUR", () => {
    expect(p.client_reference_id).toBe("u-1");
    expect((p as Record<string, unknown>).customer).toBe("cus_1");
    expect(p).not.toHaveProperty("customer_email");
    expect(p.metadata).toMatchObject({ user_id: "u-1", plan: "essentiel", interval: "month", currency: "EUR" });
    expect(p.subscription_data.metadata).toEqual(p.metadata);
  });
  it("retours vers la page de merci et vers les tarifs", () => {
    expect(p.success_url).toBe("https://kazonly.pages.dev/app/abonnement/merci/?session_id={CHECKOUT_SESSION_ID}");
    expect(p.cancel_url).toBe("https://kazonly.pages.dev/tarifs/");
  });
});

describe("achat sans compte", () => {
  const sans = paramsSessionCheckout({ userId: null, email: "nouveau@exemple.fr", price: PRIX_EUR.proprietaire.year, plan: "proprietaire", interval: "year", currency: "EUR", essai: true, base: "https://kazonly.pages.dev" });
  it("pas d'identifiant utilisateur dans les métadonnées, e-mail transmis à Stripe", () => {
    expect(sans.metadata).not.toHaveProperty("user_id");
    expect(sans.subscription_data.metadata).not.toHaveProperty("user_id");
    expect((sans as Record<string, unknown>).customer_email).toBe("nouveau@exemple.fr");
    expect((sans as Record<string, unknown>).customer).toBeUndefined();
    expect(sans.client_reference_id).toBe("sans_compte");
  });
  it("l'essai et la carte restent demandés", () => {
    expect(sans.subscription_data.trial_period_days).toBe(14);
    expect(sans.payment_method_collection).toBe("always");
  });
  it("validation de la demande publique", () => {
    expect(validerDemandePublique({ plan: "essentiel", interval: "month", startNow: true, email: "a@b.fr" })).toEqual({ ok: true, plan: "essentiel", interval: "month", email: "a@b.fr" });
    expect(validerDemandePublique({ plan: "essentiel", interval: "month", startNow: false, email: "a@b.fr" })).toEqual({ ok: false, erreur: "consentement_requis" });
    expect(validerDemandePublique({ plan: "gratuit", interval: "month", startNow: true, email: "a@b.fr" })).toEqual({ ok: false, erreur: "formule_invalide" });
    expect(validerDemandePublique({ plan: "essentiel", interval: "year", startNow: true, email: "pas-un-mail" })).toEqual({ ok: false, erreur: "email_invalide" });
    expect(validerDemandePublique({ plan: "investisseur", interval: "year", startNow: true, email: "c@d.fr" })).toEqual({ ok: true, plan: "investisseur", interval: "year", email: "c@d.fr" });
  });
});
