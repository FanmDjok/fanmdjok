import { describe, expect, it } from "vitest";
import { decideEssai, essaiEligible, hacheEmail, type StripeLecture } from "./essai";

/** Faux Stripe : clients par e-mail et abonnements par client. */
function faux(clientsParEmail: string[], abosParClient: Record<string, string[]>): StripeLecture & { appels: string[] } {
  const appels: string[] = [];
  return {
    appels,
    customers: { async list(p) { appels.push(`customers:${p.email}`); return { data: clientsParEmail.map((id) => ({ id })) }; } },
    subscriptions: { async list(p) { appels.push(`subs:${p.customer}:${p.status}`); return { data: (abosParClient[p.customer] ?? []).map((status) => ({ status })) }; } },
  };
}

describe("décision pure", () => {
  it("nouveau compte, aucun abonnement : essai accordé", () => {
    expect(decideEssai({ dejaUtiliseDansBase: false, abonnementsStripe: 0 })).toBe(true);
  });
  it("drapeau déjà posé en base : pas d'essai", () => {
    expect(decideEssai({ dejaUtiliseDansBase: true, abonnementsStripe: 0 })).toBe(false);
  });
  it("un abonnement déjà existant chez Stripe : pas d'essai", () => {
    expect(decideEssai({ dejaUtiliseDansBase: false, abonnementsStripe: 1 })).toBe(false);
  });
});

describe("éligibilité par e-mail et historique Stripe", () => {
  it("client inconnu : essai accordé et aucun client réutilisé", async () => {
    const s = faux([], {});
    expect(await essaiEligible(s, "neuf@exemple.fr", false, null)).toEqual({ essai: true, customerId: null });
  });
  it("même e-mail, abonnement annulé chez Stripe : pas d'essai, client réutilisé", async () => {
    const s = faux(["cus_1"], { cus_1: ["canceled"] });
    expect(await essaiEligible(s, "revenu@exemple.fr", false, null)).toEqual({ essai: false, customerId: "cus_1" });
  });
  it("abonnement en essai en cours : pas de second essai", async () => {
    const s = faux(["cus_2"], { cus_2: ["trialing"] });
    expect((await essaiEligible(s, "x@exemple.fr", false, null)).essai).toBe(false);
  });
  it("paiement jamais abouti (incomplete_expired) : ne compte pas comme abonnement", async () => {
    const s = faux(["cus_3"], { cus_3: ["incomplete_expired"] });
    expect((await essaiEligible(s, "y@exemple.fr", false, null)).essai).toBe(true);
  });
  it("le client déjà connu de la base est aussi contrôlé", async () => {
    const s = faux([], { cus_9: ["active"] });
    expect((await essaiEligible(s, "z@exemple.fr", false, "cus_9")).essai).toBe(false);
  });
});

describe("journaux", () => {
  it("l'e-mail est haché : jamais en clair, stable et insensible à la casse", async () => {
    const h = await hacheEmail("Bailleur@Exemple.fr");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).toBe(await hacheEmail("bailleur@exemple.fr"));
    expect(h).not.toContain("bailleur");
  });
});
