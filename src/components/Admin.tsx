import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { Btn, Card, Field, PageTitle, inputCls } from "./ui";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Toutes les lectures et écritures passent par des fonctions de base qui vérifient le droit admin (et la double authentification).
const rpc = async (nom: string, args?: Record<string, unknown>): Promise<any> => {
  if (!supabase) throw new Error("non_configure");
  const { data, error } = await supabase.rpc(nom, args ?? {});
  if (error) throw new Error(error.message);
  return data;
};
const TABS = ["Vue d'ensemble", "Parcours", "Utilisateurs", "Abonnements", "Utilisation", "Messages", "Repères", "IRL", "Santé"] as const;
type Tab = (typeof TABS)[number];
const eur = (n: number) => `${Number(n).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} €`;
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "—");

function Stat({ label, value, note }: { label: string; value: ReactNode; note?: string }) {
  return (
    <Card>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </Card>
  );
}

/** Histogramme SVG maison (sans bibliothèque) des inscriptions des 30 derniers jours. */
function Barres({ points }: { points: { jour: string; inscriptions: number }[] }) {
  const max = Math.max(1, ...points.map((p) => p.inscriptions));
  const w = 300, h = 80, gap = 2, bw = (w - gap * points.length) / points.length;
  return (
    <svg viewBox={`0 0 ${w} ${h + 14}`} className="w-full" role="img" aria-label="Inscriptions par jour, 30 derniers jours">
      {points.map((p, i) => {
        const bh = (p.inscriptions / max) * h;
        return <rect key={p.jour} x={i * (bw + gap)} y={h - bh} width={bw} height={Math.max(bh, 1)} rx={1} fill="#1976d2"><title>{`${date(p.jour)} : ${p.inscriptions}`}</title></rect>;
      })}
      <text x="0" y={h + 12} fontSize="9" fill="#5c6470">il y a 30 jours</text>
      <text x={w} y={h + 12} fontSize="9" fill="#5c6470" textAnchor="end">aujourd'hui</text>
    </svg>
  );
}

