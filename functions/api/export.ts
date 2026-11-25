import { admin, bindEnv, json, requireUser, type Env } from "../../server/lib";

const TABLES = ["biens", "locataires", "baux", "mouvements", "echeances"] as const;

const csvCell = (v: unknown): string => {
  const s = v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  // Protection contre l'injection de formules dans un tableur.
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

async function handle(req: Request): Promise<Response> {
  const user = await requireUser(req);
  if (!user) return json({ error: "non_authentifie" }, 401);
  const db = admin();
  const url = new URL(req.url);

  const donnees: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const { data, error } = await db.from(t).select("*").eq("owner_id", user.id);
    if (error) return json({ error: "export_impossible" }, 500);
    donnees[t] = data ?? [];
  }
  const { data: profil } = await db.from("profiles").select("id, email, prenom, nom, territoire_principal, created_at").eq("id", user.id).maybeSingle();
  const { data: abo } = await db.from("subscriptions").select("plan_code, periodicite, statut, essai_fin, periode_fin, cancel_at_period_end, created_at").eq("user_id", user.id).maybeSingle();

  if (url.searchParams.get("format") === "csv") {
    const lignes = donnees.mouvements as Record<string, unknown>[];
    const colonnes = ["id", "bien_id", "sens", "categorie", "libelle", "montant", "date_operation", "statut", "statut_paiement"];
    const csv = [colonnes.join(";"), ...lignes.map((l) => colonnes.map((c) => csvCell(l[c])).join(";"))].join("\r\n");
    return new Response("﻿" + csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="kazonly-mouvements.csv"', "Cache-Control": "no-store" },
    });
  }

  const corps = { exporte_le: new Date().toISOString(), compte: profil, abonnement: abo, ...donnees };
  return new Response(JSON.stringify(corps, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="kazonly-mes-donnees.json"', "Cache-Control": "no-store" },
  });
}

export async function onRequestGet(ctx: { request: Request; env: Env }): Promise<Response> {
  bindEnv(ctx.env);
  return handle(ctx.request);
}
