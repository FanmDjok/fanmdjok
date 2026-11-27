// Inscription à la liste d'attente : Turnstile côté navigateur, vérification côté serveur (/api/waitlist).
(function () {
  var form = document.getElementById("inscription");
  if (!form) return;
  var msg = document.getElementById("msg"), slot = document.getElementById("ts");
  var SITEKEY = "0x4AAAAAAGS5zCvmd0soJiFr", token = "", widget = null;
  var s = document.createElement("script");
  s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"; s.async = true; s.defer = true;
  document.head.appendChild(s);
  function monter() {
    if (!window.turnstile) { setTimeout(monter, 250); return; }
    widget = window.turnstile.render(slot, { sitekey: SITEKEY, action: slot.dataset.action, callback: function (t) { token = t; }, "expired-callback": function () { token = ""; } });
  }
  monter();
  function erreur(texte) { msg.innerHTML = ""; var d = document.createElement("span"); d.className = "alerte"; d.textContent = "⚠ " + texte; msg.appendChild(d); }
  form.addEventListener("submit", function (e) {
    e.preventDefault(); msg.textContent = "";
    var email = document.getElementById("email").value.trim();
    var consent = document.getElementById("consent").checked;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return erreur("Entrez une adresse e-mail valide.");
    if (!consent) return erreur("Cochez la case pour recevoir nos e-mails, ou laissez ce formulaire de côté.");
    if (!token) return erreur("Validez la vérification anti-robot avant d'envoyer.");
    var bouton = form.querySelector("button"); bouton.disabled = true;
    fetch("/api/waitlist", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, territoire: document.getElementById("territoire").value, consent: consent, turnstileToken: token })
    }).then(function (r) {
      if (r.ok) { window.location.assign("/merci/"); return; }
      if (r.status === 503) throw new Error("L'inscription n'est pas encore ouverte. Revenez très bientôt.");
      if (r.status === 429) throw new Error("Trop de demandes pour le moment. Réessayez dans une minute.");
      if (r.status === 403) throw new Error("La vérification a expiré. Validez-la à nouveau puis réessayez.");
      throw new Error("L'envoi a échoué. Vérifiez votre connexion et réessayez.");
    }).catch(function (err) {
      erreur(err.message); bouton.disabled = false;
      if (window.turnstile && widget !== null) { window.turnstile.reset(widget); token = ""; }
    });
  });
})();
