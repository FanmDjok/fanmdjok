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

/* ---------- Récit « douleur → solution » (défilement épinglé sur ordinateur, empilé sur mobile) ---------- */
// Une seule source : le texte sert à la lecture (tous supports), les visuels « avant / avec KAZONLY » sont décoratifs.
const STORY = [
  {
    pain: "Un loyer oublié, et personne ne le voit avant trois mois.",
    painDetail: "Sans vue d'ensemble, le retard se découvre au moment où il coûte le plus cher.",
    sol: "Chaque échéance remonte à l'accueil. Le loyer en retard est signalé, avec un message de relance prêt à copier.",
    solTag: "Retards visibles dès l'accueil",
    painVis: `<div class="vcard"><p class="vh">Loyers du mois</p>
      <div class="vrow"><span>T3 · Le Lamentin<small>Échéance le 5</small></span><span class="tag-q">Pas de nouvelles</span></div>
      <div class="vrow"><span>Studio · Fort-de-France<small>Échéance le 10</small></span><span class="tag-q">Pas de nouvelles</span></div>
      <div class="vrow"><span>T2 · Schœlcher<small>Échéance le 12</small></span><span class="tag-q">Pas de nouvelles</span></div>
      <p class="vnote">Qui a payé ? Il faut ouvrir la messagerie pour le savoir.</p></div>`,
    solVis: `<div class="vcard"><p class="vh">Loyers du mois <span class="tag-ok">Exemple</span></p>
      <div class="vrow"><span>T3 · Le Lamentin<small>Payé le 5</small></span><span class="tag-ok">Payé</span></div>
      <div class="vrow"><span>Studio · Fort-de-France<small>Payé le 10</small></span><span class="tag-ok">Payé</span></div>
      <div class="vrow"><span>T2 · Schœlcher<small>Échéance le 12</small></span><span class="tag-bad">En retard</span></div>
      <div class="valert">1 loyer à relancer <b>Copier le message</b></div></div>`,
  },
  {
    pain: "Un tableur qui additionne des francs Pacifique et des euros.",
    painDetail: "Une formule mal recopiée et le total est faux, sans que personne ne s'en aperçoive.",
    sol: "La devise découle du territoire du bien. Chaque total reste dans sa devise : jamais de conversion, jamais de mélange.",
    solTag: "Une devise par total",
    painVis: `<div class="vcard"><p class="vh">Total des loyers</p>
      <div class="vformula">=SOMME(B2:B9)</div>
      <div class="vbig bad">2 230</div>
      <p class="vnote">Francs Pacifique et euros additionnés : un total qui n'existe pas.</p></div>`,
    solVis: `<div class="vcard"><p class="vh">Total par devise</p>
      <div class="vrow"><span>Nouvelle-Calédonie<small>Franc Pacifique</small></span><b>125 000 XPF</b></div>
      <div class="vrow"><span>Martinique<small>Euro</small></span><b>780 €</b></div>
      <p class="vnote ok">Chaque devise reste dans sa devise.</p></div>`,
  },
  {
    pain: "Des dépenses éparpillées entre un classeur, des photos de factures et votre mémoire.",
    painDetail: "Travaux, taxe foncière, copropriété : impossible de savoir ce qu'un bien vous coûte vraiment.",
    sol: "Chaque dépense est rattachée à son logement et à son mois. Le solde net se calcule tout seul.",
    solTag: "Un solde net par bien",
    painVis: `<div class="vcard"><p class="vh">Dépenses</p>
      <div class="chips"><span class="chip c1">Taxe foncière ?</span><span class="chip c2">Facture plombier</span><span class="chip c3">Copro ?</span><span class="chip c4">Photo du reçu</span></div>
      <p class="vnote">Dispersées : impossible de savoir ce que coûte le bien.</p></div>`,
    solVis: `<div class="vcard"><p class="vh">Solde net · juin</p>
      <div class="vbig ok">+ 640 €</div>
      <div class="vbar" aria-hidden="true"><i></i></div>
      <div class="vrow"><span>Loyers reçus<small>3 biens</small></span><b>1 230 €</b></div>
      <div class="vrow"><span>Dépenses rattachées<small>Par logement</small></span><b>− 590 €</b></div></div>`,
  },
  {
    pain: "Vous ignorez si un bien rapporte vraiment votre argent.",
    painDetail: "Le rendement affiché ne dit rien de la vacance, de la gestion ni des charges réelles.",
    sol: "Rendement brut et net, cash-flow et score de santé de 0 à 100. Le calcul est expliqué, pas deviné.",
    solTag: "Score de 0 à 100, calcul expliqué",
    painVis: `<div class="vcard"><p class="vh">Rendement affiché</p>
      <div class="vbig bad">6 % ?</div>
      <p class="vnote">Ce chiffre ne tient compte ni de la vacance, ni de la gestion, ni des charges.</p></div>`,
    solVis: `<div class="vcard"><p class="vh">Score de santé · exemple</p>
      <svg viewBox="0 0 200 116" class="gauge" role="img" aria-label="Score de 72 sur 100"><path class="g-bg" pathLength="100" d="M20 106 A80 80 0 0 1 180 106"/><path class="g-fg" pathLength="100" d="M20 106 A80 80 0 0 1 180 106"/></svg>
      <div class="vbig ok gs">72 / 100</div>
      <p class="vnote ok">Cash-flow, rendement et endettement, chacun détaillé.</p></div>`,
  },
];

