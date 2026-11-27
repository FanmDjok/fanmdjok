import { afterEach, describe, expect, it, vi } from "vitest";
import { traiterInscription, depasseLimite, type Dependances } from "./functions/lib/waitlist";

const ENV = { BREVO_API_KEY: "cle-test", BREVO_WAITLIST_LIST_ID: "7", BREVO_DOI_TEMPLATE_ID: "3", TURNSTILE_SECRET_KEY: "secret-test", TURNSTILE_HOSTNAMES: "kazonly.com" };
let ipSeq = 0;
const requete = (corps: unknown, ip = `10.0.0.${++ipSeq}`) =>
  new Request("https://kazonly.com/api/waitlist", { method: "POST", headers: { "CF-Connecting-IP": ip, "Content-Type": "application/json" }, body: JSON.stringify(corps) });

function deps(over: Partial<Dependances> = {}): Dependances & { fetch: ReturnType<typeof vi.fn> } {
  return {
    fetch: vi.fn(async () => new Response(null, { status: 201 })),
    verifierTurnstile: vi.fn(async () => ({ ok: true as const })),
    maintenant: () => Date.UTC(2026, 10, 26),
    ...over,
  } as Dependances & { fetch: ReturnType<typeof vi.fn> };
}
const valide = { email: "bailleur@exemple.fr", territoire: "martinique", consent: true, turnstileToken: "jeton" };

afterEach(() => vi.restoreAllMocks());

describe("liste d'attente : validations", () => {
  it("refuse un e-mail invalide", async () => {
    const r = await traiterInscription(requete({ ...valide, email: "pas-un-mail" }), ENV, deps());
    expect(r.status).toBe(400);
  });
  it("refuse sans consentement explicite", async () => {
    const r = await traiterInscription(requete({ ...valide, consent: false }), ENV, deps());
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: "consentement_requis" });
  });
  it("accepte un territoire inconnu comme « aucun » sans l'enregistrer tel quel", async () => {
    const d = deps();
    const r = await traiterInscription(requete({ ...valide, territoire: "<script>" }), ENV, d);
    expect(r.status).toBe(200);
    const corps = JSON.parse(d.fetch.mock.calls[0][1].body as string);
    expect(corps.attributes.TERRITOIRE).toBe("aucun");
  });
  it("répond 503 sans secrets Brevo, sans rien envoyer", async () => {
    const d = deps();
    const r = await traiterInscription(requete(valide), { ...ENV, BREVO_API_KEY: undefined }, d);
    expect(r.status).toBe(503);
    expect(d.fetch).not.toHaveBeenCalled();
  });
});

describe("liste d'attente : sécurité et envoi", () => {
  it("refuse si Turnstile échoue, sans appeler Brevo", async () => {
    const d = deps({ verifierTurnstile: vi.fn(async () => ({ ok: false as const, motif: "rejet" as const })) });
    const r = await traiterInscription(requete(valide), ENV, d);
    expect(r.status).toBe(403);
    expect(d.fetch).not.toHaveBeenCalled();
  });
  it("envoie le double opt-in avec la liste, le modèle, la redirection et les attributs attendus", async () => {
    const d = deps();
    const r = await traiterInscription(requete(valide), ENV, d);
    expect(r.status).toBe(200);
    const [url, init] = d.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.brevo.com/v3/contacts/doubleOptinConfirmation");
    const corps = JSON.parse(init.body as string);
    expect(corps.includeListIds).toEqual([7]);
    expect(corps.templateId).toBe(3);
    expect(corps.redirectionUrl).toBe("https://kazonly.com/merci/");
    expect(corps.attributes).toEqual({ TERRITOIRE: "martinique", SOURCE: "teaser", CONSENT_DATE: "2026-11-26" });
  });
  it("répond de la même façon si Brevo échoue, sans révéler l'état de l'adresse", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const r = await traiterInscription(requete(valide), ENV, deps({ fetch: vi.fn(async () => new Response("x", { status: 400 })) }));
    expect(r.status).toBe(502);
  });
  it("ne journalise jamais l'adresse e-mail", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await traiterInscription(requete(valide), ENV, deps({ fetch: vi.fn(async () => new Response("x", { status: 500 })) }));
    for (const appel of log.mock.calls) expect(JSON.stringify(appel)).not.toContain("bailleur@exemple.fr");
  });
  it("limite à 5 requêtes par minute et par IP", () => {
    const ip = "192.0.2.10";
    const t = Date.UTC(2026, 10, 26);
    const resultats = Array.from({ length: 6 }, () => depasseLimite(ip, t));
    expect(resultats.slice(0, 5).every((x) => x === false)).toBe(true);
    expect(resultats[5]).toBe(true);
    expect(depasseLimite(ip, t + 61_000)).toBe(false);
  });
});

describe("liste d'attente : Turnstile (action « guide », échec fermé)", () => {
  it("transmet l'action attendue, le secret, la liste d'hôtes et l'IP de confiance", async () => {
    const v = vi.fn(async () => ({ ok: true as const }));
    await traiterInscription(requete(valide, "198.51.100.44"), ENV, deps({ verifierTurnstile: v }));
    expect(v).toHaveBeenCalledWith({ jeton: "jeton", action: "guide", secret: "secret-test", hostnames: "kazonly.com", ip: "198.51.100.44" });
  });
  it("sans TURNSTILE_HOSTNAMES : 503 et aucun envoi Brevo", async () => {
    const d = deps({ verifierTurnstile: vi.fn(async () => ({ ok: false as const, motif: "configuration" as const })) });
    const r = await traiterInscription(requete(valide), { ...ENV, TURNSTILE_HOSTNAMES: undefined }, d);
    expect(r.status).toBe(503);
    expect(d.fetch).not.toHaveBeenCalled();
  });
  it("jeton réutilisé ou mauvaise action : 403, aucun envoi", async () => {
    const d = deps({ verifierTurnstile: vi.fn(async () => ({ ok: false as const, motif: "rejet" as const })) });
    const r = await traiterInscription(requete(valide), ENV, d);
    expect(r.status).toBe(403);
    expect(d.fetch).not.toHaveBeenCalled();
  });
  it("erreur réseau vers siteverify : 503, aucun envoi", async () => {
    const d = deps({ verifierTurnstile: vi.fn(async () => ({ ok: false as const, motif: "reseau" as const })) });
    const r = await traiterInscription(requete(valide), ENV, d);
    expect(r.status).toBe(503);
    expect(d.fetch).not.toHaveBeenCalled();
  });
});
