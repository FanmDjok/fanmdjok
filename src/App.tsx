import { useCallback, useEffect, useState } from "react";
import { localRepository } from "./data/localRepository";
import { supabaseRepository } from "./data/supabaseRepository";
import { supabase } from "./lib/supabase";
import { ACTIVE, analysisLevel, errorMessage, fetchSubscription, openPortal, planById, propertyLimit, type Subscription } from "./lib/billing";
import type { Expense, Payment, Property } from "./data/types";
import Auth, { NouveauMotDePasse } from "./components/Auth";
import Paywall from "./components/Paywall";
import Resiliation from "./components/Resiliation";
import MesDonnees from "./components/MesDonnees";
import { MfaChallenge } from "./components/Mfa";
import Admin from "./components/Admin";
import Accueil from "./pages/Accueil";
import Biens from "./pages/Biens";
import Paiements from "./pages/Paiements";
import Depenses from "./pages/Depenses";
import Rapports from "./pages/Rapports";
import Analyses from "./pages/Analyses";

const TABS = [
  { id: "accueil", label: "Accueil" },
  { id: "biens", label: "Biens" },
  { id: "paiements", label: "Paiements" },
  { id: "depenses", label: "Dépenses" },
  { id: "rapports", label: "Rapports" },
  { id: "analyses", label: "Analyses" },
];

const repo = supabase ? supabaseRepository : localRepository;

export default function App() {
  const [session, setSession] = useState<unknown>(supabase ? undefined : "local");
  const [recovery, setRecovery] = useState(false);
  const [mfaRequis, setMfaRequis] = useState(false);
  useEffect(() => {
    if (!supabase || !session) { setMfaRequis(false); return; }
    // Double authentification : si un facteur est actif, il faut un niveau de confiance aal2 après le mot de passe.
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      setMfaRequis(Boolean(data && data.nextLevel === "aal2" && data.currentLevel !== "aal2"));
    });
  }, [session]);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  if (session === undefined) return null;
  if (recovery) return <NouveauMotDePasse onDone={() => setRecovery(false)} />;
  if (window.location.pathname.replace(/\/$/, "") === "/app/admin") return session ? <Admin /> : <Auth />;
  if (session && mfaRequis) return <MfaChallenge onDone={() => setMfaRequis(false)} onCancel={() => supabase?.auth.signOut()} />;
  if (!session) return <Auth />;
  return supabase ? <Gate /> : <Shell limit={Infinity} />;
}

/** Réserve l'application aux comptes dont l'abonnement (ou l'essai) est actif. */
function Gate() {
  const [sub, setSub] = useState<Subscription | null | undefined>(undefined);
  // Un lien de tarifs avec « plan » ouvre le choix de formule ; sans lui, on entre en formule gratuite.
  const [plansOpen, setPlansOpen] = useState(() => new URLSearchParams(window.location.search).get("plan") !== null);
  const returning = new URLSearchParams(window.location.search).get("abonnement") === "ok";

  useEffect(() => {
    let alive = true;
    let tries = 0;
    const load = async () => {
      const s = await fetchSubscription();
      if (!alive) return;
      setSub(s);
      // Au retour de Stripe, le webhook peut arriver quelques secondes après : on patiente.
      if (returning && !(s && ACTIVE.includes(s.status)) && tries++ < 10) setTimeout(load, 2000);
    };
    load();
    return () => { alive = false; };
  }, [returning]);

  if (sub === undefined) return null;
  if (sub && ACTIVE.includes(sub.status)) return <Shell limit={propertyLimit(sub)} sub={sub} />;
  if (returning) return <p className="p-8 text-center text-sm text-muted" role="status">Activation de votre abonnement en cours…</p>;
  if (plansOpen) return <Paywall hasSubscriptionRecord={Boolean(sub)} onFree={() => setPlansOpen(false)} />;
  return <Shell limit={propertyLimit(null)} free onPlans={() => setPlansOpen(true)} />;
}

