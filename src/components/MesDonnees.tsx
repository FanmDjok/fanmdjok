import { useState } from "react";
import { supabase } from "../lib/supabase";
import { supprimerCompte, telechargerDonnees } from "../lib/billing";
import { Btn, Card, PageTitle, inputCls } from "./ui";
import { MfaReglages } from "./Mfa";

/** Export de toutes les données et suppression du compte, accessibles depuis le compte. */
export default function MesDonnees() {
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const exporter = async (format: "json" | "csv") => {
    setBusy(true); setMsg(null);
    const ok = await telechargerDonnees(format);
    setBusy(false);
    if (!ok) setMsg("Export impossible pour le moment. Réessayez dans un instant.");
  };
  const supprimer = async () => {
    setBusy(true); setMsg(null);
    const r = await supprimerCompte();
    setBusy(false);
    if (r.ok) { await supabase?.auth.signOut(); return; }
    setMsg("Suppression impossible pour le moment. Réessayez dans un instant.");
  };

  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Mon compte" title="Mes données" sub="Vos données vous appartiennent : vous pouvez les télécharger ou supprimer votre compte." />
      <MfaReglages />
      <Card className="space-y-3">
        <h2 className="font-semibold">Télécharger mes données</h2>
        <p className="text-sm text-muted">Un fichier JSON contient tout votre compte, vos biens, locataires, baux et mouvements. Un CSV liste vos mouvements pour un tableur.</p>
        <Btn variant="ghost" className="w-full" disabled={busy} onClick={() => exporter("json")}>Télécharger en JSON</Btn>
        <Btn variant="ghost" className="w-full" disabled={busy} onClick={() => exporter("csv")}>Télécharger les mouvements en CSV</Btn>
      </Card>
      <Card className="space-y-3">
        <h2 className="font-semibold">Supprimer mon compte</h2>
        <p className="text-sm text-muted">La suppression est définitive : votre abonnement est arrêté, puis vos biens, locataires, baux et mouvements sont effacés. [À VALIDER] : les factures conservées par Stripe pour leurs obligations comptables ne sont pas effacées.</p>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Pour confirmer, tapez SUPPRIMER</span>
          <input className={inputCls} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" />
        </label>
        <Btn className="w-full" disabled={busy || confirm !== "SUPPRIMER"} onClick={supprimer}>Supprimer définitivement mon compte</Btn>
      </Card>
      {msg && <p role="status" className="text-sm text-amber-800">{msg}</p>}
    </div>
  );
}
