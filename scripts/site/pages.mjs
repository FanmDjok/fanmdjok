import { SIGNUP_FREE, freeMonths, fmtPrice, abs, breadcrumbLd, cfg, crumbs, esc, faqHtml, faqLd, fmtXpf, img, page, plansData, SIGNUP, territories, val } from "./layout.mjs";

import fs from "node:fs";
import { scene } from "./scenes.mjs";
const TC = JSON.parse(fs.readFileSync("shared/territory-content.json", "utf8"));
const TRIAL = plansData.trialDays;
const plans = plansData.plans;
const free = plansData.free;

/* ---------- FAQ (source unique, réutilisée sur l'accueil, /faq/ et les données structurées) ---------- */
export const FAQ = [
  ["KAZONLY, c'est quoi ?",
    "KAZONLY est un logiciel en ligne de suivi de gestion locative pour les propriétaires bailleurs des Outre-mer français. Il regroupe vos biens, vos loyers attendus et encaissés, vos dépenses et vos rapports mensuels, en euros ou en francs Pacifique selon le territoire."],
  ["Quels territoires sont couverts ?",
    "Les onze territoires d'Outre-mer : Guadeloupe, Martinique, Guyane, La Réunion, Mayotte, Saint-Martin, Saint-Barthélemy, Saint-Pierre-et-Miquelon, Nouvelle-Calédonie, Polynésie française et Wallis-et-Futuna. La devise, le code postal et l'indicatif téléphonique s'adaptent au territoire choisi."],
  ["Mes loyers passent-ils par KAZONLY ?",
    "Non. KAZONLY ne reçoit, ne détient et ne prélève aucun loyer. Les échéances sont des rappels de suivi : vous gardez la main sur vos encaissements et vos fonds restent chez vous."],
  ["Puis-je gérer des biens en euros et en francs Pacifique ?",
    "Oui. Chaque bien prend la devise de son territoire (EUR ou XPF) et KAZONLY n'additionne jamais deux devises dans un même total : vos chiffres restent justes, devise par devise."],
  [`KAZONLY est-il gratuit ?`,
    `La formule Gratuite permet de suivre ${free.maxProperties} bien, sans limite de durée et sans carte bancaire. Pour suivre plus de biens et débloquer la fiscalité avancée, les formules payantes démarrent à ${plans[0].monthly} € par mois et offrent ${TRIAL} jours d'essai.`],
  [`L'essai de ${TRIAL} jours est-il vraiment sans risque ?`,
    `Chaque formule payante s'essaie ${TRIAL} jours. Une carte bancaire est demandée au départ, mais rien n'est débité pendant l'essai. Vous pouvez résilier à tout moment depuis votre espace ; sans résiliation avant la fin de l'essai, l'abonnement démarre. La formule Gratuite, elle, ne demande aucune carte.`],
  ["KAZONLY remplace-t-il un comptable, un notaire ou une agence ?",
    "Non. KAZONLY est un outil de suivi et d'aide à la décision. Il ne fournit pas de conseil juridique, fiscal ou comptable et n'est pas une agence de gestion : pour vos déclarations ou un litige, rapprochez-vous d'un professionnel."],
  ["Mes données sont-elles protégées ?",
    "Chaque compte ne voit que ses propres données (isolement par utilisateur dans la base), les échanges sont chiffrés en HTTPS et le paiement est géré par Stripe : KAZONLY ne conserve pas vos données bancaires. Le détail figure dans la politique de confidentialité."],
  ["Les agences et les gros portefeuilles sont-ils concernés ?",
    `Oui. La formule Investisseur permet de suivre jusqu'à ${plans[2].maxProperties} biens. Au-delà, ou pour un besoin spécifique (plusieurs utilisateurs, import de données, accompagnement), nous proposons une offre Agence / Scale sur devis : contactez-nous pour construire la solution adaptée.`],
];

const FAQ_BILLING = [
  ["Comment fonctionne l'essai des formules payantes ?",
    `Vous choisissez une formule et saisissez une carte bancaire. Pendant ${TRIAL} jours, rien n'est débité. À l'issue de l'essai, l'abonnement démarre automatiquement, sauf si vous avez résilié avant. Un seul essai est offert par compte.`],
  ["Puis-je changer de formule ou résilier ?",
    "Oui, à tout moment depuis « Mon abonnement » dans l'application (portail sécurisé Stripe). La résiliation prend effet à la fin de la période déjà payée."],
  ["Quels moyens de paiement acceptez-vous ?",
    "Les cartes bancaires, via Stripe. La facturation se fait en euros, ou directement en francs Pacifique (XPF) pour la Nouvelle-Calédonie, la Polynésie française et Wallis-et-Futuna : choisissez la devise au moment de vous abonner, sans conversion de notre part."],
  ["Que se passe-t-il si je dépasse le nombre de biens de ma formule ?",
    "L'ajout d'un nouveau bien est bloqué tant que vous n'avez pas choisi une formule supérieure. Vos données existantes restent intactes."],
  ["Y a-t-il une réduction en payant à l'année ?",
    `Oui : l'abonnement annuel équivaut à ${12 - freeMonths} mois au prix de 12, soit ${freeMonths} mois offerts.`],
];

