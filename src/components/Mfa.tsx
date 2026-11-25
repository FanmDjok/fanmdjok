import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Btn, Card, Field, PageTitle, inputCls } from "./ui";

/** Code à 6 chiffres demandé après le mot de passe, quand la double authentification est active. */
export function MfaChallenge({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const verifier = async () => {
    if (!supabase) return;
    setBusy(true); setMsg(null);
    const { data: facteurs } = await supabase.auth.mfa.listFactors();
    const facteur = facteurs?.totp.find((f) => f.status === "verified");
    if (!facteur) { setBusy(false); setMsg("Aucun appareil de confirmation trouvé pour ce compte."); return; }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: facteur.id, code: code.trim() });
    setBusy(false);
    if (error) setMsg("Code incorrect ou expiré. Vérifiez l'heure de votre téléphone et réessayez.");
    else onDone();
  };
  return (
    <div className="mx-auto max-w-xl px-5 pt-12">
      <PageTitle eyebrow="Double authentification" title="Code de confirmation" sub="Saisissez le code à 6 chiffres affiché par votre application d'authentification." />
      <Card className="space-y-4">
        <Field label="Code à 6 chiffres"><input className={inputCls} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></Field>
        {msg && <p role="status" className="text-sm text-amber-800">{msg}</p>}
        <Btn className="w-full" disabled={busy || code.length !== 6} onClick={verifier}>Confirmer</Btn>
        <button className="w-full text-sm text-primary" onClick={onCancel}>Annuler et me déconnecter</button>
      </Card>
    </div>
  );
}

/** Activation, désactivation de la double authentification (TOTP) depuis le compte. */
export function MfaReglages() {
  const [actif, setActif] = useState<boolean | null>(null);
  const [facteurId, setFacteurId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const charger = async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.mfa.listFactors();
    const verifie = data?.totp.find((f) => f.status === "verified");
    setActif(Boolean(verifie));
    setFacteurId(verifie?.id ?? null);
  };
  useEffect(() => { void charger(); }, []);

  const activer = async () => {
    if (!supabase) return;
    setMsg(null);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "KAZONLY" });
    if (error || !data) { setMsg("Activation impossible pour le moment."); return; }
    setFacteurId(data.id); setQr(data.totp.qr_code); setSecret(data.totp.secret);
  };
  const confirmer = async () => {
    if (!supabase || !facteurId) return;
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: facteurId, code: code.trim() });
    if (error) { setMsg("Code incorrect. Vérifiez-le et réessayez."); return; }
    setQr(null); setSecret(null); setCode(""); setMsg("Double authentification activée."); void charger();
  };
  const desactiver = async () => {
    if (!supabase || !facteurId) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: facteurId });
    if (error) { setMsg("Désactivation impossible : confirmez d'abord votre identité avec un code."); return; }
    setMsg("Double authentification désactivée."); void charger();
  };

  if (actif === null) return null;
  return (
    <Card className="space-y-3">
      <h2 className="font-semibold">Double authentification</h2>
      <p className="text-sm text-muted">Un code à usage unique, généré par une application d'authentification (par exemple Google Authenticator ou Aegis), est demandé à chaque connexion.</p>
      {actif ? (
        <Btn variant="ghost" className="w-full" onClick={desactiver}>Désactiver la double authentification</Btn>
      ) : qr ? (
        <div className="space-y-3">
          <img src={qr} alt="QR code à scanner avec votre application d'authentification" className="mx-auto h-44 w-44" />
          {secret && <p className="break-all text-center text-xs text-muted">Saisie manuelle : {secret}</p>}
          <Field label="Code affiché par l'application"><input className={inputCls} inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></Field>
          <Btn className="w-full" disabled={code.length !== 6} onClick={confirmer}>Confirmer et activer</Btn>
        </div>
      ) : (
        <Btn variant="ghost" className="w-full" onClick={activer}>Activer la double authentification</Btn>
      )}
      {msg && <p role="status" className="text-sm text-amber-800">{msg}</p>}
    </Card>
  );
}
