import { useState } from "react";
import type { Expense, Property } from "../data/types";
import { uid } from "../data/localRepository";
import { currentMonth, monthLabel, shiftMonth } from "../lib/period";
import { formatMoney, sumByCurrency } from "../lib/money";
import posthog, { posthogEnabled } from "../lib/posthog";
import { Btn, Card, Empty, Field, PageTitle, inputCls } from "../components/ui";
import { MoneyLines } from "./Accueil";

export const CATEGORIES = ["Réparations", "Entretien courant", "Nettoyage", "Publicité / annonces", "Impôts et taxes", "Assurance", "Autre"];

export default function Depenses({ properties, expenses, onSave }: { properties: Property[]; expenses: Expense[]; onSave: (e: Expense) => Promise<void> }) {
  const [month, setMonth] = useState(currentMonth());
  const [adding, setAdding] = useState(false);
  const [propId, setPropId] = useState("");
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState("");
  const list = expenses.filter((e) => e.month === month);
  const prop = (id: string) => properties.find((x) => x.id === id)!;
  const total = sumByCurrency(list, (e) => ({ amount: e.amount, currency: prop(e.propertyId).currency }));

  return (
    <>
      <PageTitle eyebrow="Dépenses immobilières" title="Toutes vos sorties, bien rangées." sub="Enregistrez les charges et interventions par logement." />
      <div className="mb-4 flex items-center gap-2">
        <Btn variant="ghost" onClick={() => setMonth(shiftMonth(month, -1))}>←</Btn>
        <span className="flex-1 text-center font-medium capitalize">{monthLabel(month)}</span>
        <Btn variant="ghost" onClick={() => setMonth(shiftMonth(month, 1))}>→</Btn>
      </div>
      <Card className="mb-4"><p className="text-sm text-muted">Dépenses du mois</p><MoneyLines totals={total} /><p className="text-xs text-muted">Les montants restent séparés selon la devise du bien.</p></Card>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold capitalize">Dépenses de {monthLabel(month)}</h2>
          <Btn disabled={properties.length === 0} onClick={() => setAdding(!adding)}>+ Ajouter</Btn>
        </div>
        {adding && (
          <div className="mb-4 space-y-3 rounded-xl bg-soft p-3">
            <Field label="Propriété"><select className={inputCls} value={propId} onChange={(e) => setPropId(e.target.value)}><option value="">Choisir…</option>{properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
            <Field label="Catégorie"><select className={inputCls} value={cat} onChange={(e) => setCat(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Field>
            <Field label={`Montant${propId ? ` (${prop(propId).currency})` : ""}`}><input className={inputCls} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(",", "."))} /></Field>
            <Btn disabled={!propId || !(Number(amount) > 0)} onClick={async () => {
              await onSave({ id: uid(), propertyId: propId, month, amount: Number(amount), category: cat });
              if (posthogEnabled) posthog.capture("expense_created", { category: cat, currency: prop(propId).currency });
              setAdding(false); setAmount("");
            }}>Enregistrer</Btn>
          </div>
        )}
        {list.length === 0 ? (
          <Empty title={`Aucune dépense pour ${monthLabel(month)}`} text={properties.length ? "Ajoutez une dépense pour suivre vos frais par propriété et par mois." : "Créez d'abord une propriété active."} />
        ) : (
          <ul className="divide-y divide-line">{list.map((e) => <li key={e.id} className="flex justify-between py-3"><span>{e.category} <span className="text-muted">· {prop(e.propertyId).name}</span></span><span className="font-medium">{formatMoney(e.amount, prop(e.propertyId).currency)}</span></li>)}</ul>
        )}
      </Card>
    </>
  );
}