/* ---------- Accueil : création de compte gratuit, territoires, arguments, tarifs, confiance, FAQ ---------- */
const TERR_HOME = ["martinique", "guadeloupe", "guyane", "reunion"];

function planCardsHome() {
  const free = `
    <div class="plan">
      <h2 class="plan-h">${esc(free_.name)}</h2>
      <p class="muted">${esc(free_.tagline)}</p>
      <p class="price">0 €<small>/mois</small></p>
      <p class="fine">Sans carte bancaire</p>
      <a class="btn btn-ghost btn-block" href="${SIGNUP_FREE}">Créer mon compte gratuit</a>
    </div>`;
  const cards = plans.map((p) => `
    <div class="plan${p.highlight ? " hl" : ""}">
      ${p.highlight ? '<span class="badge">Le plus choisi</span>' : ""}
      <h2 class="plan-h">${esc(p.name)}</h2>
      <p class="muted">${esc(p.tagline)}</p>
      <p class="price"><span data-m>${p.monthly} €<small>/mois</small></span><span data-y hidden>${fmtPrice(p.yearly)} €<small>/an</small></span></p>
      <p class="fine"><span data-m>jusqu'à ${p.maxProperties} biens</span><span data-y hidden>${freeMonths} mois offerts, jusqu'à ${p.maxProperties} biens</span></p>
      <a class="btn btn-primary btn-block" data-plan href="${SIGNUP(p.id, "month")}">Essayer ${TRIAL} jours</a>
    </div>`).join("");
  return free + cards;
}
const free_ = plansData.free;

