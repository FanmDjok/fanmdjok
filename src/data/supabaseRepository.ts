import { supabase } from "../lib/supabase";
import type { Expense, Finance, Payment, Property, Repository } from "./types";

const db = () => { if (!supabase) throw new Error("Supabase non configuré"); return supabase; };
const check = <T,>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const num = (v: any): number | undefined => (v == null ? undefined : Number(v));
const FIN: [keyof Finance, string][] = [
  ["prixAchat", "prix_achat"], ["valeurActuelle", "valeur_actuelle"], ["capitalRestant", "capital_restant"],
  ["mensualite", "mensualite"], ["tauxCredit", "taux_credit"], ["dureeRestanteMois", "duree_restante_mois"],
  ["taxeFonciere", "taxe_fonciere"], ["assurance", "assurance"], ["chargesCopro", "charges_copro"], ["entretien", "entretien"],
];
const toFinance = (r: any): Finance => Object.fromEntries(FIN.map(([k, c]) => [k, num(r[c])]).filter(([, v]) => v !== undefined));
const fromFinance = (f: Finance = {}) => Object.fromEntries(FIN.map(([k, c]) => [c, f[k] ?? null]));
const toProperty = (r: any): Property => ({
  id: r.id, name: r.name, numero: r.numero, rue: r.rue, codePostal: r.code_postal, territoire: r.territoire,
  currency: r.currency, typeLocation: r.type_location, loyer: Number(r.loyer),
  tauxOccupation: r.taux_occupation == null ? undefined : Number(r.taux_occupation),
  locataireNom: r.locataire_nom ?? undefined, locatairePhone: r.locataire_phone ?? undefined, actif: r.actif, finance: toFinance(r),
});
const fromProperty = (p: Property) => ({
  id: p.id, name: p.name, numero: p.numero, rue: p.rue, code_postal: p.codePostal, territoire: p.territoire,
  currency: p.currency, type_location: p.typeLocation, loyer: p.loyer, taux_occupation: p.tauxOccupation ?? null,
  locataire_nom: p.locataireNom ?? null, locataire_phone: p.locatairePhone ?? null, actif: p.actif, ...fromFinance(p.finance),
});
const toPayment = (r: any): Payment => ({ id: r.id, propertyId: r.property_id, month: r.month, amount: Number(r.amount), status: r.status });
const toExpense = (r: any): Expense => ({ id: r.id, propertyId: r.property_id, month: r.month, amount: Number(r.amount), category: r.category, note: r.note ?? undefined });

export const supabaseRepository: Repository = {
  async listProperties() { return check(await db().from("properties").select("*").order("created_at")).map(toProperty); },
  async saveProperty(p) { check(await db().from("properties").upsert(fromProperty(p))); },
  async listPayments() { return check(await db().from("payments").select("*").order("created_at")).map(toPayment); },
  async savePayment(p) { check(await db().from("payments").upsert({ id: p.id, property_id: p.propertyId, month: p.month, amount: p.amount, status: p.status })); },
  async listExpenses() { return check(await db().from("expenses").select("*").order("created_at")).map(toExpense); },
  async saveExpense(e) { check(await db().from("expenses").upsert({ id: e.id, property_id: e.propertyId, month: e.month, amount: e.amount, category: e.category, note: e.note ?? null })); },
};
