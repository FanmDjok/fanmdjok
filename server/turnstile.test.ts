import { afterEach, describe, expect, it, vi } from "vitest";
import { listeHostnames, verifyTurnstile } from "./turnstile";

const HOTES = ["kazonly.pages.dev", "kazonly.com", "www.kazonly.com"];

/** Remplace fetch par une réponse Cloudflare simulée ; renvoie le mock pour vérifier les appels. */
function reponseCloudflare(corps: Record<string, unknown>, ok = true) {
  const mock = vi.fn(async () => new Response(JSON.stringify(corps), { status: ok ? 200 : 500 }));
  vi.stubGlobal("fetch", mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("verifyTurnstile : contrôles d'action et de nom d'hôte", () => {
  it("accepte une réponse réussie dont l'action et le nom d'hôte sont attendus", async () => {
    reponseCloudflare({ success: true, action: "contact", hostname: "kazonly.com" });
    expect(await verifyTurnstile("jeton", "secret", null, { action: "contact", hostnames: HOTES })).toBe(true);
  });

  it("refuse si la réponse ne contient pas d'action alors qu'une action est attendue", async () => {
    reponseCloudflare({ success: true, hostname: "kazonly.com" });
    expect(await verifyTurnstile("jeton", "secret", null, { action: "contact", hostnames: HOTES })).toBe(false);
  });

  it("refuse une mauvaise action", async () => {
    reponseCloudflare({ success: true, action: "newsletter", hostname: "kazonly.com" });
    expect(await verifyTurnstile("jeton", "secret", null, { action: "contact", hostnames: HOTES })).toBe(false);
  });

  it("refuse un nom d'hôte hors de la liste", async () => {
    reponseCloudflare({ success: true, action: "contact", hostname: "evil.example" });
    expect(await verifyTurnstile("jeton", "secret", null, { action: "contact", hostnames: HOTES })).toBe(false);
  });

  it("refuse si la réponse ne contient pas de nom d'hôte alors qu'une liste est attendue", async () => {
    reponseCloudflare({ success: true, action: "contact" });
    expect(await verifyTurnstile("jeton", "secret", null, { action: "contact", hostnames: HOTES })).toBe(false);
  });

  it("refuse une liste d'hôtes vide, sans aucune requête sortante", async () => {
    const mock = reponseCloudflare({ success: true, action: "contact", hostname: "kazonly.com" });
    expect(await verifyTurnstile("jeton", "secret", null, { action: "contact", hostnames: [] })).toBe(false);
    expect(mock).not.toHaveBeenCalled();
  });

  it("refuse une action qui sort du format autorisé, sans requête sortante", async () => {
    const mock = reponseCloudflare({ success: true, action: "a b", hostname: "kazonly.com" });
    expect(await verifyTurnstile("jeton", "secret", null, { action: "a b", hostnames: HOTES })).toBe(false);
    expect(mock).not.toHaveBeenCalled();
  });

  it("refuse sans secret, sans requête sortante", async () => {
    const mock = reponseCloudflare({ success: true, action: "contact", hostname: "kazonly.com" });
    expect(await verifyTurnstile("jeton", "", null, { action: "contact", hostnames: HOTES })).toBe(false);
    expect(mock).not.toHaveBeenCalled();
  });

  it("refuse si Cloudflare répond success: false, même avec la bonne action et le bon hôte", async () => {
    reponseCloudflare({ success: false, action: "contact", hostname: "kazonly.com" });
    expect(await verifyTurnstile("jeton", "secret", null, { action: "contact", hostnames: HOTES })).toBe(false);
  });

  it("sans contrôle supplémentaire, garde le comportement d'origine (success seul)", async () => {
    reponseCloudflare({ success: true });
    expect(await verifyTurnstile("jeton", "secret", null)).toBe(true);
  });

  it("transmet l'adresse IP du client quand elle est connue", async () => {
    const mock = reponseCloudflare({ success: true, action: "checkout", hostname: "kazonly.com" });
    await verifyTurnstile("jeton", "secret", "203.0.113.7", { action: "checkout", hostnames: HOTES });
    const corps = (mock.mock.calls[0] as unknown as [string, { body: URLSearchParams }])[1].body;
    expect(corps.get("remoteip")).toBe("203.0.113.7");
  });
});

describe("listeHostnames", () => {
  it("découpe la variable en noms d'hôte nettoyés", () => {
    expect(listeHostnames(" kazonly.pages.dev, KAZONLY.com ,,www.kazonly.com ")).toEqual(["kazonly.pages.dev", "kazonly.com", "www.kazonly.com"]);
  });
  it("renvoie une liste vide si la variable est absente ou vide", () => {
    expect(listeHostnames(undefined)).toEqual([]);
    expect(listeHostnames("  , ")).toEqual([]);
  });
});
