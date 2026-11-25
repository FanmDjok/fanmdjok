import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { TURNSTILE_SITE_KEY, mountTurnstile } from "../lib/turnstile";
import { Btn, Card, Field, PageTitle, inputCls } from "./ui";

type Mode = "in" | "up" | "reset";
const MIN_PASSWORD = 12;

/** Connexion, inscription et mot de passe oublié. Le jeton Turnstile est vérifié par Supabase Auth. */
export default function Auth() {
  const initial: Mode = new URLSearchParams(window.location.search).get("mode") === "inscription" ? "up" : "in";
  const [mode, setMode] = useState<Mode>(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const slot = useRef<HTMLDivElement>(null);
  const widget = useRef<{ reset: () => void; cleanup: () => void } | null>(null);

  // Le widget est (re)monté à chaque changement de mode ; le jeton précédent n'est jamais réutilisé.
  useEffect(() => {
    setToken("");
    if (!TURNSTILE_SITE_KEY || !slot.current) return;
    let alive = true;
    mountTurnstile(slot.current, setToken)
      .then((w) => { if (alive) widget.current = w; else w.cleanup(); })
      .catch(() => setMsg("La vérification anti-robot est indisponible. Réessayez dans un instant."));
    return () => { alive = false; widget.current?.cleanup(); widget.current = null; };
  }, [mode]);

  const captchaOk = !TURNSTILE_SITE_KEY || token !== "";
  const passwordOk = mode === "in" ? password.length > 0 : password.length >= MIN_PASSWORD;
  const ok = Boolean(email) && captchaOk && (mode === "reset" || passwordOk) && (mode !== "up" || consent);

  const submit = async () => {
    if (!supabase) return;
    if (!captchaOk) { setMsg("Validez la vérification anti-robot avant de continuer."); return; }
    setBusy(true); setMsg(null);
    const captchaToken = token || undefined;
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
      if (error) setMsg("Adresse e-mail ou mot de passe incorrect, ou vérification à refaire.");
    } else if (mode === "up") {
      const { error, data } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/app/${window.location.search}`,
          data: { consent_cgv_at: new Date().toISOString() },
          captchaToken,
        },
      });
      if (error) setMsg(`Création impossible. Vérifiez l'adresse e-mail et choisissez un mot de passe d'au moins ${MIN_PASSWORD} caractères.`);
      else if (!data.session) setMsg("Compte créé. Consultez votre boîte mail pour confirmer votre adresse, puis revenez ici.");
    } else {
      // Réponse identique que le compte existe ou non : on ne révèle pas les adresses inscrites.
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/app/`,
        captchaToken,
      });
      setMsg("Si un compte existe pour cette adresse, un e-mail de réinitialisation vient d'être envoyé.");
    }
    widget.current?.reset();
    setBusy(false);
  };

  const title = mode === "in" ? "Connexion" : mode === "up" ? "Créer mon compte" : "Mot de passe oublié";
  return (
    <div className="mx-auto max-w-xl px-5 pt-12">
      <PageTitle eyebrow="KAZONLY" title={title} sub="La gestion locative pensée pour les départements d'outre-mer." />
      <Card className="space-y-4">
        <Field label="Adresse e-mail"><input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></Field>
        {mode !== "reset" && (
          <Field label="Mot de passe" hint={mode === "up" ? `${MIN_PASSWORD} caractères minimum` : undefined}>
            <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} />
          </Field>
        )}
        {mode === "up" && (
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>J'accepte les <a className="text-primary underline" href="/cgv/" target="_blank" rel="noopener">conditions générales</a> et la <a className="text-primary underline" href="/confidentialite/" target="_blank" rel="noopener">politique de confidentialité</a>.</span>
          </label>
        )}
        {TURNSTILE_SITE_KEY && <div ref={slot} className="min-h-[65px]" />}
        {msg && <p role="status" aria-live="polite" className="text-sm text-amber-800">{msg}</p>}
        <Btn className="w-full" disabled={busy || !ok} onClick={submit}>
          {mode === "in" ? "Me connecter" : mode === "up" ? "Créer mon compte" : "Envoyer le lien"}
        </Btn>
        {mode === "in" && (
          <button className="w-full text-sm text-primary" onClick={() => { setMode("reset"); setMsg(null); }}>Mot de passe oublié ?</button>
        )}
        <button className="w-full text-sm text-primary" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }}>
          {mode === "in" ? "Pas encore de compte ? Créer un compte" : "Retour à la connexion"}
        </button>
      </Card>
    </div>
  );
}

/** Nouveau mot de passe, affiché après le lien de réinitialisation reçu par e-mail. */
export function NouveauMotDePasse({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const save = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setMsg(`Enregistrement impossible. Le mot de passe doit comporter au moins ${MIN_PASSWORD} caractères.`);
    else onDone();
  };
  return (
    <div className="mx-auto max-w-xl px-5 pt-12">
      <PageTitle eyebrow="KAZONLY" title="Nouveau mot de passe" sub={`${MIN_PASSWORD} caractères minimum.`} />
      <Card className="space-y-4">
        <Field label="Nouveau mot de passe"><input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></Field>
        {msg && <p role="status" className="text-sm text-amber-800">{msg}</p>}
        <Btn className="w-full" disabled={password.length < MIN_PASSWORD} onClick={save}>Enregistrer</Btn>
      </Card>
    </div>
  );
}
