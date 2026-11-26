import { describe, expect, it } from "vitest";
import fs from "node:fs";
import plans from "../shared/plans.json";
import territories from "../shared/territories.json";
import { TERRITORIES } from "./lib/territories";
import { FREE_PLAN, NIVEAU_GRATUIT, analysisLevel, propertyLimit } from "./lib/billing";
import { colonnes, lignesMatrice } from "../scripts/site/formules.mjs";

const migrations = fs
  .readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => fs.readFileSync(`supabase/migrations/${f}`, "utf8"))
  .join("\n");

describe("cohérence des sources partagées", () => {
  it("les formules de plans.json correspondent à la table plans du schéma", () => {
    const rows = [...plans.plans, { ...plans.free, monthly: 0, yearly: 0 }];
    for (const p of rows) {
      const row = new RegExp(`\\('${p.id}','[^']*',${p.monthly},${p.yearly},${p.maxProperties},`);
      expect(migrations).toMatch(row);
    }
  });
  it("chaque territoire de l'application existe dans le schéma", () => {
    for (const t of territories) {
      expect(migrations).toContain(`'${t.id}'`);
    }
    expect(territories).toHaveLength(TERRITORIES.length);
  });
  it("les libellés des territoires correspondent à l'application", () => {
    const app = JSON.stringify(TERRITORIES).toLowerCase();
    for (const t of territories) {
      expect(app).toContain(t.label.toLowerCase());
    }
  });
  it("les prix XPF sont cohérents (annuel = mensuel × 10, proches de la parité)", () => {
    for (const p of plans.plans) {
      expect(p.xpf.yearly).toBe(p.xpf.monthly * (12 - plans.annualMonthsFree));
      expect(Math.abs(p.xpf.monthly / plans.xpfPerEur / p.monthly - 1)).toBeLessThan(0.05);
    }
  });
  it("l'annuel offre les mois gratuits annoncés", () => {
    for (const p of plans.plans) expect(p.yearly).toBe(p.monthly * (12 - plans.annualMonthsFree));
  });
  it("aucun essai gratuit des formules payantes n'est configuré", () => {
    expect(plans).not.toHaveProperty("trialDays");
  });
  it("la formule Gratuite a le même niveau et la même limite dans le code et dans plans.json", () => {
    expect(plans.free.niveau).toBe(NIVEAU_GRATUIT);
    expect(FREE_PLAN.maxProperties).toBe(plans.free.maxProperties);
    expect(propertyLimit(null)).toBe(plans.free.maxProperties);
  });
  it("chaque formule payante a le niveau et la limite de biens annoncés dans le code", () => {
    for (const p of plans.plans) {
      const sub = { plan: p.id as "essentiel", status: "active", trialEnd: null, currentPeriodEnd: null, cancelAtPeriodEnd: false };
      expect(analysisLevel(sub)).toBe(p.niveau);
      expect(propertyLimit(sub)).toBe(p.maxProperties);
    }
  });
  it("tableau comparatif : la colonne Gratuit correspond exactement aux droits de la formule Gratuite", () => {
    expect(colonnes()[0].id).toBe(plans.free.id);
    for (const ligne of lignesMatrice()) {
      const attendu = ligne.label === "Nombre de biens" ? String(plans.free.maxProperties) : ligne.label === "Support" ? plans.free.support : undefined;
      const gratuit = ligne.valeurs[0];
      if (attendu !== undefined) expect(gratuit).toBe(attendu);
    }
    const fiscalite = lignesMatrice().find((l) => l.label.startsWith("Fiscalité par territoire"))!;
    expect(fiscalite.valeurs[0]).toBe(NIVEAU_GRATUIT >= 2 ? "✓" : "—");
    const simulateurs = lignesMatrice().find((l) => l.label.startsWith("Simulateurs"))!;
    expect(simulateurs.valeurs[0]).toBe(NIVEAU_GRATUIT >= 2 ? "Avancés" : "Base");
    const rapports = lignesMatrice().find((l) => l.label.startsWith("Rapports et export CSV"))!;
    expect(rapports.valeurs[0]).toBe("✓");
  });
});
