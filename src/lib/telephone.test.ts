import { describe, expect, it } from "vitest";
import { PAYS_TERRITOIRE, exempleTelephone, indicatifTerritoire, normaliserTelephone } from "./telephone";

const ATTENDUS: Record<string, string> = {
  martinique: "+596",
  guadeloupe: "+590",
  "saint-martin": "+590",
  "saint-barthelemy": "+590",
  guyane: "+594",
  reunion: "+262",
  mayotte: "+262",
  spm: "+508",
  "nouvelle-caledonie": "+687",
  polynesie: "+689",
  "wallis-futuna": "+681",
};

describe("téléphone par territoire", () => {
  it("couvre les 11 territoires avec le bon indicatif", () => {
    expect(Object.keys(PAYS_TERRITOIRE)).toHaveLength(11);
    for (const [id, indicatif] of Object.entries(ATTENDUS)) {
      expect(indicatifTerritoire(id), id).toBe(indicatif);
    }
  });

  for (const id of Object.keys(ATTENDUS)) {
    it(`${id} : un exemple valide est accepté, un numéro invalide est refusé`, () => {
      const exemple = exempleTelephone(id);
      expect(exemple, id).not.toBe("");
      const ok = normaliserTelephone(exemple, id);
      expect(ok.ok, id).toBe(true);
      if (ok.ok) expect(ok.e164, id).toMatch(new RegExp(`^\\${ATTENDUS[id]}\\d+$`));
      expect(normaliserTelephone("0000", id).ok, id).toBe(false);
    });
  }

  it("accepte un numéro de métropole saisi avec +33", () => {
    const r = normaliserTelephone("+33 6 12 34 56 78", "martinique");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.e164).toBe("+33612345678");
  });

  it("un champ vide est accepté sans numéro", () => {
    expect(normaliserTelephone("   ", "reunion")).toEqual({ ok: true, e164: null });
  });

  it("un exemple martiniquais n'est jamais proposé pour La Réunion", () => {
    expect(exempleTelephone("reunion")).not.toBe(exempleTelephone("martinique"));
    expect(indicatifTerritoire("reunion")).toBe("+262");
  });
});
