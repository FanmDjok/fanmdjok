// Éligibilité à l'essai de 14 jours : une seule fois par compte.
// Règle : pas d'essai si le compte a déjà un drapeau « essai utilisé » dans Supabase, ou si un abonnement
// a déjà existé chez Stripe (actif, annulé, en essai, impayé). Jamais dans les produits ni dans les prix Stripe.

export interface Verification {
  dejaUtiliseDansBase: boolean;   // essai_utilise ou essai_fin renseigné dans subscriptions
  abonnementsStripe: number;      // abonnements existants, tous statuts sauf incomplete_expired
}

/** Décision pure, testable. */
export function decideEssai(v: Verification): boolean {
  return !v.dejaUtiliseDansBase && v.abonnementsStripe === 0;
}

/** Minimal de l'API Stripe utilisé ici (permet de tester sans réseau). */
export interface StripeLecture {
  customers: { list(p: { email: string; limit: number }): Promise<{ data: { id: string }[] }> };
  subscriptions: { list(p: { customer: string; status: "all"; limit: number }): Promise<{ data: { status: string }[] }> };
}

/**
 * Cherche le client par e-mail, ajoute le client déjà connu, puis compte les abonnements de chacun.
 * Retourne l'éligibilité et l'identifiant client à réutiliser (le premier trouvé).
 */
export async function essaiEligible(
  s: StripeLecture,
  email: string,
  dejaUtiliseDansBase: boolean,
  customerIdConnu: string | null,
): Promise<{ essai: boolean; customerId: string | null }> {
  const clients = await s.customers.list({ email, limit: 100 });
  const ids = new Set<string>();
  if (customerIdConnu) ids.add(customerIdConnu);
  for (const c of clients.data) ids.add(c.id);
  let total = 0;
  for (const id of ids) {
    const abos = await s.subscriptions.list({ customer: id, status: "all", limit: 100 });
    total += abos.data.filter((a) => a.status !== "incomplete_expired").length;
  }
  return {
    essai: decideEssai({ dejaUtiliseDansBase, abonnementsStripe: total }),
    customerId: customerIdConnu ?? clients.data[0]?.id ?? null,
  };
}

/** Hachage SHA-256 de l'adresse e-mail, pour les journaux (jamais l'adresse en clair). */
export async function hacheEmail(email: string): Promise<string> {
  const octets = new TextEncoder().encode(email.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", octets);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
