import { SIGNUP_FREE, freeMonths, fmtPrice, abs, breadcrumbLd, cfg, crumbs, esc, faqHtml, faqLd, fmtXpf, img, page, plansData, SIGNUP, territories, val } from "./layout.mjs";
import { colonnes, lignesMatrice } from "./formules.mjs";

import fs from "node:fs";
import { scene } from "./scenes.mjs";
const TC = JSON.parse(fs.readFileSync("shared/territory-content.json", "utf8"));
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
    `La formule Gratuite permet de suivre ${free.maxProperties} bien, sans limite de durée et sans carte bancaire. Elle vous permet d'essayer KAZONLY avant de choisir une formule payante, qui démarrent à ${plans[0].monthly} € par mois.`],
  [`Puis-je essayer avant de payer ?`,
    `Oui. La formule Gratuite, pour 1 bien, reste sans carte et sans limite de durée. Pour une formule payante, la première souscription inclut 14 jours offerts : la carte est demandée, aucun débit n'intervient pendant l'essai, et vous êtes prévenu avant le premier paiement. L'essai n'est accordé qu'une seule fois par compte.`],
  ["KAZONLY remplace-t-il un comptable, un notaire ou une agence ?",
    "Non. KAZONLY est un outil de suivi et d'aide à la décision. Il ne fournit pas de conseil juridique, fiscal ou comptable et n'est pas une agence de gestion : pour vos déclarations ou un litige, rapprochez-vous d'un professionnel."],
  ["Mes données sont-elles protégées ?",
    "Chaque compte ne voit que ses propres données (isolement par utilisateur dans la base), les échanges sont chiffrés en HTTPS et le paiement est géré par Stripe : KAZONLY ne conserve pas vos données bancaires. Le détail figure dans la politique de confidentialité."],
  ["Les agences et les gros portefeuilles sont-ils concernés ?",
    `Oui. La formule Investisseur permet de suivre jusqu'à ${plans[2].maxProperties} biens. Au-delà, ou pour un besoin spécifique (plusieurs utilisateurs, import de données, accompagnement), nous proposons une offre Agence / Scale sur devis : contactez-nous pour construire la solution adaptée.`],
];

// FAQ propre à la page Tarifs : les questions sur les prix, les formules et la comparaison.
const FAQ_TARIFS = [
  ["La formule Gratuite a-t-elle une limite de durée ?",
    "Non. Elle suit 1 bien, sans limite de durée et sans carte bancaire. Elle ne donne accès qu'aux fonctions de base."],
  ["Quelle différence entre Essentiel et Propriétaire ?",
    "Essentiel couvre le suivi des loyers, des dépenses, les quittances, les relances et les simulateurs de base, jusqu'à 5 biens. Propriétaire ajoute la fiscalité par territoire (micro ou réel), le score de santé, le rendement net, les projections à 5, 10, 15 et 20 ans et les simulateurs avancés, jusqu'à 15 biens."],
  ["Que comprend l'offre Investisseur, en plus de Propriétaire ?",
    `Jusqu'à ${plans[2].maxProperties} biens, une vue consolidée du portefeuille devise par devise et le classement des biens par score. La fonction « plusieurs utilisateurs et accès comptable » est en préparation (bientôt).`],
  ["Les prix incluent-ils la TVA ?",
    `Les prix sont affichés toutes taxes comprises. ${cfg.tvaMention ? cfg.tvaMention + "." : ""}`],
  ["Quelle différence entre le tarif mensuel et le tarif annuel ?",
    `L'abonnement annuel équivaut à ${12 - freeMonths} mois au prix de 12, soit ${freeMonths} mois offerts. Vous pouvez changer de période depuis « Mon abonnement ».`],
  ["Que se passe-t-il si je dépasse la limite de biens de ma formule ?",
    "L'ajout d'un nouveau bien est bloqué jusqu'au changement de formule. Vos données existantes restent intactes."],
];

const FAQ_BILLING = [
  ["Comment se passe la souscription d'une formule payante ?",
    "Vous choisissez une formule et la période (mensuelle ou annuelle), puis vous réglez par carte via Stripe. L'abonnement démarre immédiatement, après votre accord exprès. Vous pouvez vous rétracter dans les 14 jours depuis votre compte, et résilier à tout moment."],
  ["Puis-je changer de formule ou résilier ?",
    "Oui, à tout moment depuis « Mon abonnement » dans l'application (portail sécurisé Stripe). La résiliation prend effet à la fin de la période déjà payée."],
  ["Quels moyens de paiement acceptez-vous ?",
    "Les cartes bancaires, via Stripe. La facturation se fait en euros."],
  ["Que se passe-t-il si je dépasse le nombre de biens de ma formule ?",
    "L'ajout d'un nouveau bien est bloqué tant que vous n'avez pas choisi une formule supérieure. Vos données existantes restent intactes."],
  ["Y a-t-il une réduction en payant à l'année ?",
    `Oui : l'abonnement annuel équivaut à ${12 - freeMonths} mois au prix de 12, soit ${freeMonths} mois offerts.`],
];

