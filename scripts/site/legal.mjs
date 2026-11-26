import { breadcrumbLd, cfg, crumbs, page, val } from "./layout.mjs";

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

// À VALIDER : médiateur de la consommation à désigner (site.config.json, clé « mediator ») ; affiché « en cours de désignation » tant qu'il est vide.
export function mentions() {
  return wrap("/mentions-legales/", "Mentions légales", "Mentions légales du site KAZONLY : éditeur, hébergeur et contact.", `
<h2>Éditeur du site</h2>
<p>${val("publisherName")}, ${cfg.publisherStatus}.<br>SIRET : ${val("siret")}<br>Adresse : ${val("publisherAddress")}<br>Contact : ${val("contactEmail")}</p>
<p>${cfg.tvaMention ? cfg.tvaMention : val("tvaMention")}</p>
<p>Directeur de la publication : ${val("publisherName")}.</p>
<h2>Hébergement</h2>
<p>${cfg.hostingNote}</p>
<h2>Médiation de la consommation</h2>
<p>Conformément aux articles L.611-1 et suivants du Code de la consommation, tout consommateur peut recourir gratuitement à un médiateur de la consommation : ${val("mediator", "en cours de désignation")}.</p>
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

// À VALIDER : lien exact vers la page cookies de Stripe (la ligne Stripe du tableau pointe vers stripe.com).
export function cookies() {
  return wrap("/cookies/", "Cookies et traceurs", "Les cookies et traceurs utilisés par le site KAZONLY, leur finalité et comment changer votre choix.", `
<p>Le site KAZONLY n'utilise aucun cookie publicitaire. Une mesure d'audience anonyme et sans cookie (Cloudflare Web Analytics) ne demande pas de consentement.</p>
<h2>Traceurs utilisés</h2>
<table class="cmp">
<thead><tr><th scope="col">Nom</th><th scope="col">Fournisseur</th><th scope="col">Finalité</th><th scope="col">Durée</th></tr></thead>
<tbody>
<tr><td>kz_consent</td><td>KAZONLY (stockage du navigateur)</td><td>Mémoriser votre choix sur les cookies</td><td>6 mois, puis redemandé</td></tr>
<tr><td>Cloudflare Web Analytics</td><td>Cloudflare, Inc.</td><td>Mesure d'audience anonyme (visites, pages vues), sans cookie et sans identifiant personnel</td><td>Aucune</td></tr>
<tr><td>Cookies de sécurité Stripe</td><td>Stripe</td><td>Prévenir la fraude pendant le paiement (nécessaires)</td><td>Selon la politique de Stripe</td></tr>
</tbody>
</table>
<p>Ces stockages sont strictement nécessaires : ils ne demandent pas de consentement. Politique de Stripe : <a href="https://stripe.com">stripe.com</a>.</p>
<h2>Votre choix</h2>
<p>Votre choix est conservé six mois, puis le bandeau vous le demande à nouveau. Vous pouvez le modifier à tout moment avec le lien « Gérer mes cookies » en bas de page.</p>
<p>Si des outils de mesure d'audience étaient ajoutés, aucun traceur ne serait chargé avant votre accord, et ce tableau serait mis à jour.</p>`);
}

export function cgv() {
  return wrap("/cgv/", "Conditions générales de vente", "Conditions générales de vente et d'utilisation de KAZONLY : abonnement, formule gratuite, rétractation, résiliation, responsabilité.", `
<h2>1. Objet</h2>
<p>Les présentes conditions régissent l'abonnement au service en ligne KAZONLY, outil de suivi de gestion locative, proposé par ${val("publisherName")} (SIRET ${val("siret")}).</p>
<h2>1 bis. Résiliation</h2>
<p>Vous pouvez résilier votre abonnement à tout moment, en ligne, depuis « Mon abonnement » dans l'application ou depuis la page <a href="/resilier/">Résilier mon abonnement</a>, sans avoir à créer ou à consulter un espace client. La résiliation prend effet à la fin de la période déjà payée. Un accusé de réception indiquant la date de fin vous est envoyé par e-mail. Source : <a href="https://entreprendre.service-public.gouv.fr/actualites/A16599">service-public.gouv.fr, résiliation des contrats (loi n° 2022-1158 du 16 août 2022, article L. 215-1-1 du Code de la consommation)</a>.</p>
<h2>1 ter. Droit de rétractation</h2>
<p>Vous disposez d'un délai de 14 jours calendaires à compter de la conclusion du contrat pour vous rétracter, sans motif. Vous pouvez exercer ce droit en ligne, depuis votre compte, pendant tout ce délai. Si vous demandez à commencer le service avant la fin de ce délai, vous le consentez expressément : le droit de rétractation disparaît une fois le service entièrement exécuté. Sources : <a href="https://www.service-public.gouv.fr/particuliers/vosdroits/F10485">service-public.gouv.fr (F10485)</a> ; <a href="https://entreprendre.service-public.gouv.fr/vosdroits/F23455">entreprendre.service-public.gouv.fr (F23455)</a>.</p>
<h2>2. Nature du service</h2>
<p>KAZONLY est un outil de suivi. Il ne reçoit, ne détient ni ne transmet aucun loyer ou fonds, et ne fournit aucun conseil juridique, fiscal ou comptable. L'utilisateur reste responsable de ses déclarations et de ses obligations de bailleur.</p>
<h2>3. Prix et facturation</h2>
<p>Les prix sont ceux affichés sur la page <a href="/tarifs/">Tarifs</a>, en euros, ${cfg.tvaMention ? cfg.tvaMention : val("tvaMention")}. L'abonnement, mensuel ou annuel, est reconduit tacitement. Le paiement est traité par Stripe.</p>
<h2>4. Formule gratuite et souscription</h2>
<p>La formule Gratuite, limitée à un bien et sans carte bancaire, est proposée sans limite de durée ; elle permet d'essayer le service. Les formules payantes bénéficient d'un essai gratuit de 14 jours, accordé une seule fois par compte. La carte bancaire est demandée dès la souscription, mais aucun débit n'intervient pendant l'essai. Sans résiliation avant la fin de l'essai, l'abonnement démarre et le premier paiement est prélevé. Vous êtes prévenu par e-mail trois jours avant ce premier débit.</p>
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
<p>Médiateur de la consommation : ${val("mediator", "en cours de désignation")}. Droit français applicable ; à défaut d'accord amiable, les tribunaux compétents seront ceux prévus par la loi.</p>`);
}
