import type { Config } from "@netlify/functions";
import { admin, json, priceIdFor, requireUser, siteUrl, stripe } from "./_lib";
import plans from "../../shared/plans.json";

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const user = await requireUser(req);
  if (!user || !user.email) return json({ error: "non_authentifie" }, 401);

  let body: { plan?: string; interval?: string; currency?: string };
  try { body = await req.json(); } catch { return json({ error: "requete_invalide" }, 400); }

  const price = priceIdFor(String(body.plan), String(body.interval), body.currency === "XPF" ? "XPF" : "EUR");
  if (!price) return json({ error: "formule_invalide" }, 400);

  const db = admin();
  const s = stripe();

  // Un abonnement déjà actif ? On renvoie vers le portail plutôt que d'en créer un second.
  const { data: existing } = await db.from("subscriptions").select("status").eq("user_id", user.id).maybeSingle();
  if (existing && ["trialing", "active", "past_due"].includes(existing.status)) {
    return json({ error: "abonnement_existant" }, 409);
  }

  // Client Stripe unique par utilisateur
  const { data: bc } = await db.from("billing_customers").select("stripe_customer_id, trial_used").eq("user_id", user.id).maybeSingle();
  let customerId = bc?.stripe_customer_id as string | undefined;
  const trialUsed = Boolean(bc?.trial_used);
  if (!customerId) {
    const customer = await s.customers.create({ email: user.email, metadata: { user_id: user.id } });
    customerId = customer.id;
    await db.from("billing_customers").insert({ user_id: user.id, stripe_customer_id: customerId });
  }

  const base = siteUrl();
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    locale: "fr",
    allow_promotion_codes: true,
    payment_method_collection: "always",
    client_reference_id: user.id,
    metadata: { user_id: user.id },
    subscription_data: {
      metadata: { user_id: user.id },
      // Un seul essai par utilisateur
      ...(trialUsed ? {} : {
        trial_period_days: plans.trialDays,
        trial_settings: { end_behavior: { missing_payment_method: "cancel" } },
      }),
    },
    success_url: `${base}/app/?abonnement=ok`,
    cancel_url: `${base}/app/?abonnement=annule`,
  });

  return json({ url: session.url });
};

export const config: Config = { path: "/api/create-checkout" };