export default function Admin() {
  const [autorise, setAutorise] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("Vue d'ensemble");
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    rpc("est_admin").then((ok) => setAutorise(Boolean(ok))).catch(() => setAutorise(false));
  }, []);
  if (autorise === null) return null;
  if (!autorise) { window.location.replace("/app/"); return null; }

  return (
    <div className="mx-auto max-w-4xl px-5 pb-12 pt-6">
      <PageTitle eyebrow="Administration" title="Espace admin KAZONLY" sub="Lecture seule, sauf messages, repères réglementaires et indices IRL. Chaque action est journalisée." />
      <nav className="mb-5 flex flex-wrap gap-2" aria-label="Sections de l'administration">
        {TABS.map((t) => (
          <button key={t} onClick={() => { setTab(t); setErreur(null); }} aria-current={tab === t ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${tab === t ? "bg-primary text-white" : "border border-line bg-white text-ink"}`}>{t}</button>
        ))}
      </nav>
      {erreur && <p role="status" className="mb-4 text-sm text-amber-800">{erreur}</p>}
      {tab === "Vue d'ensemble" && <Ensemble setErreur={setErreur} />}
      {tab === "Parcours" && <Parcours setErreur={setErreur} />}
      {tab === "Utilisateurs" && <Utilisateurs setErreur={setErreur} />}
      {tab === "Abonnements" && <Abonnements setErreur={setErreur} />}
      {tab === "Utilisation" && <Utilisation setErreur={setErreur} />}
      {tab === "Messages" && <Messages setErreur={setErreur} />}
      {tab === "Repères" && <Reperes setErreur={setErreur} />}
      {tab === "IRL" && <Irl setErreur={setErreur} />}
      {tab === "Santé" && <Sante setErreur={setErreur} />}
    </div>
  );
}

type P = { setErreur: (m: string | null) => void };
const charger = (fn: () => Promise<void>, setErreur: P["setErreur"]) => { fn().catch((e) => setErreur(`Chargement impossible : ${(e as Error).message}`)); };

function Ensemble({ setErreur }: P) {
  const [d, setD] = useState<any>(null);
  const [serie, setSerie] = useState<any[]>([]);
  useEffect(() => { charger(async () => { setD(await rpc("admin_vue_ensemble")); setSerie(await rpc("admin_inscriptions_par_jour")); }, setErreur); }, []);
  if (!d) return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Stat label="Inscrits" value={d.inscrits_total} note={`${d.inscrits_7j} sur 7 j · ${d.inscrits_30j} sur 30 j`} />
        <Stat label="Comptes payants" value={d.payants} note={`${d.essais} en essai`} />
        <Stat label="Revenu mensuel estimé" value={eur(d.revenu_mensuel_eur)} note="formules actives, annuel ramené au mois ; XPF non inclus" />
        <Stat label="Résiliations du mois" value={d.resiliations_mois} />
        <Stat label="Biens créés ce mois" value={d.biens_crees_mois} note={`${d.biens_total} au total`} />
      </div>
      <Card><h2 className="mb-2 font-semibold">Inscriptions par jour</h2><Barres points={serie.map((p) => ({ jour: p.jour, inscriptions: Number(p.inscriptions) }))} /></Card>
    </div>
  );
}

function Parcours({ setErreur }: P) {
  const [d, setD] = useState<any>(null);
  useEffect(() => { charger(async () => setD(await rpc("admin_parcours")), setErreur); }, []);
  if (!d) return null;
  const etapes = [
    { nom: "Inscrits", n: d.inscrits, b: d.inscrits, b30: d.inscrits_30j },
    { nom: "Premier bien", n: d.avec_bien, b: d.inscrits, b30: d.avec_bien_30j },
    { nom: "Premier bail", n: d.avec_bail, b: d.avec_bien, b30: null },
    { nom: "Abonnement payant", n: d.abonnes_payants, b: d.avec_bail || d.avec_bien, b30: d.payants_30j },
  ];
  const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : "—");
  return (
    <Card>
      <h2 className="mb-3 font-semibold">Parcours de conversion (depuis le début)</h2>
      <ul className="space-y-2 text-sm">
        {etapes.map((e) => (
          <li key={e.nom} className="flex justify-between border-b border-line pb-2"><span>{e.nom}</span><span className="font-medium">{e.n} · {pct(e.n, e.b)}</span></li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">Sur les 30 derniers jours : {d.inscrits_30j} inscrits, {d.avec_bien_30j} avec un bien, {d.payants_30j} abonnés payants parmi eux.</p>
    </Card>
  );
}

function Utilisateurs({ setErreur }: P) {
  const [recherche, setRecherche] = useState("");
  const [plan, setPlan] = useState("");
  const [liste, setListe] = useState<any[]>([]);
  const [fiche, setFiche] = useState<any>(null);
  const lancer = () => charger(async () => setListe(await rpc("admin_utilisateurs", { p_recherche: recherche, p_plan: plan, p_limite: 100 })), setErreur);
  useEffect(lancer, []);
  return (
    <div className="space-y-3">
      <Card className="grid gap-3 md:grid-cols-3">
        <Field label="Recherche (e-mail ou nom)"><input className={inputCls} value={recherche} onChange={(e) => setRecherche(e.target.value)} /></Field>
        <Field label="Formule"><select className={inputCls} value={plan} onChange={(e) => setPlan(e.target.value)}><option value="">Toutes</option><option value="gratuit">Gratuit</option><option value="essentiel">Essentiel</option><option value="proprietaire">Propriétaire</option><option value="investisseur">Investisseur</option></select></Field>
        <div className="flex items-end"><Btn className="w-full" onClick={lancer}>Filtrer</Btn></div>
      </Card>
      {fiche && (
        <Card>
          <div className="flex justify-between"><h2 className="font-semibold">{fiche.email}</h2><button className="text-sm text-primary" onClick={() => setFiche(null)}>Fermer</button></div>
          <p className="mt-2 text-sm">Prénom : {fiche.prenom ?? "—"} · Territoire : {fiche.territoire ?? "—"} · Formule : {fiche.plan ?? "—"} ({fiche.statut ?? "—"})</p>
          <p className="text-sm">Biens : {fiche.nb_biens} · Inscrit le {date(fiche.created_at)} · Dernière connexion : {date(fiche.derniere_connexion)}</p>
        </Card>
      )}
      <Card>
        <p className="mb-2 text-xs text-muted">{liste.length} compte(s)</p>
        <ul className="divide-y divide-line text-sm">
          {liste.map((u) => (
            <li key={u.id}><button className="flex w-full justify-between py-2 text-left" onClick={() => setFiche(u)}>
              <span className="truncate pr-2">{u.email}</span><span className="shrink-0 text-muted">{u.plan ?? "—"} · {u.nb_biens} bien(s)</span></button></li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Abonnements({ setErreur }: P) {
  const [d, setD] = useState<any>(null);
  useEffect(() => { charger(async () => setD(await rpc("admin_abonnements")), setErreur); }, []);
  if (!d) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card>
        <h2 className="mb-2 font-semibold">Par formule</h2>
        <ul className="text-sm">{d.par_formule.map((x: any) => <li key={`${x.plan_code}-${x.periodicite}`} className="flex justify-between py-1"><span>{x.plan_code} · {x.periodicite}</span><span>{x.n}</span></li>)}</ul>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">À surveiller</h2>
        <p className="text-sm">Essais qui finissent dans 7 jours : <b>{d.essais_finissent_7j}</b></p>
        <p className="text-sm">Paiements en échec (past_due) : <b>{d.past_due.length}</b></p>
        <p className="text-sm">Résiliations sur 30 jours : <b>{d.resiliations_30j}</b></p>
        <p className="mt-3 text-xs text-muted">Tableau de bord de paiement : dashboard.stripe.com (lecture seule ici).</p>
      </Card>
    </div>
  );
}

function Utilisation({ setErreur }: P) {
  const [d, setD] = useState<any>(null);
  useEffect(() => { charger(async () => setD(await rpc("admin_utilisation")), setErreur); }, []);
  if (!d) return null;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card>
        <h2 className="mb-2 font-semibold">Biens par territoire</h2>
        <ul className="text-sm">{d.biens_par_territoire.map((x: any) => <li key={x.territoire} className="flex justify-between py-1"><span>{x.territoire}</span><span>{x.n}</span></li>)}</ul>
      </Card>
      <Card className="space-y-1 text-sm">
        <h2 className="mb-2 font-semibold">Comptes</h2>
        <p>Baux actifs : <b>{d.baux_actifs}</b></p>
        <p>Comptes sans bien : <b>{d.comptes_sans_bien}</b></p>
        <p>Inactifs depuis 30 jours : <b>{d.inactifs_30j}</b></p>
        <p>Ont atteint leur limite de biens : <b>{d.a_atteint_limite}</b> (prospects pour la formule supérieure)</p>
      </Card>
    </div>
  );
}

function Messages({ setErreur }: P) {
  const [liste, setListe] = useState<any[]>([]);
  const charge = () => charger(async () => setListe(await rpc("admin_messages")), setErreur);
  useEffect(charge, []);
  const basculer = async (m: any) => {
    try { await rpc("admin_message_statut", { p_id: m.id, p_statut: m.statut === "traite" ? "a_traiter" : "traite" }); charge(); }
    catch (e) { setErreur(`Mise à jour impossible : ${(e as Error).message}`); }
  };
  return (
    <div className="space-y-3">
      {liste.length === 0 && <Card><p className="text-sm text-muted">Aucun message pour l'instant.</p></Card>}
      {liste.map((m) => (
        <Card key={m.id} className="space-y-2 text-sm">
          <div className="flex justify-between gap-2"><b>{m.name}</b><span className={m.statut === "traite" ? "text-muted" : "text-amber-800 font-semibold"}>{m.statut === "traite" ? "Traité" : "À traiter"}</span></div>
          <p className="text-muted">{m.email} · {m.topic ?? "—"} · {m.territory ?? "—"} · {m.properties ?? "—"} bien(s) · {date(m.created_at)}</p>
          <p className="whitespace-pre-wrap">{m.message}</p>
          <Btn variant="ghost" onClick={() => basculer(m)}>{m.statut === "traite" ? "Remettre à traiter" : "Marquer traité"}</Btn>
        </Card>
      ))}
    </div>
  );
}

const VIDE = { id: "", territoire: "martinique", categorie: "location", titre: "", resume: "", source_url: "https://", date_effet: "", verifier_avant: "", publie: false };
function Reperes({ setErreur }: P) {
  const [liste, setListe] = useState<any[]>([]);
  const [f, setF] = useState<any>(VIDE);
  const charge = () => charger(async () => setListe(await rpc("admin_reperes")), setErreur);
  useEffect(charge, []);
  const enregistrer = async () => {
    try {
      await rpc("admin_repere_enregistrer", { p: { ...f, id: f.id || null, date_effet: f.date_effet || null } });
      setF(VIDE); setErreur(null); charge();
    } catch (e) {
      const m = (e as Error).message;
      setErreur(m.includes("source_obligatoire") ? "Le lien source doit commencer par https://." : m.includes("revalidation_depassee") ? "Date de revérification dépassée : revérifiez le repère avant de le publier." : m.includes("date_revalidation") ? "Indiquez la date « à revérifier avant le »." : `Enregistrement impossible : ${m}`);
    }
  };
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h2 className="font-semibold">{f.id ? "Modifier le repère" : "Nouveau repère"}</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Territoire"><input className={inputCls} value={f.territoire} onChange={(e) => setF({ ...f, territoire: e.target.value })} /></Field>
          <Field label="Catégorie"><input className={inputCls} value={f.categorie} onChange={(e) => setF({ ...f, categorie: e.target.value })} /></Field>
          <Field label="Titre"><input className={inputCls} value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} /></Field>
          <Field label="Lien source (officiel, https)"><input className={inputCls} value={f.source_url} onChange={(e) => setF({ ...f, source_url: e.target.value })} /></Field>
          <Field label="Date d'effet"><input type="date" className={inputCls} value={f.date_effet} onChange={(e) => setF({ ...f, date_effet: e.target.value })} /></Field>
          <Field label="À revérifier avant le"><input type="date" className={inputCls} value={f.verifier_avant} onChange={(e) => setF({ ...f, verifier_avant: e.target.value })} /></Field>
        </div>
        <Field label="Résumé"><textarea className={inputCls} rows={3} value={f.resume} onChange={(e) => setF({ ...f, resume: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.publie} onChange={(e) => setF({ ...f, publie: e.target.checked })} /> Publier (rien n'est publié par défaut)</label>
        <Btn className="w-full" onClick={enregistrer} disabled={!f.titre || !f.resume || !f.verifier_avant}>Enregistrer</Btn>
      </Card>
      <Card>
        <ul className="divide-y divide-line text-sm">
          {liste.map((r) => (
            <li key={r.id} className="py-2">
              <button className="w-full text-left" onClick={() => setF({ id: r.id, territoire: r.territoire, categorie: r.categorie, titre: r.titre, resume: r.resume, source_url: r.source_url, date_effet: r.date_effet ?? "", verifier_avant: r.verifier_avant ?? "", publie: r.publie })}>
                <span className="font-medium">{r.titre}</span> <span className="text-muted">· {r.territoire ?? "tous"} · {r.publie ? "publié" : "non publié"}</span>
                {r.a_revalider && <span className="ml-2 font-semibold text-amber-800">À revérifier</span>}
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Irl({ setErreur }: P) {
  const [liste, setListe] = useState<any[]>([]);
  const [f, setF] = useState({ trimestre: "", valeur: "", date_publication: "", lien_insee: "https://www.insee.fr/" });
  const charge = () => charger(async () => setListe(await rpc("admin_irl")), setErreur);
  useEffect(charge, []);
  // Rappel : le dernier trimestre attendu (T-1) doit être saisi.
  const now = new Date(); const q = Math.floor(now.getMonth() / 3); const prec = q === 0 ? `${now.getFullYear() - 1}-T4` : `${now.getFullYear()}-T${q}`;
  const dernier = liste[0]?.trimestre;
  const enregistrer = async () => {
    try { await rpc("admin_irl_enregistrer", { p_trimestre: f.trimestre, p_valeur: Number(f.valeur), p_date: f.date_publication, p_lien: f.lien_insee }); setF({ ...f, valeur: "" }); charge(); }
    catch (e) { setErreur(`Enregistrement impossible : ${(e as Error).message}`); }
  };
  return (
    <div className="space-y-4">
      {dernier !== prec && <Card className="border-amber-300 text-sm text-amber-800">Rappel : l'indice IRL du trimestre {prec} n'est pas encore saisi (dernier saisi : {dernier ?? "aucun"}). Vérifiez la publication Insee.</Card>}
      <Card className="grid gap-3 md:grid-cols-2">
        <Field label="Trimestre (ex. 2026-T3)"><input className={inputCls} value={f.trimestre} onChange={(e) => setF({ ...f, trimestre: e.target.value })} /></Field>
        <Field label="Valeur de l'indice"><input className={inputCls} inputMode="decimal" value={f.valeur} onChange={(e) => setF({ ...f, valeur: e.target.value })} /></Field>
        <Field label="Date de publication"><input type="date" className={inputCls} value={f.date_publication} onChange={(e) => setF({ ...f, date_publication: e.target.value })} /></Field>
        <Field label="Lien Insee officiel"><input className={inputCls} value={f.lien_insee} onChange={(e) => setF({ ...f, lien_insee: e.target.value })} /></Field>
        <div className="md:col-span-2"><Btn className="w-full" onClick={enregistrer} disabled={!f.trimestre || !f.valeur || !f.date_publication}>Enregistrer l'indice</Btn></div>
      </Card>
      <Card>
        <ul className="divide-y divide-line text-sm">{liste.map((i) => <li key={i.id} className="flex justify-between py-2"><span>{i.trimestre}</span><span>{i.valeur} · publié le {date(i.date_publication)}</span></li>)}</ul>
      </Card>
    </div>
  );
}

function Sante({ setErreur }: P) {
  const [d, setD] = useState<any>(null);
  useEffect(() => { charger(async () => setD(await rpc("admin_sante")), setErreur); }, []);
  if (!d) return null;
  const jauge = (nom: string, val: number, limite: number, detail: string) => {
    const p = Math.min(100, Math.round((val / limite) * 100));
    const alerte = p >= 85 ? "alerte" : p >= 70 ? "attention" : "";
    return (
      <Card key={nom}>
        <div className="flex justify-between text-sm"><span>{nom}</span><span className={alerte ? "font-semibold text-amber-800" : ""}>{p} %</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-soft"><div className={`h-2 ${alerte ? "bg-amber-600" : "bg-secondary"}`} style={{ width: `${p}%` }} /></div>
        <p className="mt-1 text-xs text-muted">{detail}</p>
      </Card>
    );
  };
  const mo = (n: number) => `${(n / 1048576).toFixed(1)} Mo`;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {jauge("Base de données (limite 0,5 Go)", d.base_octets, d.base_limite_octets, mo(d.base_octets) + " utilisés")}
        {jauge("Utilisateurs actifs du mois (limite 50 000)", d.utilisateurs_actifs_30j, d.utilisateurs_limite, `${d.utilisateurs_actifs_30j} sur 30 jours`)}
        {jauge("E-mails du jour (limite 300)", d.emails_aujourdhui, d.emails_limite, "depuis le journal d'envoi (Brevo, à activer)")}
      </div>
      <Card className="space-y-3 text-sm">
        <p>Dernier export de la base : <b>{d.dernier_export ? date(d.dernier_export) : "jamais"}</b> (rappel hebdomadaire recommandé).</p>
        <Btn variant="ghost" className="w-full" onClick={async () => {
          try {
            const corps = await rpc("admin_exporter_base");
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([JSON.stringify(corps, null, 2)], { type: "application/json" }));
            a.download = "kazonly-export-base.json"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
          } catch (e) { setErreur(`Export impossible : ${(e as Error).message}`); }
        }}>Exporter la base (JSON)</Btn>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold">Tâches planifiées</h2>
        {d.taches.length === 0
          ? <p className="text-sm text-muted">Aucune tâche enregistrée. Les rappels et la dépublication automatique des repères seront listés ici une fois les tâches planifiées activées.</p>
          : <ul className="text-sm">{d.taches.map((t: any) => <li key={t.nom} className="flex justify-between py-1"><span>{t.nom}</span><span>{t.statut} · {date(t.derniere_execution)}</span></li>)}</ul>}
      </Card>
    </div>
  );
}
