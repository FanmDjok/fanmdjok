import { useState } from "react";
import type { Payment, Property } from "../data/types";
import { monthLabel } from "../lib/period";
import { formatMoney } from "../lib/money";
import { LEVELS, internationalPhone, lateItems, relanceMessage } from "../lib/relances";
import { useBailleur } from "../lib/bailleur";
import { Btn, Card, Empty } from "../components/ui";

export default function Relances({ properties, payments, onSave }: { properties: Property[]; payments: Payment[]; onSave: (p: Payment) => Promise<void> }) {
  const [b] = useBailleur();
  const items = lateItems(properties, payments);
  const [info, setInfo] = useState("");
  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <Card><Empty title="Aucun loyer à relancer" text="Les loyers en retard, ou restés en attente après leur mois, apparaissent ici avec un message prêt à envoyer." /></Card>
      ) : items.map((it) => {
        const msg = relanceMessage(it, b.nom);
        const tel = internationalPhone(it.property.locatairePhone, it.property.territoire);
        return (
          <Card key={it.payment.id}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{it.property.name}</p>
                <p className="text-sm text-muted capitalize">{monthLabel(it.payment.month)} · {formatMoney(it.payment.amount, it.property.currency)}</p>
              </div>
              <span className="rounded-full bg-[#fff8e1] px-2 py-0.5 text-xs font-medium text-[#7a5b00]">{LEVELS[it.level]}</span>
            </div>
            <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-soft p-3 font-sans text-sm" aria-label="Message de relance">{msg}</pre>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn variant="ghost" onClick={async () => { try { await navigator.clipboard.writeText(msg); setInfo("Message copié."); } catch { setInfo("Copie impossible sur cet appareil."); } }}>Copier</Btn>
              {tel && <a className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-soft" target="_blank" rel="noopener" href={`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`}>WhatsApp</a>}
              {tel && <a className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold hover:bg-soft" href={`sms:+${tel}?&body=${encodeURIComponent(msg)}`}>SMS</a>}
              <Btn onClick={() => onSave({ ...it.payment, status: "recu" })}>Marquer reçu</Btn>
            </div>
            {!tel && <p className="mt-2 text-xs text-muted">Ajoutez le téléphone du locataire dans la fiche du bien pour envoyer par WhatsApp ou SMS.</p>}
          </Card>
        );
      })}
      {info && <p role="status" className="text-xs text-muted">{info}</p>}
      <p className="text-xs text-muted">KAZONLY prépare le message, c'est vous qui l'envoyez : rien n'est expédié automatiquement. Le dernier rappel n'est pas une mise en demeure officielle.</p>
    </div>
  );
}