/* ---------- Accueil « Lagon calme » : création de compte gratuit, démonstration, arguments, tarifs ---------- */
const free_ = plansData.free;

// Démonstration de l'accueil : données fictives, une entrée par territoire (les 11 sont couverts au lancement).
// Les montants sont saisis en nombres ; le solde est calculé (loyers − dépenses), jamais saisi à la main.
const DEMO_BRUT = {
  martinique: { nom: "Martinique", devise: "EUR", loyers: 2450, depenses: 610, at: "Saison cyclonique", ad: "Vérifiez la garantie catastrophes naturelles de votre bien." },
  guadeloupe: { nom: "Guadeloupe", devise: "EUR", loyers: 1980, depenses: 540, at: "Diagnostic à renouveler", ad: "Le diagnostic du studio arrive à échéance en mars." },
  guyane: { nom: "Guyane", devise: "EUR", loyers: 1420, depenses: 390, at: "Humidité et entretien", ad: "Prévoyez l'entretien de la ventilation avant la saison des pluies." },
  reunion: { nom: "La Réunion", devise: "EUR", loyers: 2130, depenses: 575, at: "Saison cyclonique", ad: "Vérifiez votre assurance pour le T2 de votre bien." },
  mayotte: { nom: "Mayotte", devise: "EUR", loyers: 1360, depenses: 410, at: "Assurance", ad: "Relisez les garanties de votre bien avant l'échéance." },
  "saint-martin": { nom: "Saint-Martin", devise: "EUR", loyers: 2280, depenses: 620, at: "Saison cyclonique", ad: "Vérifiez la garantie catastrophes naturelles de votre bien." },
  "saint-barthelemy": { nom: "Saint-Barthélemy", devise: "EUR", loyers: 3150, depenses: 880, at: "Saison cyclonique", ad: "Contrôlez les fixations extérieures avant la saison." },
  spm: { nom: "Saint-Pierre-et-Miquelon", devise: "EUR", loyers: 1240, depenses: 430, at: "Chauffage", ad: "Faites contrôler le chauffage avant l'hiver." },
  "nouvelle-caledonie": { nom: "Nouvelle-Calédonie", devise: "XPF", loyers: 262000, depenses: 71000, at: "Saison cyclonique", ad: "Vérifiez l'assurance de votre bien avant la saison des cyclones." },
  polynesie: { nom: "Polynésie française", devise: "XPF", loyers: 238000, depenses: 66000, at: "Entretien", ad: "Prévoyez l'entretien de la toiture avant la saison des pluies." },
  "wallis-futuna": { nom: "Wallis-et-Futuna", devise: "XPF", loyers: 149000, depenses: 42000, at: "Assurance", ad: "Vérifiez les garanties de votre bien." },
};
/** Montant affiché : euros avec espace des milliers, ou francs Pacifique sans décimales. */
export const montantDemo = (n, devise) => {
  const signe = n < 0 ? "−" : n > 0 ? "+" : "";
  const abs = Math.abs(n).toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ");
  return `${signe}${abs} ${devise === "XPF" ? "XPF" : "€"}`.replace("+ ", "+").replace("− ", "−");
};
/** Solde = loyers − dépenses, calculé pour chaque territoire. */
export const soldeDemo = (t) => t.loyers - t.depenses;
/** Montant sans signe (loyers, dépenses) : 1 980 €, 262 000 XPF. */
const montantNu = (n, devise) => `${Math.abs(n).toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ")} ${devise === "XPF" ? "XPF" : "€"}`;
export const DEMO = Object.fromEntries(Object.entries(DEMO_BRUT).map(([id, t]) => [id, {
  nom: t.nom,
  rent: montantNu(t.loyers, t.devise),
  spend: montantNu(t.depenses, t.devise),
  fore: montantDemo(soldeDemo(t), t.devise),
  at: t.at,
  ad: t.ad,
}]));
const DEMO_DEFAUT = "martinique";

/** Achat direct sans compte : e-mail, consentement exprès à commencer tout de suite, jeton Turnstile. Le compte KAZONLY est créé après le paiement. */
function checkoutPanel() {
  return `
  <div class="checkout-panel" id="checkout-panel" hidden>
    <form class="cform" id="checkout-form" novalidate data-sitekey="${esc(process.env.TURNSTILE_SITE_KEY || "")}">
      <h2 class="h3">Souscrire : <span id="co-plan"></span></h2>
      <p class="fine">14 jours offerts, carte demandée, aucun débit pendant l'essai. Votre espace KAZONLY se crée à partir de cette adresse : un e-mail vous permettra de choisir votre mot de passe.</p>
      <div class="fld"><label for="co-email">Adresse e-mail</label><input id="co-email" name="email" type="email" autocomplete="email" required maxlength="200"></div>
      <div class="fld consent"><label><input id="co-consent" name="consent" type="checkbox"> <span>Je demande à commencer l'accès tout de suite. Je sais que mon droit de rétractation de 14 jours prend fin lorsque le service est entièrement exécuté.</span></label></div>
      <div id="ts-checkout" class="ts-slot" data-action="checkout"></div>
      <p class="err" id="co-err" role="alert"></p>
      <button class="btn btn-primary btn-block" type="submit" id="co-send">Continuer vers le paiement sécurisé</button>
      <p class="fine">Paiement traité par Stripe. Voir les <a href="/cgv/">conditions générales de vente</a>.</p>
    </form>
  </div>`;
}

