// Contraste WCAG AA : 4,5:1 minimum pour le texte normal. Les couleurs sont lues dans style.css,
// pour que le test échoue dès qu'une couleur change et casse le seuil.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./style.css", import.meta.url), "utf8");
const bloc = (regex: RegExp) => css.match(regex)?.[1] ?? "";
const variables = (texte: string): Record<string, string> =>
  Object.fromEntries([...texte.matchAll(/--([\w-]+):(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2].toLowerCase()]));

const clair = variables(bloc(/:root\{([^}]*)\}/));
const sombre = { ...clair, ...variables(bloc(/:root\[data-theme="dark"\]\{([^}]*)\}/)) };

function luminance(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}
function contraste(a: string, b: string): number {
  const [clairL, sombreL] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clairL + 0.05) / (sombreL + 0.05);
}

const SEUIL_AA = 4.5;
const pairs: Array<[string, string, string]> = [
  ["texte sur fond (clair)", clair.texte, clair.fond],
  ["texte sur fond (sombre)", sombre.texte, sombre.fond],
  ["légende et texte secondaire sur fond (clair)", clair.muted, clair.fond],
  ["légende et texte secondaire sur fond (sombre)", sombre.muted, sombre.fond],
  ["bouton : texte blanc sur bleu foncé", "#ffffff", clair["bleu-fonce"]],
  ["bandeau : texte clair sur bleu marine", "#e4ecf7", clair.nuit],
  ["bandeau : surtitre sur bleu marine", "#a9d4ff", clair.nuit],
  ["bandeau : titre blanc sur bleu marine", "#ffffff", clair.nuit],
  ["pied de page : blanc sur bleu marine", "#ffffff", clair.nuit],
  ["formulaire : libellés foncés sur carte blanche", clair["carte-texte"], clair.carte],
  ["formulaire : texte secondaire sur carte blanche", clair["carte-muted"], clair.carte],
  ["champ de saisie : texte foncé sur blanc", "#14181f", "#ffffff"],
  ["encadré : texte foncé sur fond blanc", clair["carte-texte"], clair.carte],
  ["alerte : texte sur fond d'alerte", clair["erreur-texte"], clair["erreur-fond"]],
];

describe("contraste WCAG AA de la page teaser", () => {
  it.each(pairs)("%s ≥ 4,5:1", (_nom, texte, fond) => {
    expect(contraste(texte, fond)).toBeGreaterThanOrEqual(SEUIL_AA);
  });
  it("le texte principal n'est jamais clair sur une carte blanche (mode sombre du système)", () => {
    expect(css).toMatch(/form\{[^}]*background:var\(--carte\)/);
    expect(css).toMatch(/\.reassurance li\{[^}]*background:var\(--carte\)/);
    expect(css).not.toMatch(/\[data-theme="dark"\] form/);
  });
});
