import { describe, expect, it } from "vitest";
import { analyze, consolidate, monthlyPayment, project, remainingBalance, DEFAULT_ASSUMPTIONS } from "./analysis";
import type { Property } from "../data/types";

const base: Property = {
  id: "1", name: "A", numero: "1", rue: "r", codePostal: "97200", territoire: "martinique", currency: "EUR",
  typeLocation: "nue", loyer: 900, actif: true,
  finance: { prixAchat: 180000, valeurActuelle: 200000, capitalRestant: 100000, mensualite: 650, tauxCredit: 3, dureeRestanteMois: 200, taxeFonciere: 800, assurance: 240, chargesCopro: 600, entretien: 400 },
};
const noVac = { ...DEFAULT_ASSUMPTIONS, vacance: 0, gestion: 0 };

describe("analyse financière", () => {
  it("mensualité : 100 000 € à 3,5 % sur 20 ans ≈ 579,96 €", () => {
    expect(monthlyPayment(100000, 3.5, 240)).toBeCloseTo(579.96, 1);
  });
  it("le capital restant dû est nul au terme du prêt", () => {
    const m = monthlyPayment(100000, 3.5, 240);
    expect(remainingBalance(100000, m, 3.5, 240, 240)!).toBeCloseTo(0, 0);
  });
  it("sans taux, amortissement linéaire ; sans durée, inconnu", () => {
    expect(remainingBalance(100000, 0, undefined, 200, 100)).toBe(50000);
    expect(remainingBalance(100000, 0, undefined, undefined, 100)).toBeNull();
  });
  it("rendement brut 6 % pour 900 €/mois sur 180 000 €", () => {
    expect(analyze(base, noVac).grossYield).toBeCloseTo(0.06, 5);
  });
  it("rendement net et cash-flow", () => {
    const r = analyze(base, noVac);
    expect(r.charges).toBe(2040);
    expect(r.netYield).toBeCloseTo((10800 - 2040) / 180000, 5);
    expect(r.cashflowAnnual).toBe(10800 - 2040 - 7800);
  });
  it("meublé de tourisme : loyer = tarif/nuit × 365 × occupation", () => {
    const t: Property = { ...base, typeLocation: "tourisme_classe", loyer: 100, tauxOccupation: 50, finance: {} };
    expect(analyze(t).rentGross).toBe(18250);
  });
  it("sans données financières : pas de score, pas de rendement", () => {
    const r = analyze({ ...base, finance: undefined });
    expect(r.score).toBeUndefined();
    expect(r.grossYield).toBeUndefined();
  });
  it("le score reste dans [0, 100]", () => {
    const r = analyze(base);
    expect(r.score!.total).toBeGreaterThanOrEqual(0);
    expect(r.score!.total).toBeLessThanOrEqual(100);
  });
  it("projection : la valeur croît et le patrimoine net aussi", () => {
    const rows = project(base, DEFAULT_ASSUMPTIONS)!;
    expect(rows[0].value).toBeCloseTo(200000 * 1.02 ** 5, 0);
    expect(rows[3].equity!).toBeGreaterThan(rows[0].equity!);
  });
  it("consolidation : EUR et XPF ne sont jamais additionnés", () => {
    const xpf: Property = { ...base, id: "2", currency: "XPF", territoire: "polynesie", codePostal: "98714", loyer: 100000, finance: {} };
    const lines = consolidate([base, xpf]);
    expect(lines.map((l) => l.currency).sort()).toEqual(["EUR", "XPF"]);
  });
});