export function home() {
  const softwareLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": abs("/#software"),
    name: cfg.name,
    url: abs("/"),
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "fr-FR",
    description: "Suivi des loyers, dépenses et projections de patrimoine pour propriétaires bailleurs des Outre-mer, en euros et en francs Pacifique.",
    areaServed: territories.map((t) => t.label),
    offers: [{ "@type": "Offer", name: free_.name, price: 0, priceCurrency: "EUR", url: abs("/tarifs/") }].concat(plans.map((p) => ({
      "@type": "Offer", name: p.name, price: p.monthly, priceCurrency: "EUR", url: abs("/tarifs/"),
    }))),
  };
  const terr = TERR_HOME.map((slug, i) => {
    const t = territories.find((x) => x.slug === `gestion-locative-${slug}`);
    return `<li><a class="pill" style="--i:${i}" href="/${t.slug}/">${esc(t.label)}</a></li>`;
  }).join("");

  const body = `
<section class="hero"><div class="wrap grid">
  <div>
    <h1>La gestion locative pensée pour les départements d'outre-mer.</h1>
    <p class="lead">Suivez vos loyers, anticipez vos dépenses et recevez les repères propres à votre territoire. Gratuit pour un bien, sans carte bancaire.</p>
    <div class="cta-row">
      <a class="btn btn-primary" href="${SIGNUP_FREE}">Créer mon compte gratuit</a>
      <a class="btn btn-ghost" href="/tarifs/">Voir les tarifs</a>
    </div>
    <p class="fine">Gratuit pour 1 bien, sans carte bancaire.</p>
  </div>
  <figure class="hero-fig">
    <div class="phone">${img("app-accueil", "Tableau de bord KAZONLY : loyers reçus, attendus et en attente", 520, 1040, false)}</div>
    <div class="fchip fc1" aria-hidden="true"><small>Loyers du mois</small><b>Reçus et attendus</b></div>
    <div class="fchip fc2" aria-hidden="true"><small>Données</small><b>Euro ou XPF</b></div>
  </figure>
</div></section>

<section class="terr-band" aria-label="Territoires couverts"><div class="wrap">
  <p class="terr-title">Pour les propriétaires de</p>
  <ul class="pills">${terr}</ul>
</div></section>

<section id="probleme"><div class="wrap">
  <p class="eyebrow">Le quotidien du propriétaire</p>
  <h2>Trois situations que tout propriétaire connaît.</h2>
  <div class="cards c3" style="margin-top:28px">
    <div class="card"><h3>Un loyer en attente passe inaperçu</h3><p class="muted">Sans tableau à jour, un loyer qui n'arrive pas est vu trop tard, parfois un mois après.</p></div>
    <div class="card"><h3>Une échéance oubliée</h3><p class="muted">Assurance, taxe foncière, fin de bail : une date manquée peut coûter bien plus cher que l'outil qui la rappelle.</p></div>
    <div class="card"><h3>Une saison cyclonique anticipée trop tard</h3><p class="muted">Aux Antilles et en Guyane, la saison cyclonique revient chaque année. Mieux vaut préparer ses biens avant qu'elle n'arrive.</p></div>
  </div>
</div></section>

<section class="soft" id="fonctionnalites"><div class="wrap">
  <p class="eyebrow">Pourquoi KAZONLY</p>
  <h2>Trois raisons de gérer vos biens ici.</h2>
  <div class="sshow">
    <div class="ssteps"><div class="srail" aria-hidden="true"><i id="sfill"></i></div>
      <article class="sstep on" data-i="0">
        <h3>Pensé pour votre territoire</h3>
        <p class="lead">Martinique, Guadeloupe, Guyane, La Réunion et les autres collectivités : chaque bien prend la devise et le code postal de son territoire.</p>
        <ul class="ticks"><li>Euro ou franc Pacifique, sans conversion</li><li>Code postal contrôlé selon le territoire</li><li>Indicatif téléphonique adapté</li></ul>
      </article>
      <article class="sstep" data-i="1">
        <h3>Votre trésorerie sous les yeux</h3>
        <p class="lead">Loyers reçus et attendus, dépenses et solde du mois, sur un seul écran.</p>
        <ul class="ticks"><li>Solde net calculé bien par bien</li><li>Projections de patrimoine à 5, 10, 15 et 20 ans</li></ul>
      </article>
      <article class="sstep" data-i="2">
        <h3>Rien n'est oublié</h3>
        <p class="lead">Les loyers en attente remontent à l'accueil, avec un message de relance prêt à copier.</p>
        <ul class="ticks"><li>Loyers en attente repérés d'un coup d'œil</li><li>Messages de relance prêts à envoyer</li><li>Rappels d'échéances : bientôt</li></ul>
      </article>
    </div>
    <div class="sstage" aria-hidden="true"><div class="phone pstack">${img("app-biens", "Liste des biens : territoire, devise et loyer de chaque logement", 520, 1040, false)}${img("app-accueil", "Tableau de bord : loyers reçus, dépenses et solde du mois", 520, 1040, false)}${img("app-paiements", "Suivi des loyers : reçu, attendu ou en attente", 520, 1040, false)}</div></div>
  </div>
  <p class="fine" style="text-align:center">Captures de l'application avec des données d'exemple.</p>
</div></section>

<section><div class="wrap">
  <p class="eyebrow">Comment ça marche</p>
  <h2>Opérationnel en quelques minutes.</h2>
  <ol class="steps howto" style="margin-top:24px">
    <li><h3>1. Ajoutez votre bien</h3><p class="muted">Adresse, territoire, type de location : la devise et les indicatifs se règlent seuls.</p></li>
    <li><h3>2. Renseignez le loyer et le locataire</h3><p class="muted">Le loyer mensuel, le locataire et son téléphone, directement sur le bien.</p></li>
    <li><h3>3. KAZONLY suit tout</h3><p class="muted">Marquez les loyers reçus, saisissez vos dépenses, consultez vos analyses.</p></li>
  </ol>
</div></section>

<section class="soft" id="tarifs-apercu"><div class="wrap">
  <p class="eyebrow">Tarifs</p>
  <h2>Gratuit pour 1 bien, puis dès ${plans[0].monthly} € par mois.</h2>
  <div class="seg" data-billing-toggle role="group" aria-label="Période de facturation" style="margin:20px 0 24px">
    <button type="button" data-interval="month" aria-pressed="true">Mensuel</button>
    <button type="button" data-interval="year" aria-pressed="false">Annuel · ${freeMonths} mois offerts</button>
  </div>
  <div class="plans">${planCardsHome()}</div>
  <p class="muted" style="margin:20px 0 0">Agence ou gros portefeuille ? Une offre <a href="/contact/?sujet=agence">Agence / Scale sur devis</a> est disponible.</p>
</div></section>

<section class="confiance" id="confiance"><div class="wrap">
  <p class="eyebrow">Nos engagements</p>
  <h2>Ce que KAZONLY s'engage à tenir.</h2>
  <div class="trust" style="margin-top:24px">
    <div class="card"><h3>Gratuit pour un bien</h3><p class="muted">Un bien suivi sans carte bancaire et sans limite de durée.</p></div>
    <div class="card"><h3>Prix clairs, résiliables en ligne</h3><p class="muted">Des prix affichés avant tout paiement, et une résiliation possible en ligne à tout moment.</p></div>
    <div class="card"><h3>Données hébergées dans l'Union européenne</h3><p class="muted">La base de données est hébergée en Irlande.</p></div>
    <div class="card"><h3>Un logiciel neutre</h3><p class="muted">KAZONLY ne détient jamais d'argent et n'agit pas comme gestionnaire. Il ne donne aucun conseil juridique ou fiscal.</p></div>
    <div class="card"><h3>Vos données vous appartiennent</h3><p class="muted">Export et suppression de vos données : bientôt disponibles.</p></div>
    <div class="card"><h3>Conçu pour votre territoire</h3><p class="muted">Pensé pour la Martinique, la Guadeloupe, la Guyane et La Réunion.</p></div>
  </div>
</div></section>

<section id="faq"><div class="wrap prose">
  <p class="eyebrow">Questions fréquentes</p>
  <h2>Vos questions, nos réponses.</h2>
  ${faqHtml([FAQ[4], FAQ[1], FAQ[2], FAQ[7], FAQ[6], FAQ[5], FAQ_BILLING[1]])}
  <p><a href="/faq/">Voir toutes les questions →</a></p>
</div></section>

<section class="final-band"><div class="wrap">
  <h2>Prêt à suivre votre premier bien ?</h2>
  <p>Gratuit pour 1 bien, sans carte bancaire.</p>
  <a class="btn btn-primary" href="${SIGNUP_FREE}">Créer mon compte gratuit</a>
</div></section>`;

  return page({
    path: "/",
    title: "KAZONLY | Gestion locative pour les départements d'outre-mer",
    description: "La gestion locative pensée pour les départements d'outre-mer. Suivez vos loyers et dépenses, en euros ou en francs Pacifique. Gratuit pour un bien, sans carte bancaire.",
    body,
    ld: [softwareLd, faqLd(FAQ.slice(0, 5))],
  });
}

