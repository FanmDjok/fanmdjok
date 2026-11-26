import { describe, expect, it } from "vitest";
import { territories } from "./layout.mjs";
import { confirmeVeillePage, contactPage, faqPage, home, hub, notFound, pricing, resilierPage, territoryPage, tresoriePage } from "./pages.mjs";
import { cgv, confidentialite, cookies, mentions } from "./legal.mjs";

// Toutes les pages publiées : le test échoue si une note de travail ou un ancien argument commercial réapparaît.
const pages = (): { nom: string; html: string }[] => [
  { nom: "accueil", html: home().html },
  { nom: "tarifs", html: pricing().html },
  { nom: "faq", html: faqPage().html },
  { nom: "contact", html: contactPage().html },
  { nom: "outre-mer", html: hub().html },
  ...territories.map((t: { slug: string }) => ({ nom: t.slug, html: territoryPage(t).html })),
  { nom: "mentions", html: mentions().html },
  { nom: "confidentialite", html: confidentialite().html },
  { nom: "cookies", html: cookies().html },
  { nom: "cgv", html: cgv().html },
  { nom: "resilier", html: resilierPage().html },
  { nom: "confirmation", html: confirmeVeillePage().html },
  { nom: "tresorerie", html: tresoriePage().html },
  { nom: "404", html: notFound().html },
];

// Marqueurs de travail : ils restent dans le code (commentaires) et dans shared/site.config.json, jamais en ligne.
const MARQUEURS = /À VALIDER|à renseigner|À renseigner|\bTODO\b|==\[|<mark>/;

describe("pages publiées : aucune note de travail, aucun argument retiré", () => {
  it("aucun marqueur de travail dans le HTML généré", () => {
    for (const p of pages()) expect(p.html, p.nom).not.toMatch(MARQUEURS);
  });
  it("aucun essai gratuit annoncé, aucun badge « Le plus choisi », aucun « Mayotte arrive bientôt »", () => {
    for (const p of pages()) {
      expect(p.html, p.nom).not.toMatch(/Essayer \d+ jours|essai de \d+ jours|\d+ jours d'essai|Le plus choisi|Mayotte arrive/i);
    }
  });
  it("le contact est visible en pied de page de toutes les pages", () => {
    for (const p of pages()) expect(p.html, p.nom).toContain("contact@kazonly.com");
  });
  it("« Recommandé pour 6 à 15 biens » est affiché à l'identique sur l'accueil et sur les tarifs", () => {
    expect(home().html).toContain("Recommandé pour 6 à 15 biens");
    expect(pricing().html).toContain("Recommandé pour 6 à 15 biens");
  });
  it("les boutons d'abonnement sont des liens vers l'inscription, avec la période choisie par défaut", () => {
    expect(pricing().html).toMatch(/data-plan="essentiel" href="\/app\/\?mode=inscription&amp;plan=essentiel&amp;interval=month"/);
  });
  it("la démonstration de l'accueil couvre les 11 territoires, avec leur devise", () => {
    const html = home().html;
    expect((html.match(/class="k-chip"/g) ?? []).length).toBe(11);
    expect(html).toContain("262 000 XPF");
    expect(html).toContain("1 360 €");
  });
  it("le tableau comparatif est généré depuis la configuration des formules", () => {
    const html = pricing().html;
    expect(html).toContain("<th scope=\"row\">Projections à 5, 10, 15, 20 ans</th>");
    expect(html).toContain("Fiscalité par territoire (micro ou réel)");
  });
  it("la page Trésorerie précise que KAZONLY ne calcule pas l'impôt et donne des scénarios d'exemple", () => {
    const html = tresoriePage().html;
    expect(html).toContain("KAZONLY ne calcule aucun impôt");
    expect(html).toContain("La taxe foncière se saisit comme une dépense");
    expect(html).toContain("données fictives");
    expect(html).toContain("service-public.gouv.fr/particuliers/vosdroits/F3171");
  });
  it("aucune prévision sur douze mois n'est présentée comme existante, ni de scénario chiffré", () => {
    for (const p of [{ nom: "accueil", html: home().html }, { nom: "tresorerie", html: tresoriePage().html }]) {
      expect(p.html, p.nom).not.toContain("douze mois à l'avance");
      expect(p.html, p.nom).not.toContain("Scénario central");
      expect(p.html, p.nom).not.toContain("Solde prévu");
    }
  });
  it("les alertes de démonstration n'affichent aucun lien de source", () => {
    const html = home().html;
    const blocs = html.match(/Exemple[^<]*<\/b>[\s\S]{0,300}/g) ?? [];
    expect(blocs.length).toBeGreaterThan(0);
    for (const b of blocs) expect(b).not.toMatch(/href=/);
  });
  it("la FAQ de la page Tarifs est dédiée aux prix et distincte de la FAQ facturation", () => {
    const html = pricing().html;
    expect(html).toContain("Vos questions sur les prix et les formules.");
    expect(html).toContain("La formule Gratuite a-t-elle une limite de durée");
  });
});