function planCardsHome() {
  const free = `
    <div class="plan">
      <h2 class="plan-h">${esc(free_.name)}</h2>
      <p class="muted">${esc(free_.tagline)}</p>
      <p class="price"><span data-m>0 €<small>/mois</small></span><span data-y hidden>0 €<small>/an</small></span></p>
      <p class="fine">Sans carte bancaire</p>
      <a class="btn btn-ghost btn-block" href="${SIGNUP_FREE}">Créer mon compte gratuit</a>
    </div>`;
  const cards = plans.map((p) => `
    <div class="plan${p.highlight ? " hl" : ""}">
      ${p.recommandation ? `<p class="rec">${esc(p.recommandation)}</p>` : ""}
      <h2 class="plan-h">${esc(p.name)}</h2>
      <p class="muted">${esc(p.tagline)}</p>
      <p class="price"><span data-m>${p.monthly} €<small>/mois</small></span><span data-y hidden>${fmtPrice(p.yearly)} €<small>/an</small></span></p>
      <p class="fine"><span data-m>jusqu'à ${p.maxProperties} biens</span><span data-y hidden>${freeMonths} mois offerts, jusqu'à ${p.maxProperties} biens</span></p>
      <p class="fine essai-note">14 jours offerts, carte demandée, aucun débit pendant l'essai.</p>
      <button type="button" class="btn btn-primary btn-block" data-checkout="${p.id}" data-name="${esc(p.name)}">S'abonner à ${esc(p.name)}</button>
    </div>`).join("");
  return free + cards;
}

