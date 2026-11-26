import { getCountryCallingCode, getExampleNumber, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/max";
import examples from "libphonenumber-js/mobile/examples";

/** Pays de référence de chaque territoire (métadonnées officielles libphonenumber). */
export const PAYS_TERRITOIRE: Record<string, CountryCode> = {
  martinique: "MQ",
  guadeloupe: "GP",
  "saint-martin": "MF",
  "saint-barthelemy": "BL",
  guyane: "GF",
  reunion: "RE",
  mayotte: "YT",
  spm: "PM",
  "nouvelle-caledonie": "NC",
  polynesie: "PF",
  "wallis-futuna": "WF",
};

const paysDe = (territoireId: string): CountryCode => {
  const pays = PAYS_TERRITOIRE[territoireId];
  if (!pays) throw new Error(`Territoire sans pays de référence : ${territoireId}`);
  return pays;
};

/** Indicatif du territoire, par exemple « +596 » pour la Martinique. */
export const indicatifTerritoire = (territoireId: string): string => `+${getCountryCallingCode(paysDe(territoireId))}`;

/** Exemple de mobile au format national du territoire, pour l'aide à la saisie (jamais un vrai numéro). */
export const exempleTelephone = (territoireId: string): string =>
  getExampleNumber(paysDe(territoireId), examples)?.formatNational() ?? "";

export type ResultatTelephone = { ok: true; e164: string | null } | { ok: false; message: string };

/**
 * Valide la saisie d'un téléphone de locataire.
 * - Vide : accepté (champ facultatif), sans numéro enregistré.
 * - Format national du territoire, ou international avec « + » (un locataire peut avoir un numéro de métropole).
 * - Retour au format E.164 pour le stockage.
 */
export function normaliserTelephone(saisie: string, territoireId: string): ResultatTelephone {
  const brut = saisie.trim();
  if (!brut) return { ok: true, e164: null };
  const numero = parsePhoneNumberFromString(brut, paysDe(territoireId));
  if (!numero || !numero.isValid()) {
    return { ok: false, message: `Ce numéro n'est pas valide. Exemple pour ce territoire : ${exempleTelephone(territoireId)}, ou un numéro commençant par + et l'indicatif du pays.` };
  }
  return { ok: true, e164: numero.number };
}
