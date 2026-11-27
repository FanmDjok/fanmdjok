import Stripe from "stripe";
import { admin, bindEnv, env, json, planFromPriceId, readBounded, siteUrl, statutLocal, stripe, type Env } from "../../server/lib";
import { hacheEmail } from "../../server/essai";

const iso = (ts: number | null | undefined) => (ts ? new Date(ts * 1000).toISOString() : null);

/** Recopie l'état de l'abonnement Stripe dans la ligne de l'utilisateur. Idempotent : même état, même résultat. */
async function syncSubscription(sub: Stripe.Subscription, userIdHint?: string | null): Promise<"ok" | "a_rattacher"> {
  const userId = sub.metadata?.user_id || userIdHint || null;
  const item = sub.items.data[0];
  const found = item ? planFromPriceId(item.price.id) : null;
  if (!found) {
    console.error("Prix Stripe inconnu pour l'abonnement", sub.id);
    return "ok";
  }
  if (!userId) {
    // Aucun utilisateur reconnu : on ne perd pas le paiement, on le signale pour rattachement manuel.
    await admin().from("paiements_a_rattacher").upsert({
      stripe_subscription_id: sub.id,
      stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      plan: found.plan,
      periodicite: found.interval === "month" ? "mensuel" : "annuel",
      devise: item?.price.currency ?? null,
    }, { onConflict: "stripe_subscription_id" });
    return "a_rattacher";
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
  return "ok";
}

/** Retrouve l'abonnement d'une facture (paiement réussi ou échoué) et recopie son état. */
async function syncDepuisFacture(invoice: Stripe.Invoice): Promise<void> {
  const sousAbo = (invoice as unknown as { subscription?: string | Stripe.Subscription | null }).subscription;
  if (!sousAbo) return;
  const id = typeof sousAbo === "string" ? sousAbo : sousAbo.id;
  await syncSubscription(await stripe().subscriptions.retrieve(id));
}

/**
 * Checkout terminé. Qui est le client ?
 * 1) identifiant Supabase transmis (achat connecté) ; 2) compte existant pour l'e-mail ;
 * 3) sinon création du compte par invitation (lien pour choisir son mot de passe), puis rattachement.
 */
async function traiterCheckout(session: Stripe.Checkout.Session): Promise<void> {
  if (session.mode !== "subscription" || typeof session.subscription !== "string") return;
  const s = stripe();
  const abo = await s.subscriptions.retrieve(session.subscription);
  const db = admin();
  const email = session.customer_details?.email ?? null;

  let userId: string | null = null;
  const refUtilisateur = session.client_reference_id && session.client_reference_id !== "sans_compte" ? session.client_reference_id : null;
  userId = refUtilisateur ?? abo.metadata?.user_id ?? null;
  if (!userId && email) {
    const { data } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
    userId = data?.id ?? null;
  }
  if (!userId && email) {
    const { data: invite, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo: `${siteUrl()}/app/` });
    userId = invite?.user?.id ?? null;
    if (!userId && error) {
      // Compte déjà créé entre-temps : on le retrouve par e-mail.
      const { data } = await db.from("profiles").select("id").eq("email", email).maybeSingle();
      userId = data?.id ?? null;
    }
  }

  const resultat = await syncSubscription(abo, userId);
  if (resultat === "a_rattacher") {
    await db.from("paiements_a_rattacher").upsert({
      stripe_session_id: session.id,
      stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
      stripe_subscription_id: abo.id,
      email,
      plan: planFromPriceId(abo.items.data[0]?.price.id ?? "")?.plan ?? null,
      devise: session.currency ?? null,
    }, { onConflict: "stripe_session_id" });
  } else {
    // Rattaché : l'essai est consommé, et l'éventuel signalement « à rattacher » est résolu.
    await db.from("subscriptions").update({ essai_utilise: true }).eq("user_id", userId as string);
    await db.from("paiements_a_rattacher").update({ traite: true }).eq("stripe_subscription_id", abo.id);
  }
}

async function enregistrerRappel(customerId: string, type: string): Promise<void> {
  const client = await stripe().customers.retrieve(customerId);
  if (!client || (client as { deleted?: boolean }).deleted) return;
  const email = (client as Stripe.Customer).email;
  if (!email) return;
  await admin().from("email_log").insert({ type, destinataire_hash: await hacheEmail(email), statut: "a_envoyer" });
}

async function handle(req: Request): Promise<Response> {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "signature_absente" }, 400);

  const raw = await readBounded(req, 1_000_000);
  if (raw === null) return json({ error: "requete_trop_grande" }, 413);
  const s = stripe();
  let event: Stripe.Event;
  try {
    // Version asynchrone : indispensable dans un environnement Workers (WebCrypto).
    event = await s.webhooks.constructEventAsync(raw, signature, env("STRIPE_WEBHOOK_SECRET"), undefined, Stripe.createSubtleCryptoProvider());
  } catch {
    return json({ error: "signature_invalide" }, 400);
  }

  // Idempotence : un événement déjà traité n'est pas rejoué.
  const db = admin();
  const { error: insertError } = await db.from("stripe_events").insert({ id: event.id, type: event.type });
  if (insertError) {
    if ((insertError as { code?: string }).code === "23505") return json({ received: true, deja_traite: true });
    console.error("Enregistrement de l'événement impossible", event.id);
    return json({ error: "traitement_echoue" }, 500);
  }

  try {
    switch (event.type) {
      case "customer.subscription.created": {
        const abo = event.data.object as Stripe.Subscription;
        await syncSubscription(abo);
        // Un abonnement a été créé : l'essai de 14 jours n'est plus accordable pour ce compte.
        if (abo.metadata?.user_id) {
          await admin().from("subscriptions").update({ essai_utilise: true }).eq("user_id", abo.metadata.user_id);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.trial_will_end": {
        // Rappel 3 jours avant le premier débit : on met à jour la fin d'essai et on prépare l'e-mail.
        const abo = event.data.object as Stripe.Subscription;
        await syncSubscription(abo);
        const client = typeof abo.customer === "string" ? abo.customer : abo.customer.id;
        await enregistrerRappel(client, "rappel_fin_essai");
        break;
      }
      case "checkout.session.completed":
        await traiterCheckout(event.data.object as Stripe.Checkout.Session);
        break;
      case "invoice.paid":
        await syncDepuisFacture(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed": {
        // Compte passé en impayé (past_due) : l'accès reste ouvert, un rappel est préparé.
        const facture = event.data.object as Stripe.Invoice;
        await syncDepuisFacture(facture);
        const client = typeof facture.customer === "string" ? facture.customer : facture.customer?.id;
        if (client) await enregistrerRappel(client, "rappel_paiement_echoue");
        break;
      }
      default:
        break;
    }
  } catch (e) {
    // Échec : on retire l'événement du journal pour que Stripe le rejoue, et on signale l'erreur.
    await db.from("stripe_events").delete().eq("id", event.id);
    console.error("Erreur webhook", event.type, e);
    return json({ error: "traitement_echoue" }, 500);
  }

  return json({ received: true });
}

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  bindEnv(ctx.env);
  return handle(ctx.request);
}
