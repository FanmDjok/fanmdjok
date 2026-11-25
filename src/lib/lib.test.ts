import { describe, expect, it } from "vitest";
import { getTerritory, validatePostalCode, TERRITORIES } from "./territories";
import { formatMoney, sumByCurrency } from "./money";

describe("territoires", () => {
  it("dérive la devise du territoire", () => {
    expect(getTerritory("martinique").currency).toBe("EUR");
    expect(getTerritory("nouvelle-caledonie").currency).toBe("XPF");
    expect(getTerritory("polynesie").currency).toBe("XPF");
    expect(getTerritory("wallis-futuna").currency).toBe("XPF");
    expect(getTerritory("spm").currency).toBe("EUR");
  });
  it("couvre 11 territoires", () => expect(TERRITORIES).toHaveLength(11));
  it("valide les codes postaux", () => {
    expect(validatePostalCode("martinique", "97200")).toBeNull();
    expect(validatePostalCode("martinique", "97100")).toMatch(/972/);
    expect(validatePostalCode("saint-martin", "97150")).toBeNull();
    expect(validatePostalCode("saint-barthelemy", "97133")).toBeNull();
    expect(validatePostalCode("polynesie", "9871")).toMatch(/5 chiffres/);
  });
});

describe("monnaie", () => {
  it("formate sans centimes en XPF", () => expect(formatMoney(95000, "XPF")).toBe("95 000 XPF"));
  it("formate avec centimes en EUR", () => expect(formatMoney(850, "EUR")).toBe("850,00 €"));
  it("ne mélange pas les devises", () => {
    const t = sumByCurrency([{ a: 100, c: "EUR" as const }, { a: 5000, c: "XPF" as const }, { a: 50, c: "EUR" as const }], (x) => ({ amount: x.a, currency: x.c }));
    expect(t).toEqual({ EUR: 150, XPF: 5000 });
  });
});