/* ---------- Tarifs ---------- */
const xp = (n) => n.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ");
export function pricing() {
  const freeCard = `
    <div class="plan">
      <h2 class="plan-h">${esc(free.name)}</h2>
      <p class="muted">${esc(free.tagline)}</p>
      <p class="price">0 €<small>/mois</small></p>
      <p class="fine">Sans limite de durée, sans carte bancaire</p>
      <ul>${free.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      <a class="btn btn-ghost btn-block" href="${SIGNUP_FREE}">Créer mon compte gratuit</a>
    </div>`;
  const cards = freeCard + plans.map((p) => `
    <div class="plan${p.highlight ? " hl" : ""}">
      ${p.highlight ? '<span class="badge">Le plus choisi</span>' : ""}
      <h2 class="plan-h">${esc(p.name)}</h2>
      <p class="muted">${esc(p.tagline)}</p>
      <p class="price"><span data-m data-e>${p.monthly} €<small>/mois</small></span><span data-y data-e hidden>${fmtPrice(p.yearly)} €<small>/an</small></span><span data-m data-x hidden>${xp(p.xpf.monthly)} XPF<small>/mois</small></span><span data-y data-x hidden>${xp(p.xpf.yearly)} XPF<small>/an</small></span></p>
      <p class="fine"><span data-m data-e>ou ${fmtPrice(p.yearly)} € par an (${freeMonths} mois offerts)</span><span data-y data-e hidden>soit ${fmtPrice(Math.round(p.yearly / 12 * 100) / 100)} €/mois</span><span data-m data-x hidden>ou ${xp(p.xpf.yearly)} XPF par an (${freeMonths} mois offerts)</span><span data-y data-x hidden>soit ${xp(Math.round(p.xpf.yearly / 12))} XPF/mois</span></p>
      <ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      <a class="btn ${p.highlight ? "btn-primary" : "btn-ghost"} btn-block" data-plan="${p.id}" href="${SIGNUP(p.id)}">Essayer ${TRIAL} jours</a>
    </div>`).join("");

  const body = `
${crumbs([["Accueil", "/"], ["Tarifs", "/tarifs/"]])}
<section style="padding-top:28px"><div class="wrap">
  <p class="eyebrow">Tarifs</p>
  <h1>Des tarifs simples pour les propriétaires d'Outre-mer.</h1>
  <p class="lead">Un bien gratuit, sans carte. Puis ${TRIAL} jours d'essai sur chaque formule payante : une carte est demandée, rien n'est débité pendant l'essai, résiliation à tout moment.</p>
  <div class="toggle" data-billing-toggle role="group" aria-label="Période de facturation" hidden>
    <button type="button" data-interval="month" aria-pressed="true">Mensuel</button>
    <button type="button" data-interval="year" aria-pressed="false">Annuel · ${freeMonths} mois offerts</button>
  </div>
  <div class="toggle" data-currency-toggle role="group" aria-label="Devise" hidden>
    <button type="button" data-cur="eur" aria-pressed="true">Euro (€)</button>
    <button type="button" data-cur="xpf" aria-pressed="false">Franc Pacifique (XPF)</button>
  </div>
  <p class="fine">Nouvelle-Calédonie, Polynésie française, Wallis-et-Futuna : tarifs et facturation directement en francs Pacifique, sans conversion.</p>
  <div class="plans">${cards}</div>
  <div class="band left" style="margin-top:24px">
    <p class="eyebrow" style="color:#fff;opacity:.85">Agence / Scale · sur devis</p>
    <h2 style="margin-top:4px">Plus de ${plans[2].maxProperties} biens, ou un besoin spécifique ?</h2>
    <p>${esc(plansData.scale.tagline)}. Parlons de votre activité : nous construisons avec vous l'offre la mieux adaptée.</p>
    <ul style="margin:0 0 16px;padding-left:18px">${plansData.scale.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
    <a class="btn btn-primary" href="/contact/?sujet=agence">Nous contacter</a>
  </div>
  <p class="fine" style="margin-top:16px">${cfg.tvaMention ? esc(cfg.tvaMention) + ". " : ""}Prix en euros, toutes taxes comprises.</p>
</div></section>

<section class="soft"><div class="wrap">
  <h2>Comparer les formules</h2>
  <div class="scroll"><table class="cmp">
    <thead><tr><th scope="col">Fonction</th><th scope="col">${esc(free.name)}</th>${plans.map((p) => `<th scope="col">${esc(p.name)}</th>`).join("")}</tr></thead>
    <tbody>
      <tr><th scope="row">Nombre de biens</th><td>${free.maxProperties}</td>${plans.map((p) => `<td>${p.maxProperties}</td>`).join("")}</tr>
      <tr><th scope="row">Suivi des loyers et échéances</th><td>✓</td>${plans.map(() => "<td>✓</td>").join("")}</tr>
      <tr><th scope="row">Dépenses par bien</th><td>✓</td>${plans.map(() => "<td>✓</td>").join("")}</tr>
      <tr><th scope="row">Rapports et export CSV</th><td>✓</td>${plans.map(() => "<td>✓</td>").join("")}</tr>
      <tr><th scope="row">Euro et franc Pacifique</th><td>✓</td>${plans.map(() => "<td>✓</td>").join("")}</tr>
      <tr><th scope="row">Locations saisonnières (tarif par nuit)</th><td>✓</td><td>✓</td><td>✓</td><td>✓</td></tr>
      <tr><th scope="row">Rendement brut, cash-flow, patrimoine net</th><td>✓</td><td>✓</td><td>✓</td><td>✓</td></tr>
      <tr><th scope="row">Quittances et messages de relance</th><td>✓</td><td>✓</td><td>✓</td><td>✓</td></tr>
      <tr><th scope="row">Simulateurs rentabilité, cash-flow, crédit</th><td>Base</td><td>Base</td><td>Avancés</td><td>Avancés</td></tr>
      <tr><th scope="row">Fiscalité par territoire (micro ou réel)</th><td>—</td><td>—</td><td>✓</td><td>✓</td></tr>
      <tr><th scope="row">Rendement net et score de santé</th><td>—</td><td>—</td><td>✓</td><td>✓</td></tr>
      <tr><th scope="row">Financement et répartition des dépenses</th><td>—</td><td>—</td><td>✓</td><td>✓</td></tr>
      <tr><th scope="row">Projections à 5, 10, 15, 20 ans</th><td>—</td><td>—</td><td>✓</td><td>✓</td></tr>
      <tr><th scope="row">Vue consolidée et classement des biens</th><td>—</td><td>—</td><td>—</td><td>✓</td></tr>
      <tr><th scope="row">Support</th><td>Documentation</td><td>Documentation</td><td>E-mail</td><td>E-mail prioritaire</td></tr>
    </tbody>
  </table></div>
</div></section>

<section><div class="wrap prose">
  <h2>Questions sur la facturation</h2>
  ${faqHtml(FAQ_BILLING)}
</div></section>`;

  return page({
    path: "/tarifs/",
    title: `Tarifs KAZONLY | Gestion locative Outre-mer dès ${plans[0].monthly} €/mois`,
    description: `Un bien gratuit, puis trois formules dès ${plans[0].monthly} €/mois pour gérer vos locations en Outre-mer. Essai ${TRIAL} jours, résiliable à tout moment, euro et franc Pacifique.`,
    body,
    ld: [breadcrumbLd([["Accueil", "/"], ["Tarifs", "/tarifs/"]]), faqLd(FAQ_BILLING)],
  });
}