// Hauteurs des barres de l'exemple (données fictives, en pourcentage).
const BARRES = [34, 40, 37, 50, 46, 58, 55, 66, 62, 74, 71, 86];
const MOIS = ["Déc.", "Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov."];

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
    description: "Suivi des loyers, trésorerie et alertes pour propriétaires bailleurs des départements d'outre-mer, en euros et en francs Pacifique.",
    areaServed: territories.map((t) => t.label),
    offers: [{ "@type": "Offer", name: free_.name, price: 0, priceCurrency: "EUR", url: abs("/tarifs/") }].concat(plans.map((p) => ({
      "@type": "Offer", name: p.name, price: p.monthly, priceCurrency: "EUR", url: abs("/tarifs/"),
    }))),
  };
  const pills = territories.map((t) => `<button type="button" class="k-chip" data-t="${t.id}" aria-pressed="${t.id === DEMO_DEFAUT}">${esc(t.label)}</button>`).join("");
  const bars = BARRES.map((h, i) => `<i style="--h:${h}%;--d:${(i * 0.06).toFixed(2)}s" title="${MOIS[i]}"></i>`).join("");
  const trust = [
    ["Double authentification", "Un code à usage unique protège chaque connexion.", "M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"],
    ["Données chiffrées", "En transit et au repos, sur des serveurs sécurisés.", "M6 11h12v9H6zM8 11V8a4 4 0 018 0v3"],
    ["Sources officielles", "Chaque repère renvoie au texte qui le fonde.", "M5 4h10l4 4v12H5zM14 4v5h5"],
    ["Vos données vous suivent", "Export gratuit à tout moment, suppression en un clic.", "M12 4v11M7 10l5 5 5-5M5 20h14"],
  ].map(([t, d, icon]) => `<div class="trust-item"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1976d2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icon}"/></svg><h3>${t}</h3><p>${d}</p></div>`).join("");

  const body = `
<section class="hero2" aria-labelledby="hero-title">
  <div class="blob b1" aria-hidden="true"></div><div class="blob b2" aria-hidden="true"></div>
  <div class="wrap hero2-in">
    <p class="eyebrow k-rise">Pour les propriétaires d'outre-mer</p>
    <h1 id="hero-title" class="h1-xl k-rise">Vos locations d'outre-mer, pilotées d'un seul regard.</h1>
    <p class="lead lead-xl k-rise">Loyers, trésorerie et alertes propres à votre territoire. Que vous viviez sur place ou dans l'Hexagone.</p>
    <div class="cta-row k-rise">
      <a class="btn btn-primary btn-lg" href="${SIGNUP_FREE}">Créer mon compte gratuit</a>
      <a class="btn btn-ghost btn-lg" href="/tarifs/">Voir les tarifs</a>
    </div>
    <p class="fine k-rise">Gratuit pour 1 bien, sans carte bancaire.</p>
  </div>
</section>

<section class="demo-sec" aria-labelledby="demo-title"><div class="wrap">
  <div class="terr-switch" role="group" aria-label="Territoire de l'exemple">
    <span class="terr-lbl">Voir pour :</span>${pills}
  </div>
  <div class="dash" id="dash" aria-live="polite" data-demo="${esc(JSON.stringify(DEMO))}">
    <div class="dash-bar"><span></span><span></span><span></span><b>Tableau de bord · <span data-f="nom">Martinique</span></b></div>
    <div class="dash-body">
      <aside class="dash-nav" aria-hidden="true"><span class="on">Vue d'ensemble</span><span>Mes biens</span><span>Loyers</span><span>Trésorerie</span><span>Alertes</span></aside>
      <div class="dash-main">
        <div class="kpis">
          <div><small>Loyers reçus ce mois</small><b data-f="rent">${DEMO[DEMO_DEFAUT].rent}</b><em class="ok">Tout est encaissé</em></div>
          <div><small>Dépenses du mois</small><b data-f="spend">${DEMO[DEMO_DEFAUT].spend}</b><em>Charges et entretien</em></div>
          <div><small>Solde du mois</small><b class="blue" data-f="fore">${DEMO[DEMO_DEFAUT].fore}</b><em>Exemple, données fictives</em></div>
        </div>
        <div class="chart"><div class="chart-t">Trésorerie mois par mois</div><div class="bars" aria-hidden="true">${bars}</div></div>
        <div class="toast toast-amber" role="status"><small>Exemple d'alerte</small><b data-f="at">Saison cyclonique</b><span data-f="ad">Vérifiez la garantie catastrophes naturelles de votre bien.</span></div>
      </div>
    </div>
  </div>
  <h2 id="demo-title" class="sr-only">Exemple de tableau de bord</h2>
  <p class="fine center">Données d'exemple, pour illustrer l'application.</p>
</div></section>

<section class="trust-sec" aria-labelledby="trust-title"><div class="wrap">
  <h2 id="trust-title" class="sr-only">Confiance</h2>
  <div class="trust-grid">${trust}</div>
</div></section>

<section class="feat-sec" id="fonctionnalites" aria-labelledby="feat-title"><div class="wrap">
  <h2 id="feat-title" class="h2-xl">Tout ce qu'un bailleur d'outre-mer doit suivre, au même endroit.</h2>
  <div class="feat-row">
    <div class="feat-txt">
      <h3>Chaque loyer suivi, sans tableur.</h3>
      <p>Vous voyez qui a payé, qui est en attente, et vous envoyez une relance ou une quittance en un clic.</p>
      <a class="link-u" href="/tarifs/">Voir les formules</a>
    </div>
    <div class="feat-card">
      <div class="mini"><span><b>T3 Bellevue</b><small>Fort-de-France</small></span><em>920 €</em><i class="pill ok">Payé</i></div>
      <div class="mini"><span><b>Studio Bas-du-Fort</b><small>Le Gosier</small></span><em>850 €</em><i class="pill ok">Payé</i></div>
      <div class="mini"><span><b>T2 Saint-Gilles</b><small>Saint-Paul</small></span><em>680 €</em><i class="pill wait">Attendu le 5</i></div>
    </div>
  </div>
  <div class="feat-row rev">
    <div class="feat-txt">
      <h3>Votre solde, mois par mois.</h3>
      <p>Loyers attendus et encaissés, dépenses et taxe foncière saisis à leur mois : le rapport mensuel affiche le solde de chaque mois. KAZONLY ne calcule pas l'impôt. La prévision sur douze mois est en préparation.</p>
      <a class="link-u" href="/fonctionnalites/tresorerie/">Découvrir la trésorerie</a>
    </div>
    <div class="feat-card">
      <div class="mini"><span><b>Taxe foncière</b><small>Octobre, impôts et taxes</small></span><em>−1 240 €</em><i class="pill info">Exemple</i></div>
      <div class="mini"><span><b>Peinture T2</b><small>Mars, entretien</small></span><em>−800 €</em><i class="pill info">Exemple</i></div>
      <div class="mini"><span><b>Solde du mois</b><small>Rapport mensuel</small></span><em>+1 840 €</em><i class="pill info">Exemple</i></div>
    </div>
  </div>
  <div class="feat-row">
    <div class="feat-txt">
      <h3>Des repères par territoire, avec leur source.</h3>
      <p>Cyclones, indices de loyer, diagnostics : chaque repère renverra vers le texte officiel qui le fonde. (bientôt)</p>
      <a class="link-u" href="/outre-mer/">Voir les territoires</a>
    </div>
    <div class="feat-card">
      <div class="mini"><span><b>Exemple : saison cyclonique</b><small>Non publiée</small></span><i class="pill info">Exemple</i></div>
      <div class="mini"><span><b>Exemple : indice de loyer</b><small>Non publié</small></span><i class="pill info">Exemple</i></div>
      <div class="mini"><span><b>Exemple : diagnostic</b><small>Non publié</small></span><i class="pill info">Exemple</i></div>
    </div>
  </div>
  <p class="fine center">Maquettes avec des données fictives. L'application ne publie encore aucun repère réglementaire : ces alertes sont des exemples, sans source.</p>
  <p class="aussi"><span>Et aussi :</span><a href="/tarifs/">Fiche par bien</a><a href="/tarifs/">Simulateur de rentabilité</a><a href="/tarifs/">Quittances PDF</a><a href="/tarifs/">Coffre-fort documents</a></p>
</div></section>

<section class="tarifs-sec" id="tarifs-apercu" aria-labelledby="tarifs-title"><div class="wrap">
  <div class="tarifs-head">
    <div>
      <h2 id="tarifs-title" class="h2-xl">Votre formule, en deux minutes.</h2>
      <p class="lead">Choisissez, payez en ligne, votre espace est prêt.</p>
    </div>
    <div class="seg" data-billing-toggle role="group" aria-label="Période de facturation">
      <button type="button" data-interval="month" aria-pressed="true">Mensuel</button>
      <button type="button" data-interval="year" aria-pressed="false">Annuel, ${freeMonths} mois offerts</button>
    </div>
  </div>
  <div class="plans">${planCardsHome()}</div>
  ${checkoutPanel()}
  <p class="fine">Paiement sécurisé par Stripe. Résiliation en ligne. Export de vos données gratuit. Agences et gros portefeuilles : <a href="/contact/?sujet=agence">sur devis</a>.</p>
</div></section>

<section class="confiance-sec" id="confiance" aria-labelledby="eng-title"><div class="wrap">
  <p class="eyebrow">Nos engagements</p>
  <h2 id="eng-title" class="h2-xl">Ce que KAZONLY s'engage à tenir.</h2>
  <div class="trust" style="margin-top:24px">
    <div class="card"><h3>Gratuit pour un bien</h3><p class="muted">Un bien suivi sans carte bancaire et sans limite de durée.</p></div>
    <div class="card"><h3>Prix clairs, résiliables en ligne</h3><p class="muted">Des prix affichés avant tout paiement, et une résiliation possible en ligne à tout moment.</p></div>
    <div class="card"><h3>Données hébergées dans l'Union européenne</h3><p class="muted">La base de données est hébergée en Irlande.</p></div>
    <div class="card"><h3>Un logiciel neutre</h3><p class="muted">KAZONLY ne détient jamais d'argent et n'agit pas comme gestionnaire. Il ne donne aucun conseil juridique ou fiscal.</p></div>
    <div class="card"><h3>Vos données vous appartiennent</h3><p class="muted">Export de vos données gratuit à tout moment, suppression en un clic.</p></div>
    <div class="card"><h3>Conçu pour votre territoire</h3><p class="muted">Pensé pour les onze territoires d'Outre-mer, avec la bonne devise pour chacun.</p></div>
  </div>
</div></section>

<section id="faq"><div class="wrap prose">
  <p class="eyebrow">Questions fréquentes</p>
  <h2>Vos questions, nos réponses.</h2>
  ${faqHtml([FAQ[4], FAQ[1], FAQ[2], FAQ[7], FAQ[6], FAQ[5], FAQ_BILLING[1]])}
  <p><a href="/faq/">Voir toutes les questions →</a></p>
</div></section>

<section class="newsletter" aria-labelledby="nl-title"><div class="wrap">
  <h2 id="nl-title">Les règles changent. Vous serez prévenu.</h2>
  <p class="lead">Une lettre par mois : lois, indices et obligations qui évoluent dans votre territoire, et les nouveautés de KAZONLY.</p>
  <form class="nl-form" id="newsletter-form" novalidate data-sitekey="${esc(process.env.TURNSTILE_SITE_KEY || "")}">
    <label for="nl-email" class="sr-only">Adresse e-mail</label>
    <input id="nl-email" name="email" type="email" autocomplete="email" placeholder="vous@exemple.fr" required maxlength="320">
    <label class="nl-consent"><input type="checkbox" name="consent" value="1"> J'accepte de recevoir la veille KAZONLY. Désinscription en un clic. Voir la <a href="/confidentialite/">politique de confidentialité</a>.</label>
    <div id="newsletter-ts" class="ts-slot" data-action="newsletter"></div>
    <button class="btn btn-amber" type="submit">Recevoir la veille</button>
  </form>
  <p class="err" id="newsletter-msg" role="status" aria-live="polite"></p>
</div></section>

<section class="final-band"><div class="wrap">
  <h2>Prêt à suivre votre premier bien ?</h2>
  <p>Gratuit pour 1 bien, sans carte bancaire.</p>
  <a class="btn btn-lg btn-white" href="${SIGNUP_FREE}">Créer mon compte gratuit</a>
</div></section>`;

  return page({
    path: "/",
    title: "KAZONLY | Gestion locative pour les départements d'outre-mer",
    description: "Vos locations d'outre-mer, pilotées d'un seul regard : loyers, trésorerie et alertes propres à votre territoire. Gratuit pour 1 bien.",
    body,
    ld: [softwareLd, faqLd(FAQ.slice(0, 5))],
  });
}

