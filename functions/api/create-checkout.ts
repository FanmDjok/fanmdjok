import { admin, bindEnv, json, priceIdFor, readBounded, requireUser, siteUrl, stripe, type Env } from "../../server/lib";
import { paramsSessionCheckout } from "../../server/checkout";


async function handle(req: Request, ENV: Env): Promise<Response> {
  // CHECKOUT_MODE=api (défaut) : page de paiement Stripe hébergée. Toute autre valeur est refusée.
  if ((ENV.CHECKOUT_MODE ?? "api") !== "api") return json({ error: "mode_indisponible" }, 503);

  const user = await requireUser(req);
  if (!user || !user.email) return json({ error: "non_authentifie" }, 401);

  const raw = await readBounded(req, 2048);
  if (raw === null) return json({ error: "requete_trop_grande" }, 413);
  let body: { plan?: string; interval?: string; currency?: string; startNow?: boolean };
  try { body = JSON.parse(raw); } catch { return json({ error: "requete_invalide" }, 400); }
  // Consentement exprès à commencer tout de suite (non pré-coché côté interface) : sans lui, pas de souscription.
  if (body.startNow !== true) return json({ error: "consentement_requis" }, 400);

  const plan = String(body.plan);
  const interval = body.interval === "year" ? "year" : "month";
  const currency = body.currency === "XPF" ? "XPF" : "EUR";
  const price = priceIdFor(plan, interval, currency);
  if (!price) return json({ error: "formule_invalide" }, 400);

  const db = admin();
  const s = stripe();

  // Une ligne par utilisateur (créée à l'inscription, formule Gratuite par défaut).
  const { data: sub } = await db
    .from("subscriptions")
    .select("plan_code, statut, stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Déjà abonné : on envoie vers le portail client Stripe (changement de formule), jamais vers un second abonnement.
  const actif = sub && sub.plan_code !== "gratuit" && ["trialing", "active", "past_due"].includes(sub.statut);
  if (actif && sub.stripe_customer_id) {
    const portail = await s.billingPortal.sessions.create({
      customer: sub.stripe_customer_id as string,
      return_url: `${siteUrl()}/app/`,
    });
    return json({ url: portail.url, portail: true });
  }

  // Client Stripe réutilisé s'il existe. Stripe n'accepte pas customer et customer_email dans la même session :
  // l'e-mail est donc porté par le client Stripe créé à la première souscription.
  let customerId = sub?.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    const customer = await s.customers.create({ email: user.email, metadata: { user_id: user.id } });
    customerId = customer.id;
    await db.from("subscriptions").upsert({ user_id: user.id, stripe_customer_id: customerId }, { onConflict: "user_id" });
  }

  const session = await s.checkout.sessions.create(paramsSessionCheckout({
    userId: user.id, customer: customerId, price, plan, interval, currency, base: siteUrl(),
  }));

  return json({ url: session.url });
}

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  bindEnv(ctx.env);
  return handle(ctx.request, ctx.env);
}
