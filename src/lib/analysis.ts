import type { Currency } from "./territories";
import type { Property } from "../data/types";

export interface Assumptions {
  vacance: number; // % de loyers perdus (hors meublés de tourisme, dont le taux d'occupation tient lieu)
  gestion: number; // % de frais de gestion sur les loyers encaissés
  revalorisation: number; // % de hausse annuelle de la valeur du bien
  indexation: number; // % de hausse annuelle des loyers et des charges
}
export const DEFAULT_ASSUMPTIONS: Assumptions = { vacance: 5, gestion: 0, revalorisation: 2, indexation: 1 };

const isTourisme = (p: Property) => p.typeLocation.startsWith("tourisme");
const n = (v: number | undefined) => v ?? 0;

/** Mensualité d'un prêt à taux fixe (formule d'annuité constante). */
export function monthlyPayment(capital: number, ratePct: number, months: number): number {
  if (capital <= 0 || months <= 0) return 0;
  const i = ratePct / 1200;
  if (i === 0) return capital / months;
  return (capital * i) / (1 - Math.pow(1 + i, -months));
}

/** Capital restant dû après `months` mois. Sans taux, amortissement linéaire sur la durée restante. */
export function remainingBalance(
  balance: number, payment: number, ratePct: number | undefined, durationMonths: number | undefined, months: number,
): number | null {
  if (balance <= 0) return 0;
  if (ratePct && ratePct > 0 && payment > 0) {
    const i = ratePct / 1200;
    const g = Math.pow(1 + i, months);
    return Math.max(0, balance * g - (payment * (g - 1)) / i);
  }
  if (durationMonths && durationMonths > 0) return Math.max(0, balance * (1 - months / durationMonths));
  return null;
}

export interface ScorePart { label: string; points: number; max: number }
export interface Analysis {
  currency: Currency;
  rentGross: number; // loyers annuels théoriques
  rentEffective: number; // après vacance
  charges: number; // charges annuelles hors crédit
  debtService: number; // crédit annuel
  cashflowAnnual: number;
  cashflowMonthly: number;
  basis?: number; // base de calcul des rendements (prix d'achat, sinon valeur actuelle)
  grossYield?: number; // fraction (0.06 = 6 %)
  netYield?: number;
  value?: number;
  equity?: number; // patrimoine net = valeur - capital restant dû
  gain?: number; // plus-value latente
  ltv?: number; // endettement / valeur
  breakdown: { label: string; amount: number }[];
  score?: { total: number; parts: ScorePart[] };
}

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const lin = (x: number, zero: number, full: number) => clamp((x - zero) / (full - zero));

export function analyze(p: Property, a: Assumptions = DEFAULT_ASSUMPTIONS): Analysis {
  const f = p.finance ?? {};
  const rentGross = isTourisme(p) ? p.loyer * 365 * (n(p.tauxOccupation) / 100) : p.loyer * 12;
  const rentEffective = isTourisme(p) ? rentGross : rentGross * (1 - a.vacance / 100);
  const gestion = (rentEffective * a.gestion) / 100;
  const breakdown = [
    { label: "Taxe foncière", amount: n(f.taxeFonciere) },
    { label: "Assurance", amount: n(f.assurance) },
    { label: "Charges de copropriété", amount: n(f.chargesCopro) },
    { label: "Entretien", amount: n(f.entretien) },
    { label: "Gestion", amount: gestion },
    { label: "Crédit", amount: n(f.mensualite) * 12 },
  ].filter((x) => x.amount > 0);
  const charges = breakdown.filter((x) => x.label !== "Crédit").reduce((s, x) => s + x.amount, 0);
  const debtService = n(f.mensualite) * 12;
  const cashflowAnnual = rentEffective - charges - debtService;
  const basis = f.prixAchat || f.valeurActuelle || undefined;
  const value = f.valeurActuelle || undefined;
  const grossYield = basis ? rentGross / basis : undefined;
  const netYield = basis ? (rentEffective - charges) / basis : undefined;
  const equity = value !== undefined ? value - n(f.capitalRestant) : undefined;
  const gain = value !== undefined && f.prixAchat ? value - f.prixAchat : undefined;
  const ltv = value !== undefined && f.capitalRestant !== undefined ? f.capitalRestant / value : undefined;

  let score: Analysis["score"];
  if (basis && rentGross > 0 && netYield !== undefined) {
    const parts: ScorePart[] = [
      { label: "Cash-flow", max: 40, points: Math.round(40 * lin(cashflowAnnual / rentGross, -0.1, 0.15)) },
      { label: "Endettement", max: 30, points: Math.round(30 * (ltv === undefined ? 1 : 1 - lin(ltv, 0.4, 0.9))) },
      { label: "Rendement net", max: 30, points: Math.round(30 * lin(netYield, 0.01, 0.06)) },
    ];
    score = { total: parts.reduce((s, x) => s + x.points, 0), parts };
  }
  return { currency: p.currency, rentGross, rentEffective, charges, debtService, cashflowAnnual, cashflowMonthly: cashflowAnnual / 12, basis, grossYield, netYield, value, equity, gain, ltv, breakdown, score };
}

