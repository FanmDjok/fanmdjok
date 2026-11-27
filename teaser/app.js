// Inscription à la liste d'attente : widget Turnstile (action « guide ») rendu une seule fois, vérifié côté serveur (/api/waitlist).
// La clé de site vient de TURNSTILE_SITE_KEY au build (remplace __TURNSTILE_SITE_KEY__ dans _teaser/index.html). Sans clé, le bouton reste désactivé.
(function () {
  var form = document.getElementById("inscription");
  if (!form) return;
  var msg = document.getElementById("msg"), slot = document.getElementById("ts"), bouton = form.querySelector("button");
  var cle = slot.dataset.sitekey || "", token = "", widget = null;
  function erreur(texte) { msg.innerHTML = ""; var d = document.createElement("span"); d.className = "alerte"; d.textContent = "⚠ " + texte; msg.appendChild(d); }
  function desactiver(texte) { erreur(texte); bouton.disabled = true; }
  if (!cle || cle.indexOf("__") === 0) return desactiver("L'inscription n'est pas encore ouverte. Revenez très bientôt.");
  var tentatives = 0;
  var s = document.createElement("script");
  s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; s.async = true; s.defer = true;
  s.onerror = function () { erreur("La vérification anti-robot est indisponible. Rechargez la page pour réessayer."); };
  document.head.appendChild(s);
  function monter() {
    if (!window.turnstile) { if (++tentatives < 60) setTimeout(monter, 250); else erreur("La vérification anti-robot est indisponible. Rechargez la page pour réessayer."); return; }
    widget = window.turnstile.render(slot, {
      sitekey: cle, action: slot.dataset.action,
      callback: function (t) { token = t; },
      "expired-callback": function () { token = ""; },
      "error-callback": function () { token = ""; }
    });
  }
  monter();
  function reinitialiser() { token = ""; if (widget !== null && window.turnstile) window.turnstile.reset(widget); }
  form.addEventListener("submit", function (e) {
    e.preventDefault(); msg.textContent = "";
    var email = document.getElementById("email").value.trim();
    var consent = document.getElementById("consent").checked;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return erreur("Entrez une adresse e-mail valide.");
    if (!consent) return erreur("Cochez la case pour recevoir nos e-mails, ou laissez ce formulaire de côté.");
    if (!token) return erreur("Validez la vérification anti-robot avant d'envoyer.");
    bouton.disabled = true;
    fetch("/api/waitlist", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, territoire: document.getElementById("territoire").value, consent: consent, turnstileToken: token })
    }).then(function (r) {
      if (r.ok) { window.location.assign("/merci/"); return; }
      if (r.status === 503) throw new Error("L'inscription n'est pas encore ouverte, ou la vérification est momentanément indisponible. Réessayez dans un instant.");
      if (r.status === 429) throw new Error("Trop de demandes pour le moment. Réessayez dans une minute.");
      if (r.status === 403) throw new Error("La vérification a expiré. Validez-la à nouveau puis réessayez.");
      throw new Error("L'envoi a échoué. Vérifiez votre connexion et réessayez.");
    }).catch(function (err) {
      erreur(err.message); bouton.disabled = false; reinitialiser();
    });
  });
})();
