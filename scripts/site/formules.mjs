// Tableau comparatif généré depuis shared/plans.json : une seule source pour les formules.
// Le test src/consistency.test.ts vérifie que la colonne Gratuit correspond au code de l'application.
import { plansData } from "./layout.mjs";

/** Colonnes du tableau : la formule Gratuite puis les formules payantes, dans l'ordre de plans.json. */
export const colonnes = () => [plansData.free, ...plansData.plans];

/** Valeur d'une cellule pour une formule (niveau = profondeur d'analyse dans l'application). */
export function cellule(ligne, formule) {
  if (ligne.valeur === "maxProperties") return String(formule.maxProperties);
  if (ligne.support) return formule.support;
  if (ligne.valeurs) return ligne.valeurs[String(formule.niveau)] ?? "—";
  return formule.niveau >= ligne.min ? "✓" : "—";
}

/** Lignes du tableau : { label, valeurs: [cellule par colonne] }. */
export const lignesMatrice = () =>
  plansData.matrice.map((ligne) => ({ label: ligne.label, valeurs: colonnes().map((f) => cellule(ligne, f)) }));