function storySection() {
  const beats = STORY.map((s, i) => `
    <li class="beat" data-i="${i}">
      <span class="beat-num">0${i + 1}</span>
      <h3 class="beat-pain">${esc(s.pain)}</h3>
      <p class="muted beat-detail">${esc(s.painDetail)}</p>
      <div class="beat-sol">
        <span class="sol-tag">✓ ${esc(s.solTag)}</span>
        <p>${esc(s.sol)}</p>
      </div>
    </li>`).join("");
  const vis = STORY.map((s, i) => `
      <div class="vis${i === 0 ? " on" : ""}" data-v="${i}">
        <div class="v-pain">${s.painVis}</div>
        <div class="v-sol">${s.solVis}</div>
      </div>`).join("");
  return `
<section class="story" id="probleme" aria-labelledby="story-title"><div class="wrap">
  <header class="story-head">
    <p class="eyebrow">Le problème, puis la solution</p>
    <h2 id="story-title">Ce que vit chaque propriétaire d'Outre-mer, et ce qui change.</h2>
    <p class="lead">Faites défiler : chaque difficulté trouve sa réponse.</p>
  </header>
  <div class="story-grid">
    <div class="stage" aria-hidden="true" data-stage data-ph="p">
      <div class="stage-top"><span class="stage-tag">Avant</span><span class="stage-dots"><i></i><i></i><i></i><i></i></span></div>
      <div class="stage-in">${vis}
      </div>
    </div>
    <ol class="beats">${beats}
    </ol>
  </div>
</div></section>`;
}

