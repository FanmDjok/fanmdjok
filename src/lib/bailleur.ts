import { useState } from "react";

export interface Bailleur { nom: string; adresse: string; ville: string }
const KEY = "kazonly.bailleur";
const read = (): Bailleur => { try { return { nom: "", adresse: "", ville: "", ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { nom: "", adresse: "", ville: "" }; } };

/** Identité du bailleur, gardée sur cet appareil (navigateur) uniquement. */
export function useBailleur(): [Bailleur, (b: Bailleur) => void] {
  const [b, setB] = useState<Bailleur>(read);
  return [b, (n) => { setB(n); try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* stockage indisponible */ } }];
}
