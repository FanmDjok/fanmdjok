import { describe, expect, it, vi } from "vitest";
import { ipDeConfiance, listeHotes, verifierTurnstile, TURNSTILE_VERIFY_URL } from "./turnstile";

const SECRET = "secret-de-test-non-reel";
const HOTES = "kazonly.com, www.kazonly.com,kazonly.pages.dev";

/** Faux siteverify : répond la réponse donnée et garde la trace des appels. */
function siteverify(reponse: unknown, statut = 200) {
  const appels: Array<{ url: string; corps: URLSearchParams }> = [];
  const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
    appels.push({ url, corps: init.body as URLSearchParams });
    return new Response(JSON.stringify(reponse), { status: statut, headers: { "Content-Type": "application/json" } });
  }) as unknown as typeof fetch;
  return { fetchImpl, appels };
}
const bonne = { success: true, action: "contact", hostname: "kazonly.com" };
const base = { jeton: "jeton-test", action: "contact", secret: SECRET, hostnames: HOTES, ip: "203.0.113.7" };

describe("verifierTurnstile : acceptation", () => {
  it("accepte une réponse valide : succès, bonne action, hôte listé", async () => {
    const { fetchImpl } = siteverify(bonne);
    expect(await verifierTurnstile({ ...base, fetchImpl })).toEqual({ ok: true });
  });
  it("envoie le secret et l'IP de confiance en POST à siteverify", async () => {
    const { fetchImpl, appels } = siteverify(bonne);
    await verifierTurnstile({ ...base, fetchImpl });
    expect(appels[0].url).toBe(TURNSTILE_VERIFY_URL);
    expect(appels[0].corps.get("secret")).toBe(SECRET);
    expect(appels[0].corps.get("response")).toBe("jeton-test");
    expect(appels[0].corps.get("remoteip")).toBe("203.0.113.7");
  });
});

describe("verifierTurnstile : refus", () => {
  it("rejette un jeton réutilisé (siteverify : timeout-or-duplicate)", async () => {
    const { fetchImpl } = siteverify({ success: false, "error-codes": ["timeout-or-duplicate"] });
    expect(await verifierTurnstile({ ...base, fetchImpl })).toEqual({ ok: false, motif: "rejet" });
  });
  it("rejette une mauvaise action", async () => {
    const { fetchImpl } = siteverify({ ...bonne, action: "checkout" });
    expect(await verifierTurnstile({ ...base, fetchImpl })).toEqual({ ok: false, motif: "rejet" });
  });
  it("rejette un hôte absent de la liste", async () => {
    const { fetchImpl } = siteverify({ ...bonne, hostname: "autre-site.example" });
    expect(await verifierTurnstile({ ...base, fetchImpl })).toEqual({ ok: false, motif: "rejet" });
  });
  it("rejette localhost en production quand il n'est pas dans TURNSTILE_HOSTNAMES", async () => {
    const { fetchImpl } = siteverify({ ...bonne, hostname: "localhost" });
    expect(await verifierTurnstile({ ...base, fetchImpl })).toEqual({ ok: false, motif: "rejet" });
  });
  it("rejette si success est faux ou absent", async () => {
    const { fetchImpl } = siteverify({ action: "contact", hostname: "kazonly.com" });
    expect(await verifierTurnstile({ ...base, fetchImpl })).toEqual({ ok: false, motif: "rejet" });
  });
  it("échoue fermé sur une erreur HTTP de siteverify", async () => {
    const { fetchImpl } = siteverify(bonne, 500);
    expect(await verifierTurnstile({ ...base, fetchImpl })).toEqual({ ok: false, motif: "reseau" });
  });
  it("échoue fermé sur une exception réseau", async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError("network"); }) as unknown as typeof fetch;
    expect(await verifierTurnstile({ ...base, fetchImpl })).toEqual({ ok: false, motif: "reseau" });
  });
  it("échoue fermé après le délai de 10 s", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((_u: string, init: RequestInit) => new Promise((_ok, ko) => {
      init.signal?.addEventListener("abort", () => ko(new DOMException("aborted", "AbortError")));
    })) as unknown as typeof fetch;
    const resultat = verifierTurnstile({ ...base, fetchImpl });
    await vi.advanceTimersByTimeAsync(10_001);
    expect(await resultat).toEqual({ ok: false, motif: "reseau" });
    vi.useRealTimers();
  });
});

describe("verifierTurnstile : entrées et configuration", () => {
  it("sans TURNSTILE_HOSTNAMES : configuration (503 côté route), aucun appel", async () => {
    const { fetchImpl, appels } = siteverify(bonne);
    expect(await verifierTurnstile({ ...base, hostnames: undefined, fetchImpl })).toEqual({ ok: false, motif: "configuration" });
    expect(await verifierTurnstile({ ...base, hostnames: " , ", fetchImpl })).toEqual({ ok: false, motif: "configuration" });
    expect(appels).toHaveLength(0);
  });
  it("sans secret : configuration, aucun appel", async () => {
    const { fetchImpl, appels } = siteverify(bonne);
    expect(await verifierTurnstile({ ...base, secret: undefined, fetchImpl })).toEqual({ ok: false, motif: "configuration" });
    expect(appels).toHaveLength(0);
  });
  it.each([
    ["absent", undefined],
    ["vide", ""],
    ["non-chaîne", 42],
    ["objet", { jeton: "x" }],
    ["trop long", "a".repeat(2049)],
  ])("jeton %s : rejeté sans appel sortant", async (_nom, jeton) => {
    const { fetchImpl, appels } = siteverify(bonne);
    expect(await verifierTurnstile({ ...base, jeton, fetchImpl })).toEqual({ ok: false, motif: "jeton" });
    expect(appels).toHaveLength(0);
  });
  it("jeton de 2048 caractères accepté à la limite", async () => {
    const { fetchImpl } = siteverify(bonne);
    expect(await verifierTurnstile({ ...base, jeton: "a".repeat(2048), fetchImpl })).toEqual({ ok: true });
  });
  it("sans IP de confiance : remoteip n'est pas envoyé", async () => {
    const { fetchImpl, appels } = siteverify(bonne);
    await verifierTurnstile({ ...base, ip: null, fetchImpl });
    expect(appels[0].corps.has("remoteip")).toBe(false);
  });
});

describe("listeHotes et ipDeConfiance", () => {
  it("normalise la liste d'hôtes et refuse les jokers", () => {
    expect(listeHotes(" KAZONLY.com , *.evil.example ,, www.kazonly.com ")).toEqual(["kazonly.com", "www.kazonly.com"]);
  });
  it("prend l'IP de cf-connecting-ip seulement, et ignore X-Forwarded-For", () => {
    expect(ipDeConfiance(new Headers({ "cf-connecting-ip": "203.0.113.7" }))).toBe("203.0.113.7");
    expect(ipDeConfiance(new Headers({ "x-forwarded-for": "198.51.100.1" }))).toBeNull();
  });
  it("refuse une valeur qui n'est pas une adresse", () => {
    expect(ipDeConfiance(new Headers({ "cf-connecting-ip": "999.1.1.1" }))).toBeNull();
    expect(ipDeConfiance(new Headers({ "cf-connecting-ip": "<script>" }))).toBeNull();
  });
});
