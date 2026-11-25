import { describe, expect, it } from "vitest";
import { bindEnv } from "./lib";
import { onRequestGet as exporter } from "../functions/api/export";
import { onRequestPost as supprimer } from "../functions/api/supprimer-compte";

const ENV = { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "k", STRIPE_SECRET_KEY: "sk_test_x" };

describe("export et suppression des données", () => {
  it("l'export refuse sans session", async () => {
    bindEnv(ENV);
    const r = await exporter({ request: new Request("https://kazonly.test/api/export"), env: ENV });
    expect(r.status).toBe(401);
  });
  it("la suppression refuse sans session", async () => {
    const r = await supprimer({ request: new Request("https://kazonly.test/api/supprimer-compte", { method: "POST", body: "{}" }), env: ENV });
    expect(r.status).toBe(401);
  });
});
