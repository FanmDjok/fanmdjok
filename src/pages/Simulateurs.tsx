import { useState } from "react";
import { monthlyPayment } from "../lib/analysis";
import { Card, Field, inputCls } from "../components/ui";

const num = (s: string) => { const x = Number(s.replace(",", ".")); return Number.isFinite(x) ? x : 0; };
const fmt = (x: number, d = 0) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d }).format(x);
const pct = (x: number) => `${fmt(x * 100, 1)} %`;

function NumberField({ label, value, set, hint }: { label: string; value: string; set: (v: string) => void; hint?: string }) {
  return <Field label={label} hint={hint}><input className={inputCls} inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} /></Field>;
}
const Result = ({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) => (
  <div className="rounded-xl bg-soft p-3">
    <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
    <p className={`mt-1 text-xl font-bold ${tone === "good" ? "text-[#1b7f3b]" : tone === "bad" ? "text-amber-800" : ""}`}>{value}</p>
  </div>
);

/** Simulateurs indicatifs : montants à saisir dans la devise du bien (aucune conversion). */
export default function Simulateurs({ level }: { level: 1 | 2 | 3 }) {
  const [tab, setTab] = useState<"rent" | "cash" | "loan">("rent");
  const [s, set] = useState({ prix: "180000", loyer: "900", charges: "2500", mens: "650", taxe: "800", assur: "240", copro: "600", entretien: "400", gestion: "6", vacance: "3", capital: "150000", taux: "3.5", duree: "20" });
  const upd = (k: keyof typeof s) => (v: string) => set({ ...s, [k]: v });
  const [cur, setCur] = useState<"EUR" | "XPF">("EUR");
  const m = (x: number, d = 0) => `${fmt(x, cur === "XPF" ? 0 : d)} ${cur === "XPF" ? "XPF" : "€"}`;
  const adv = level >= 2;

  const prix = num(s.prix), loyerAn = num(s.loyer) * 12;
  const net = prix ? (loyerAn - num(s.charges)) / prix : 0;
  const revenus = num(s.loyer) * (adv ? 1 - num(s.vacance) / 100 : 1) * (adv ? 1 - num(s.gestion) / 100 : 1);
  const depenses = num(s.mens) + (num(s.taxe) + num(s.assur) + (adv ? num(s.copro) + num(s.entretien) : 0)) / 12;
  const cf = revenus - depenses;
  const mens = monthlyPayment(num(s.capital), num(s.taux), num(s.duree) * 12);

  const tabs = [["rent", "Rentabilité"], ["cash", "Cash-flow"], ["loan", "Crédit"]] as const;
  return (
    <div className="space-y-4">
      <div role="tablist" className="flex rounded-xl bg-soft p-1 text-sm">
        {tabs.map(([id, l]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`flex-1 rounded-lg py-2 font-medium ${tab === id ? "bg-white shadow-sm" : "text-muted"}`}>{l}</button>
        ))}
      </div>
      <div role="group" aria-label="Devise du bien" className="flex gap-2 text-sm">
        {(["EUR", "XPF"] as const).map((c) => (
          <button key={c} aria-pressed={cur === c} onClick={() => setCur(c)} className={`rounded-lg border border-line px-3 py-2 font-medium ${cur === c ? "bg-white shadow-sm" : "bg-soft text-muted"}`}>{c === "EUR" ? "Euro (€)" : "Franc Pacifique (XPF)"}</button>
        ))}
      </div>
      <Card className="space-y-3">
        {tab === "rent" && (<>
          <NumberField label="Prix d'achat" value={s.prix} set={upd("prix")} />
          <NumberField label="Loyer mensuel" value={s.loyer} set={upd("loyer")} />
          <NumberField label="Charges annuelles" value={s.charges} set={upd("charges")} />
          <div className="grid grid-cols-2 gap-3"><Result label="Rentabilité brute" value={prix ? pct(loyerAn / prix) : "—"} />
            {adv ? <Result label="Rentabilité nette" value={prix ? pct(net) : "—"} /> : <Result label="Rentabilité nette" value="Formule Propriétaire" />}</div>
          <p className="text-xs text-muted">Brute = loyers annuels ÷ prix. Nette = (loyers − charges) ÷ prix, hors crédit et fiscalité personnelle.</p>
        </>)}
        {tab === "cash" && (<>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Loyer mensuel" value={s.loyer} set={upd("loyer")} />
            <NumberField label="Mensualité du crédit" value={s.mens} set={upd("mens")} />
            <NumberField label="Taxe foncière (an)" value={s.taxe} set={upd("taxe")} />
            <NumberField label="Assurance (an)" value={s.assur} set={upd("assur")} />
            {adv && <>
              <NumberField label="Charges copro (an)" value={s.copro} set={upd("copro")} />
              <NumberField label="Entretien (an)" value={s.entretien} set={upd("entretien")} />
              <NumberField label="Gestion (%)" value={s.gestion} set={upd("gestion")} />
              <NumberField label="Vacance (%)" value={s.vacance} set={upd("vacance")} />
            </>}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Result label="Revenus nets /mois" value={m(revenus)} />
            <Result label="Dépenses /mois" value={m(depenses)} />
            <Result label="Cash-flow /mois" value={`${cf >= 0 ? "+" : ""}${m(cf)}`} tone={cf >= 0 ? "good" : "bad"} />
          </div>
          {!adv && <p className="text-xs text-muted">La formule Propriétaire ajoute les charges de copropriété, l'entretien, la gestion et la vacance.</p>}
        </>)}
        {tab === "loan" && (<>
          <NumberField label="Capital emprunté" value={s.capital} set={upd("capital")} />
          <div className="grid grid-cols-2 gap-3"><NumberField label="Taux annuel (%)" value={s.taux} set={upd("taux")} /><NumberField label="Durée (années)" value={s.duree} set={upd("duree")} /></div>
          <div className="grid grid-cols-2 gap-3"><Result label="Mensualité" value={m(mens, 2)} /><Result label="Coût total du crédit" value={m(Math.max(0, mens * num(s.duree) * 12 - num(s.capital)))} /></div>
          <p className="text-xs text-muted">Hors assurance emprunteur et frais de dossier.</p>
        </>)}
      </Card>
      <p className="text-xs text-muted">Simulations indicatives, non contractuelles : elles ne remplacent pas l'avis d'un professionnel. Choisissez la devise du bien : les montants saisis et affichés restent dans cette devise, sans conversion.</p>
    </div>
  );
}
