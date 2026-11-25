import { describe, expect, it } from "vitest";
import { compareRegimes, hasLocalCode } from "./fiscalite";
import { internationalPhone, lateItems, relanceMessage } from "./relances";
import type { Payment, Property } from "../data/types";

const prop = (o: Partial<Property> = {}): Property => ({ id: "a", name: "T2", numero: "1", rue: "r", codePostal: "97200", territoire: "martinique", currency: "EUR", typeLocation: "nue", loyer: 600, actif: true, ...o });

describe("fiscalité", () => {
  it("micro-foncier : 30 % d'abattement", () => {
    const r = compareRegimes({ type: "nue", recettes: 10000, charges: 0, interets: 0, tmi: 30, ps: 17.2 });
    expect(r.baseMicro).toBe(7000); expect(r.best).toBe("micro");
  });
  it("réel préféré si les charges dépassent l'abattement", () => {
    const r = compareRegimes({ type: "nue", recettes: 10000, charges: 5000, interets: 0, tmi: 30, ps: 17.2 });
    expect(r.best).toBe("reel"); expect(r.base).toBe(5000);
  });
  it("micro non éligible au-delà du plafond", () => {
    expect(compareRegimes({ type: "nue", recettes: 20000, charges: 0, interets: 0, tmi: 11, ps: 17.2 }).microEligible).toBe(false);
  });
  it("les COM ont leur propre code", () => { expect(hasLocalCode("nouvelle-caledonie")).toBe(true); expect(hasLocalCode("martinique")).toBe(false); });
});

describe("relances", () => {
  const pay = (month: string, status: Payment["status"]): Payment => ({ id: month, propertyId: "a", month, amount: 600, status });
  it("détecte retards explicites et attentes dépassées", () => {
    const l = lateItems([prop()], [pay("2026-09", "attente"), pay("2026-10", "retard"), pay("2026-11", "attente"), pay("2026-08", "recu")], "2026-11");
    expect(l.map((x) => [x.payment.month, x.level])).toEqual([["2026-09", 3], ["2026-10", 2]]);
  });
  it("message dans la devise du bien", () => {
    const [i] = lateItems([prop({ currency: "XPF", territoire: "nouvelle-caledonie", loyer: 90000, locataireNom: "M. Kaï" })], [{ ...pay("2026-10", "retard"), amount: 90000 }], "2026-11");
    expect(relanceMessage(i, "Dru")).toContain("90 000 XPF");
  });
  it("numéro international", () => {
    expect(internationalPhone("06 96 12 34 56", "martinique")).toBe("596696123456");
    expect(internationalPhone("+687 75 12 34", "nouvelle-caledonie")).toBe("687751234");
  });
});

import { currentMonth } from "./period";
describe("période", () => {
  it("utilise la date locale, pas UTC", () => expect(currentMonth(new Date(2026, 9, 31, 23, 30))).toBe("2026-10"));
});
