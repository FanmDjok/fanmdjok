import type { Currency, TypeLocation } from "../lib/territories";

/** Données financières optionnelles, dans la devise du bien. */
export interface Finance {
  prixAchat?: number;
  valeurActuelle?: number;
  capitalRestant?: number; // capital restant dû du prêt
  mensualite?: number; // mensualité du prêt
  tauxCredit?: number; // % annuel
  dureeRestanteMois?: number;
  taxeFonciere?: number; // par an
  assurance?: number; // par an
  chargesCopro?: number; // par an
  entretien?: number; // par an
}

export interface Property {
  id: string;
  name: string;
  numero: string;
  rue: string;
  codePostal: string;
  territoire: string;
  currency: Currency; // dérivée du territoire, jamais saisie
  typeLocation: TypeLocation;
  loyer: number; // loyer mensuel, ou tarif par nuit si meublé de tourisme
  tauxOccupation?: number; // % (meublés de tourisme)
  locataireNom?: string;
  locatairePhone?: string;
  actif: boolean;
  finance?: Finance;
}

export type PaymentStatus = "attente" | "recu" | "retard";
export interface Payment {
  id: string;
  propertyId: string;
  month: string; // YYYY-MM
  amount: number;
  status: PaymentStatus;
}

export interface Expense {
  id: string;
  propertyId: string;
  month: string; // YYYY-MM
  amount: number;
  category: string;
  note?: string;
}

/** Interface d'accès aux données : implémentable avec localStorage, Supabase, Postgres... */
export interface Repository {
  listProperties(): Promise<Property[]>;
  saveProperty(p: Property): Promise<void>;
  listPayments(): Promise<Payment[]>;
  savePayment(p: Payment): Promise<void>;
  listExpenses(): Promise<Expense[]>;
  saveExpense(e: Expense): Promise<void>;
}
