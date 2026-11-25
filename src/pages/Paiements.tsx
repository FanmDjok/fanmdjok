import { useState } from "react";
import type { Payment, Property } from "../data/types";
import { uid } from "../data/localRepository";
import { currentMonth, monthLabel, shiftMonth } from "../lib/period";
import { formatMoney, sumByCurrency } from "../lib/money";
import { Btn, Card, Empty, Field, PageTitle, inputCls } from "../components/ui";
import { MoneyLines } from "./Accueil";

import Quittances from "./Quittances";
import Relances from "./Relances";
import { lateItems } from "../lib/relances";

export default function Paiements(props: { properties: Property[]; payments: Payment[]; onSave: (p: Payment) => Promise<void>; initialSub?: string }) {
  const [sub, setSub] = useState(props.initialSub ?? "echeances");
  const n = lateItems(props.properties, props.payments).length;
  const subs = [["echeances", "Échéances"], ["relances", n ? `Relances (${n})` : "Relances"], ["quittances", "Quittances"]];
  return (
    <>
      <div role="tablist" aria-label="Sections des paiements" className="mb-4 flex gap-1 rounded-xl bg-soft p-1">
        {subs.map(([id, l]) => <button key={id} role="tab" aria-selected={sub === id} onClick={() => setSub(id)} className={`flex-1 rounded-lg py-2 text-sm font-medium ${sub === id ? "bg-white shadow-sm" : "text-muted"}`}>{l}</button>)}
      </div>
      {sub === "echeances" && <Echeances {...props} />}
      {sub === "relances" && <><h1 className="mb-1 text-2xl font-bold">Relancez sans friction.</h1><p className="mb-4 text-sm text-muted">Un message prêt à envoyer pour chaque loyer qui tarde.</p><Relances {...props} /></>}
      {sub === "quittances" && <><h1 className="mb-1 text-2xl font-bold">Vos quittances de loyer.</h1><p className="mb-4 text-sm text-muted">Générées à partir des loyers marqués reçus.</p><Quittances {...props} /></>}
    </>
  );
}

function Echeances({ properties, payments, onSave }: { properties: Property[]; payments: Payment[]; onSave: (p: Payment) => Promise<void> }) {
  const [month, setMonth] = useState(currentMonth());
  const [adding, setAdding] = useState(false);
  const [propId, setPropId] = useState("");
  const list = payments.filter((p) => p.month === month);
  const prop = (id: string) => properties.find((x) => x.id === id)!;
  const by = (s: Payment["status"][]) => sumByCurrency(list.filter((p) => s.includes(p.status)), (p) => ({ amount: p.amount, currency: prop(p.propertyId).currency }));

  return (
    <>
      <PageTitle eyebrow="Loyers et échéances" title="Gardez le fil des encaissements." sub="Ajoutez une échéance, puis marquez-la reçue lorsque le loyer est encaissé." />
      <div className="mb-4 flex items-center gap-2">
        <Btn variant="ghost" onClick={() => setMonth(shiftMonth(month, -1))}>←</Btn>
        <span className="flex-1 text-center font-medium capitalize">{monthLabel(month)}</span>
        <Btn variant="ghost" onClick={() => setMonth(shiftMonth(month, 1))}>→</Btn>
      </div>
      <div className="mb-4 space-y-3">
        <Card><p className="text-sm text-muted">Loyers reçus</p><MoneyLines totals={by(["recu"])} /></Card>
        <Card><p className="text-sm text-muted">À recevoir</p><MoneyLines totals={by(["attente"])} /></Card>
        <Card><p className="text-sm text-muted">Loyers en retard</p><MoneyLines totals={by(["retard"])} /></Card>
      </div>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <div><h2 className="font-semibold capitalize">Échéances de {monthLabel(month)}</h2><p className="text-xs text-muted">Les montants restent séparés par devise.</p></div>
          <Btn disabled={properties.length === 0} onClick={() => setAdding(!adding)}>+ Ajouter</Btn>
        </div>
        {adding && (
          <div className="mb-4 space-y-3 rounded-xl bg-soft p-3">
            <Field label="Propriété">
              <select className={inputCls} value={propId} onChange={(e) => setPropId(e.target.value)}>
                <option value="">Choisir…</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
            <Btn disabled={!propId} onClick={async () => {
              const p = prop(propId);
              await onSave({ id: uid(), propertyId: p.id, month, amount: p.loyer, status: "attente" });
              setAdding(false); setPropId("");
            }}>Créer l'échéance ({propId ? formatMoney(prop(propId).loyer, prop(propId).currency) : "—"})</Btn>
          </div>
        )}
        {list.length === 0 ? (
          <Empty title={`Aucune échéance pour ${monthLabel(month)}`} text={properties.length ? "Ajoutez une échéance de loyer pour suivre son encaissement." : "Créez d'abord une propriété active."} />
        ) : (
          <ul className="divide-y divide-line">
            {list.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-3">
                <div><p className="font-medium">{prop(p.propertyId).name}</p><p className="text-sm text-muted">{formatMoney(p.amount, prop(p.propertyId).currency)}</p></div>
                <select className="rounded-lg border border-line px-2 py-1 text-sm" value={p.status} onChange={(e) => onSave({ ...p, status: e.target.value as Payment["status"] })}>
                  <option value="attente">En attente</option><option value="recu">Reçu</option><option value="retard">En retard</option>
                </select>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="mt-4 text-xs text-muted">Les échéances sont des rappels de suivi : aucun prélèvement ou paiement bancaire n'est déclenché.</p>
    </>
  );
}
