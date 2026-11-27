import { describe, expect, it } from "vitest";
import { routeHote, securiserTeaser } from "../functions/_middleware";

describe("routage par hôte", () => {
  it("kazonly.com et www servent le teaser, avec le chemin du dossier _teaser", () => {
    expect(routeHote("kazonly.com", "/")).toEqual({ mode: "teaser", chemin: "/_teaser/" });
    expect(routeHote("www.kazonly.com", "/merci/")).toEqual({ mode: "teaser", chemin: "/_teaser/merci/" });
    expect(routeHote("kazonly.com:443", "/style.css")).toEqual({ mode: "teaser", chemin: "/_teaser/style.css" });
  });
  it("l'API reste traitée par les fonctions, même sur kazonly.com", () => {
    expect(routeHote("kazonly.com", "/api/waitlist")).toEqual({ mode: "site" });
  });
  it("kazonly.pages.dev garde le site complet", () => {
    expect(routeHote("kazonly.pages.dev", "/tarifs/")).toEqual({ mode: "site" });
  });
  it("un autre hôte n'est jamais routé vers le teaser", () => {
    expect(routeHote("exemple.com", "/")).toEqual({ mode: "site" });
    expect(routeHote("kazonly.com.evil.net", "/")).toEqual({ mode: "site" });
  });
});

describe("en-têtes de sécurité du teaser", () => {
  it("HSTS, CSP stricte, pas d'intégration ni de script hors liste", () => {
    const r = securiserTeaser(new Response("ok"));
    expect(r.headers.get("Strict-Transport-Security")).toContain("max-age=63072000");
    expect(r.headers.get("Content-Security-Policy")).toContain("upgrade-insecure-requests");
    expect(r.headers.get("Content-Security-Policy")).toContain("object-src 'none'");
    expect(r.headers.get("X-Frame-Options")).toBe("DENY");
    expect(r.headers.get("Content-Security-Policy")).not.toContain("cloudflareinsights");
  });
});
