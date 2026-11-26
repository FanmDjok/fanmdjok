// Test de bout en bout du bandeau de consentement. Usage : node scripts/e2e-consentement.cjs http://localhost:8791
const { chromium } = require('playwright');
const base = process.argv[2] || 'http://localhost:8791';
// Traceurs soumis au consentement. La balise Cloudflare Web Analytics est sans cookie : elle est testée à part.
const TRACEURS = /posthog|facebook|tiktok|google-analytics|googletagmanager/i;
let ok = 0, ko = 0;
const verifier = (nom, cond, detail = '') => { if (cond) { ok++; console.log('OK  ', nom); } else { ko++; console.log('ECHEC', nom, detail); } };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const nouveauContexte = async () => {
    const c = await b.newContext({ viewport: { width: 390, height: 844 } });
    const requetes = [];
    c.on('request', (r) => { if (TRACEURS.test(r.url())) requetes.push(r.url()); });
    return { c, requetes };
  };

  // 1. Première visite : bandeau visible, aucun traceur.
  let { c, requetes } = await nouveauContexte();
  let p = await c.newPage();
  await p.goto(base + '/', { waitUntil: 'load' });
  await p.waitForTimeout(800);
  verifier('le bandeau s\'affiche à la première visite', await p.isVisible('#kz-consent'));
  verifier('aucun traceur avant le choix', requetes.length === 0, requetes.join(' '));
  verifier('Cloudflare Web Analytics chargé et sans cookie', (await p.evaluate(() => !!document.querySelector('script[data-cf-beacon]'))) && (await c.cookies()).every((k) => !/cf|_cf/i.test(k.name) || k.name === 'kz_consent' ? true : false));

  // 2. Tous les boutons principaux ont la même taille calculée.
  const tailles = await p.$$eval('#kz-consent .kz-actions .kz-btn', (els) => els.map((e) => { const r = e.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}`; }));
  verifier('les trois boutons ont la même taille', new Set(tailles).size === 1, tailles.join(','));

  // 3. Refuser : bandeau fermé, choix enregistré, aucun traceur.
  await p.click('#kz-consent button[data-c="refuser"]');
  await p.waitForTimeout(300);
  verifier('« Tout refuser » ferme le bandeau', !(await p.isVisible('#kz-consent')));
  verifier('« Tout refuser » ne charge aucun traceur', requetes.length === 0, requetes.join(' '));
  const choix1 = await p.evaluate(() => JSON.parse(localStorage.getItem('kz_consent') || 'null'));
  verifier('le refus est mémorisé sans mesure', choix1 && choix1.mesure === false);
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(500);
  verifier('le bandeau ne revient pas pendant six mois', !(await p.isVisible('#kz-consent')));

  // 4. « Gérer mes cookies » rouvre le panneau.
  await p.click('#kz-gerer');
  await p.waitForTimeout(200);
  verifier('« Gérer mes cookies » rouvre le bandeau', await p.isVisible('#kz-consent'));
  await p.click('#kz-consent button[data-c="accepter"]');
  await p.waitForTimeout(300);
  const choix2 = await p.evaluate(() => JSON.parse(localStorage.getItem('kz_consent') || 'null'));
  verifier('« Tout accepter » est mémorisé avec la mesure', choix2 && choix2.mesure === true);
  await c.close();

  // 5. Six mois plus tard : le choix n'est plus valable, le bandeau revient.
  ({ c, requetes } = await nouveauContexte());
  p = await c.newPage();
  await p.goto(base + '/', { waitUntil: 'load' });
  await p.evaluate(() => localStorage.setItem('kz_consent', JSON.stringify({ v: 1, date: Date.now() - 200 * 864e5, mesure: true })));
  await p.reload({ waitUntil: 'load' });
  await p.waitForTimeout(500);
  verifier('après six mois, le bandeau est redemandé', await p.isVisible('#kz-consent'));
  await c.close();

  // 6. Sans JavaScript : aucun bandeau, aucun traceur.
  const sans = await b.newContext({ javaScriptEnabled: false });
  const q = await sans.newPage();
  await q.goto(base + '/', { waitUntil: 'load' });
  verifier('sans JavaScript, la page reste utilisable et sans bandeau', !(await q.isVisible('#kz-consent')) && (await q.isVisible('h1')));
  await sans.close();

  await b.close();
  console.log(`\n${ok} vérifications réussies, ${ko} échec(s).`);
  process.exit(ko ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
