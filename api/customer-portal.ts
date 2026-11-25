import { admin, bindEnv, json, requireUser, siteUrl, stripe, type Env } from "../server/lib";

async function handle(req: Request): Promise<Response> {
  const user = await requireUser(req);
  if (!user) return json({ error: "non_authentifie" }, 401);

  const { data } = await admin().from("subscriptions").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (!data?.stripe_customer_id) return json({ error: "aucun_abonnement" }, 404);

  const session = await stripe().billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${siteUrl()}/app/`,
  });
  return json({ url: session.url });
}

export const config = { runtime: "edge" };

export default async function handler(request: Request): Promise<Response> {
  bindEnv(process.env as Env);
  return handle(request);
}
