import { useState } from "react";
import { ANNUAL_MONTHS_FREE, PLANS, planAmount, type Currency, TRIAL_DAYS, errorMessage, isValidPlan, openPortal, startCheckout, type Interval, type PlanId } from "../lib/billing";
import { supabase } from "../lib/supabase";
import { Btn, Card, Eyebrow } from "./ui";

export default function Paywall({ hasSubscriptionRecord, onFree }: { hasSubscriptionRecord: boolean; onFree?: () => void }) {
  const params = new URLSearchParams(window.location.search);
  const wanted = params.get("plan");
  const [interval, setInterval_] = useState<Interval>(params.get("interval") === "year" ? "year" : "month");
  const [cur, setCur] = useState<Currency>(params.get("cur") === "xpf" ? "XPF" : "EUR");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(
    params.get("abonnement") === "annule" ? "Paiement annulé : aucun montant n'a été débité." : null,
  );

  const go = async (plan: PlanId) => {
    setBusy(plan); setMsg(null);
    const r = await startCheckout(plan, interval, cur);
    if (r.url) { window.location.assign(r.url); return; }
    setMsg(errorMessage(r.error)); setBusy(null);
  };
  const portal = async () => {
    setBusy("portal");
    const r = await openPortal();
    if (r.url) { window.location.assign(r.url); return; }
    setMsg(errorMessage(r.error)); setBusy(null);
  };

  return (
    <div className="mx-auto max-w-xl px-5 py-8">
      <Eyebrow>Dernière étape</Eyebrow>
      <h1 className="mt-1 text-2xl font-bold leading-tight">
        {hasSubscriptionRecord ? "Votre abonnement n'est plus actif." : `Choisissez votre formule : ${TRIAL_DAYS} jours d'essai.`}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {hasSubscriptionRecord
          ? "Réactivez-le pour retrouver l'accès à vos biens, vos loyers et vos dépenses. Vos données sont conservées."
          : "Une carte bancaire est demandée pour démarrer l'essai, mais rien n'est débité pendant l'essai. Vous pouvez aussi continuer gratuitement avec 1 bien, sans carte."}
      </p>

      <div className="my-5 inline-flex rounded-xl border border-line bg-soft p-1 text-sm" role="group" aria-label="Période de facturation">
        {(["month", "year"] as const).map((i) => (
          <button key={i} onClick={() => setInterval_(i)} aria-pressed={interval === i}
            className={`rounded-lg px-4 py-2 font-medium ${interval === i ? "bg-white shadow-sm" : "text-muted"}`}>
            {i === "month" ? "Mensuel" : `Annuel (${ANNUAL_MONTHS_FREE} mois offerts)`}
          </button>
        ))}
      </div>

      <div className="mb-5 ml-2 inline-flex rounded-xl border border-line bg-soft p-1 text-sm" role="group" aria-label="Devise">
        {(["EUR", "XPF"] as const).map((c) => (
          <button key={c} onClick={() => setCur(c)} aria-pressed={cur === c}
            className={`rounded-lg px-4 py-2 font-medium ${cur === c ? "bg-white shadow-sm" : "text-muted"}`}>
            {c === "EUR" ? "Euro (€)" : "Franc Pacifique (XPF)"}
          </button>
        ))}
      </div>

      {msg && <p role="alert" className="mb-4 rounded-xl bg-soft p-3 text-sm">{msg}</p>}

      <div className="space-y-3">
        {PLANS.map((p) => {
          const chosen = isValidPlan(wanted) ? wanted === p.id : p.highlight;
          return (
            <Card key={p.id} className={chosen ? "border-primary ring-1 ring-primary" : ""}>
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <p className="text-lg font-bold">{planAmount(p, interval, cur)}<span className="text-sm font-normal text-muted">{interval === "month" ? "/mois" : "/an"}</span></p>
              </div>
              <p className="text-sm text-muted">{p.tagline}</p>
              <ul className="mt-3 space-y-1 text-sm">{p.features.map((f) => <li key={f}>• {f}</li>)}</ul>
              <Btn className="mt-4 w-full" variant={chosen ? "primary" : "ghost"} disabled={busy !== null} onClick={() => go(p.id as PlanId)}>
                {busy === p.id ? "Redirection…" : hasSubscriptionRecord ? `Choisir ${p.name}` : `Essayer ${TRIAL_DAYS} jours`}
              </Btn>
            </Card>
          );
        })}
      </div>

      <p className="mt-5 text-xs text-muted">
        Paiement sécurisé par Stripe. KAZONLY ne conserve pas vos données bancaires.{" "}
        <a className="text-primary underline" href="/cgv/">CGV</a> · <a className="text-primary underline" href="/confidentialite/">Confidentialité</a>
      </p>
      <div className="mt-4 flex gap-4 text-sm">
        {hasSubscriptionRecord && <button className="text-primary" onClick={portal} disabled={busy !== null}>Gérer mon abonnement</button>}
        {onFree && <button className="font-medium text-primary" onClick={onFree}>Continuer gratuitement (1 bien)</button>}
        <button className="text-muted" onClick={() => supabase?.auth.signOut()}>Se déconnecter</button>
      </div>
    </div>
  );
}
