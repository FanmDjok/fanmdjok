import { describe, expect, it } from "vitest";
import { aalDuJeton, jetonDuRequete } from "./aal";
import { modeStripe } from "../functions/api/admin-config";

const jeton = (charge: object) => `en-tete.${btoa(JSON.stringify(charge)).replace(/=+$/, "")}.signature`;

describe("niveau de confiance et mode Stripe (carte de configuration)", () => {
  it("lit aal depuis le jeton", () => {
    expect(aalDuJeton(jeton({ aal: "aal2", sub: "x" }))).toBe("aal2");
    expect(aalDuJeton(jeton({ aal: "aal1" }))).toBe("aal1");
    expect(aalDuJeton("n-importe-quoi")).toBe("");
  });
  it("extrait le jeton de l'en-tête Authorization", () => {
    const r = new Request("https://kazonly.test/api/admin-config", { headers: { authorization: "Bearer abc.def.ghi" } });
    expect(jetonDuRequete(r)).toBe("abc.def.ghi");
  });
  it("détecte le mode Stripe sans jamais exposer la clé", () => {
    expect(modeStripe("sk_test_123")).toBe("test");
    expect(modeStripe("sk_live_123")).toBe("reel");
    expect(modeStripe(undefined)).toBe("absent");
    expect(modeStripe("")).toBe("absent");
  });
});
