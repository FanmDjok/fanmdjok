// Contrôle navigateur de l'intégration Turnstile sur le site compilé (dist) :
// - api.js chargé une seule fois par page, en mode explicite ;
// - chaque formulaire protégé a un conteneur .cf-turnstile avec sa data-action ;
// - sans jeton, aucune requête n'est envoyée à l'API.
// Usage : node scripts/e2e-turnstile.cjs <url de base>
const { chromium } = require("playwright");
const base = (process.argv[2] || "http://127.0.0.1:8791").replace(/\/$/, "");
const attendus = { "/contact/": "contact", "/tarifs/": "checkout" };

(async () => {
  const navigateur = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
  const verifs = [];
  const check = (nom, ok, detail = "") => verifs.push({ nom, ok, detail });
  for (const [chemin, action] of Object.entries(attendus)) {
    const page = await navigateur.newPage({ viewport: { width: 390, height: 844 } });
    const appelsApi = [];
    // Le réseau vers Cloudflare peut être bloqué ici : seul le comportement côté page est vérifié.
    await page.route("https://challenges.cloudflare.com/**", (r) => r.abort());
    page.on("request", (r) => { if (r.url().includes("/api/")) appelsApi.push(r.url()); });
    await page.goto(base + chemin, { waitUntil: "load" });
    await page.waitForTimeout(600);
    const scripts = await page.$$eval('script[src*="turnstile/v0/api.js"]', (els) => els.map((e) => e.getAttribute("src")));
    check(`${chemin} : api.js chargé une seule fois, en mode explicite`, scripts.length === 1 && scripts[0].includes("render=explicit"), scripts.join(" "));
    const conteneur = await page.$eval(`.cf-turnstile[data-action="${action}"]`, (el) => ({ cle: el.dataset.sitekey, action: el.dataset.action })).catch(() => null);
    check(`${chemin} : conteneur avec data-action="${action}"`, !!conteneur && conteneur.action === action, JSON.stringify(conteneur));
    // Soumission sans jeton : refus côté page, aucun appel API.
    const formulaire = chemin === "/contact/" ? "#contact-form" : null;
    if (formulaire) {
      await page.fill("#contact-form input[name=name]", "Test");
      await page.fill("#contact-form input[name=email]", "test@example.com");
      await page.fill("#contact-form textarea[name=message]", "Bonjour");
      await page.click("#c-send");
      await page.waitForTimeout(400);
      const message = await page.textContent("#c-err");
      check(`${chemin} : sans jeton, message et aucune requête /api/`, /vérification/i.test(message || "") && appelsApi.length === 0, `« ${message} » ; appels API : ${appelsApi.length}`);
    }
    await page.close();
  }
  await navigateur.close();
  for (const v of verifs) console.log(`${v.ok ? "OK  " : "KO  "} ${v.nom}${v.detail ? "  (" + v.detail + ")" : ""}`);
  const echecs = verifs.filter((v) => !v.ok).length;
  console.log(`\n${verifs.length - echecs} vérifications réussies, ${echecs} échec(s).`);
  process.exit(echecs ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
