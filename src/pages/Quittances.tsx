import { useState } from "react";
import type { Payment, Property } from "../data/types";
import { currentMonth, monthLabel, shiftMonth } from "../lib/period";
import { formatMoney } from "../lib/money";
import { getTerritory } from "../lib/territories";
import { useBailleur, type Bailleur } from "../lib/bailleur";
import { Btn, Card, Empty, Field, inputCls } from "../components/ui";

const lastDay = (m: string) => { const [y, mo] = m.split("-").map(Number); return new Date(y, mo, 0).getDate(); };
const fr = (m: string, d: number) => `${String(d).padStart(2, "0")}/${m.slice(5)}/${m.slice(0, 4)}`;

export function quittanceLines(p: Property, pay: Payment, b: Bailleur, charges: number, today = new Date()): string[] {
  const loyerHC = pay.amount - charges;
  const adresse = `${p.numero} ${p.rue}, ${p.codePostal} ${getTerritory(p.territoire).label}`.replace(/\s+/g, " ").trim();
  const lines = [
    `QUITTANCE DE LOYER — ${monthLabel(pay.month)}`,
    `Bailleur : ${b.nom || "[nom du bailleur]"}${b.adresse ? `, ${b.adresse}` : ""}`,
    `Locataire : ${p.locataireNom || "[nom du locataire]"}`,
    `Logement : ${p.name}, ${adresse}`,
    `Période : du ${fr(pay.month, 1)} au ${fr(pay.month, lastDay(pay.month))}`,
    charges > 0 ? `Loyer hors charges : ${formatMoney(loyerHC, p.currency)} · Charges : ${formatMoney(charges, p.currency)}` : `Loyer : ${formatMoney(pay.amount, p.currency)}`,
    `Total reçu : ${formatMoney(pay.amount, p.currency)}`,
    `Je soussigné(e) ${b.nom || "[nom du bailleur]"}, bailleur du logement désigné ci-dessus, déclare avoir reçu de ${p.locataireNom || "[nom du locataire]"} la somme de ${formatMoney(pay.amount, p.currency)} au titre du loyer${charges > 0 ? " et des charges" : ""} de la période indiquée, et lui en donne quittance, sous réserve de tous mes droits.`,
    `Fait à ${b.ville || "[ville]"}, le ${today.toLocaleDateString("fr-FR")}.`,
  ];
  return lines;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
function printHtml(lines: string[]) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(`<!doctype html><meta charset="utf-8"><title>${esc(lines[0])}</title><style>body{font:16px/1.6 system-ui,sans-serif;max-width:680px;margin:40px auto;padding:0 24px;color:#111}h1{font-size:22px;margin:0 0 24px}p{margin:0 0 12px}.sig{margin-top:48px}</style><h1>${esc(lines[0])}</h1>${lines.slice(1, 7).map((l) => `<p>${esc(l)}</p>`).join("")}<p style="margin-top:24px">${esc(lines[7])}</p><p class="sig">${esc(lines[8])}</p><p class="sig">Signature du bailleur :</p>`);
  w.document.close(); w.focus(); w.print();
  return true;
}

export default function Quittances({ properties, payments }: { properties: Property[]; payments: Payment[] }) {
  const [month, setMonth] = useState(currentMonth());
  const [b, setB] = useBailleur();
  const [open, setOpen] = useState<string | null>(null);
  const [charges, setCharges] = useState(0);
  const [msg, setMsg] = useState("");
  const recus = payments.filter((p) => p.month === month && p.status === "recu");
  const prop = (id: string) => properties.find((x) => x.id === id)!;
  const current = recus.find((p) => p.id === open);

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-semibold">Vos informations de bailleur</h2>
        <p className="mb-2 text-xs text-muted">Elles apparaissent sur la quittance et restent enregistrées sur cet appareil.</p>
        <div className="space-y-2">
          <Field label="Nom ou raison sociale"><input className={inputCls} value={b.nom} onChange={(e) => setB({ ...b, nom: e.target.value })} /></Field>
          <Field label="Adresse (facultative)"><input className={inputCls} value={b.adresse} onChange={(e) => setB({ ...b, adresse: e.target.value })} /></Field>
          <Field label="Ville de signature"><input className={inputCls} value={b.ville} onChange={(e) => setB({ ...b, ville: e.target.value })} /></Field>
        </div>
      </Card>
      <div className="flex items-center gap-2">
        <Btn variant="ghost" onClick={() => { setMonth(shiftMonth(month, -1)); setOpen(null); }}>←</Btn>
        <span className="flex-1 text-center font-medium capitalize">{monthLabel(month)}</span>
        <Btn variant="ghost" onClick={() => { setMonth(shiftMonth(month, 1)); setOpen(null); }}>→</Btn>
      </div>
      <Card>
        <h2 className="font-semibold">Loyers reçus, quittance prête</h2>
        <p className="mb-2 text-xs text-muted">Une quittance n'est proposée que pour un loyer marqué « Reçu ».</p>
        {recus.length === 0 ? <Empty title="Aucun loyer reçu ce mois-ci" text="Marquez un loyer comme reçu dans « Échéances » : sa quittance apparaît ici." /> : (
          <ul className="divide-y divide-line">
            {recus.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 py-3">
                <div><p className="font-medium">{prop(p.propertyId).name}</p><p className="text-sm text-muted">{formatMoney(p.amount, prop(p.propertyId).currency)}</p></div>
                <Btn variant="ghost" onClick={() => { setOpen(open === p.id ? null : p.id); setCharges(0); setMsg(""); }}>{open === p.id ? "Fermer" : "Voir la quittance"}</Btn>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {current && (() => {
        const p = prop(current.propertyId); const lines = quittanceLines(p, current, b, charges);
        return (
          <Card className="border-secondary">
            <Field label={`Dont charges (${p.currency === "XPF" ? "XPF" : "€"}, facultatif)`} hint="À renseigner si votre bail distingue loyer et charges.">
              <input className={inputCls} type="number" min={0} max={current.amount} value={charges || ""} onChange={(e) => setCharges(Math.min(current.amount, Math.max(0, Number(e.target.value))))} />
            </Field>
            <article className="mt-3 space-y-2 rounded-xl bg-soft p-4 text-sm" aria-label="Aperçu de la quittance">
              <h3 className="font-bold">{lines[0]}</h3>
              {lines.slice(1, 7).map((l, i) => <p key={i}>{l}</p>)}
              <p className="pt-2">{lines[7]}</p><p>{lines[8]}</p>
            </article>
            <div className="mt-3 flex flex-wrap gap-2">
              <Btn onClick={() => { if (!printHtml(lines)) setMsg("Le navigateur a bloqué l'ouverture : autorisez les fenêtres, ou copiez le texte."); }}>Imprimer / PDF</Btn>
              <Btn variant="ghost" onClick={async () => { try { await navigator.clipboard.writeText(lines.join("\n")); setMsg("Texte copié."); } catch { setMsg("Copie impossible sur cet appareil."); } }}>Copier le texte</Btn>
            </div>
            {msg && <p role="status" className="mt-2 text-xs text-muted">{msg}</p>}
          </Card>
        );
      })()}
      <p className="text-xs text-muted">Modèle simple de quittance : vérifiez qu'il correspond à votre bail. KAZONLY n'envoie rien au locataire et ne donne pas de conseil juridique.</p>
    </div>
  );
}
