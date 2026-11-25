import type { Config } from "@netlify/functions";
import { admin, json, requireUser, siteUrl, stripe } from "./_lib";

export default async (req: Request): Promise<Response> => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const user = await requireUser(req);
  if (!user) return json({ error: "non_authentifie" }, 401);

  const { data } = await admin().from("billing_customers").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
  if (!data?.stripe_customer_id) return json({ error: "aucun_abonnement" }, 404);

  const session = await stripe().billingPortal.sessions.create({
    customer: data.stripe_customer_id,
    return_url: `${siteUrl()}/app/`,
  });
  return json({ url: session.url });
};

export const config: Config = { path: "/api/customer-portal" };
