import Stripe from "stripe";
import { admin, bindEnv, env, json, planFromPriceId, statutLocal, stripe, type Env } from "../server/lib";

const iso = (ts: number | null | undefined) => (ts ? new Date(ts * 1000).toISOString() : null);

/** Recopie l'état de l'abonnement Stripe dans la ligne de l'utilisateur. Idempotent : même état, même résultat. */
async function syncSubscription(sub: Stripe.Subscription): Promise<void> {
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
  const deleted = sub.status === "canceled";

  const { error } = await admin().from("subscriptions").upsert({
    user_id: userId,
    plan_code: deleted ? "gratuit" : found.plan,
    periodicite: found.interval === "month" ? "mensuel" : "annuel",
    statut: statutLocal(sub.status),
    stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    stripe_subscription_id: sub.id,
    essai_fin: iso(sub.trial_end),
    periode_fin: iso(periodEnd),
    cancel_at_period_end: sub.cancel_at_period_end,
  }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
}

async function handle(req: Request): Promise<Response> {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "signature_absente" }, 400);

  const raw = await req.text();
  const s = stripe();
  let event: Stripe.Event;
  try {
    // Version asynchrone : indispensable dans un environnement Workers (WebCrypto).
    event = await s.webhooks.constructEventAsync(raw, signature, env("STRIPE_WEBHOOK_SECRET"), undefined, Stripe.createSubtleCryptoProvider());
  } catch {
    return json({ error: "signature_invalide" }, 400);
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
    // Stripe rejouera l'événement : on signale l'échec plutôt que de le perdre.
    console.error("Erreur webhook", event.type, e);
    return json({ error: "traitement_echoue" }, 500);
  }

  return json({ received: true });
}

export const config = { runtime: "edge" };

export default async function handler(request: Request): Promise<Response> {
  bindEnv(process.env as Env);
  return handle(request);
}
