import { describe, expect, it } from "vitest";
import fs from "node:fs";
import plans from "../shared/plans.json";
import territories from "../shared/territories.json";
import { TERRITORIES } from "./lib/territories";

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
});
