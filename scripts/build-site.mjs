// Génère le site vitrine statique (HTML prérendu) dans dist/ — à lancer après `vite build`.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { abs, assets, cfg, plansData, territories, warnings } from "./site/layout.mjs";
import { confirmeVeillePage, contactPage, faqPage, home, hub, notFound, pricing, resilierPage, territoryPage, tresoriePage } from "./site/pages.mjs";
import { cgv, confidentialite, cookies, mentions } from "./site/legal.mjs";

const DIST = "dist";
const write = (rel, content) => {
  const f = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
};

// Assets avec empreinte de contenu (cache immuable)
const hashed = (name) => {
  const buf = fs.readFileSync(`site-assets/${name}`);
  const h = crypto.createHash("sha256").update(buf).digest("hex").slice(0, 10);
  const ext = path.extname(name);
  const out = `${path.basename(name, ext)}.${h}${ext}`;
  write(out, buf);
  return `/${out}`;
};
assets.css = hashed("site.css");
assets.js = hashed("site.js");
for (const f of ["favicon.svg", "og-image.png"]) {
  if (fs.existsSync(`site-assets/${f}`)) write(f, fs.readFileSync(`site-assets/${f}`));
  else warnings.push(`Fichier manquant : site-assets/${f}`);
}

for (const f of fs.readdirSync("site-assets/fonts")) write(`fonts/${f}`, fs.readFileSync(`site-assets/fonts/${f}`));
for (const f of fs.readdirSync("site-assets/shots")) write(`img/${f}`, fs.readFileSync(`site-assets/shots/${f}`));

const pages = [
  home(), pricing(), faqPage(), contactPage(), hub(),
  ...territories.map(territoryPage),
  mentions(), confidentialite(), cookies(), cgv(), resilierPage(), confirmeVeillePage(), tresoriePage(),
];
pages.push(notFound());

// Aucune note de travail ne doit être publiée : le build échoue, quel que soit le mode.
// Les marqueurs de travail restent dans le code (commentaires) et dans shared/site.config.json.
const MARQUEURS = /À VALIDER|à renseigner|À renseigner|\bTODO\b|==\[|<mark>/;
const avecMarqueur = pages.filter((p) => MARQUEURS.test(p.html)).map((p) => p.path);
if (avecMarqueur.length) {
  console.error(`Marqueurs de travail visibles dans le HTML généré : ${avecMarqueur.join(", ")}`);
  process.exit(1);
}
for (const p of pages) {
  const sortie = p.path === "/" ? "index.html" : p.path.endsWith(".html") ? p.path.slice(1) : `${p.path.replace(/^\//, "")}index.html`;
  write(sortie, p.html);
}

// sitemap : uniquement les pages indexables
const today = new Date().toISOString().slice(0, 10);
const indexable = pages.filter((p) => !p.noindex);
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((p) => `  <url><loc>${abs(p.path)}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`);

const aiBots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "PerplexityBot", "Google-Extended", "Applebot-Extended"];
write("robots.txt", `User-agent: *
Allow: /
Disallow: /app/
Disallow: /api/

${aiBots.map((b) => `User-agent: ${b}\nAllow: /\nDisallow: /app/\nDisallow: /api/\n`).join("\n")}
Sitemap: ${abs("/sitemap.xml")}
`);

write("llms.txt", `# KAZONLY

> Logiciel en ligne de suivi de gestion locative pour les propriétaires bailleurs des Outre-mer français (11 territoires, euro et franc Pacifique). Une formule gratuite pour 1 bien, sans carte bancaire ; formules payantes à partir de ${plansData.plans[0].monthly} €/mois. KAZONLY ne détient aucun loyer et ne fournit pas de conseil juridique ou fiscal.

## Pages
- [Accueil](${abs("/")}): présentation et fonctionnalités
- [Tarifs](${abs("/tarifs/")}): trois formules, mensuel ou annuel
- [FAQ](${abs("/faq/")}): questions fréquentes
- [Contact et offre Agence / Scale sur devis](${abs("/contact/")})
- [Territoires couverts](${abs("/outre-mer/")}): ${territories.map((t) => t.label).join(", ")}
`);

if (cfg.contactEmail) {
  const exp = new Date(Date.now() + 330 * 864e5).toISOString();
  write(".well-known/security.txt", `Contact: mailto:${cfg.contactEmail}\nExpires: ${exp}\nPreferred-Languages: fr, en\nCanonical: ${abs("/.well-known/security.txt")}\n`);
} else warnings.push("security.txt non généré (contactEmail vide)");

// Cloudflare Pages lit ces deux fichiers à la publication (en-têtes de sécurité, cache, réécriture de l'application)
write("_redirects", "/app/*  /app/index.html  200\n");
write("_headers", `/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src-elem 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests
  Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin
  X-Permitted-Cross-Domain-Policies: none

/app/assets/*
  Cache-Control: public, max-age=31536000, immutable
/site.*
  Cache-Control: public, max-age=31536000, immutable
/api/*
  Cache-Control: no-store
`);

console.log(`Site vitrine : ${pages.length + 1} pages, ${indexable.length} dans le sitemap.`);
const uniq = [...new Set(warnings)];
if (uniq.length) console.log("À compléter avant le lancement :\n - " + uniq.join("\n - "));
if (process.env.STRICT_SITE === "1" && uniq.length) process.exit(1);
