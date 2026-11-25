import type { TypeLocation } from "./territories";

/** Territoires dont l'impôt sur le revenu relève du code général des impôts (droit commun). */
export const DROIT_COMMUN = ["guadeloupe", "martinique", "guyane", "reunion", "mayotte"];
export const hasLocalCode = (territoryId: string) => !DROIT_COMMUN.includes(territoryId);

export interface MicroRule { label: string; abattement: number; plafond: number }
export const MICRO: Record<TypeLocation, MicroRule> = {
  nue: { label: "Micro-foncier", abattement: 0.3, plafond: 15000 },
  meublee: { label: "Micro-BIC", abattement: 0.5, plafond: 77700 },
  tourisme_classe: { label: "Micro-BIC meublé de tourisme classé", abattement: 0.5, plafond: 77700 },
  tourisme_non_classe: { label: "Micro-BIC meublé de tourisme non classé", abattement: 0.3, plafond: 15000 },
};
export const REEL_LABEL: Record<TypeLocation, string> = {
  nue: "Régime réel (revenus fonciers)", meublee: "Régime réel (BIC)", tourisme_classe: "Régime réel (BIC)", tourisme_non_classe: "Régime réel (BIC)",
};

export interface FiscalInput { type: TypeLocation; recettes: number; charges: number; interets: number; tmi: number; ps: number }
export interface FiscalResult {
  microEligible: boolean; baseMicro: number; baseReel: number; best: "micro" | "reel"; base: number; impotEstime: number; economie: number;
}
const pos = (n: number) => Math.max(0, n);

/** Compare micro et réel (hors amortissement) et estime impôt + prélèvements sociaux sur la base la plus faible. */
export function compareRegimes(i: FiscalInput): FiscalResult {
  const rule = MICRO[i.type];
  const microEligible = i.recettes <= rule.plafond;
  const baseMicro = Math.round(i.recettes * (1 - rule.abattement));
  const baseReel = Math.round(pos(i.recettes - i.charges - i.interets));
  const best = microEligible && baseMicro <= baseReel ? "micro" : "reel";
  const base = best === "micro" ? baseMicro : baseReel;
  const rate = (i.tmi + i.ps) / 100;
  const other = best === "micro" ? baseReel : baseMicro;
  const impotEstime = Math.round(base * rate);
  const economie = microEligible || best === "reel" ? Math.round(pos(other - base) * rate) : 0;
  return { microEligible, baseMicro, baseReel, best, base, impotEstime, economie };
}

export const REDUCTION_DROM: Record<string, { taux: number; plafond: number }> = {
  guadeloupe: { taux: 30, plafond: 2450 }, martinique: { taux: 30, plafond: 2450 }, reunion: { taux: 30, plafond: 2450 },
  guyane: { taux: 40, plafond: 4050 }, mayotte: { taux: 40, plafond: 4050 },
};
