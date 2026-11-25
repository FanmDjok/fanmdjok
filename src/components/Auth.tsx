import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Btn, Card, Field, PageTitle, inputCls } from "./ui";

export default function Auth() {
  const initial = new URLSearchParams(window.location.search).get("mode") === "inscription" ? "up" : "in";
  const [mode, setMode] = useState<"in" | "up">(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!supabase) return;
    setBusy(true); setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg("Adresse e-mail ou mot de passe incorrect.");
    } else {
      const { error, data } = await supabase.auth.signUp({
        email, password,
        options: {
          // On conserve le choix de formule après la confirmation de l'e-mail.
          emailRedirectTo: `${window.location.origin}/app/${window.location.search}`,
          data: { consent_cgv_at: new Date().toISOString() },
        },
      });
      if (error) setMsg("Création impossible. Vérifiez l'adresse e-mail et choisissez un mot de passe d'au moins 8 caractères.");
      else if (!data.session) setMsg("Compte créé. Consultez votre boîte mail pour confirmer votre adresse, puis revenez ici.");
    }
    setBusy(false);
  };

  const ok = email && password.length >= 8 && (mode === "in" || consent);

  return (
    <div className="mx-auto max-w-xl px-5 pt-12">
      <PageTitle eyebrow="KAZONLY" title={mode === "in" ? "Connexion" : "Créer mon compte"} sub="La gestion locative pensée pour les Outre-mer." />
      <Card className="space-y-4">
        <Field label="Adresse e-mail"><input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
        <Field label="Mot de passe" hint={mode === "up" ? "8 caractères minimum" : undefined}>
          <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} />
        </Field>
        {mode === "up" && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>J'accepte les <a className="text-primary underline" href="/cgv/" target="_blank" rel="noopener">conditions générales</a> et la <a className="text-primary underline" href="/confidentialite/" target="_blank" rel="noopener">politique de confidentialité</a>.</span>
          </label>
        )}
        {msg && <p role="alert" className="text-sm text-red-600">{msg}</p>}
        <Btn className="w-full" disabled={busy || !ok} onClick={submit}>{mode === "in" ? "Me connecter" : "Créer mon compte"}</Btn>
        <button className="w-full text-sm text-primary" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }}>
          {mode === "in" ? "Pas encore de compte ? Créer un compte" : "Déjà un compte ? Se connecter"}
        </button>
      </Card>
    </div>
  );
}
