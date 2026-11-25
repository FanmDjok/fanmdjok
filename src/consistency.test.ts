import { describe, expect, it } from "vitest";
import fs from "node:fs";
import plans from "../shared/plans.json";
import territories from "../shared/territories.json";
import { TERRITORIES } from "./lib/territories";

describe("cohérence des sources partagées", () => {
  it("les limites de plans.json correspondent au SQL", () => {
    const sql = fs.readFileSync("supabase/migrations/0005_plans_v2.sql", "utf8");
    for (const p of plans.plans) {
      expect(sql).toMatch(new RegExp(`'${p.id}'\\s+then\\s+${p.maxProperties}\\b`));
    }
    expect(sql).toMatch(new RegExp(`else ${plans.free.maxProperties} end`));
  });
  it("territories.json correspond à src/lib/territories.ts", () => {
    const app = JSON.stringify(TERRITORIES).toLowerCase();
    for (const t of territories) {
      expect(app).toContain(t.label.toLowerCase());
    }
    expect(territories).toHaveLength(Object.keys(TERRITORIES).length || (TERRITORIES as any).length);
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