/* ---------- FAQ ---------- */
export function faqPage() {
  const all = [...FAQ, ...FAQ_BILLING];
  const body = `
${crumbs([["Accueil", "/"], ["Questions fréquentes", "/faq/"]])}
<section style="padding-top:28px"><div class="wrap prose">
  <p class="eyebrow">FAQ</p>
  <h1>Questions fréquentes sur KAZONLY</h1>
  <p class="lead">Tout ce qu'il faut savoir sur la gestion locative en Outre-mer avec KAZONLY.</p>
  ${faqHtml(all)}
  ${cfg.contactEmail ? `<p style="margin-top:24px">Une autre question ? Écrivez-nous : ${esc(cfg.contactEmail)}.</p>` : ""}
</div></section>`;
  return page({
    path: "/faq/",
    title: "FAQ KAZONLY | Gestion locative Outre-mer, essai, tarifs, données",
    description: "Réponses aux questions sur KAZONLY : territoires couverts, euro et franc Pacifique, essai de 14 jours, résiliation, sécurité des données et fonctions.",
    body,
    ld: [breadcrumbLd([["Accueil", "/"], ["Questions fréquentes", "/faq/"]]), faqLd(all)],
  });
}

/* ---------- Outre-mer : hub + une page par territoire ---------- */
const FISCAL = {
  drom: "Les départements et régions d'Outre-mer disposent d'un dispositif fiscal propre, notamment une réduction d'impôt sur le revenu prévue à l'article 197 du Code général des impôts, dont le taux et le plafond varient selon le département. Vérifiez ces paramètres auprès de l'administration fiscale ou d'un professionnel : KAZONLY ne les applique pas à votre place pour le moment.",
  com: "Cette collectivité dispose de son propre régime fiscal : l'imposition des revenus locatifs y diffère de celle de la métropole. Les règles locales doivent être vérifiées auprès de l'administration fiscale du territoire ou d'un professionnel. Le calculateur de rentabilité par territoire est en préparation.",
  wallis: "Wallis-et-Futuna ne connaît pas d'impôt sur le revenu des particuliers comparable à celui de la métropole. Pour toute question fiscale, rapprochez-vous de l'administration locale ou d'un professionnel.",
};

