import { useState } from "react";
import type { Property } from "../data/types";
import { analyze, consolidate, DEFAULT_ASSUMPTIONS, project, scoreVerdict, type Assumptions } from "../lib/analysis";
import { formatMoney } from "../lib/money";
import { getTerritory } from "../lib/territories";
import { Card, Empty, Field, PageTitle, inputCls } from "../components/ui";
import Simulateurs from "./Simulateurs";

const pct = (x?: number) => (x === undefined ? "—" : `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(x * 100)} %`);
const signed = (x: number, c: Property["currency"]) => `${x >= 0 ? "+" : "−"}${formatMoney(Math.abs(x), c, true)}`;

const Kpi = ({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) => (
  <div className="rounded-xl border border-line p-3">
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
    <p className={`mt-1 text-lg font-bold ${tone === "good" ? "text-[#1b7f3b]" : tone === "bad" ? "text-amber-800" : ""}`}>{value}</p>
  </div>
);

const Locked = ({ plan, text, onUpgrade }: { plan: string; text: string; onUpgrade: () => void }) => (
  <Card className="border-accent bg-[#fff8e1]">
    <p className="text-sm font-semibold">Formule {plan}</p>
    <p className="mt-1 text-sm text-muted">{text}</p>
    <button className="mt-2 text-sm font-semibold text-primary underline" onClick={onUpgrade}>Changer de formule</button>
  </Card>
);

function ScoreRing({ value }: { value: number }) {
  const r = 34, c = 2 * Math.PI * r;
  const color = value >= 80 ? "#1b7f3b" : value >= 60 ? "#00b4a6" : value >= 40 ? "#e08a00" : "#c0392b";
  return (
    <svg viewBox="0 0 80 80" className="h-24 w-24 shrink-0" role="img" aria-label={`Score de santé ${value} sur 100`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="#e6e9ee" strokeWidth="8" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} transform="rotate(-90 40 40)" />
      <text x="40" y="45" textAnchor="middle" fontSize="20" fontWeight="700" fill="#14181f">{value}</text>
    </svg>
  );
}

function PropertyAnalysis({ p, level, a, onUpgrade, goBiens }: { p: Property; level: 1 | 2 | 3; a: Assumptions; onUpgrade: () => void; goBiens: () => void }) {
  const r = analyze(p, a);
  const hasFin = p.finance && Object.keys(p.finance).length > 0;
  const rows = level >= 2 ? project(p, a) : null;
  const c = p.currency;
  const max = Math.max(...r.breakdown.map((x) => x.amount), 1);
  return (
    <Card className="space-y-4">
      <div>
        <h3 className="font-semibold">{p.name} <span className="font-normal text-muted">— {getTerritory(p.territoire).label}</span></h3>
        <p className="text-xs text-muted">Hypothèses : vacance {a.vacance} %, gestion {a.gestion} %.</p>
      </div>
      {!hasFin && (
        <p className="rounded-xl bg-soft p-3 text-sm">Ajoutez les données financières de ce bien pour obtenir ses analyses. <button className="font-semibold text-primary underline" onClick={goBiens}>Compléter</button></p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Kpi label="Loyers annuels" value={formatMoney(r.rentEffective, c, true)} />
        <Kpi label="Rendement brut" value={pct(r.grossYield)} />
        <Kpi label="Cash-flow mensuel" value={signed(r.cashflowMonthly, c)} tone={r.cashflowMonthly >= 0 ? "good" : "bad"} />
        <Kpi label="Cash-flow annuel" value={signed(r.cashflowAnnual, c)} tone={r.cashflowAnnual >= 0 ? "good" : "bad"} />
        {r.value !== undefined && <Kpi label="Valeur actuelle" value={formatMoney(r.value, c, true)} />}
        {r.equity !== undefined && <Kpi label="Patrimoine net" value={formatMoney(r.equity, c, true)} />}
      </div>

      {level < 2 ? (
        <Locked plan="Propriétaire" onUpgrade={onUpgrade} text="Rendement net, score de santé, financement, répartition des dépenses et projections à 5, 10, 15 et 20 ans." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Kpi label="Rendement net" value={pct(r.netYield)} />
            <Kpi label="Plus-value latente" value={r.gain === undefined ? "—" : signed(r.gain, c)} tone={r.gain === undefined ? undefined : r.gain >= 0 ? "good" : "bad"} />
          </div>

          {r.score && (
            <div className="flex items-center gap-4 rounded-xl bg-mint p-4">
              <ScoreRing value={r.score.total} />
              <div className="text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#007a70]">Score de santé patrimoniale</p>
                <p className="mt-1 font-medium">{scoreVerdict(r.score.total)}</p>
                <p className="mt-1 text-xs text-muted">{r.score.parts.map((x) => `${x.label} ${x.points}/${x.max}`).join(" · ")}</p>
              </div>
            </div>
          )}

          {r.ltv !== undefined && (
            <div>
              <h4 className="mb-1 text-sm font-semibold">Financement</h4>
              <div className="h-2 overflow-hidden rounded-full bg-soft"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, r.ltv * 100)}%` }} /></div>
              <p className="mt-1 text-xs text-muted">Endettement : {pct(r.ltv)} de la valeur · capital restant dû {formatMoney(p.finance!.capitalRestant ?? 0, c)}</p>
            </div>
          )}

          {r.breakdown.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Répartition des dépenses annuelles</h4>
              <ul className="space-y-2">
                {r.breakdown.map((x) => (
                  <li key={x.label} className="text-sm">
                    <div className="flex justify-between"><span>{x.label}</span><span className="font-medium">{formatMoney(x.amount, c, true)}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-soft"><div className="h-full rounded-full bg-secondary" style={{ width: `${(x.amount / max) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {rows && (
            <div>
              <h4 className="mb-2 text-sm font-semibold">Projection du patrimoine</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted"><tr><th className="py-1 pr-2 font-medium">Horizon</th><th className="pr-2 font-medium">Valeur</th><th className="pr-2 font-medium">Patrimoine net</th><th className="font-medium">Cash-flow cumulé</th></tr></thead>
                  <tbody>
                    {rows.map((x) => (
                      <tr key={x.years} className="border-t border-line">
                        <td className="py-1.5 pr-2">{x.years} ans</td>
                        <td className="pr-2">{formatMoney(x.value, c, true)}</td>
                        <td className="pr-2 font-semibold">{x.equity === null ? "—" : formatMoney(x.equity, c, true)}</td>
                        <td>{signed(x.cumulatedCashflow, c)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted">Valeur +{a.revalorisation} %/an, loyers et charges +{a.indexation} %/an. Projection indicative, non garantie.</p>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

export default function Analyses({ properties, level, onUpgrade, goBiens }: { properties: Property[]; level: 1 | 2 | 3; onUpgrade: () => void; goBiens: () => void }) {
  const [view, setView] = useState<"biens" | "sim">("biens");
  const [a, setA] = useState<Assumptions>(DEFAULT_ASSUMPTIONS);
  const active = properties.filter((p) => p.actif);
  const lines = level >= 3 ? consolidate(properties, a) : [];
  const ranked = level >= 3 ? [...active].map((p) => ({ p, s: analyze(p, a).score?.total })).filter((x) => x.s !== undefined).sort((x, y) => y.s! - x.s!) : [];
  const set = (k: keyof Assumptions) => (e: React.ChangeEvent<HTMLInputElement>) => setA({ ...a, [k]: Number(e.target.value.replace(",", ".")) || 0 });

  return (
    <>
      <PageTitle eyebrow="Analyses" title="Comprenez la performance de vos biens." sub="Rendement, cash-flow, financement et projections, bien par bien." />
      <div role="tablist" className="mb-4 flex rounded-xl bg-soft p-1 text-sm">
        {([["biens", "Mes biens"], ["sim", "Simulateurs"]] as const).map(([id, l]) => (
          <button key={id} role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`flex-1 rounded-lg py-2 font-medium ${view === id ? "bg-white shadow-sm" : "text-muted"}`}>{l}</button>
        ))}
      </div>
      {view === "sim" ? <Simulateurs level={level} /> : active.length === 0 ? (
        <Card><Empty title="Aucun bien à analyser" text="Ajoutez un bien et ses données financières pour voir ses analyses." /></Card>
      ) : (
        <div className="space-y-4">
          {level >= 2 && (
            <Card>
              <h3 className="mb-2 text-sm font-semibold">Hypothèses</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Vacance (%)"><input className={inputCls} inputMode="decimal" defaultValue={a.vacance} onChange={set("vacance")} /></Field>
                <Field label="Gestion (%)"><input className={inputCls} inputMode="decimal" defaultValue={a.gestion} onChange={set("gestion")} /></Field>
                <Field label="Valeur du bien (%/an)"><input className={inputCls} inputMode="decimal" defaultValue={a.revalorisation} onChange={set("revalorisation")} /></Field>
                <Field label="Loyers et charges (%/an)"><input className={inputCls} inputMode="decimal" defaultValue={a.indexation} onChange={set("indexation")} /></Field>
              </div>
            </Card>
          )}
          {level >= 3 ? (
            <Card className="space-y-3">
              <h3 className="font-semibold">Vue consolidée du portefeuille</h3>
              {lines.map((l) => (
                <div key={l.currency}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{l.currency === "XPF" ? "Biens en francs Pacifique" : "Biens en euros"} · {l.count} bien{l.count > 1 ? "s" : ""}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Kpi label="Loyers annuels" value={formatMoney(l.rentEffective, l.currency, true)} />
                    <Kpi label="Cash-flow annuel" value={signed(l.cashflowAnnual, l.currency)} tone={l.cashflowAnnual >= 0 ? "good" : "bad"} />
                    <Kpi label="Patrimoine net" value={formatMoney(l.equity, l.currency, true)} />
                    <Kpi label="Rendement net moyen" value={pct(l.netYield)} />
                  </div>
                </div>
              ))}
              {ranked.length > 1 && (
                <div>
                  <h4 className="mb-1 text-sm font-semibold">Classement des biens par score</h4>
                  <ol className="space-y-1 text-sm">{ranked.map(({ p, s }, i) => <li key={p.id} className="flex justify-between"><span>{i + 1}. {p.name}</span><span className="font-semibold">{s}/100</span></li>)}</ol>
                </div>
              )}
            </Card>
          ) : (
            <Locked plan="Portefeuille" onUpgrade={onUpgrade} text="Vue consolidée par devise et classement de vos biens par score de santé." />
          )}
          {active.map((p) => <PropertyAnalysis key={p.id} p={p} level={level} a={a} onUpgrade={onUpgrade} goBiens={goBiens} />)}
        </div>
      )}
    </>
  );
}
