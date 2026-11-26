// Paramètres de la session Checkout (page de paiement Stripe hébergée). Module pur : testable sans appel réseau.

/** Identifiants des prix Stripe (mode test, EUR). Publics, non secrets : servent à vérifier les variables STRIPE_PRICE_*. */
export const PRIX_EUR: Record<string, Record<"month" | "year", string>> = {
  essentiel: { month: "price_1UfvNj8mMdKNLKBfW2NIc1Cm", year: "price_1UfvNm8mMdKNLKBf4nShlVdf" },
  proprietaire: { month: "price_1UfvNq8mMdKNLKBf5UKLhods", year: "price_1UfvNu8mMdKNLKBfzNbQemoh" },
  investisseur: { month: "price_1UfvNx8mMdKNLKBfDpdIzr0w", year: "price_1UfvO48mMdKNLKBf3ErI6hHh" },
};

/** Durée d'essai des formules payantes (demande du 26 novembre, à valider avec les CGV et la FAQ). */
export const ESSAI_JOURS = 14;

/**
 * Prix pour une formule et un intervalle, en EUR uniquement.
 * Lit STRIPE_PRICE_<FORMULE>_<MONTHLY|YEARLY> ; si la variable existe, elle doit correspondre à l'identifiant attendu.
 */
export function resoudrePrix(plan: string, interval: "month" | "year", ENV: Record<string, string | undefined>):
  { ok: true; price: string } | { ok: false; erreur: string } {
  const attendu = PRIX_EUR[plan]?.[interval];
  if (!attendu) return { ok: false, erreur: "formule_invalide" };
  const noms = plan === "investisseur" ? ["INVESTISSEUR", "PORTEFEUILLE"] : [plan.toUpperCase()];
  const cle = interval === "month" ? "MONTHLY" : "YEARLY";
  for (const nom of noms) {
    const valeur = ENV[`STRIPE_PRICE_${nom}_${cle}`];
    if (valeur !== undefined && valeur !== "" && valeur !== attendu) return { ok: false, erreur: "configuration_incoherente" };
  }
  return { ok: true, price: attendu };
}

export const TEXTE_CGV =
  // [À VALIDER juriste] : formulation à faire valider avant la mise en ligne. Ne jamais l'afficher comme marqueur.
  "J'accepte les [CGV](https://kazonly.pages.dev/cgv/) et je demande à commencer l'accès à KAZONLY tout de suite. Je conserve mon droit de rétractation de 14 jours, exercé depuis mon compte.";
export const TEXTE_SOUMISSION = "Abonnement renouvelé automatiquement, résiliable à tout moment depuis votre compte.";

export interface ParamsSession {
  userId: string;
  customer: string;
  price: string;
  plan: string;
  interval: "month" | "year";
  currency: "EUR";
  base: string;
  /** Vrai seulement pour un compte qui n'a jamais eu d'abonnement (voir server/essai.ts). */
  essai: boolean;
}

export function paramsSessionCheckout(p: ParamsSession) {
  const metadata = { user_id: p.userId, plan: p.plan, interval: p.interval, currency: "EUR", app: "kazonly" };
  return {
    mode: "subscription" as const,
    ui_mode: "hosted_page" as const,
    locale: "fr" as const,
    customer: p.customer,
    client_reference_id: p.userId,
    line_items: [{ price: p.price, quantity: 1 }],
    billing_address_collection: "required" as const,
    name_collection: {
      individual: { enabled: true, optional: true },
      business: { enabled: true, optional: true },
    },
    payment_method_collection: "always" as const,
    saved_payment_method_options: { payment_method_save: "enabled" as const },
    allow_promotion_codes: false,
    consent_collection: { terms_of_service: "required" as const },
    custom_text: {
      terms_of_service_acceptance: { message: TEXTE_CGV },
      submit: { message: TEXTE_SOUMISSION },
    },
    metadata,
    subscription_data: p.essai
      ? { metadata, trial_period_days: ESSAI_JOURS, trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } } }
      : { metadata },
    success_url: `${p.base}/app/abonnement/merci/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${p.base}/tarifs/`,
  };
}
