import { useState } from "react";
import { errorMessage, planById, resilier, retracter, type Subscription } from "../lib/billing";
import { Btn, Card, PageTitle } from "./ui";

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "la fin de votre période en cours");

/** Résiliation en ligne : récapitulatif, puis confirmation explicite. Rétractation de 14 jours sur la même page. */
export default function Resiliation({ sub, onClose }: { sub: Subscription; onClose: () => void }) {
  const [etape, setEtape] = useState<"recap" | "confirme">("recap");
  const [msg, setMsg] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nom = planById(sub.plan)?.name ?? sub.plan;

  const doResilier = async () => {
    setBusy(true); setMsg(null);
    const r = await resilier();
    setBusy(false);
    if (r.ok) setFait(`Votre abonnement est résilié. Votre accès reste actif jusqu'au ${date(r.fin ?? sub.currentPeriodEnd)}. Un accusé de réception avec cette date vous sera envoyé par e-mail.`);
    else setMsg(errorMessage(r.error));
  };
  const doRetracter = async () => {
    setBusy(true); setMsg(null);
    const r = await retracter();
    setBusy(false);
    if (r.ok) setFait("Votre rétractation est enregistrée. Votre accès est arrêté. Le remboursement éventuel de la part non utilisée sera versé sur votre moyen de paiement.");
    else setMsg(errorMessage(r.error));
  };

  return (
    <div className="space-y-4">
      <PageTitle eyebrow="Mon abonnement" title="Résilier mon abonnement" sub={`Formule : ${nom}`} />
      {fait ? (
        <Card><p className="text-sm">{fait}</p><Btn className="mt-4 w-full" variant="ghost" onClick={onClose}>Retour à mes biens</Btn></Card>
      ) : (
        <>
          <Card className="space-y-3">
            <h2 className="font-semibold">Résiliation</h2>
            <p className="text-sm text-muted">Votre accès reste actif jusqu'au {date(sub.currentPeriodEnd)}. Vos données restent consultables jusqu'à cette date.</p>
            {etape === "recap" ? (
              <Btn variant="ghost" className="w-full" onClick={() => setEtape("confirme")}>Résilier mon abonnement</Btn>
            ) : (
              <div className="space-y-2">
                <p className="text-sm">Confirmez-vous la résiliation ? Elle prend effet à la fin de la période déjà payée.</p>
                <Btn className="w-full" disabled={busy} onClick={doResilier}>Confirmer la résiliation</Btn>
                <button className="w-full text-sm text-primary" onClick={() => setEtape("recap")}>Annuler</button>
              </div>
            )}
          </Card>
          <Card className="space-y-3">
            <h2 className="font-semibold">Droit de rétractation (14 jours)</h2>
            {/* À VALIDER (juridique) : modalités de calcul du remboursement en cas de rétractation (voir CGV, article 5). */}
            <p className="text-sm text-muted">Vous pouvez vous rétracter dans les 14 jours suivant la souscription. L'accès est alors arrêté immédiatement et la part non utilisée est remboursée.</p>
            <Btn variant="ghost" className="w-full" disabled={busy} onClick={doRetracter}>Me rétracter et arrêter l'accès</Btn>
          </Card>
          {msg && <p role="status" className="text-sm text-amber-800">{msg}</p>}
          <button className="text-sm text-primary" onClick={onClose}>Retour</button>
        </>
      )}
    </div>
  );
}
