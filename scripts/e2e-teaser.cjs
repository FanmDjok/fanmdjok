// Contrôle de rendu de la page teaser (mobile d'abord) : couverture centrée, pas de défilement horizontal,
// bandeau d'introduction sombre, formulaire sur carte blanche. Usage : node scripts/e2e-teaser.cjs <url>
const { chromium } = require("playwright");
const url = process.argv[2] || "http://127.0.0.1:8792/";
const sortie = process.env.E2E_SORTIE || "/tmp/teaser-mobile.png";

(async () => {
  const navigateur = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
  const verifs = [];
  const check = (nom, ok, detail = "") => verifs.push({ nom, ok, detail });
  for (const schema of ["light", "dark"]) {
    const page = await navigateur.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: schema === "light" ? 2 : 1, colorScheme: schema });
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    const r = await page.evaluate(() => {
      const img = document.querySelector(".vignette img").getBoundingClientRect();
      const carte = document.querySelector("form").getBoundingClientRect();
      const bandeau = document.querySelector(".intro");
      const label = document.querySelector("form label");
      const couleur = (el) => getComputedStyle(el).color;
      const fond = (el) => getComputedStyle(el).backgroundColor;
      return {
        largeurEcran: document.documentElement.clientWidth,
        defilementX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        imgLargeur: img.width,
        imgCentre: img.left + img.width / 2,
        imgGauche: img.left, imgDroite: window.innerWidth - img.right,
        bandeauFond: fond(bandeau), bandeauTexte: couleur(bandeau.querySelector(".lead")),
        carteFond: fond(document.querySelector("form")), labelCouleur: couleur(label),
      };
    });
    const centre = r.largeurEcran / 2;
    check(`[${schema}] pas de défilement horizontal`, r.defilementX <= 0, `${r.defilementX}px`);
    check(`[${schema}] couverture large sur mobile`, r.imgLargeur >= 0.8 * r.largeurEcran, `${Math.round(r.imgLargeur)}px`);
    check(`[${schema}] couverture centrée, sans vide à droite`, Math.abs(r.imgGauche - r.imgDroite) <= 2, `gauche ${Math.round(r.imgGauche)} / droite ${Math.round(r.imgDroite)}`);
    check(`[${schema}] centre de la couverture au milieu de l'écran`, Math.abs(r.imgCentre - centre) <= 2, `${Math.round(r.imgCentre)} vs ${centre}`);
    check(`[${schema}] bandeau bleu marine à texte clair`, r.bandeauFond === "rgb(15, 42, 74)" && r.bandeauTexte === "rgb(228, 236, 247)", `${r.bandeauFond} / ${r.bandeauTexte}`);
    check(`[${schema}] formulaire sur carte blanche`, r.carteFond === "rgb(255, 255, 255)", r.carteFond);
    check(`[${schema}] libellé foncé sur carte blanche`, r.labelCouleur !== "rgb(238, 243, 250)" && r.labelCouleur !== "rgb(255, 255, 255)", r.labelCouleur);
    if (schema === "light") await page.screenshot({ path: sortie, fullPage: true });
    await page.close();
  }
  await navigateur.close();
  for (const v of verifs) console.log(`${v.ok ? "OK  " : "KO  "} ${v.nom}${v.detail ? "  (" + v.detail + ")" : ""}`);
  const echecs = verifs.filter((v) => !v.ok).length;
  console.log(`\n${verifs.length - echecs} vérifications réussies, ${echecs} échec(s).`);
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
