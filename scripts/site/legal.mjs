import { breadcrumbLd, cfg, crumbs, page, plansData, val } from "./layout.mjs";

const TRIAL = plansData.trialDays;
const noindex = !cfg.legalReviewed;
const wrap = (path, title, description, inner) =>
  page({
    path,
    title: `${title} | KAZONLY`,
    description,
    noindex,
    body: `${crumbs([["Accueil", "/"], [title, path]])}
<section style="padding-top:28px"><div class="wrap prose">
<h1>${title}</h1>
<p class="fine">Dernière mise à jour : ${new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}.</p>
${inner}
</div></section>`,
    ld: [breadcrumbLd([["Accueil", "/"], [title, path]])],
  });

export function mentions() {
  return wrap("/mentions-legales/", "Mentions légales", "Mentions légales du site KAZONLY : éditeur, hébergeur et contact.", `
<h2>Éditeur du site</h2>
<p>${val("publisherName")}, ${cfg.publisherStatus}.<br>SIRET : ${val("siret")}<br>Adresse : ${val("publisherAddress")}<br>Contact : ${val("contactEmail")}</p>
<p>${cfg.tvaMention ? cfg.tvaMention : val("tvaMention")}</p>
<p>Directeur de la publication : ${val("publisherName")}.</p>
<h2>Hébergement</h2>
<p>${cfg.hostingNote}</p>
<h2>Médiation de la consommation</h2>
<p>Conformément aux articles L.611-1 et suivants du Code de la consommation, tout consommateur peut recourir gratuitement à un médiateur de la consommation : ${val("mediator")}.</p>
<h2>Propriété intellectuelle</h2>
<p>La marque, les textes, le logiciel et les éléments graphiques de KAZONLY sont protégés. Toute reproduction non autorisée est interdite.</p>`);
}

export function confidentialite() {
  return wrap("/confidentialite/", "Politique de confidentialité", "Comment KAZONLY traite vos données personnelles (RGPD) : finalités, durées, droits et sous-traitants.", `
<h2>Responsable du traitement</h2>
<p>${val("publisherName")} (${val("contactEmail")}).</p>
<h2>Données traitées et finalités</h2>
<ul>
<li><strong>Compte</strong> : adresse e-mail, mot de passe (chiffré) — pour créer et sécuriser votre accès (exécution du contrat).</li>
<li><strong>Données de gestion locative</strong> que vous saisissez : biens, loyers, dépenses, éventuels noms de locataires — pour fournir le service (exécution du contrat). Elles ne sont visibles que de votre compte.</li>
<li><strong>Abonnement et facturation</strong> : plan, statut, dates — gérés avec Stripe. KAZONLY ne conserve pas vos données de carte bancaire.</li>
<li><strong>Journaux techniques</strong> : adresse IP et événements de sécurité, pour assurer la sécurité du service (intérêt légitime).</li>
</ul>
<h2>Durées de conservation</h2>
<p>Les données du compte sont conservées pendant la durée de l'abonnement puis supprimées dans un délai raisonnable après la clôture du compte, sauf obligation légale (conservation des factures : dix ans).</p>
<h2>Sous-traitants</h2>
<ul>
<li>Stripe Payments Europe, Ltd. — paiement et facturation.</li>
<li>Supabase — base de données et authentification (région : ${val("dbRegion")}).</li>
<li>Cloudflare, Inc. — hébergement du site et des fonctions de paiement (États-Unis).</li>
</ul>
<p>Certains sous-traitants sont situés hors de l'Union européenne ; les transferts sont encadrés par les clauses contractuelles types ou le Data Privacy Framework.</p>
<h2>Vos droits</h2>
<p>Vous disposez des droits d'accès, de rectification, d'effacement, d'opposition, de limitation et de portabilité. Écrivez à ${val("contactEmail")}. Vous pouvez aussi saisir la CNIL (cnil.fr).</p>
<h2>Cookies</h2>
<p>Voir la <a href="/cookies/">politique de cookies</a>.</p>`);
}

