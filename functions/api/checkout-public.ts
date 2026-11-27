import { admin, bindEnv, json, readBounded, siteUrl, stripe, type Env } from "../../server/lib";
import { paramsSessionCheckout, resoudrePrix, validerDemandePublique } from "../../server/checkout";
import { essaiEligible } from "../../server/essai";
import { listeHostnames, verifyTurnstile } from "../../server/turnstile";

/**
 * Achat sans compte : la page de paiement Stripe demande la carte ; le compte est créé après le paiement,
 * à partir de l'e-mail du client (webhook checkout.session.completed). Protégé par Turnstile.
 */
async function handle(req: Request, ENV: Env): Promise<Response> {
  if ((ENV.CHECKOUT_MODE ?? "api") !== "api") return json({ error: "mode_indisponible" }, 503);

  const raw = await readBounded(req, 4096);
  if (raw === null) return json({ error: "requete_trop_grande" }, 413);
  let body: { plan?: unknown; interval?: unknown; startNow?: unknown; email?: unknown; turnstileToken?: unknown; currency?: unknown };
  try { body = JSON.parse(raw); } catch { return json({ error: "requete_invalide" }, 400); }
  if (body.currency !== undefined && body.currency !== "EUR") return json({ error: "devise_indisponible" }, 400);

  const v = validerDemandePublique(body);
  if (!v.ok) return json({ error: v.erreur }, 400);

  // Sans clé Turnstile, on ne crée aucune session : pas de protection, pas d'achat.
  if (!ENV.TURNSTILE_SECRET_KEY) return json({ error: "bientot_ouvert" }, 503);
  const hostnames = listeHostnames(ENV.TURNSTILE_HOSTNAMES);
  if (hostnames.length === 0) return json({ error: "verification_indisponible" }, 503);
  const humain = await verifyTurnstile(
    typeof body.turnstileToken === "string" ? body.turnstileToken : "",
    ENV.TURNSTILE_SECRET_KEY,
    req.headers.get("cf-connecting-ip"),
    { action: "checkout", hostnames },
  );
  if (!humain) return json({ error: "verification_echouee" }, 403);

  const prix = resoudrePrix(v.plan, v.interval, ENV as unknown as Record<string, string | undefined>);
  if (!prix.ok) return json({ error: prix.erreur }, prix.erreur === "configuration_incoherente" ? 500 : 400);

  const db = admin();
  const s = stripe();

  // Un compte existe déjà pour cet e-mail ? On le retrouve pour l'historique d'essai et l'abonnement.
  const { data: profil } = await db.from("profiles").select("id").eq("email", v.email).maybeSingle();
  let dejaBase = false;
  if (profil) {
    const { data: abo } = await db.from("subscriptions").select("plan_code, statut, essai_utilise, essai_fin").eq("user_id", profil.id).maybeSingle();
    if (abo && abo.plan_code !== "gratuit" && ["trialing", "active", "past_due"].includes(abo.statut)) {
      return json({ error: "abonnement_existant" }, 409);
    }
    dejaBase = Boolean(abo?.essai_utilise) || Boolean(abo?.essai_fin);
  }

  const verif = await essaiEligible(s, v.email, dejaBase, null);
  const session = await s.checkout.sessions.create(paramsSessionCheckout({
    userId: profil?.id ?? null,
    customer: verif.customerId ?? undefined,
    email: v.email,
    price: prix.price,
    plan: v.plan,
    interval: v.interval,
    currency: "EUR",
    base: siteUrl(),
    essai: verif.essai,
  }));
  return json({ url: session.url, essai: verif.essai });
}

export async function onRequestPost(ctx: { request: Request; env: Env }): Promise<Response> {
  bindEnv(ctx.env);
  return handle(ctx.request, ctx.env);
}
