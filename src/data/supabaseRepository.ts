import { supabase } from "../lib/supabase";
import { TERRITORIES } from "../lib/territories";
import type { Currency } from "../lib/territories";
import type { Expense, Finance, Payment, Property, Repository } from "./types";

// Schéma réel : biens (propriétés), mouvements (loyers et dépenses), protégés par RLS (owner_id = auth.uid()).
const db = () => { if (!supabase) throw new Error("Supabase non configuré"); return supabase; };
const check = <T,>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
const monthStart = (month: string) => `${month}-01`;
const monthOf = (date: string) => String(date).slice(0, 7);
const currencyOf = (territoire: string): Currency => TERRITORIES.find((t) => t.id === territoire)?.currency ?? "EUR";

/** Libellés de l'application -> catégories enregistrées en base. Le libellé exact est conservé dans `libelle`. */
const CATEGORIE_DB: Record<string, string> = {
  "Réparations": "travaux",
  "Entretien courant": "entretien",
  "Nettoyage": "entretien",
  "Publicité / annonces": "frais_gestion",
  "Impôts et taxes": "taxe_fonciere",
  "Assurance": "assurance",
  "Autre": "autre",
};

const toProperty = (r: any): Property => ({
  id: r.id,
  name: r.nom,
  numero: r.numero ?? "",
  rue: r.rue ?? r.adresse ?? "",
  codePostal: r.code_postal ?? "",
  territoire: r.territoire,
  currency: currencyOf(r.territoire),
  typeLocation: r.type_location,
  loyer: Number(r.loyer),
  tauxOccupation: r.taux_occupation == null ? undefined : Number(r.taux_occupation),
  locataireNom: r.locataire_nom ?? undefined,
  locatairePhone: r.locataire_telephone ?? undefined,
  actif: r.actif,
  finance: (r.finance ?? {}) as Finance,
});

const fromProperty = (p: Property) => ({
  id: p.id,
  nom: p.name,
  numero: p.numero || null,
  rue: p.rue || null,
  adresse: `${p.numero} ${p.rue}`.trim() || null,
  code_postal: p.codePostal || null,
  territoire: p.territoire,
  type_location: p.typeLocation,
  loyer: p.loyer,
  taux_occupation: p.tauxOccupation ?? null,
  locataire_nom: p.locataireNom ?? null,
  locataire_telephone: p.locatairePhone ?? null,
  actif: p.actif,
  finance: p.finance ?? {},
});

const toPayment = (r: any): Payment => ({
  id: r.id,
  propertyId: r.bien_id,
  month: monthOf(r.date_operation),
  amount: Number(r.montant),
  status: r.statut_paiement ?? (r.statut === "realise" ? "recu" : "attente"),
});

const fromPayment = (p: Payment) => ({
  id: p.id,
  bien_id: p.propertyId,
  sens: "recette",
  categorie: "loyer",
  libelle: `Loyer ${p.month}`,
  montant: p.amount,
  date_operation: monthStart(p.month),
  statut: p.status === "recu" ? "realise" : "prevu",
  statut_paiement: p.status,
});

const toExpense = (r: any): Expense => {
  const [category, ...note] = String(r.libelle ?? "Autre").split(" — ");
  return {
    id: r.id,
    propertyId: r.bien_id,
    month: monthOf(r.date_operation),
    amount: Number(r.montant),
    category,
    note: note.length ? note.join(" — ") : undefined,
  };
};

const fromExpense = (e: Expense) => ({
  id: e.id,
  bien_id: e.propertyId,
  sens: "depense",
  categorie: CATEGORIE_DB[e.category] ?? "autre",
  libelle: e.note ? `${e.category} — ${e.note}` : e.category,
  montant: e.amount,
  date_operation: monthStart(e.month),
  statut: "realise",
});

export const supabaseRepository: Repository = {
  async listProperties() {
    return check(await db().from("biens").select("*").order("created_at")).map(toProperty);
  },
  async saveProperty(p) {
    check(await db().from("biens").upsert(fromProperty(p), { onConflict: "id" }));
  },
  async listPayments() {
    return check(await db().from("mouvements").select("*").eq("sens", "recette").eq("categorie", "loyer").order("created_at")).map(toPayment);
  },
  async savePayment(p) {
    check(await db().from("mouvements").upsert(fromPayment(p), { onConflict: "id" }));
  },
  async listExpenses() {
    return check(await db().from("mouvements").select("*").eq("sens", "depense").order("created_at")).map(toExpense);
  },
  async saveExpense(e) {
    check(await db().from("mouvements").upsert(fromExpense(e), { onConflict: "id" }));
  },
};