export function cookies() {
  return wrap("/cookies/", "Cookies et traceurs", "KAZONLY n'utilise que des traceurs strictement nécessaires : aucun cookie publicitaire ni de mesure d'audience.", `
<p>KAZONLY n'utilise aucun cookie publicitaire ni outil de mesure d'audience. Seuls des stockages strictement nécessaires au fonctionnement sont employés, exemptés de consentement :</p>
<ul>
<li>le jeton de session de connexion (stockage local du navigateur) ;</li>
<li>les cookies techniques de Stripe lors du paiement, destinés à la prévention de la fraude.</li>
</ul>
<p>Si des outils de mesure d'audience étaient ajoutés, un bandeau de consentement serait mis en place au préalable.</p>`);
}

export function cgv() {
  return wrap("/cgv/", "Conditions générales de vente", "Conditions générales de vente et d'utilisation de KAZONLY : abonnement, essai, rétractation, résiliation, responsabilité.", `
<h2>1. Objet</h2>
<p>Les présentes conditions régissent l'abonnement au service en ligne KAZONLY, outil de suivi de gestion locative, proposé par ${val("publisherName")} (SIRET ${val("siret")}).</p>
<h2>2. Nature du service</h2>
<p>KAZONLY est un outil de suivi. Il ne reçoit, ne détient ni ne transmet aucun loyer ou fonds, et ne fournit aucun conseil juridique, fiscal ou comptable. L'utilisateur reste responsable de ses déclarations et de ses obligations de bailleur.</p>
<h2>3. Prix et facturation</h2>
<p>Les prix sont ceux affichés sur la page <a href="/tarifs/">Tarifs</a>, en euros, ${cfg.tvaMention ? cfg.tvaMention : val("tvaMention")}. L'abonnement, mensuel ou annuel, est reconduit tacitement. Le paiement est traité par Stripe.</p>
<h2>4. Essai gratuit</h2>
<p>Une formule Gratuite, limitée à un bien et sans carte bancaire, est proposée sans limite de durée. Pour les formules payantes, un essai de ${TRIAL} jours est offert une seule fois par compte. Une carte bancaire est demandée au départ ; aucun prélèvement n'intervient pendant l'essai. Sans résiliation avant son terme, l'abonnement démarre et le premier paiement est prélevé.</p>
<h2>5. Droit de rétractation</h2>
<p>Le consommateur dispose de quatorze jours pour se rétracter d'un contrat à distance (article L.221-18 du Code de la consommation). Si l'utilisateur demande l'exécution immédiate du service pendant ce délai, il reconnaît que le droit de rétractation s'exerce dans les conditions de l'article L.221-25 (paiement du service déjà fourni).</p>
<h2>6. Résiliation</h2>
<p>La résiliation est possible à tout moment depuis « Mon abonnement ». Elle prend effet à la fin de la période en cours ; aucun remboursement prorata temporis n'est dû, sauf disposition légale contraire.</p>
<h2>7. Limitation de formule</h2>
<p>Chaque formule limite le nombre de biens. Au-delà, l'ajout de biens est bloqué jusqu'au changement de formule ; les données existantes ne sont pas supprimées.</p>
<h2>8. Responsabilité</h2>
<p>KAZONLY s'engage à fournir le service avec diligence mais ne garantit pas une disponibilité ininterrompue. Sa responsabilité est limitée, dans la mesure permise par la loi, au montant payé sur les douze derniers mois. Les informations générales du site (dont la fiscalité locale) sont indicatives.</p>
<h2>9. Données personnelles</h2>
<p>Voir la <a href="/confidentialite/">politique de confidentialité</a>.</p>
<h2>10. Médiation et droit applicable</h2>
<p>Médiateur de la consommation : ${val("mediator")}. Droit français applicable ; à défaut d'accord amiable, les tribunaux compétents seront ceux prévus par la loi.</p>`);
}