const prep = (t) => `${t.article === "en" ? "en" : "à"} ${t.label}`;
const devise = (t) => (t.currency === "EUR" ? "l'euro (€)" : "le franc Pacifique (XPF)");

export function hub() {
  const block = (t, i) => {
    const c = TC[t.id];
    return `
<section id="${t.id}"${i % 2 ? ' class="soft"' : ""}><div class="wrap terr">
  <div>
    <p class="eyebrow">${esc(t.label)} · ${t.currency === "EUR" ? "euro" : "franc Pacifique"}</p>
    <h2>${esc(t.label)} : ${esc(c.tagline)}</h2>
    ${c.intro.map((x) => `<p class="lead">${esc(x)}</p>`).join("")}
    <p>${esc(c.louer)}</p>
    <div class="cta-row"><a class="btn btn-primary" href="/${t.slug}/">Lire le portrait de ${esc(t.label)}</a><a class="btn btn-ghost" href="${SIGNUP('proprietaire', 'month', t.currency)}">Essayer ${TRIAL} jours</a></div>
  </div>
  <div class="card"><h3>Pourquoi on en est fier</h3><ul class="ticks">${c.atouts.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
    <dl class="facts mini"><div><dt>Chef-lieu</dt><dd>${esc(t.chefLieu)}</dd></div><div><dt>Devise</dt><dd>${t.currency}</dd></div><div><dt>Indicatif</dt><dd>${t.phone}</dd></div></dl></div>
</div></section>`;
  };
  const body = `
${crumbs([["Accueil", "/"], ["Outre-mer", "/outre-mer/"]])}
<section style="padding-top:28px"><div class="wrap">
  <p class="eyebrow">Outre-mer</p>
  <h1>Onze territoires d'Outre-mer, un même soin pour votre patrimoine locatif.</h1>
  <p class="lead">Des Antilles à l'océan Indien, de l'Amazonie au Pacifique : la Guadeloupe, la Martinique, la Guyane, La Réunion, Mayotte, Saint-Martin, Saint-Barthélemy, Saint-Pierre-et-Miquelon, la Nouvelle-Calédonie, la Polynésie française et Wallis-et-Futuna ont chacun leur histoire, leur culture et leur marché locatif. KAZONLY aide chaque propriétaire bailleur à suivre ses loyers, ses dépenses et sa rentabilité locative, dans la bonne devise.</p>
  <ul class="pill-list" style="margin-top:20px">${territories.map((t) => `<li><a href="#${t.id}">${esc(t.label)}</a></li>`).join("")}</ul>
</div></section>
${territories.map(block).join("\n")}
<section><div class="wrap"><div class="band">
  <h2>Votre territoire mérite un outil à sa hauteur.</h2>
  <p>${TRIAL} jours d'essai, euro ou franc Pacifique, sans débit pendant l'essai.</p>
  <a class="btn btn-primary" href="${SIGNUP()}">Démarrer mon essai</a>
</div></div></section>`;
  const itemList = { "@context": "https://schema.org", "@type": "ItemList", name: "Territoires d'Outre-mer couverts par KAZONLY", itemListElement: territories.map((t, i) => ({ "@type": "ListItem", position: i + 1, name: t.label, url: abs(`/${t.slug}/`) })) };
  return page({
    path: "/outre-mer/",
    title: "Gestion locative Outre-mer : Antilles, Réunion, Guyane, Pacifique | KAZONLY",
    description: "Découvrez les 11 territoires d'Outre-mer et gérez vos locations en euros ou en francs Pacifique : Guadeloupe, Martinique, Guyane, Réunion, Mayotte, Saint-Martin, Saint-Barthélemy, Saint-Pierre-et-Miquelon, Nouvelle-Calédonie, Polynésie, Wallis-et-Futuna.",
    body,
    ld: [breadcrumbLd([["Accueil", "/"], ["Outre-mer", "/outre-mer/"]]), itemList],
  });
}

