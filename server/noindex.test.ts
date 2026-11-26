import { describe, expect, it } from "vitest";
import { ajouterNoindex } from "../functions/_middleware";

describe("X-Robots-Tag sur les adresses de test", () => {
  it("ajoute noindex sur kazonly.pages.dev", () => {
    const r = ajouterNoindex("kazonly.pages.dev", new Response("ok"));
    expect(r.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
  it("ajoute noindex sur un aperçu de branche pages.dev avec port", () => {
    const r = ajouterNoindex("abc123.kazonly.pages.dev:443", new Response("ok"));
    expect(r.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
  it("ne touche pas kazonly.com", () => {
    const r = ajouterNoindex("kazonly.com", new Response("ok"));
    expect(r.headers.get("X-Robots-Tag")).toBeNull();
  });
});