/* ---------- Page pilote « Trésorerie » : modèle des pages fonctionnalités ---------- */
export function tresoriePage() {
  const mois = MOIS.map((m, i) => `<div class="tr-col"><i style="--h:${BARRES[i]}%;--d:${(i * 0.06).toFixed(2)}s"></i><small>${m}</small></div>`).join("");
  const body = `
<section class="hero2 hero2-sm" aria-labelledby="tr-title"><div class="blob b1" aria-hidden="true"></div>
  <div class="wrap hero2-in">
    <p class="eyebrow">Fonctionnalité · Trésorerie</p>
    <h1 id="tr-title" class="h1-xl">Vos loyers et dépenses, mois par mois.</h1>
    <p class="lead lead-xl">Loyers attendus et encaissés, dépenses et taxe foncière saisis à leur mois : le rapport affiche le solde de chaque mois. La prévision sur douze mois est en préparation.</p>
    <div class="cta-row"><a class="btn btn-primary btn-lg" href="${SIGNUP_FREE}">Créer mon compte gratuit</a><a class="btn btn-ghost btn-lg" href="/tarifs/">Voir les formules</a></div>
  </div>
</section>

<section class="demo-sec"><div class="wrap">
  <div class="chart chart-lg" data-reveal>
    <div class="chart-t">Exemple de solde mensuel (données fictives)</div>
    <div class="tr-cols" aria-hidden="true">${mois}</div>
  </div>
</div></section>

<section class="feat-sec"><div class="wrap">
  <h2 class="h2-xl">Comment ça marche, en trois étapes.</h2>
  <ol class="steps3">
    <li><span class="num">1</span><h3>Vous saisissez vos dépenses</h3><p>Travaux, assurance, copropriété, taxe foncière : chacune au mois où elle est payée, dans sa catégorie. La taxe foncière se saisit comme une dépense ; KAZONLY ne calcule pas son montant.</p></li>
    <li><span class="num">2</span><h3>Vous suivez vos loyers</h3><p>Le loyer de chaque bien, son échéance, et ce qui est encaissé ou reste à recevoir.</p></li>
    <li><span class="num">3</span><h3>KAZONLY affiche votre solde</h3><p>Un solde par mois, pour chaque bien, dans le rapport mensuel.</p></li>
  </ol>
</div></section>

<section class="feat-sec"><div class="wrap prose">
  <h2 class="h2-xl">Ce qui existe aujourd'hui, et ce qui arrive.</h2>
  <ul class="ticks">
    <li><b>Disponible :</b> loyers attendus et encaissés, dépenses par bien, et solde de chaque mois dans le rapport mensuel.</li>
    <li><b>Disponible :</b> taxe foncière et autres impôts saisis comme dépenses, au mois où ils sont payés. KAZONLY ne calcule pas leur montant.</li>
    <li><b>Bientôt :</b> prévision de trésorerie sur douze mois, avec scénarios. Aucun chiffre de prévision n'est publié tant que cette fonction n'existe pas.</li>
  </ul>
  <p class="fine">Les montants de cette page sont des exemples, sans valeur de prévision. Source de la taxe foncière : <a href="https://www.service-public.gouv.fr/particuliers/vosdroits/F3171">service-public.gouv.fr, taxe foncière sur les propriétés bâties</a>.</p>
  <h2 class="h2-md">Par territoire</h2>
  <p>Les charges et la fiscalité ne sont pas les mêmes d'un territoire à l'autre. La devise de chaque bien reste celle de son territoire : euro ou franc Pacifique, jamais additionnés. Repères par territoire : <a href="/outre-mer/">voir les territoires</a>.</p>
</div></section>

<section class="confiance-sec"><div class="wrap prose">
  <h2 class="h2-md">Questions fréquentes</h2>
  ${faqHtml([
    ["La trésorerie prévoit-elle l'impôt ?", "Non. Elle compte vos loyers et vos dépenses. KAZONLY ne calcule aucun impôt : pour votre fiscalité, rapprochez-vous de votre service des impôts ou d'un professionnel."],
    ["Mes loyers passent-ils par KAZONLY ?", "Non. KAZONLY ne reçoit, ne détient et ne prélève aucun loyer."],
    ["Puis-je l'utiliser gratuitement ?", `Oui, pour 1 bien, sans carte bancaire. Les formules payantes démarrent à ${plans[0].monthly} € par mois.`],
  ])}
</div></section>

<section class="final-band"><div class="wrap">
  <h2>Suivez votre solde, mois par mois.</h2>
  <p>Gratuit pour 1 bien, sans carte bancaire.</p>
  <a class="btn btn-lg btn-white" href="${SIGNUP_FREE}">Créer mon compte gratuit</a>
</div></section>`;
  return page({
    path: "/fonctionnalites/tresorerie/",
    title: "Suivi de trésorerie mensuel | KAZONLY",
    description: "Suivez les loyers, les dépenses et le solde de chaque mois de vos biens d'outre-mer. Prévision sur douze mois en préparation. Gratuit pour 1 bien.",
    body,
    ld: [faqLd([
      ["La trésorerie prévoit-elle l'impôt ?", "Non. Elle compte vos loyers et vos dépenses."],
      ["Mes loyers passent-ils par KAZONLY ?", "Non. KAZONLY ne reçoit, ne détient et ne prélève aucun loyer."],
    ])],
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
      ${p.recommandation ? `<p class="rec">${esc(p.recommandation)}</p>` : ""}
      <h2 class="plan-h">${esc(p.name)}</h2>
      <p class="muted">${esc(p.tagline)}</p>
      <p class="price"><span data-m data-e>${p.monthly} €<small>/mois</small></span><span data-y data-e hidden>${fmtPrice(p.yearly)} €<small>/an</small></span></p>
      <p class="fine"><span data-m data-e>ou ${fmtPrice(p.yearly)} € par an (${freeMonths} mois offerts)</span><span data-y data-e hidden>soit ${fmtPrice(Math.round(p.yearly / 12 * 100) / 100)} €/mois</span></p>
      <ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      <p class="fine essai-note">14 jours offerts, carte demandée, aucun débit pendant l'essai.</p>
      <button type="button" class="btn ${p.highlight ? "btn-primary" : "btn-ghost"} btn-block" data-checkout="${p.id}" data-name="${esc(p.name)}">S'abonner à ${esc(p.name)}</button>
    </div>`).join("");

  const body = `
${crumbs([["Accueil", "/"], ["Tarifs", "/tarifs/"]])}
<section style="padding-top:28px"><div class="wrap">
  <p class="eyebrow">Tarifs</p>
  <h1>Des tarifs simples pour les propriétaires d'Outre-mer.</h1>
  <p class="lead">Un bien gratuit, sans carte bancaire et sans limite de durée. Les formules payantes se souscrivent en ligne, avec un paiement immédiat et résiliables à tout moment.</p>
  <div class="toggle" data-billing-toggle role="group" aria-label="Période de facturation">
    <button type="button" data-interval="month" aria-pressed="true">Mensuel</button>
    <button type="button" data-interval="year" aria-pressed="false">Annuel · ${freeMonths} mois offerts</button>
  </div>
  <div class="plans">${cards}</div>
  ${checkoutPanel()}
  <div class="band left" style="margin-top:24px">
    <p class="eyebrow" style="color:#fff;opacity:.85">Agence / Scale · sur devis</p>
    <h2 style="margin-top:4px">Plus de ${plans[2].maxProperties} biens, ou un besoin spécifique ?</h2>
    <p>${esc(plansData.scale.tagline)}. Parlons de votre activité : nous construisons avec vous l'offre la mieux adaptée.</p>
    <ul style="margin:0 0 16px;padding-left:18px">${plansData.scale.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
    <a class="btn btn-primary" href="/contact/?sujet=agence">Nous contacter</a>
  </div>
  <p class="fine" style="margin-top:16px">${cfg.tvaMention ? esc(cfg.tvaMention) + ". " : ""}Prix en euros, toutes taxes comprises.</p>
</div></section>

<section class="soft" id="comparer"><div class="wrap">
  <p class="eyebrow">Comparatif</p>
  <h2>Comparer les formules, fonction par fonction.</h2>
  <p class="fine">Le tableau est généré depuis la même configuration que les cartes ci-dessus. Sur mobile, faites défiler le tableau horizontalement.</p>
  <div class="scroll" tabindex="0" role="region" aria-label="Tableau comparatif des formules"><table class="cmp">
    <thead><tr><th scope="col">Fonction</th>${colonnes().map((f) => `<th scope="col">${esc(f.name)}</th>`).join("")}</tr></thead>
    <tbody>
${lignesMatrice().map((l) => `      <tr><th scope="row">${esc(l.label)}</th>${l.valeurs.map((v) => `<td>${esc(v)}</td>`).join("")}</tr>`).join("\n")}
    </tbody>
  </table></div>
</div></section>

<section id="questions-tarifs"><div class="wrap prose">
  <p class="eyebrow">Questions sur les tarifs</p>
  <h2>Vos questions sur les prix et les formules.</h2>
  ${faqHtml(FAQ_TARIFS)}
</div></section>

<section class="soft" id="avant-commande"><div class="wrap prose">
  <h2>Informations avant commande</h2>
    <ul>
      <li>Prix affichés TTC. ${esc(cfg.tvaMention)}.</li>
      <li>Formules payantes : abonnement mensuel ou annuel, réglé par carte via Stripe. Il démarre après votre accord exprès et se renouvelle automatiquement à chaque échéance, jusqu'à résiliation.</li>
      <li>Résiliation en ligne possible à tout moment, depuis « Mon abonnement » ou la page <a href="/resilier/">Résilier mon abonnement</a>. Elle prend effet à la fin de la période déjà payée.</li>
      <li>Droit de rétractation de 14 jours, exercé en ligne depuis votre compte. Si vous demandez à commencer le service avant la fin de ce délai, le droit disparaît une fois le service entièrement exécuté.</li>
      <li>Réclamation : ${val("contactEmail")}. Médiateur de la consommation : ${val("mediator", "en cours de désignation")}.</li>
    </ul>
    <p class="fine">Sources : <a href="https://entreprendre.service-public.gouv.fr/vosdroits/F23455">service-public.gouv.fr (F23455)</a>.</p>
</div></section>`;

  return page({
    path: "/tarifs/",
    title: `Tarifs KAZONLY | Gestion locative Outre-mer dès ${plans[0].monthly} €/mois`,
    description: `Un bien gratuit, sans carte bancaire, puis trois formules dès ${plans[0].monthly} €/mois pour gérer vos locations en Outre-mer. Résiliable à tout moment, euro et franc Pacifique.`,
    body,
    ld: [breadcrumbLd([["Accueil", "/"], ["Tarifs", "/tarifs/"]]), faqLd(FAQ_TARIFS)],
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
    title: "FAQ KAZONLY | Gestion locative Outre-mer, formule gratuite, tarifs, données",
    description: "Réponses aux questions sur KAZONLY : territoires couverts, euro et franc Pacifique, formule gratuite, résiliation, sécurité des données et fonctions.",
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
    <div class="cta-row"><a class="btn btn-primary" href="/${t.slug}/">Lire le portrait de ${esc(t.label)}</a><a class="btn btn-ghost" href="${SIGNUP_FREE}">Créer mon compte gratuit</a></div>
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
  <p>Gratuit pour 1 bien, sans carte bancaire. Euro ou franc Pacifique selon votre territoire.</p>
  <a class="btn btn-primary" href="${SIGNUP_FREE}">Créer mon compte gratuit</a>
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
    <div class="cta-row"><a class="btn btn-primary" href="${SIGNUP_FREE}">Créer mon compte gratuit</a><a class="btn btn-ghost" href="/tarifs/">Voir les tarifs</a></div>
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
  <p>Gratuit pour 1 bien, sans carte bancaire.</p>
  <a class="btn btn-primary" href="${SIGNUP_FREE}">Créer mon compte gratuit</a>
</div></div></section>`;

  return page({
    path,
    title: `Gestion locative ${prep(t)} | Logiciel en ${t.currency === "EUR" ? "euros" : "francs Pacifique"} | KAZONLY`,
    description: `Suivez loyers, dépenses et biens ${prep(t)} en ${t.currency === "EUR" ? "euros" : "francs Pacifique (XPF)"}. Code postal ${fixed ? t.postal : t.postal + "xx"}, indicatif ${t.phone}. Gratuit pour 1 bien.`,
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
      <p>Vous pouvez aussi écrire directement à ${val("contactEmail")}.</p>
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
      <div id="ts-contact" class="ts-slot" data-action="contact"></div>
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

/* ---------- Résilier mon abonnement, sans compte : lien envoyé par e-mail ---------- */
export function resilierPage() {
  const body = `
<section class="legal wrap prose" style="padding-top:48px">
  <p class="eyebrow">Résiliation</p>
  <h1>Résilier mon abonnement</h1>
  <p class="lead">Indiquez l'adresse e-mail de votre compte. Si un compte existe, nous vous envoyons un lien de connexion qui ouvre directement la page de résiliation. Vous n'avez pas besoin d'être connecté.</p>
  <form class="cform" id="resil-form" novalidate data-sitekey="${esc(process.env.TURNSTILE_SITE_KEY || "")}">
    <div class="fld"><label for="r-email">Adresse e-mail de votre compte</label><input id="r-email" name="email" type="email" autocomplete="email" required maxlength="320"></div>
    <div id="resil-ts" class="ts-slot" data-action="resiliation"></div>
    <button class="btn btn-primary btn-block" type="submit">Envoyer le lien</button>
  </form>
  <p class="err" id="resil-msg" role="status" aria-live="polite"></p>
  <p class="fine">Vous pouvez aussi résilier depuis « Mon abonnement » dans l'application. Informations : <a href="https://entreprendre.service-public.gouv.fr/actualites/A16599">service-public.gouv.fr</a>.</p>
</section>`;
  return page({
    path: "/resilier/",
    title: "Résilier mon abonnement | KAZONLY",
    description: "Résiliez votre abonnement KAZONLY en ligne, sans avoir à ouvrir un espace client.",
    body,
    noindex: true,
  });
}

/* ---------- Confirmation de l'inscription à la veille (page utilitaire, non indexée) ---------- */
export function confirmeVeillePage() {
  const body = `
<section class="legal wrap prose" style="padding-top:48px">
  <p class="eyebrow">Veille KAZONLY</p>
  <h1>Inscription confirmée</h1>
  <p class="lead">Merci. Votre adresse est enregistrée pour recevoir la veille KAZONLY : lois, indices et obligations de votre territoire.</p>
  <p><a class="btn btn-ghost" href="/">Retour à l'accueil</a></p>
</section>`;
  return page({ path: "/newsletter/confirme/", title: "Inscription confirmée | KAZONLY", description: "Votre inscription à la veille KAZONLY est confirmée.", body, noindex: true });
}