export function territoryPage(t) {
  const fixed = String(t.postal).length === 5;
  const faq = [
    [`Quelle devise KAZONLY utilise-t-il ${prep(t)} ?`,
      t.currency === "EUR"
        ? `${t.label} utilise l'euro : vos loyers et dépenses sont suivis en euros, avec les centimes.`
        : `${t.label} utilise le franc Pacifique (XPF), qui n'a pas de centimes : vos montants sont suivis et affichés en XPF, sans décimales, et jamais additionnés à des montants en euros.`],
    [`Comment KAZONLY gère-t-il les adresses ${prep(t)} ?`,
      fixed
        ? `L'adresse est saisie en quatre champs (numéro, rue, code postal, territoire). Le code postal est unique pour ${t.label} : ${t.postal}.`
        : `L'adresse est saisie en quatre champs (numéro, rue, code postal, territoire). Le code postal doit commencer par ${t.postal} pour ${t.label}, sinon KAZONLY vous le signale.`],
    [`KAZONLY calcule-t-il mon impôt ${prep(t)} ?`,
      "Pas pour le moment. KAZONLY suit vos loyers, dépenses et rapports ; le calculateur de rentabilité par territoire est en préparation. KAZONLY ne remplace pas un conseil fiscal : vérifiez les règles locales auprès de l'administration ou d'un professionnel."],
  ];
  const path = `/${t.slug}/`;
  const crumbItems = [["Accueil", "/"], ["Outre-mer", "/outre-mer/"], [t.label, path]];
  const body = `
${crumbs(crumbItems)}
<article class="art">
  <div class="wrap">
    <p class="eyebrow">Portrait · ${esc(t.label)}</p>
    <h1 class="art-h1">${esc(t.label)} : ${esc(TC[t.id].tagline)}</h1>
    <p class="art-by">Par l'équipe KAZONLY · ${Math.max(2, Math.round([...TC[t.id].intro, ...TC[t.id].histoire, TC[t.id].louer].join(" ").split(/\s+/).length / 190))} min de lecture</p>
  </div>
  <div class="wrap art-banner">${scene(t.id)}</div>
  <div class="wrap art-body">
    <p class="art-chapo">${esc(TC[t.id].intro[0])}</p>
    <nav class="art-toc" aria-label="Sommaire"><a href="#histoire">Une terre, une histoire</a><a href="#lieux">Lieux à connaître</a><a href="#louer">Louer et investir ici</a></nav>
    <p class="drop">${esc(TC[t.id].intro[1])}</p>
    <h2 id="histoire">Une terre, une histoire</h2>
    ${TC[t.id].histoire.map((x) => `<p>${esc(x)}</p>`).join("")}
    <blockquote class="art-quote">${esc(TC[t.id].atouts[0])}.</blockquote>
    <h2 id="lieux">Lieux à connaître ${prep(t)}</h2>
    <ul class="art-places">${TC[t.id].lieux.map(([n, d]) => `<li><b>${esc(n)}</b><span>${esc(d)}</span></li>`).join("")}</ul>
    <h2 id="louer">Louer et investir ${prep(t)}</h2>
    <p>${esc(TC[t.id].louer)}</p>
    <p>KAZONLY aide les propriétaires bailleurs ${prep(t)} à suivre leurs loyers, leurs dépenses et leurs biens en ${devise(t)}, sans tableur et sans mélange de devises.</p>
    <div class="cta-row"><a class="btn btn-primary" href="${SIGNUP('proprietaire', 'month', t.currency)}">Essayer gratuitement ${TRIAL} jours</a><a class="btn btn-ghost" href="/tarifs/${t.currency === 'XPF' ? '?cur=xpf' : ''}">Voir les tarifs</a></div>
  </div>
</article>

<section class="soft"><div class="wrap">
  <h2>Ce qui est adapté ${prep(t)}</h2>
  <div class="cards c2" style="margin:24px 0">
    <div class="card"><h3>Devise</h3><p class="muted">${t.currency === "EUR" ? "Euro (€), avec centimes." : "Franc Pacifique (XPF), affiché sans décimales. Jamais additionné à des euros."}</p></div>
    <div class="card"><h3>Adresse et code postal</h3><p class="muted">Quatre champs distincts ; ${fixed ? `code postal unique ${t.postal}` : `code postal en ${t.postal}xx contrôlé`} automatiquement.</p></div>
    <div class="card"><h3>Téléphone</h3><p class="muted">Indicatif ${t.phone} pré-rempli pour vos locataires.</p></div>
    <div class="card"><h3>Types de location</h3><p class="muted">Location nue, meublée, meublé de tourisme classé ou non classé, avec tarif par nuit pour la saisonnier.</p></div>
  </div>
  <dl class="facts">
    <div><dt>Territoire</dt><dd>${esc(t.label)}</dd></div>
    <div><dt>Chef-lieu</dt><dd>${esc(t.chefLieu)}</dd></div>
    <div><dt>Devise</dt><dd>${t.currency}</dd></div>
    <div><dt>Indicatif téléphonique</dt><dd>${t.phone}</dd></div>
    <div><dt>Code postal</dt><dd>${fixed ? t.postal : t.postal + "xx"}</dd></div>
  </dl>
</div></section>

<section><div class="wrap prose">
  <h2>Fiscalité locale : à vérifier</h2>
  <p>${esc(FISCAL[t.kind])}</p>
  <p class="fine">Information générale, non contractuelle, qui ne constitue pas un conseil fiscal.</p>
</div></section>

<section class="soft"><div class="wrap prose">
  <h2>Questions fréquentes ${prep(t)}</h2>
  ${faqHtml(faq)}
</div></section>

<section><div class="wrap">
  <h2>Autres territoires</h2>
  <ul class="pill-list">${territories.filter((x) => x.id !== t.id).map((x) => `<li><a href="/${x.slug}/">${esc(x.label)}</a></li>`).join("")}</ul>
</div></section>

<section><div class="wrap"><div class="band">
  <h2>Gérez vos locations ${prep(t)} dès aujourd'hui.</h2>
  <p>${TRIAL} jours d'essai, sans débit pendant l'essai.</p>
  <a class="btn btn-primary" href="${SIGNUP('proprietaire', 'month', t.currency)}">Démarrer mon essai</a>
</div></div></section>`;

  return page({
    path,
    title: `Gestion locative ${prep(t)} | Logiciel en ${t.currency === "EUR" ? "euros" : "francs Pacifique"} | KAZONLY`,
    description: `Suivez loyers, dépenses et biens ${prep(t)} en ${t.currency === "EUR" ? "euros" : "francs Pacifique (XPF)"}. Code postal ${fixed ? t.postal : t.postal + "xx"}, indicatif ${t.phone}. Essai ${TRIAL} jours.`,
    body,
    ld: [breadcrumbLd(crumbItems), faqLd(faq)],
  });
}

