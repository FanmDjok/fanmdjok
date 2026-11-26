import { useState } from "react";
import type { Property } from "../data/types";
import { uid } from "../data/localRepository";
import { TERRITORIES, TYPES_LOCATION, getTerritory, validatePostalCode, type TypeLocation } from "../lib/territories";
import { exempleTelephone, indicatifTerritoire, normaliserTelephone } from "../lib/telephone";
import { formatMoney } from "../lib/money";
import FinanceForm from "../components/FinanceForm";
import { Btn, Card, Empty, Field, PageTitle, inputCls } from "../components/ui";

export default function Biens({ properties, onSave, limit, onUpgrade }: { properties: Property[]; onSave: (p: Property) => Promise<void>; limit: number; onUpgrade: () => void }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <>
      <PageTitle eyebrow="Biens" title="Gérez vos biens en un seul endroit." sub="Loyers, adresses et informations locataire." />
      {properties.length >= limit ? (
        <Card className="mb-4 border-accent bg-[#fff8e1]">
          <p className="text-sm">Vous avez atteint la limite de {limit} bien{limit > 1 ? "s" : ""} de votre formule.</p>
          <button className="mt-1 text-sm font-semibold text-primary underline" onClick={onUpgrade}>Passer à la formule supérieure</button>
        </Card>
      ) : (
        <Btn onClick={() => setOpen(true)} className="mb-4 w-full">+ Ajouter une propriété</Btn>
      )}
      {open && <PropertyForm onCancel={() => setOpen(false)} onSave={async (p) => { await onSave(p); setOpen(false); }} />}
      {properties.length === 0 && !open && (
        <Card><Empty title="Aucune propriété pour le moment" text="Ajoutez votre premier logement pour garder vos informations locatives à portée de main." /></Card>
      )}
      <div className="space-y-3">
        {properties.map((p) => {
          const t = getTerritory(p.territoire);
          const type = TYPES_LOCATION.find((x) => x.id === p.typeLocation)!;
          return (
            <Card key={p.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{p.name} <span className="font-normal text-muted">— {t.label}</span></h3>
                  <p className="text-sm text-muted">{[p.numero, p.rue].filter(Boolean).join(" ")}{p.numero || p.rue ? ", " : ""}{p.codePostal}</p>
                </div>
                <span className="rounded-full bg-mint px-2.5 py-1 text-xs font-medium text-[#007a70]">{type.label}</span>
              </div>
              <p className="mt-3 text-lg font-bold">{formatMoney(p.loyer, p.currency)}<span className="text-sm font-normal text-muted">{type.touristique ? " / nuit" : " / mois"}</span></p>
              {editing === p.id ? (
                <FinanceForm property={p} onSave={onSave} onClose={() => setEditing(null)} />
              ) : (
                <button className="mt-3 text-sm font-semibold text-primary underline" onClick={() => setEditing(p.id)}>
                  {p.finance && Object.keys(p.finance).length ? "Modifier les données financières" : "Ajouter les données financières (pour les analyses)"}
                </button>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

function PropertyForm({ onSave, onCancel }: { onSave: (p: Property) => Promise<void>; onCancel: () => void }) {
  const [territoire, setTerritoire] = useState("");
  const [name, setName] = useState("");
  const [numero, setNumero] = useState("");
  const [rue, setRue] = useState("");
  const [codePostal, setCodePostal] = useState("");
  const [type, setType] = useState<TypeLocation>("nue");
  const [loyer, setLoyer] = useState("");
  const [occ, setOcc] = useState("65");
  const [locNom, setLocNom] = useState("");
  const [locTel, setLocTel] = useState("");
  const [touched, setTouched] = useState(false);

  const t = territoire ? getTerritory(territoire) : null;
  const typeInfo = TYPES_LOCATION.find((x) => x.id === type)!;
  const cpError = t && touched ? validatePostalCode(t.id, codePostal) : null;
  const telephone = t ? normaliserTelephone(locTel, t.id) : null;
  const telError = telephone && !telephone.ok && touched ? telephone.message : null;
  const valid = name && rue && t && !validatePostalCode(t.id, codePostal) && Number(loyer) > 0 && (!telephone || telephone.ok);

  // Le code postal propose le préfixe du territoire choisi ; il reste vide tant qu'aucun territoire n'est choisi.
  const pickTerritory = (id: string) => {
    setTerritoire(id);
    setCodePostal(id ? getTerritory(id).postal : "");
  };

  const submit = async () => {
    setTouched(true);
    if (!valid || !t || !telephone || !telephone.ok) return;
    await onSave({
      id: uid(), name, numero, rue, codePostal, territoire: t.id, currency: t.currency,
      typeLocation: type, loyer: Number(loyer), tauxOccupation: typeInfo.touristique ? Number(occ) : undefined,
      locataireNom: locNom || undefined, locatairePhone: telephone.e164 ?? undefined, actif: true,
    });
  };

  return (
    <Card className="mb-4 space-y-4">
      <h2 className="text-lg font-semibold">Ajouter une propriété</h2>

      <Field label="Territoire" hint="Il détermine la devise, le code postal et l'indicatif téléphonique.">
        <select className={inputCls} value={territoire} onChange={(e) => pickTerritory(e.target.value)}>
          <option value="">Choisir un territoire…</option>
          {TERRITORIES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
      </Field>

      <Field label="Nom du bien" hint="Un nom qui vous aide à le reconnaître, par exemple « T2 centre-ville ».">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. : T2 centre-ville" />
      </Field>

      <fieldset className="space-y-3 rounded-xl bg-soft p-3">
        <legend className="px-1 text-sm font-semibold">Adresse</legend>
        <div className="grid grid-cols-[90px_1fr] gap-3">
          <Field label="Numéro"><input className={inputCls} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="N°" /></Field>
          <Field label="Rue / voie"><input className={inputCls} value={rue} onChange={(e) => setRue(e.target.value)} placeholder="Nom de la rue" /></Field>
        </div>
        <Field label="Code postal" hint={t ? (t.postalFixed ? "Code postal unique pour ce territoire" : `Commence par ${t.postal}`) : "Choisissez d'abord un territoire"}>
          <input className={inputCls} value={codePostal} disabled={!t || t.postalFixed} inputMode="numeric" maxLength={5}
            placeholder={t ? (t.postalFixed ? t.postal : `${t.postal}xx`) : ""}
            onChange={(e) => setCodePostal(e.target.value.replace(/\D/g, ""))} />
          {cpError && <span className="mt-1 block text-xs text-amber-800">{cpError}</span>}
        </Field>
      </fieldset>

      <Field label="Type de location" hint={typeInfo.hint}>
        <select className={inputCls} value={type} onChange={(e) => setType(e.target.value as TypeLocation)}>
          {TYPES_LOCATION.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
      </Field>

      <Field label={typeInfo.touristique ? "Tarif par nuit" : "Loyer mensuel"} hint={t ? `Devise : ${t.currency === "XPF" ? "franc Pacifique (XPF)" : "euro (€)"}` : "La devise s'affiche dès que vous choisissez le territoire"}>
        <div className="flex items-center gap-2">
          <input className={inputCls} value={loyer} inputMode="decimal" disabled={!t} onChange={(e) => setLoyer(e.target.value.replace(",", "."))} placeholder="Montant" />
          <span className="min-w-[3.5rem] rounded-xl bg-soft px-3 py-2.5 text-center text-sm font-semibold">{t ? (t.currency === "XPF" ? "XPF" : "€") : "—"}</span>
        </div>
      </Field>
      {typeInfo.touristique && (
        <Field label="Taux d'occupation estimé (%)"><input className={inputCls} value={occ} inputMode="numeric" onChange={(e) => setOcc(e.target.value.replace(/\D/g, ""))} /></Field>
      )}

      <fieldset className="space-y-3 rounded-xl bg-soft p-3">
        <legend className="px-1 text-sm font-semibold">Locataire (facultatif)</legend>
        <Field label="Nom du locataire"><input className={inputCls} value={locNom} onChange={(e) => setLocNom(e.target.value)} /></Field>
        <Field label="Téléphone" hint={t ? `Indicatif ${indicatifTerritoire(t.id)} pour ce territoire. Vous pouvez saisir un numéro avec +.` : "Choisissez d'abord un territoire"}>
          <div className="flex gap-2">
            <span className="min-w-[4rem] rounded-xl bg-white px-2.5 py-2.5 text-center text-sm font-semibold">{t ? indicatifTerritoire(t.id) : "+"}</span>
            <input className={inputCls} value={locTel} inputMode="tel" disabled={!t} onChange={(e) => setLocTel(e.target.value)}
              placeholder={t ? `Ex. : ${exempleTelephone(t.id)}` : ""} aria-invalid={Boolean(telError)} />
          </div>
          {telError && <span className="mt-1 block text-xs text-amber-800">{telError}</span>}
        </Field>
        <p className="text-xs text-muted">Vous êtes responsable des données de votre locataire. KAZONLY les héberge pour vous et ne les utilise jamais à d'autres fins.</p>
      </fieldset>

      <div className="flex gap-3">
        <Btn onClick={submit} className="flex-1">Enregistrer</Btn>
        <Btn variant="ghost" onClick={onCancel}>Annuler</Btn>
      </div>
    </Card>
  );
}