function Shell({ limit, sub, free, onPlans }: { limit: number; sub?: Subscription; free?: boolean; onPlans?: () => void }) {
  const [estAdmin, setEstAdmin] = useState(false);
  useEffect(() => { supabase?.rpc("est_admin").then(({ data }) => setEstAdmin(Boolean(data))); }, []);
  const [tab, setTab] = useState("accueil");
  const [properties, setProperties] = useState<Property[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [vue, setVue] = useState<"resilier" | "donnees" | null>(() => (new URLSearchParams(window.location.search).get("mode") === "resilier" ? "resilier" : null));

  const load = useCallback(async () => {
    setProperties(await repo.listProperties());
    setPayments(await repo.listPayments());
    setExpenses(await repo.listExpenses());
  }, []);
  useEffect(() => { load(); }, [load]);

  const manage = async () => {
    if (!sub && onPlans) { onPlans(); return; }
    const r = await openPortal();
    if (r.url) window.location.assign(r.url); else setNotice(errorMessage(r.error));
  };

  return (
    <div className="mx-auto min-h-screen max-w-xl bg-white pb-24">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-white/95 px-5 py-3 backdrop-blur">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-sm font-bold text-white">K</span>
        <span className="font-bold tracking-wide">KAZONLY</span>
        {sub && <span className="ml-2 rounded-full bg-mint px-2 py-0.5 text-xs font-medium text-[#007a70]">{sub.status === "trialing" ? "Essai · " : ""}{planById(sub.plan)?.name}</span>}
        {free && <span className="ml-2 rounded-full bg-soft px-2 py-0.5 text-xs font-medium text-muted">Gratuit</span>}
        {supabase && (
          <div className="ml-auto flex gap-3 text-xs text-muted">
            {sub && <button onClick={manage}>Mon abonnement</button>}
            {free && <button className="font-semibold text-primary" onClick={manage}>Passer à une formule</button>}
            {estAdmin && <a className="font-semibold text-primary" href="/app/admin">Admin</a>}
            <button onClick={() => supabase!.auth.signOut()}>Déconnexion</button>
          </div>
        )}
      </header>
      <main className="px-5 pt-5">
        {notice && <p role="alert" className="mb-4 rounded-xl bg-soft p-3 text-sm">{notice}</p>}
        {sub?.status === "past_due" && (
          <p role="alert" className="mb-4 rounded-xl border border-accent bg-[#fff8e1] p-3 text-sm">
            Le dernier paiement a échoué. <button className="font-semibold underline" onClick={manage}>Mettre à jour ma carte</button> pour éviter l'interruption du service.
          </p>
        )}
        {vue === "resilier" && sub && <Resiliation sub={sub} onClose={() => setVue(null)} />}
        {vue === "donnees" && <MesDonnees />}
        {vue === null && tab.split(":")[0] === "accueil" && <Accueil properties={properties} payments={payments} expenses={expenses} go={setTab} />}
        {tab.split(":")[0] === "biens" && (
          <Biens properties={properties} limit={limit} onUpgrade={manage}
            onSave={async (p) => {
              try { await repo.saveProperty(p); await load(); }
              catch (e) { setNotice(String((e as Error).message).includes("LIMITE_BIENS") ? "Vous avez atteint la limite de biens de votre formule." : "Enregistrement impossible, réessayez."); }
            }} />
        )}
        {tab.startsWith("paiements") && <Paiements key={tab} initialSub={tab.split(":")[1]} properties={properties} payments={payments} onSave={async (p) => { await repo.savePayment(p); await load(); }} />}
        {tab === "depenses" && <Depenses properties={properties} expenses={expenses} onSave={async (e) => { await repo.saveExpense(e); await load(); }} />}
        {tab === "analyses" && <Analyses properties={properties} level={free ? 1 : analysisLevel(sub)} onUpgrade={manage} goBiens={() => setTab("biens")} />}
        {tab === "rapports" && <Rapports properties={properties} payments={payments} expenses={expenses} level={free ? 1 : analysisLevel(sub)} onUpgrade={manage} />}
        {vue === null && <div className="mt-6 flex gap-4 text-sm"><button className="text-primary" onClick={() => setVue("donnees")}>Mes données</button>{sub && <button className="text-primary" onClick={() => setVue("resilier")}>Résilier mon abonnement</button>}</div>}
        <p className="mt-8 border-t border-line pt-4 text-xs text-muted">KAZONLY · La gestion locative pensée pour les Outre-mer · <a className="underline" href="/cgv/">CGV</a> · <a className="underline" href="/confidentialite/">Confidentialité</a></p>
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-white" aria-label="Navigation principale">
        <div className="mx-auto flex max-w-xl">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab.split(":")[0] === t.id ? "page" : undefined} className={`flex-1 py-3 text-xs font-medium ${tab.split(":")[0] === t.id ? "text-primary" : "text-muted"}`}>
              <span className={`mx-auto mb-1 block h-1 w-6 rounded-full ${tab.split(":")[0] === t.id ? "bg-primary" : "bg-transparent"}`} />
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