export function notFound() {
  return page({
    path: "/404.html",
    title: "Page introuvable | KAZONLY",
    description: "Cette page n'existe pas.",
    noindex: true,
    body: `<section><div class="wrap prose"><h1>Page introuvable</h1><p class="lead">Le lien est peut-être ancien. Retrouvez ce que vous cherchez depuis l'accueil.</p><p><a class="btn btn-primary" href="/">Retour à l'accueil</a></p></div></section>`,
  });
}

export function contactPage() {
  const opts = territories.map((t) => `<option value="${esc(t.label)}">${esc(t.label)}</option>`).join("");
  const body = `
${crumbs([["Accueil", "/"], ["Contact", "/contact/"]])}
<section style="padding-top:28px"><div class="wrap">
  <div class="contact">
    <div>
      <p class="eyebrow">Contact</p>
      <h1>Parlons de votre activité</h1>
      <p class="lead">Agence, gestionnaire ou gros portefeuille : nous construisons avec vous l'offre Agence / Scale la mieux adaptée. Une question ? Écrivez-nous aussi.</p>
      <h2 style="font-size:1.2rem;margin-top:28px">Pour répondre utilement, dites-nous</h2>
      <ul class="ticks"><li>Combien de biens vous suivez, et dans quels territoires.</li><li>Combien de personnes utiliseront l'outil.</li><li>Vos outils actuels et les données à reprendre.</li><li>Ce qui vous manque aujourd'hui.</li></ul>
    </div>
    <form class="cform" id="contact-form" novalidate data-sitekey="${esc(process.env.TURNSTILE_SITE_KEY || "")}">
      <div class="fld"><label for="c-topic">Votre demande</label>
        <select id="c-topic" name="topic"><option value="agence">Offre Agence / Scale</option><option value="question">Une question</option><option value="autre">Autre</option></select></div>
      <div class="fld"><label for="c-name">Nom</label><input id="c-name" name="name" autocomplete="name" required maxlength="120"></div>
      <div class="fld"><label for="c-email">Adresse e-mail pour vous répondre</label><input id="c-email" name="email" type="email" autocomplete="email" required maxlength="200"></div>
      <div class="two">
        <div class="fld"><label for="c-terr">Territoire</label><select id="c-terr" name="territory"><option value="">Choisir</option>${opts}</select></div>
        <div class="fld"><label for="c-props">Nombre de biens</label><input id="c-props" name="properties" inputmode="numeric" maxlength="6"></div>
      </div>
      <div class="fld"><label for="c-msg">Votre message</label><textarea id="c-msg" name="message" rows="5" required maxlength="3000"></textarea></div>
      <div class="hp" aria-hidden="true"><label>Ne pas remplir<input name="website" tabindex="-1" autocomplete="off"></label></div>
      <div id="ts-contact" class="ts-slot"></div>
      <p class="err" id="c-err" role="alert"></p>
      <button class="btn btn-primary btn-block" type="submit" id="c-send">Envoyer ma demande</button>
      <p class="fine">Vos informations ne servent qu'à répondre à votre demande. Voir la <a href="/confidentialite/">politique de confidentialité</a>.</p>
    </form>
    <div class="cdone" id="contact-done" hidden><h2>Demande envoyée.</h2><p>Merci. Nous vous répondons à l'adresse indiquée.</p><a class="btn btn-ghost" href="/">Retour à l'accueil</a></div>
  </div>
</div></section>`;
  return page({
    path: "/contact/",
    title: "Contact et offre Agence / Scale | KAZONLY",
    description: "Agence, gestionnaire ou gros portefeuille en Outre-mer : contactez KAZONLY pour une offre Agence / Scale sur mesure.",
    body,
    ld: [breadcrumbLd([["Accueil", "/"], ["Contact", "/contact/"]])],
  });
}
