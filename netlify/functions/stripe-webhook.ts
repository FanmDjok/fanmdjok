import type { Config } from "@netlify/functions";
import type Stripe from "stripe";
import { admin, env, json, planFromPriceId, stripe } from "./_lib";

const iso = (ts: number | null | undefined) => (ts ? new Date(ts * 1000).toISOString() : null);

async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
  const db = admin();
  const userId = sub.metadata?.user_id;
  if (!userId) return;

  const item = sub.items.data[0];
  const found = item ? planFromPriceId(item.price.id) : null;
  if (!found) {
    console.error("Prix Stripe inconnu pour l'abonnement", sub.id);
    return;
  }

  const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end
    ?? (item as unknown as { current_period_end?: number } | undefined)?.current_period_end;

  await db.from("subscriptions").upsert({
    user_id: userId,
    stripe_subscription_id: sub.id,
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    plan: found.plan,
    billing_interval: found.interval,
    status: sub.status,
    trial_end: iso(sub.trial_end),
    current_period_end: iso(periodEnd),
    cancel_at_period_end: sub.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  });

  // L'essai gratuit est consommé dès qu'un abonnement avec essai a existé.
  if (sub.trial_end) {
    await db.from("billing_customers").update({ trial_used: true }).eq("user_id", userId);
  }
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "signature_absente" }, 400);

  const raw = await req.text();
  const s = stripe();
  let event: Stripe.Event;
  try {
    event = s.webhooks.constructEvent(raw, signature, env("STRIPE_WEBHOOK_SECRET"));
  } catch {
    return json({ error: "signature_invalide" }, 400);
  }

  const db = admin();
  // Idempotence : un événement n'est traité qu'une fois.
  const { error: dup } = await db.from("stripe_events").insert({ id: event.id, type: event.type });
  if (dup) {
    return json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && typeof session.subscription === "string") {
          await syncSubscription(await s.subscriptions.retrieve(session.subscription));
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    // On libère l'événement pour que Stripe puisse le rejouer.
    await db.from("stripe_events").delete().eq("id", event.id);
    console.error("Erreur webhook", event.type, e);
    return json({ error: "traitement_echoue" }, 500);
  }

  return json({ received: true });
};

export const config: Config = { path: "/api/stripe-webhook" };
