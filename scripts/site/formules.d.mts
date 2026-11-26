export interface LigneComparatif {
  label: string;
  valeurs: string[];
}

/** Colonnes du tableau comparatif : formule Gratuite puis formules payantes (objets de shared/plans.json). */
export declare function colonnes(): { id: string; name: string; support: string; maxProperties: number; niveau: number }[];

/** Lignes du tableau comparatif, générées depuis shared/plans.json. */
export declare function lignesMatrice(): LigneComparatif[];
