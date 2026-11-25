import { useState } from "react";
import type { Expense, Payment, Property } from "../data/types";
import { currentMonth, monthLabel, shiftMonth } from "../lib/period";
import { formatMoney } from "../lib/money";
import { getTerritory } from "../lib/territories";
import { Btn, Card, Empty, PageTitle, inputCls } from "../components/ui";

import Fiscalite from "./Fiscalite";

export default function Rapports(props: { properties: Property[]; payments: Payment[]; expenses: Expense[]; level: 1 | 2 | 3; onUpgrade: () => void }) {
  const [sub, setSub] = useState("mois");
  return (
    <>
      <div role="tablist" aria-label="Sections des rapports" className="mb-4 flex gap-1 rounded-xl bg-soft p-1">
        {[["mois", "Rapport mensuel"], ["fiscalite", "Fiscalité"]].map(([id, l]) => <button key={id} role="tab" aria-selected={sub === id} onClick={() => setSub(id)} className={`flex-1 rounded-lg py-2 text-sm font-medium ${sub === id ? "bg-white shadow-sm" : "text-muted"}`}>{l}</button>)}
      </div>
      {sub === "mois" ? <Mensuel properties={props.properties} payments={props.payments} expenses={props.expenses} /> : <><h1 className="mb-1 text-2xl font-bold">Votre fiscalité, territoire par territoire.</h1><p className="mb-4 text-sm text-muted">Comparez les régimes avant de déclarer.</p><Fiscalite {...props} /></>}
    </>
  );
}

function Mensuel({ properties, payments, expenses }: { properties: Property[]; payments: Payment[]; expenses: Expense[] }) {
  const [month, setMonth] = useState(currentMonth());
  const [only, setOnly] = useState("");
  const rows = properties.filter((p) => !only || p.id === only).map((p) => {
    const recu = payments.filter((x) => x.propertyId === p.id && x.month === month && x.status === "recu").reduce((a, x) => a + x.amount, 0);
    const attente = payments.filter((x) => x.propertyId === p.id && x.month === month && x.status !== "recu").reduce((a, x) => a + x.amount, 0);
    const dep = expenses.filter((x) => x.propertyId === p.id && x.month === month).reduce((a, x) => a + x.amount, 0);
    return { p, recu, attente, dep, solde: recu - dep };
  });

  const exportCsv = () => {
    const head = "Propriete;Territoire;Devise;Loyers recus;A recevoir;Depenses;Solde";
    const body = rows.map((r) => [r.p.name, getTerritory(r.p.territoire).label, r.p.currency, r.recu, r.attente, r.dep, r.solde].join(";"));
    const blob = new Blob(["﻿" + [head, ...body].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `kazonly-${month}.csv`; a.click();
  };

  return (
    <>
      <PageTitle eyebrow="Vue financière" title="Vos chiffres, clairement." sub="Comparez loyers encaissés, échéances en attente et dépenses enregistrées." />
      <div className="mb-3 flex items-center gap-2">
        <Btn variant="ghost" onClick={() => setMonth(shiftMonth(month, -1))}>←</Btn>
        <span className="flex-1 text-center font-medium capitalize">{monthLabel(month)}</span>
        <Btn variant="ghost" onClick={() => setMonth(shiftMonth(month, 1))}>→</Btn>
      </div>
      <select className={`${inputCls} mb-3`} value={only} onChange={(e) => setOnly(e.target.value)}>
        <option value="">Toutes les propriétés</option>
        {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <Btn className="mb-4 w-full" onClick={exportCsv} disabled={rows.length === 0}>Télécharger le CSV</Btn>
      <Card>
        <h2 className="font-semibold">Détail par propriété</h2>
        <p className="mb-2 text-xs text-muted">Les soldes sont calculés dans la devise de chaque logement.</p>
        {rows.length === 0 ? <Empty title="Aucune donnée pour cette période" text="Les paiements reçus et dépenses saisis apparaîtront ici." /> : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.p.id} className="py-3 text-sm">
                <p className="font-medium">{r.p.name} <span className="text-muted">— {getTerritory(r.p.territoire).label}</span></p>
                <p className="text-muted">Reçu {formatMoney(r.recu, r.p.currency)} · À recevoir {formatMoney(r.attente, r.p.currency)} · Dépenses {formatMoney(r.dep, r.p.currency)}</p>
                <p className="font-semibold">Solde {formatMoney(r.solde, r.p.currency)}</p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