export function scoreVerdict(total: number): string {
  if (total >= 80) return "Excellent : ce bien contribue positivement à votre patrimoine.";
  if (total >= 60) return "Solide : quelques points à surveiller.";
  if (total >= 40) return "Fragile : le cash-flow ou l'endettement mérite attention.";
  return "À risque : les charges et le crédit pèsent lourd sur ce bien.";
}

export interface ProjectionRow { years: number; value: number; balance: number | null; equity: number | null; cumulatedCashflow: number }

/** Projection du patrimoine net et du cash-flow cumulé (hypothèses simples, indicatives). */
export function project(p: Property, a: Assumptions, horizons = [5, 10, 15, 20]): ProjectionRow[] | null {
  const f = p.finance ?? {};
  if (!f.valeurActuelle) return null;
  const base = analyze(p, a);
  const balance0 = n(f.capitalRestant);
  const payment = n(f.mensualite);
  const rows: ProjectionRow[] = [];
  for (const y of horizons) {
    let cumulated = 0;
    for (let k = 1; k <= y; k++) {
      const growth = Math.pow(1 + a.indexation / 100, k - 1);
      const monthsDue = f.dureeRestanteMois === undefined ? 12 : clamp(f.dureeRestanteMois - 12 * (k - 1), 0, 12);
      cumulated += (base.rentEffective - base.charges) * growth - payment * monthsDue;
    }
    const bal = remainingBalance(balance0, payment, f.tauxCredit, f.dureeRestanteMois, y * 12);
    const value = f.valeurActuelle * Math.pow(1 + a.revalorisation / 100, y);
    rows.push({ years: y, value, balance: bal, equity: bal === null ? null : value - bal, cumulatedCashflow: cumulated });
  }
  return rows;
}

export interface PortfolioLine { currency: Currency; count: number; rentEffective: number; charges: number; debtService: number; cashflowAnnual: number; value: number; equity: number; netYield?: number }

/** Consolidation par devise : jamais d'addition entre EUR et XPF. */
export function consolidate(properties: Property[], a: Assumptions = DEFAULT_ASSUMPTIONS): PortfolioLine[] {
  const out = new Map<Currency, PortfolioLine & { basis: number }>();
  for (const p of properties.filter((x) => x.actif)) {
    const r = analyze(p, a);
    const l = out.get(p.currency) ?? { currency: p.currency, count: 0, rentEffective: 0, charges: 0, debtService: 0, cashflowAnnual: 0, value: 0, equity: 0, basis: 0 };
    l.count++; l.rentEffective += r.rentEffective; l.charges += r.charges; l.debtService += r.debtService; l.cashflowAnnual += r.cashflowAnnual;
    l.value += r.value ?? 0; l.equity += r.equity ?? 0; l.basis += r.basis ?? 0;
    out.set(p.currency, l);
  }
  return [...out.values()].map(({ basis, ...l }) => ({ ...l, netYield: basis ? (l.rentEffective - l.charges) / basis : undefined }));
}
