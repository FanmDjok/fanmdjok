export type Currency = "EUR" | "XPF";

export interface Territory {
  id: string;
  label: string;
  currency: Currency;
  /** Préfixe de code postal (3 chiffres) ou code complet (5 chiffres) si unique */
  postal: string;
  postalFixed: boolean;
  phone: string;
  group: "DROM" | "COM";
}

export const TERRITORIES: Territory[] = [
  { id: "guadeloupe", label: "Guadeloupe", currency: "EUR", postal: "971", postalFixed: false, phone: "+590", group: "DROM" },
  { id: "martinique", label: "Martinique", currency: "EUR", postal: "972", postalFixed: false, phone: "+596", group: "DROM" },
  { id: "guyane", label: "Guyane", currency: "EUR", postal: "973", postalFixed: false, phone: "+594", group: "DROM" },
  { id: "reunion", label: "La Réunion", currency: "EUR", postal: "974", postalFixed: false, phone: "+262", group: "DROM" },
  { id: "mayotte", label: "Mayotte", currency: "EUR", postal: "976", postalFixed: false, phone: "+262", group: "DROM" },
  { id: "saint-martin", label: "Saint-Martin", currency: "EUR", postal: "97150", postalFixed: true, phone: "+590", group: "COM" },
  { id: "saint-barthelemy", label: "Saint-Barthélemy", currency: "EUR", postal: "97133", postalFixed: true, phone: "+590", group: "COM" },
  { id: "spm", label: "Saint-Pierre-et-Miquelon", currency: "EUR", postal: "975", postalFixed: false, phone: "+508", group: "COM" },
  { id: "nouvelle-caledonie", label: "Nouvelle-Calédonie", currency: "XPF", postal: "988", postalFixed: false, phone: "+687", group: "COM" },
  { id: "polynesie", label: "Polynésie française", currency: "XPF", postal: "987", postalFixed: false, phone: "+689", group: "COM" },
  { id: "wallis-futuna", label: "Wallis-et-Futuna", currency: "XPF", postal: "986", postalFixed: false, phone: "+681", group: "COM" },
];

export const getTerritory = (id: string): Territory => {
  const t = TERRITORIES.find((x) => x.id === id);
  if (!t) throw new Error(`Territoire inconnu : ${id}`);
  return t;
};

/** Valide un code postal selon le territoire. Retourne un message d'erreur ou null. */
export function validatePostalCode(territoryId: string, code: string): string | null {
  const t = getTerritory(territoryId);
  if (!/^\d{5}$/.test(code)) return "Le code postal doit comporter 5 chiffres.";
  if (t.postalFixed) {
    return code === t.postal ? null : `Code postal unique pour ${t.label} : ${t.postal}.`;
  }
  return code.startsWith(t.postal) ? null : `Le code postal doit commencer par ${t.postal} pour ${t.label}.`;
}

export type TypeLocation = "nue" | "meublee" | "tourisme_classe" | "tourisme_non_classe";

export const TYPES_LOCATION: { id: TypeLocation; label: string; hint: string; touristique: boolean }[] = [
  { id: "nue", label: "Location nue (vide)", hint: "Bail d'habitation non meublé, régime foncier", touristique: false },
  { id: "meublee", label: "Location meublée classique", hint: "LMNP : micro-BIC 50 % ou réel avec amortissement", touristique: false },
  { id: "tourisme_classe", label: "Meublé de tourisme classé", hint: "Courte durée classée, micro-BIC 50 %", touristique: true },
  { id: "tourisme_non_classe", label: "Meublé de tourisme non classé", hint: "Courte durée non classée, micro-BIC 30 % (loi Le Meur 2025)", touristique: true },
];