/* ---------- Accueil ---------- */
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
    description: "Suivi des loyers, analyses de rentabilité et projections de patrimoine pour propriétaires bailleurs des Outre-mer, en euros et en francs Pacifique.",
    areaServed: territories.map((t) => t.label),
    offers: [{ "@type": "Offer", name: free.name, price: 0, priceCurrency: "EUR", url: abs("/tarifs/") }].concat(plans.map((p) => ({
      "@type": "Offer", name: p.name, price: p.monthly, priceCurrency: "EUR", url: abs("/tarifs/"),
      priceSpecification: { "@type": "UnitPriceSpecification", price: p.monthly, priceCurrency: "EUR", billingDuration: 1, unitCode: "MON" },
    }))),
  };
  const demo = '<p class="demo">Données d\'exemple</p>';
  const body = `
<section class="hero"><div class="wrap grid">
  <div>
    <p class="eyebrow">La gestion locative pensée pour les Outre&#8209;mer</p>
    <h1>Le logiciel de gestion locative des propriétaires d'Outre&#8209;mer.</h1>
    <p class="lead">Suivez vos loyers, comprenez la performance de chaque bien et projetez votre patrimoine, en euros ou en francs Pacifique. Sans tableur.</p>
    <div class="cta-row">
      <a class="btn btn-primary" href="${SIGNUP_FREE}">Commencer gratuitement</a>
      <a class="btn btn-ghost" href="/tarifs/">Voir les tarifs</a>
    </div>
    <p class="fine">1 bien gratuit, sans carte bancaire. Formules payantes avec ${TRIAL} jours d'essai, résiliables à tout moment.</p>
  </div>
  <figure style="margin:0;position:relative" class="hero-fig"><div class="phone" data-par>${img("app-accueil", "Tableau de bord KAZONLY : revenus, dépenses, loyers reçus, en attente et en retard", 520, 1040, false)}</div>${demo}
    <div class="fchip fc1" aria-hidden="true"><small>Loyer reçu</small><b>Encaissé</b></div>
    <div class="fchip fc2" aria-hidden="true"><small>Score de santé</small><b>0 à 100</b></div></figure>
</div></section>

<div class="bar-proof"><div class="wrap"><ul>
  <li>11 territoires d'Outre-mer</li><li>Euro et franc Pacifique</li><li>Aucun loyer détenu par KAZONLY</li><li>Résiliable à tout moment</li>
</ul></div></div>

<section class="stmt" aria-label="Notre promesse"><div class="wrap"><p id="stmt">Chaque loyer suivi. Chaque dépense rangée. Chaque territoire dans sa propre devise. Voilà ce que vous voyez en ouvrant KAZONLY.</p></div></section>

<section class="demo-sec" id="demo"><div class="wrap dgrid">
  <div>
    <p class="eyebrow">En action</p>
    <h2>Un mois de loyers, en quelques secondes.</h2>
    <p class="lead">Regardez un tableau de bord se remplir : chaque loyer reçu met à jour le total, le statut du bien et la barre d'avancement.</p>
    <div class="dc" role="group" aria-label="Devise de l'exemple"><button type="button" data-dc="eur" aria-pressed="true">Euro (€)</button><button type="button" data-dc="xpf" aria-pressed="false">Franc Pacifique (XPF)</button></div>
    <ul class="ticks"><li>Statut payé, attendu ou en retard, bien par bien</li><li>Total du mois toujours à jour</li><li>Chaque devise reste dans sa devise, sans conversion</li></ul>
    <p class="dm-src" id="dm-src" hidden>Repères de loyers à Nouméa, à titre indicatif : studio ou petit T2 environ 90 000 XPF, T3 120 000 à 130 000 XPF, maison à partir de 250 000 XPF par mois. Source : <a href="https://lepetitjournal.com/vivre-en-nouvelle-caledonie/se-loger-noumea-guide-complet-398346" target="_blank" rel="noopener">Le Petit Journal, « Se loger à Nouméa »</a> (mis à jour le 8 novembre 2025). Achat en centre-ville : environ 500 000 XPF le m² (<a href="https://www.combien-coute.net/prixm2-centre/nouvelle-caledonie/noumea/" target="_blank" rel="noopener">combien-coute.net</a>, d'après Numbeo, novembre 2026). Les montants du tableau de bord restent un exemple.</p>
  </div>
  <div class="dmock" id="dmock" role="img" aria-label="Animation d'exemple : trois loyers du mois passent de attendu à payé ou en retard">
    <div class="dm-h"><b>Novembre 2026</b><span class="ex">Données d'exemple</span></div>
    <div class="dm-total"><small>Loyers reçus</small><b id="dm-sum">0 €</b></div>
    <div class="dm-bar"><i id="dm-fill"></i></div>
    <div class="dm-row" data-e="780" data-x="125000" data-le="T3 · Le Lamentin" data-lx="T3 · Nouméa" data-end="paid"><span><b>T3 · Le Lamentin</b><small>Échéance le 5</small></span><em class="st wait">Attendu</em></div>
    <div class="dm-row" data-e="450" data-x="90000" data-le="Studio · Fort-de-France" data-lx="Studio ou petit T2 · Nouméa" data-end="paid"><span><b>Studio · Fort-de-France</b><small>Échéance le 10</small></span><em class="st wait">Attendu</em></div>
    <div class="dm-row" data-e="620" data-x="250000" data-le="T2 · Schœlcher" data-lx="Maison T4-T5 · Nouméa" data-end="late"><span><b>T2 · Schœlcher</b><small>Échéance le 12</small></span><em class="st wait">Attendu</em></div>
    <div class="dm-alert" id="dm-alert">1 loyer en retard : à relancer</div>
  </div>
</div></section>

${storySection()}

<section class="finale" aria-labelledby="finale-title"><div class="wrap finale-in">
  <p class="eyebrow">Le graal de la location Outre-mer</p>
  <h2 id="finale-title">Une seule source de vérité pour toute votre location, de la Guadeloupe à la Polynésie.</h2>
  <p class="lead">Loyers, dépenses, quittances, relances, fiscalité et projections : KAZONLY réunit ce qui était éparpillé, chaque chiffre dans sa devise.</p>
  <div class="cta-row">
    <a class="btn btn-primary" href="${SIGNUP_FREE}">Commencer gratuitement</a>
    <a class="btn btn-ghost" href="/tarifs/">Voir les tarifs</a>
  </div>
  <p class="fine">Sans carte bancaire pour le premier bien. Formules payantes : ${TRIAL} jours d'essai, résiliables à tout moment.</p>
</div></section>

<section class="soft" id="fonctionnalites"><div class="wrap">
  <p class="eyebrow">Le produit</p>
  <h2>De la saisie du loyer à la décision d'investir.</h2>

  <div class="sshow">
    <div class="ssteps"><div class="srail" aria-hidden="true"><i id="sfill"></i></div>
      <article class="sstep on" data-i="0">
        <h3>Suivez chaque loyer, sans rien oublier.</h3>
        <p class="lead">Un tableau de bord clair : ce qui est reçu, ce qui est attendu, ce qui est en retard.</p>
        <ul class="ticks"><li>Échéances par bien et par mois</li><li>Retards repérés d'un coup d'œil</li><li>Dépenses rattachées à chaque logement</li><li>Rapports mensuels exportables en CSV</li></ul>
      </article>
      <article class="sstep" data-i="1">
        <h3>Sachez si un bien est vraiment bon.</h3>
        <p class="lead">Rendement brut et net, cash-flow, plus-value latente et un score de santé de 0 à 100 dont le calcul est expliqué.</p>
        <ul class="ticks"><li>Score de santé détaillé (cash-flow, endettement, rendement)</li><li>Hypothèses de vacance et de gestion modifiables</li><li>Biens meublés de tourisme : tarif par nuit et occupation</li></ul>
      </article>
      <article class="sstep" data-i="2">
        <h3>Projetez votre patrimoine à 5, 10, 15 et 20 ans.</h3>
        <p class="lead">Financement, répartition des dépenses et projection du patrimoine net, pour décider avec des chiffres.</p>
        <ul class="ticks"><li>Capital restant dû et amortissement du prêt</li><li>Répartition des dépenses annuelles</li><li>Revalorisation et indexation que vous réglez</li></ul>
      </article>
      <article class="sstep" data-i="3">
        <h3>Pilotez tout un portefeuille, territoire par territoire.</h3>
        <p class="lead">Une vue consolidée devise par devise, et un classement de vos biens par score.</p>
        <ul class="ticks"><li>Euro et franc Pacifique séparés, jamais additionnés</li><li>Classement des biens du meilleur au plus fragile</li><li>Jusqu'à ${plans[2].maxProperties} biens</li></ul>
      </article>
    </div>
    <div class="sstage" aria-hidden="true"><div class="phone pstack">${img("app-accueil", "Tableau de bord : loyers reçus, en attente et en retard", 520, 1040, false)}${img("app-score", "Analyse d'un bien : rendement, cash-flow et score de santé patrimoniale", 520, 1040, false)}${img("app-projection", "Financement, répartition des dépenses et projection du patrimoine", 520, 1040, false)}${img("app-portefeuille", "Vue consolidée du portefeuille par devise et classement des biens", 520, 1040, false)}</div>${demo}</div>
  </div>
  <p class="fine" style="text-align:center">Captures de l'application avec des données d'exemple. La profondeur des analyses dépend de la formule.</p>
</div></section>

<section><div class="wrap">
  <p class="eyebrow">Pour qui</p>
  <h2>Que vous ayez un bien ou quarante.</h2>
  <div class="aud" style="margin-top:24px">
    <div class="card"><h3>Le propriétaire bailleur</h3><p class="muted">Un ou deux logements, souvent loués à distance. Vous voulez savoir qui a payé, sans y passer vos soirées.</p></div>
    <div class="card"><h3>L'investisseur multi-biens</h3><p class="muted">Vous construisez un patrimoine. Rendement net, cash-flow et projections vous aident à arbitrer.</p></div>
    <div class="card"><h3>La diaspora et les expatriés</h3><p class="muted">Vous possédez en Outre-mer et vivez ailleurs : un seul endroit, sur téléphone, dans la bonne devise.</p></div>
  </div>
</div></section>

<section class="soft"><div class="wrap">
  <p class="eyebrow">Au quotidien</p>
  <h2>Du loyer reçu à la déclaration.</h2>
  <div class="cards c3" style="margin-top:24px">
    <div class="card"><h3>Quittances de loyer</h3><p class="muted">Une quittance prête dès qu'un loyer est marqué reçu : aperçu, impression ou PDF, dans la devise du bien.</p></div>
    <div class="card"><h3>Relances et alertes</h3><p class="muted">Les loyers en retard remontent dès l'accueil, avec un message de relance prêt à copier ou à envoyer par WhatsApp ou SMS.</p></div>
    <div class="card"><h3>Fiscalité par territoire</h3><p class="muted">Micro ou réel : comparez les régimes pour les territoires au droit commun. Pour les collectivités à fiscalité propre, vos totaux sont prêts à reporter.</p></div>
  </div>
  <p class="fine" style="margin-top:16px">Vous restez maître de l'envoi : KAZONLY prépare les messages et les documents, sans rien expédier à votre place. Estimations fiscales indicatives, sans valeur de conseil.</p>
</div></section>

<section><div class="wrap">
  <p class="eyebrow">Comparatif</p>
  <h2>KAZONLY ou le tableur ?</h2>
  <div class="scroll" style="margin-top:20px"><table class="versus">
    <thead><tr><th scope="col"></th><th scope="col">Tableur</th><th scope="col">KAZONLY</th></tr></thead>
    <tbody>
      <tr><th scope="row">Euro et franc Pacifique</th><td>Formules à refaire, risque de mélange</td><td class="us">Devise déduite du territoire</td></tr>
      <tr><th scope="row">Retards de loyer</th><td>À repérer à la main</td><td class="us">Visibles dès l'accueil</td></tr>
      <tr><th scope="row">Rendement et cash-flow</th><td>Vos propres formules</td><td class="us">Calculés pour chaque bien</td></tr>
      <tr><th scope="row">Projection du patrimoine</th><td>À construire</td><td class="us">5, 10, 15 et 20 ans</td></tr>
      <tr><th scope="row">Sur téléphone</th><td>Peu pratique</td><td class="us">Pensé mobile</td></tr>
    </tbody>
  </table></div>
</div></section>

<section class="soft" id="confiance"><div class="wrap">
  <p class="eyebrow">Confiance</p>
  <h2>Vos données et votre argent restent à vous.</h2>
  <div class="trust" style="margin-top:24px">
    <div class="card"><h3>Données cloisonnées</h3><p class="muted">Chaque compte ne voit que ses propres données, garanti au niveau de la base de données.</p></div>
    <div class="card"><h3>Paiement sécurisé</h3><p class="muted">Le paiement est assuré par Stripe. KAZONLY ne conserve pas vos données de carte.</p></div>
    <div class="card"><h3>Aucun loyer détenu</h3><p class="muted">KAZONLY est un outil de suivi : il ne reçoit ni ne prélève aucun loyer.</p></div>
    <div class="card"><h3>Connexion chiffrée</h3><p class="muted">Tous les échanges passent en HTTPS, avec des protections de navigateur strictes.</p></div>
    <div class="card"><h3>Vos données sont exportables</h3><p class="muted">Rapports téléchargeables en CSV : vous partez quand vous voulez avec vos chiffres.</p></div>
    <div class="card"><h3>Résiliation en un clic</h3><p class="muted">Depuis « Mon abonnement », sans courrier ni justification.</p></div>
  </div>
</div></section>

<section id="comment"><div class="wrap">
  <p class="eyebrow">Comment ça marche</p>
  <h2>Opérationnel en quelques minutes.</h2>
  <ol class="steps" style="margin-top:24px">
    <li><h3>Créez votre compte</h3><p class="muted">Choisissez une formule et démarrez l'essai de ${TRIAL} jours.</p></li>
    <li><h3>Ajoutez vos biens</h3><p class="muted">Adresse, territoire, type de location, loyer : la devise et les indicatifs se règlent seuls.</p></li>
    <li><h3>Suivez et analysez</h3><p class="muted">Marquez les loyers reçus, saisissez vos dépenses, consultez vos analyses.</p></li>
  </ol>
</div></section>

<section class="soft" id="tarifs-apercu"><div class="wrap">
  <p class="eyebrow">Tarifs</p>
  <h2>Gratuit pour 1 bien, puis dès ${plans[0].monthly} € par mois.</h2>
  <div class="cards c4" style="margin:28px 0">
    <div class="card"><h3>${esc(free.name)}</h3><p class="price">0 €<small>/mois</small></p><p class="muted">${esc(free.tagline)} · ${free.maxProperties} bien</p></div>
    ${plans.map((p) => `<div class="card"><h3>${esc(p.name)}</h3><p class="price">${p.monthly} €<small>/mois</small></p><p class="muted">${esc(p.tagline)} · jusqu'à ${p.maxProperties} biens</p></div>`).join("")}
  </div>
  <p class="muted" style="margin-bottom:16px">Agence ou gros portefeuille ? Une offre <a href="/contact/?sujet=agence">Agence / Scale sur devis</a> est disponible.</p>
  <a class="btn btn-primary" href="/tarifs/">Comparer les formules</a>
