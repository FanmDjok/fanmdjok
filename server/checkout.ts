// Paramètres de la session Checkout (page de paiement Stripe hébergée). Module pur : testable sans appel réseau.

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
  currency: "EUR" | "XPF";
  base: string;
}

export function paramsSessionCheckout(p: ParamsSession) {
  const metadata = { user_id: p.userId, plan: p.plan, interval: p.interval, currency: p.currency, app: "kazonly" };
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
    allow_promotion_codes: true,
    consent_collection: { terms_of_service: "required" as const },
    custom_text: {
      terms_of_service_acceptance: { message: TEXTE_CGV },
      submit: { message: TEXTE_SOUMISSION },
    },
    metadata,
    subscription_data: { metadata },
    success_url: `${p.base}/app/abonnement/merci/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${p.base}/tarifs/`,
  };
}
