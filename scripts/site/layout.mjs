import fs from "node:fs";

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
export const cfg = read("shared/site.config.json");
export const plansData = read("shared/plans.json");
export const territories = read("shared/territories.json");

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const abs = (p) => `${cfg.siteUrl}${p}`;
export const warnings = [];

/**
 * Valeur de configuration (shared/site.config.json). Si elle est vide, on affiche un texte neutre et vrai
 * (repli) et on le signale dans la console du build. Aucun marqueur de travail ne doit apparaître en ligne :
 * le build échoue si c'est le cas (scripts/build-site.mjs).
 */
export function val(key, repli = "") {
  if (cfg[key]) return esc(cfg[key]);
  warnings.push(`Configuration manquante : ${key}`);
  return esc(repli);
}

export const assets = { css: "/site.css", js: "/site.js" };

export const SIGNUP_FREE = "/app/?mode=inscription";
export const SIGNUP = (plan = "proprietaire", interval = "month", cur = "EUR") => `/app/?mode=inscription&amp;plan=${plan}&amp;interval=${interval}${cur === "XPF" ? "&amp;cur=xpf" : ""}`;

export const img = (name, alt, w = 520, h = 1040, lazy = true) => `<img src="/img/${name}.webp" alt="${esc(alt)}" width="${w}" height="${h}"${lazy ? ' loading="lazy" decoding="async"' : ' fetchpriority="high"'}>`;

export const fmtEur = (n) => `${fmtPrice(n)} €`;
export const fmtPrice = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(".", ","));
export const freeMonths = plansData.annualMonthsFree;
export const fmtXpf = (eur) => `${Math.round(eur * plansData.xpfPerEur).toLocaleString("fr-FR").replace(/\u202f/g, " ")} XPF`;

const NAV = [
  ["/#fonctionnalites", "Fonctionnalités"],
  ["/outre-mer/", "Territoires"],
  ["/tarifs/", "Tarifs"],
];

export function jsonLd(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
}

export const orgLd = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": abs("/#organization"),
  name: cfg.name,
  url: abs("/"),
  logo: abs("/favicon.svg"),
  description: "Logiciel de gestion locative pour les propriétaires bailleurs des Outre-mer français.",
  areaServed: territories.map((t) => t.label),
});

export const siteLd = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": abs("/#website"),
  url: abs("/"),
  name: cfg.name,
  inLanguage: "fr-FR",
  publisher: { "@id": abs("/#organization") },
});

export const breadcrumbLd = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: abs(path) })),
});

export const faqLd = (qas) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: qas.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
});

export const faqHtml = (qas) =>
  qas.map(([q, a]) => `<details class="q"><summary>${esc(q)}</summary><div class="a"><p>${esc(a)}</p></div></details>`).join("\n");

export function crumbs(items) {
  return `<nav class="crumbs wrap" aria-label="Fil d'Ariane">${items
    .map(([n, p], i) => (i < items.length - 1 ? `<a href="${p}">${esc(n)}</a> › ` : `<span aria-current="page">${esc(n)}</span>`))
    .join("")}</nav>`;
}

export function page({ path, title, description, body, ld = [], noindex = false, ogType = "website" }) {
  const url = abs(path);
  const robots = noindex ? "noindex,follow" : "index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1";
  const nav = NAV.map(([h, l]) => `<a href="${h}">${l}</a>`).join("");
  const footerTerritories = territories.slice(0, 5).map((t) => `<li><a href="/${t.slug}/">${esc(t.label)}</a></li>`).join("");
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="${robots}">
<meta name="theme-color" content="#1976d2">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="${esc(cfg.name)}">
<meta property="og:locale" content="fr_FR">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${abs("/og-image.png")}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="KAZONLY, la gestion locative pensée pour les Outre-mer">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${abs("/og-image.png")}">
<link rel="preload" href="/fonts/nunito-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/nunito-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${assets.css}">
${[orgLd(), siteLd(), ...ld].map(jsonLd).join("\n")}
</head>
<body>
<a class="skip" href="#contenu">Aller au contenu</a>
<header class="hdr"><div class="wrap">
  <a class="logo" href="/"><b aria-hidden="true">K</b>KAZONLY</a>
  <nav class="nav" aria-label="Navigation principale">${nav}<a href="/app/">Se connecter</a><a class="btn btn-primary btn-sm" href="${SIGNUP_FREE}">Créer mon compte gratuit</a></nav>
  <details class="menu"><summary>Menu</summary><div class="panel">${nav}<a href="/app/">Se connecter</a><a class="btn btn-primary" href="${SIGNUP_FREE}">Créer mon compte gratuit</a></div></details>
</div></header>
<main id="contenu">
${body}
</main>
<footer class="ftr"><div class="wrap">
  <div class="cols">
    <div><a class="logo" href="/" style="color:#fff"><b aria-hidden="true">K</b>KAZONLY</a><p style="margin-top:12px">KAZONLY, la gestion locative pour les onze territoires d'Outre-mer.</p><p style="margin-top:12px">Contact : <a href="mailto:${esc(cfg.contactEmail)}">${esc(cfg.contactEmail)}</a></p></div>
    <div><h3 class="ftr-h">Produit</h3><ul><li><a href="/#fonctionnalites">Fonctionnalités</a></li><li><a href="/tarifs/">Tarifs</a></li><li><a href="/faq/">Questions fréquentes</a></li><li><a href="/contact/">Contact et offre Agence</a></li><li><a href="/app/">Se connecter</a></li></ul></div>
    <div><h3 class="ftr-h">Outre-mer</h3><ul>${footerTerritories}<li><a href="/outre-mer/">Tous les territoires</a></li></ul></div>
    <div><h3 class="ftr-h">Informations</h3><ul><li><a href="/cgv/">Conditions générales</a></li><li><a href="/confidentialite/">Confidentialité</a></li><li><a href="/cookies/">Cookies</a></li><li><a href="/mentions-legales/">Mentions légales</a></li></ul></div>
  </div>
  <div class="legal"><button type="button" id="kz-gerer" class="kz-lien">Gérer mes cookies</button> · © ${new Date().getFullYear()} ${esc(cfg.name)}. Outil de suivi de gestion locative : KAZONLY ne détient pas vos fonds et ne remplace pas un conseil juridique, fiscal ou comptable.</div>
</div></footer>
<div id="kz-consent" class="kz-consent" role="region" aria-label="Choix des traceurs" hidden>
  <p>Nous utilisons des traceurs pour mesurer l'audience et améliorer KAZONLY. Vous pouvez accepter, refuser ou choisir. Votre choix est modifiable à tout moment. <a href="/cookies/">En savoir plus</a></p>
  <div class="kz-actions">
    <button type="button" class="kz-btn" data-c="refuser">Tout refuser</button>
    <button type="button" class="kz-btn" data-c="personnaliser">Personnaliser</button>
    <button type="button" class="kz-btn" data-c="accepter">Tout accepter</button>
  </div>
  <div class="kz-panel" hidden>
    <fieldset>
      <legend>Vos choix</legend>
      <label class="kz-cat"><input type="checkbox" checked disabled> <span>Nécessaires : toujours actifs, non modifiables.</span></label>
      <label class="kz-cat"><input type="checkbox" id="kz-mesure"> <span>Mesure d'audience (aucun outil actif à ce jour).</span></label>
    </fieldset>
    <button type="button" class="kz-btn" data-c="enregistrer">Enregistrer mes choix</button>
  </div>
</div>
<script src="${assets.js}" defer></script>
</body>
</html>`;
  return { path, noindex, html };
}