</div></section>

<section id="faq"><div class="wrap prose">
  <p class="eyebrow">Questions fréquentes</p>
  <h2>Vos questions, nos réponses.</h2>
  ${faqHtml(FAQ.slice(0, 5))}
  <p><a href="/faq/">Voir toutes les questions →</a></p>
</div></section>

<section><div class="wrap"><div class="band">
  <h2>Reprenez la main sur vos locations.</h2>
  <p>1 bien gratuit, sans carte bancaire. Formules payantes avec ${TRIAL} jours d'essai.</p>
  <a class="btn btn-primary" href="${SIGNUP_FREE}">Commencer gratuitement</a>
</div></div></section>`;

  return page({
    path: "/",
    title: "KAZONLY | Logiciel de gestion locative pour les Outre-mer",
    description: "Suivez loyers et dépenses, analysez rendement et cash-flow, projetez votre patrimoine en euros ou francs Pacifique. Gestion locative Outre-mer. Essai 14 jours.",
    body,
    ld: [softwareLd, faqLd(FAQ.slice(0, 5))],
  });
}

/* ---------- Tarifs ---------- */
const xp = (n) => n.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ");
export function pricing() {
  const freeCard = `
    <div class="plan">
      <h3>${esc(free.name)}</h3>
      <p class="muted">${esc(free.tagline)}</p>
      <p class="price">0 €<small>/mois</small></p>
      <p class="fine">Sans limite de durée, sans carte bancaire</p>
      <ul>${free.features.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>
      <a class="btn btn-ghost btn-block" href="${SIGNUP_FREE}">Commencer gratuitement</a>
    </div>`;
  const cards = freeCard + plans.map((p) => `
    <div class="plan${p.highlight ? " hl" : ""}">
      ${p.highlight ? '<span class="badge">Le plus choisi</span>' : ""}
      <h3>${esc(p.name)}</h3>
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

const SB_URL = process.env.VITE_SUPABASE_URL || cfg.supabaseUrl || "";
const SB_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || cfg.supabaseKey || "";
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
    <form class="cform" id="contact-form" novalidate data-endpoint="${esc(SB_URL)}" data-key="${esc(SB_KEY)}">
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
