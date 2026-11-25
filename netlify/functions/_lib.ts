import Stripe from "stripe";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import plans from "../../shared/plans.json";

export type PlanId = "essentiel" | "proprietaire" | "portefeuille";
export type Interval = "month" | "year";

const PLAN_IDS = plans.plans.map((p) => p.id) as PlanId[];

export const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

export const env = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`Variable d'environnement manquante : ${key}`);
  return v;
};

export const stripe = (): Stripe => new Stripe(env("STRIPE_SECRET_KEY"));

export const admin = (): SupabaseClient =>
  createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

export const siteUrl = (): string => (process.env.SITE_URL || process.env.URL || "").replace(/\/$/, "");

/** Liste blanche : l'identifiant de prix ne vient jamais du navigateur. */
export function priceIdFor(plan: string, interval: string, currency = "EUR"): string | null {
  if (!PLAN_IDS.includes(plan as PlanId) || (interval !== "month" && interval !== "year")) return null;
  if (currency !== "EUR" && currency !== "XPF") return null;
  const key = `STRIPE_PRICE_${plan.toUpperCase()}_${interval === "month" ? "MONTHLY" : "YEARLY"}${currency === "XPF" ? "_XPF" : ""}`;
  return process.env[key] || null;
}

/** Retrouve la formule à partir d'un identifiant de prix Stripe. */
export function planFromPriceId(priceId: string): { plan: PlanId; interval: Interval } | null {
  for (const plan of PLAN_IDS) {
    for (const interval of ["month", "year"] as const) {
      if (priceIdFor(plan, interval) === priceId || priceIdFor(plan, interval, "XPF") === priceId) return { plan, interval };
    }
  }
  return null;
}

/** Valide le jeton de session Supabase envoyé par l'application. */
export async function requireUser(req: Request): Promise<User | null> {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  return error || !data.user ? null : data.user;
}

export const ACTIVE_STATUSES = ["trialing", "active", "past_due"];
