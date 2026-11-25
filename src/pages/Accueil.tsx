import type { Expense, Payment, Property } from "../data/types";
import { currentMonth } from "../lib/period";
import { lateItems } from "../lib/relances";
import { formatMoney, sumByCurrency } from "../lib/money";
import type { Currency } from "../lib/territories";
import { Btn, Card, Empty, PageTitle } from "../components/ui";

const cur = (p: Property[], id: string): Currency => p.find((x) => x.id === id)?.currency ?? "EUR";

export function MoneyLines({ totals }: { totals: Record<Currency, number> }) {
  const lines = (Object.keys(totals) as Currency[]).filter((c) => totals[c] !== 0);
  if (lines.length === 0) return <p className="text-3xl font-bold">0 €</p>;
  return <>{lines.map((c) => <p key={c} className="text-3xl font-bold">{formatMoney(totals[c], c)}</p>)}</>;
}

export default function Accueil({ properties, payments, expenses, go }: { properties: Property[]; payments: Payment[]; expenses: Expense[]; go: (t: string) => void }) {
  const m = currentMonth();
  const pm = payments.filter((p) => p.month === m);
  const received = sumByCurrency(pm.filter((p) => p.status === "recu"), (p) => ({ amount: p.amount, currency: cur(properties, p.propertyId) }));
  const pending = sumByCurrency(pm.filter((p) => p.status !== "recu"), (p) => ({ amount: p.amount, currency: cur(properties, p.propertyId) }));
  const spent = sumByCurrency(expenses.filter((e) => e.month === m), (e) => ({ amount: e.amount, currency: cur(properties, e.propertyId) }));
  const net: Record<Currency, number> = { EUR: received.EUR - spent.EUR, XPF: received.XPF - spent.XPF };
  const late = lateItems(properties, payments).length;

  // Parcours de mise en route : chaque étape se valide avec les données réelles du compte.
  const steps = [
    { label: "Ajouter votre premier bien", done: properties.length > 0, go: "biens" },
    { label: "Marquer un loyer ce mois-ci", done: pm.length > 0, go: "paiements" },
    { label: "Saisir une dépense", done: expenses.length > 0, go: "depenses" },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <>
      <PageTitle eyebrow="Bienvenue sur KAZONLY" title="Vos locations, en un coup d'œil." sub="Retrouvez ici vos revenus, vos dépenses et les paiements à suivre." />
      {properties.length > 0 && doneCount < steps.length && (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Premiers pas</h2>
            <span className="text-xs text-muted">{doneCount} / {steps.length}</span>
          </div>
          <div role="progressbar" aria-label="Progression de la mise en route" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount} className="mt-3 h-2 overflow-hidden rounded-full bg-soft">
            <div className="h-2 rounded-full bg-secondary transition-all duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>
          <ul className="mt-4 space-y-3">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-3 text-sm">
                <span className={s.done ? "text-muted line-through" : "font-medium"}>{s.done ? "✓ " : ""}{s.label}</span>
                {!s.done && <button className="shrink-0 font-semibold text-primary" onClick={() => go(s.go)}>Commencer →</button>}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="space-y-3">
        <Card><p className="text-sm text-muted">Revenus reçus</p><MoneyLines totals={received} /><p className="text-xs text-muted">Vos loyers encaissés ce mois</p></Card>
        <Card><p className="text-sm text-muted">Dépenses</p><MoneyLines totals={spent} /><p className="text-xs text-muted">Vos dépenses enregistrées ce mois</p></Card>
        <Card className="border-secondary bg-mint"><p className="text-sm text-muted">Solde net du mois</p><MoneyLines totals={net} /><p className="text-xs text-muted">Loyers encaissés moins dépenses du mois</p></Card>
        <Card><p className="text-sm text-muted">À recevoir</p><MoneyLines totals={pending} /><p className="text-xs text-muted">Loyers attendus ce mois</p></Card>
        <Card><p className="text-sm text-muted">Propriétés gérées</p><p className="text-3xl font-bold">{properties.length}</p></Card>
        <Card>
          <h2 className="font-semibold">Alertes urgentes</h2>
          <p className="text-sm text-muted">{late === 0 ? "Aucun loyer en retard à ce jour." : `${late} loyer(s) en retard à régulariser.`}</p>
          {late > 0 && <Btn className="mt-3" onClick={() => go("paiements:relances")}>Préparer les relances</Btn>}
        </Card>
        {properties.length === 0 && (
          <Card><Empty title="Votre première propriété vous attend" text="Ajoutez un logement pour commencer à suivre les loyers, les dépenses et votre trésorerie au même endroit." action={<Btn onClick={() => go("biens")}>+ Créer ma première propriété</Btn>} /></Card>
        )}
      </div>
    </>
  );
}
