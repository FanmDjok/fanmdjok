import { useState } from "react";
import type { Expense, Payment, Property } from "../data/types";
import { formatMoney } from "../lib/money";
import { getTerritory, TYPES_LOCATION } from "../lib/territories";
import { MICRO, REDUCTION_DROM, REEL_LABEL, compareRegimes, hasLocalCode } from "../lib/fiscalite";
import { Card, Empty, Field, inputCls } from "../components/ui";

export default function Fiscalite({ properties, payments, expenses, level, onUpgrade }: { properties: Property[]; payments: Payment[]; expenses: Expense[]; level: 1 | 2 | 3; onUpgrade: () => void }) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [tmi, setTmi] = useState(30);
  const [ps, setPs] = useState(17.2);
  const [interets, setInterets] = useState<Record<string, number>>({});
  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-semibold">Fiscalité par territoire</h2>
        <p className="mb-3 text-xs text-muted">Une estimation pour vous orienter avant de parler à votre comptable : elle ne remplace pas votre déclaration.</p>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Année"><input className={inputCls} inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} /></Field>
          <Field label="Tranche (%)"><select className={inputCls} value={tmi} onChange={(e) => setTmi(Number(e.target.value))}>{[0, 11, 30, 41, 45].map((x) => <option key={x}>{x}</option>)}</select></Field>
          <Field label="Prél. sociaux (%)"><input className={inputCls} type="number" step="0.1" min={0} max={30} value={ps} onChange={(e) => setPs(Number(e.target.value))} /></Field>
        </div>
      </Card>
      {properties.length === 0 ? <Card><Empty title="Aucun bien à analyser" text="Ajoutez un bien, ses loyers reçus et ses dépenses : l'estimation se calcule ici." /></Card> : properties.map((p) => {
        const t = getTerritory(p.territoire);
        const rec = payments.filter((x) => x.propertyId === p.id && x.status === "recu" && x.month.startsWith(year)).reduce((a, x) => a + x.amount, 0);
        const ch = expenses.filter((x) => x.propertyId === p.id && x.month.startsWith(year)).reduce((a, x) => a + x.amount, 0);
        const typeLabel = TYPES_LOCATION.find((x) => x.id === p.typeLocation)!.label;
        const base = (
          <p className="text-sm text-muted">Loyers reçus {formatMoney(rec, p.currency)} · Dépenses {formatMoney(ch, p.currency)} · Résultat avant impôt <b className="text-ink">{formatMoney(rec - ch, p.currency)}</b></p>
        );
        if (hasLocalCode(p.territoire)) return (
          <Card key={p.id}>
            <p className="font-semibold">{p.name} <span className="font-normal text-muted">— {t.label}</span></p>
            {base}
            <p className="mt-2 rounded-xl bg-soft p-3 text-sm">{t.label} applique son propre code des impôts : KAZONLY ne calcule pas l'impôt avec les règles métropolitaines. Reprenez ces totaux ({year}) auprès de l'administration fiscale locale ou d'un professionnel du territoire.</p>
          </Card>
        );
        if (level < 2) return (
          <Card key={p.id}>
            <p className="font-semibold">{p.name} <span className="font-normal text-muted">— {t.label} · {typeLabel}</span></p>
            {base}
            <p className="mt-2 rounded-xl bg-soft p-3 text-sm">La comparaison micro et réel et l'estimation de l'impôt sont incluses dans la formule Propriétaire. Vos totaux ({year}) restent disponibles ci-dessus.</p>
            <button className="mt-2 text-sm font-semibold text-primary" onClick={onUpgrade}>Voir les formules</button>
          </Card>
        );
        const it = interets[p.id] ?? 0;
        const r = compareRegimes({ type: p.typeLocation, recettes: rec, charges: ch, interets: it, tmi, ps });
        const red = REDUCTION_DROM[p.territoire];
        return (
          <Card key={p.id}>
            <p className="font-semibold">{p.name} <span className="font-normal text-muted">— {t.label} · {typeLabel}</span></p>
            {base}
            <div className="mt-3"><Field label={`Intérêts d'emprunt de ${year} (${p.currency === "XPF" ? "XPF" : "€"}, facultatif)`}>
              <input className={inputCls} type="number" min={0} value={it || ""} onChange={(e) => setInterets({ ...interets, [p.id]: Math.max(0, Number(e.target.value)) })} />
            </Field></div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className={`rounded-xl p-3 ${r.best === "micro" ? "bg-mint" : "bg-soft"}`}><dt className="text-xs text-muted">{MICRO[p.typeLocation].label}</dt><dd className="font-semibold">{r.microEligible ? formatMoney(r.baseMicro, p.currency) : "Non éligible"}</dd><dd className="text-xs text-muted">{r.microEligible ? `base imposable (abattement ${MICRO[p.typeLocation].abattement * 100} %)` : `recettes au-dessus de ${formatMoney(MICRO[p.typeLocation].plafond, "EUR", true)}`}</dd></div>
              <div className={`rounded-xl p-3 ${r.best === "reel" ? "bg-mint" : "bg-soft"}`}><dt className="text-xs text-muted">{REEL_LABEL[p.typeLocation]}</dt><dd className="font-semibold">{formatMoney(r.baseReel, p.currency)}</dd><dd className="text-xs text-muted">base imposable (hors amortissement)</dd></div>
            </dl>
            <p className="mt-3 text-sm">Régime le plus léger : <b>{r.best === "micro" ? MICRO[p.typeLocation].label : REEL_LABEL[p.typeLocation]}</b>. Impôt et prélèvements estimés : <b>{formatMoney(r.impotEstime, p.currency)}</b>{r.economie > 0 && <> , soit environ {formatMoney(r.economie, p.currency)} de moins que l'autre régime</>}.</p>
            {red && <p className="mt-2 text-xs text-muted">À vérifier avec votre comptable : en {t.label}, une réduction d'impôt sur le revenu de {red.taux} % (plafonnée à {formatMoney(red.plafond, "EUR", true)}) peut s'appliquer à l'impôt global du foyer. Elle n'est pas incluse dans l'estimation.</p>}
          </Card>
        );
      })}
      <p className="text-xs text-muted">Barèmes pris en compte : abattements et plafonds de micro-foncier et micro-BIC en vigueur à la date de rédaction, à revérifier chaque année. Plafonds appliqués bien par bien, alors qu'ils s'apprécient pour l'ensemble du foyer. Amortissement, déficits et TVA ne sont pas calculés. Aucune conversion de devise n'est faite.</p>
    </div>
  );
}
