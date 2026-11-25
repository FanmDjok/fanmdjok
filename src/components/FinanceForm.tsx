import { useState } from "react";
import type { Finance, Property } from "../data/types";
import { Btn, Field, inputCls } from "./ui";

const FIELDS: { key: keyof Finance; label: string; hint?: string }[] = [
  { key: "prixAchat", label: "Prix d'achat" },
  { key: "valeurActuelle", label: "Valeur actuelle estimée" },
  { key: "capitalRestant", label: "Capital restant dû" },
  { key: "mensualite", label: "Mensualité du prêt" },
  { key: "tauxCredit", label: "Taux du prêt (%)" },
  { key: "dureeRestanteMois", label: "Durée restante (mois)" },
  { key: "taxeFonciere", label: "Taxe foncière (par an)" },
  { key: "assurance", label: "Assurance (par an)" },
  { key: "chargesCopro", label: "Charges de copropriété (par an)" },
  { key: "entretien", label: "Entretien (par an)" },
];

/** Saisie facultative des données financières d'un bien, dans sa devise. */
export default function FinanceForm({ property, onSave, onClose }: { property: Property; onSave: (p: Property) => Promise<void>; onClose: () => void }) {
  const [v, setV] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS.map((f) => [f.key, property.finance?.[f.key] === undefined ? "" : String(property.finance[f.key])])));
  const unit = property.currency === "XPF" ? "XPF" : "€";
  const submit = async () => {
    const finance: Finance = {};
    for (const f of FIELDS) {
      const x = v[f.key].trim().replace(",", ".");
      if (x !== "" && Number.isFinite(Number(x)) && Number(x) >= 0) (finance as Record<string, number>)[f.key] = Number(x);
    }
    await onSave({ ...property, finance });
    onClose();
  };
  return (
    <div className="mt-4 space-y-3 rounded-xl bg-soft p-3">
      <p className="text-sm font-semibold">Données financières <span className="font-normal text-muted">(facultatif, en {unit})</span></p>
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <input className={inputCls} inputMode="decimal" value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
          </Field>
        ))}
      </div>
      <p className="text-xs text-muted">Ces données restent privées et ne servent qu'à calculer vos analyses. Laissez vide ce que vous ne connaissez pas.</p>
      <div className="flex gap-3"><Btn onClick={submit} className="flex-1">Enregistrer</Btn><Btn variant="ghost" onClick={onClose}>Fermer</Btn></div>
    </div>
  );
}
