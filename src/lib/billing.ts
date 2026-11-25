import plans from "../../shared/plans.json";
import { supabase } from "./supabase";

export type PlanId = "essentiel" | "proprietaire" | "investisseur";
export type Interval = "month" | "year";

export const PLANS = plans.plans;
export const ANNUAL_MONTHS_FREE = plans.annualMonthsFree;
/** Montant en euros à la française : 115,20 ou 29. */
export const eur = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ","));
export type Currency = "EUR" | "XPF";
/** Montant XPF sans décimale, séparateur de milliers espace : 1 400. */
export const xpf = (n: number) => n.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ");
export const planAmount = (p: (typeof plans.plans)[number], interval: Interval, cur: Currency): string =>
  cur === "XPF" ? `${xpf(interval === "month" ? p.xpf.monthly : p.xpf.yearly)} XPF` : `${eur(interval === "month" ? p.monthly : p.yearly)} €`;
export const TRIAL_DAYS = plans.trialDays;
export const FREE_PLAN = plans.free;

export interface Subscription {
  plan: PlanId;
  status: string;
  trialEnd: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export const ACTIVE = ["trialing", "active", "past_due"];

export const planById = (id: string) => PLANS.find((p) => p.id === id);
export const isValidPlan = (id: string | null): id is PlanId => PLANS.some((p) => p.id === id);

export const priceLabel = (planId: PlanId, interval: Interval, cur: Currency = "EUR"): string => {
  const p = planById(planId)!;
  return `${planAmount(p, interval, cur)}${interval === "month" ? "/mois" : "/an"}`;
};

/** Nombre de biens autorisé : celui de la formule active, sinon celui de la formule gratuite. */
export const propertyLimit = (sub: Subscription | null): number =>
  sub && ACTIVE.includes(sub.status) ? planById(sub.plan)?.maxProperties ?? FREE_PLAN.maxProperties : FREE_PLAN.maxProperties;

export async function fetchSubscription(): Promise<Subscription | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan_code,statut,essai_fin,periode_fin,cancel_at_period_end")
    .maybeSingle();
  // Formule Gratuite (ligne créée à l'inscription) : pas d'abonnement à gérer.
  if (error || !data || data.plan_code === "gratuit") return null;
  return {
    plan: data.plan_code as PlanId, status: data.statut, trialEnd: data.essai_fin,
    currentPeriodEnd: data.periode_fin, cancelAtPeriodEnd: data.cancel_at_period_end,
  };
}

type PostResult = { url?: string; error?: string; ok?: boolean; fin?: string; rembourse_centimes?: number };
async function post(path: string, body?: unknown): Promise<PostResult> {
  if (!supabase) return { error: "non_configure" };
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return { error: "non_authentifie" };
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    return await res.json();
  } catch {
    return { error: "reseau" };
  }
}

export const startCheckout = (plan: PlanId, interval: Interval, currency: Currency = "EUR", startNow = false) =>
  post("/api/create-checkout", { plan, interval, currency, startNow });
export const resilier = () => post("/api/resiliation", { action: "resilier" });
export const retracter = () => post("/api/resiliation", { action: "retracter" });
export const openPortal = () => post("/api/customer-portal");

export const errorMessage = (code?: string): string => {
  switch (code) {
    case "abonnement_existant": return "Vous avez déjà un abonnement : gérez-le depuis « Mon abonnement ».";
    case "formule_invalide": return "Cette formule n'est pas disponible pour le moment.";
    case "aucun_abonnement": return "Aucun abonnement à gérer pour l'instant.";
    case "consentement_requis": return "Cochez la case pour commencer tout de suite, puis réessayez.";
    case "delai_depasse": return "Le délai de rétractation de 14 jours est dépassé. Vous pouvez résilier votre abonnement.";
    case "reseau": return "Connexion impossible. Vérifiez votre réseau et réessayez.";
    default: return "Une erreur est survenue. Réessayez dans un instant.";
  }
};

/** Profondeur des analyses : 1 Essentiel, 2 Propriétaire, 3 Portefeuille (3 hors ligne). */
export const analysisLevel = (sub?: Subscription | null): 1 | 2 | 3 =>
  !sub ? 3 : sub.plan === "investisseur" ? 3 : sub.plan === "proprietaire" ? 2 : 1;
