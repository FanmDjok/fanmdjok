// Bascules mensuel/annuel et euro/franc Pacifique sur la page tarifs. Sans JavaScript, le tarif mensuel
// en euros reste affiché avec le prix annuel en clair : la page reste utilisable.
(function () {
  var group = document.querySelector("[data-billing-toggle]");
  if (!group) return;
  var cgroup = document.querySelector("[data-currency-toggle]");
  var state = { interval: "month", cur: /[?&]cur=xpf/i.test(location.search) ? "xpf" : "eur" };
  function apply() {
    group.querySelectorAll("button[data-interval]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.interval === state.interval)); });
    if (cgroup) cgroup.querySelectorAll("button[data-cur]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.cur === state.cur)); });
    document.querySelectorAll("[data-m],[data-y]").forEach(function (el) {
      var iv = el.hasAttribute("data-m") ? "month" : "year";
      var cu = el.hasAttribute("data-x") ? "xpf" : "eur";
      el.hidden = !(iv === state.interval && cu === state.cur);
    });
    document.querySelectorAll("a[data-plan]").forEach(function (a) {
      var u = new URL(a.getAttribute("href"), location.origin);
      u.searchParams.set("interval", state.interval);
      if (state.cur === "xpf") u.searchParams.set("cur", "xpf"); else u.searchParams.delete("cur");
      a.setAttribute("href", u.pathname + u.search);
    });
  }
  group.querySelectorAll("button[data-interval]").forEach(function (b) { b.addEventListener("click", function () { state.interval = b.dataset.interval; apply(); }); });
  if (cgroup) { cgroup.querySelectorAll("button[data-cur]").forEach(function (b) { b.addEventListener("click", function () { state.cur = b.dataset.cur; apply(); }); }); cgroup.hidden = false; }
  group.hidden = false;
  apply();
})();

// Formulaire de contact : jeton Turnstile vérifié côté serveur par /api/contact (aucune donnée écrite depuis le navigateur).
(function () {
  var f = document.getElementById("contact-form");
  if (!f) return;
  var err = document.getElementById("c-err"), btn = document.getElementById("c-send"), slot = document.getElementById("ts-contact");
  var sitekey = f.dataset.sitekey, token = "", wid = null, tries = 0;
  function reset() { token = ""; if (wid !== null && window.turnstile) window.turnstile.reset(wid); }
  function mount() {
    if (!sitekey) { err.textContent = "Le formulaire n'est pas encore disponible. Écrivez-nous à l'adresse de contact."; btn.disabled = true; return; }
    if (!window.turnstile) { if (++tries < 40) setTimeout(mount, 250); else err.textContent = "La vérification anti-robot est indisponible. Réessayez plus tard."; return; }
    wid = window.turnstile.render(slot, { sitekey: sitekey, callback: function (t) { token = t; }, "expired-callback": function () { token = ""; }, "error-callback": function () { token = ""; } });
  }
  var s = document.createElement("script");
  s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"; s.async = true;
  document.head.appendChild(s);
  mount();
  f.addEventListener("submit", function (e) {
    e.preventDefault(); err.textContent = "";
    var d = new FormData(f);
    var name = String(d.get("name") || "").trim(), email = String(d.get("email") || "").trim(), msg = String(d.get("message") || "").trim();
    if (!name) { err.textContent = "Indiquez votre nom."; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = "Entrez une adresse e-mail valide pour que nous puissions vous répondre."; return; }
    if (!msg) { err.textContent = "Écrivez quelques mots sur votre besoin."; return; }
    if (!token) { err.textContent = "Validez la vérification anti-robot avant d'envoyer."; return; }
    btn.disabled = true; btn.textContent = "Envoi…";
    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, email: email, topic: d.get("topic") || "question", territory: d.get("territory") || "", properties: d.get("properties") || "", message: msg, website: d.get("website") || "", turnstileToken: token })
    }).then(function (r) {
      if (r.status === 429) throw new Error("trop");
      if (r.status === 403) throw new Error("robot");
      if (!r.ok) throw new Error("http");
      f.hidden = true; document.getElementById("contact-done").hidden = false;
    }).catch(function (e) {
      err.textContent = e.message === "trop" ? "Trop de demandes pour le moment. Réessayez plus tard."
        : e.message === "robot" ? "La vérification a expiré. Validez-la à nouveau puis réessayez."
        : "L'envoi a échoué. Vérifiez votre connexion et réessayez.";
      btn.disabled = false; btn.textContent = "Envoyer ma demande"; reset();
    });
  });
})();

// Défilement : barre de progression, apparitions, vitrine collée, léger parallaxe.
(function () {
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");
  var bar = document.createElement("div"); bar.className = "sbar"; bar.setAttribute("aria-hidden", "true"); document.body.appendChild(bar);
  var steps = [].slice.call(document.querySelectorAll(".sstep")), imgs = [].slice.call(document.querySelectorAll(".pstack img"));
  var fill = document.getElementById("sfill"), wrap = document.querySelector(".ssteps"), par = document.querySelector("[data-par]");
  var cur = -1;
  function setStep(i) { if (i === cur) return; cur = i; steps.forEach(function (s, k) { s.classList.toggle("on", k === i); }); imgs.forEach(function (m, k) { m.classList.toggle("on", k === i); }); }
  function onScroll() {
    var h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = "scaleX(" + (h > 0 ? Math.min(1, scrollY / h) : 0) + ")";
    if (wrap && steps.length && innerWidth >= 900) {
      var r = wrap.getBoundingClientRect(); fill.style.transform = "scaleY(" + Math.min(1, Math.max(0, (innerHeight * .5 - r.top) / r.height)) + ")";
      var mid = innerHeight / 2, best = 0, bd = 1e9;
      steps.forEach(function (s, k) { var b = s.getBoundingClientRect(), d = Math.abs(b.top + b.height / 2 - mid); if (d < bd) { bd = d; best = k; } });
      setStep(best);
    } else if (steps.length) setStep(0);
    if (par && !reduce && innerWidth >= 900) par.style.transform = "translateY(" + Math.max(-30, -scrollY * .06) + "px) rotate(2deg)";
  }
  var t = false; addEventListener("scroll", function () { if (!t) { t = true; requestAnimationFrame(function () { t = false; onScroll(); }); } }, { passive: true }); addEventListener("resize", onScroll);
  if (imgs[0]) imgs[0].classList.add("on");
  if (!reduce && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: .12 });
    document.querySelectorAll(".card, .plan, section h2:not(.sr-only), .aud > *, .faq details, .lead").forEach(function (el) { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("rv"); io.observe(el); } });
  }
  onScroll();
})();

// Immersion : titre mot à mot, phrase qui s'allume au défilement, démonstration animée, projecteur du hero.
(function () {
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function words(el, cls) {
    var t = el.textContent.trim().split(/\s+/); el.setAttribute("aria-label", el.textContent.trim()); el.textContent = "";
    return t.map(function (w, i) { var s = document.createElement("span"); s.className = cls; s.style.setProperty("--i", i); s.setAttribute("aria-hidden", "true"); s.textContent = w; el.appendChild(s); el.appendChild(document.createTextNode(" ")); return s; });
  }
  // 1. titre du hero
  var h1 = document.querySelector(".hero h1");
  if (h1 && !reduce) words(h1, "hw");
  // 2. phrase qui s'allume
  var st = document.getElementById("stmt");
  if (st) {
    var sw = words(st, "sw");
    var upd = function () {
      var r = st.getBoundingClientRect(), p = (innerHeight * .85 - r.top) / (r.height + innerHeight * .35);
      p = Math.min(1, Math.max(0, p)); var n = Math.round(p * sw.length);
      sw.forEach(function (s, i) { s.classList.toggle("lit", i < n || reduce); });
    };
    addEventListener("scroll", upd, { passive: true }); addEventListener("resize", upd); upd();
  }
  // 3. démonstration : un mois de loyers
  var mock = document.getElementById("dmock");
  if (mock) {
    var cur = "eur", rows = [].slice.call(mock.querySelectorAll(".dm-row")), sum = document.getElementById("dm-sum"), fill = document.getElementById("dm-fill"), alertEl = document.getElementById("dm-alert");
    var nf = function (n) { return n.toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " "); };
    var money = function (n) { return cur === "xpf" ? nf(n) + " XPF" : nf(n) + " €"; };
    var shown = 0, timers = [], loop = null, visible = false;
    var amt = function (r) { return Number(cur === "xpf" ? r.dataset.x : r.dataset.e); };
    function count(to) {
      var from = shown, t0 = performance.now(), d = reduce ? 0 : 700;
      (function f(now) { var k = d ? Math.min(1, (now - t0) / d) : 1, e = 1 - Math.pow(1 - k, 4); shown = from + (to - from) * e; sum.textContent = money(Math.round(shown)); if (k < 1) requestAnimationFrame(f); })(t0);
    }
    function setRow(r, state) { var em = r.querySelector(".st"); em.className = "st " + state; em.textContent = state === "paid" ? "Payé" : state === "late" ? "En retard" : "Attendu"; }
    function reset() { timers.forEach(clearTimeout); timers = []; rows.forEach(function (r) { setRow(r, "wait"); }); shown = 0; sum.textContent = money(0); fill.style.transform = "scaleX(0)"; alertEl.classList.remove("on"); }
    function final() { var total = 0, paid = 0; rows.forEach(function (r) { setRow(r, r.dataset.end); if (r.dataset.end === "paid") { total += amt(r); paid++; } }); shown = total; sum.textContent = money(total); fill.style.transform = "scaleX(" + paid / rows.length + ")"; alertEl.classList.add("on"); }
    function run() {
      reset(); var total = 0, paid = 0, at = function (ms, fn) { timers.push(setTimeout(fn, ms)); };
      at(900, function () { setRow(rows[0], "paid"); total += amt(rows[0]); paid++; count(total); fill.style.transform = "scaleX(" + paid / 3 + ")"; });
      at(2300, function () { setRow(rows[1], "paid"); total += amt(rows[1]); paid++; count(total); fill.style.transform = "scaleX(" + paid / 3 + ")"; });
      at(3800, function () { setRow(rows[2], "late"); alertEl.classList.add("on"); });
    }
    function start() { if (reduce) { final(); return; } run(); loop = setInterval(run, 9000); }
    function stop() { clearInterval(loop); loop = null; timers.forEach(clearTimeout); }
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && !loop) start(); else if (!e.isIntersecting) stop(); }); }, { threshold: .35 }).observe(mock);
    else final();
    document.querySelectorAll("[data-dc]").forEach(function (b) { b.addEventListener("click", function () { cur = b.dataset.dc; rows.forEach(function (r) { r.querySelector("span b").textContent = cur === "xpf" ? r.dataset.lx : r.dataset.le; }); var sr = document.getElementById("dm-src"); if (sr) sr.hidden = cur !== "xpf"; document.querySelectorAll("[data-dc]").forEach(function (c) { c.setAttribute("aria-pressed", String(c === b)); }); if (reduce) final(); else { stop(); start(); } }); });
  }
  // 4. projecteur qui suit le pointeur (ordinateur)
  var hero = document.querySelector(".hero");
  if (hero && !reduce && matchMedia("(hover: hover)").matches) hero.addEventListener("pointermove", function (e) { var r = hero.getBoundingClientRect(); hero.style.setProperty("--mx", (e.clientX - r.left) + "px"); hero.style.setProperty("--my", (e.clientY - r.top) + "px"); });
})();

// Accueil : l'en-tête se réduit au défilement ; la ligne entre les étapes se trace une fois visible.
(function () {
  var h = document.querySelector(".hdr"), t = false;
  function shrink() { if (h) h.classList.toggle("small", scrollY > 40); }
  addEventListener("scroll", function () { if (!t) { t = true; requestAnimationFrame(function () { t = false; shrink(); }); } }, { passive: true });
  shrink();
  var how = document.querySelector(".howto");
  if (how && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { how.classList.add("in"); io.disconnect(); } }); }, { threshold: 0.4 });
    io.observe(how);
  } else if (how) how.classList.add("in");
})();

// Page « Résilier mon abonnement » : lien de connexion envoyé si le compte existe (réponse identique dans tous les cas).
(function () {
  var f = document.getElementById("resil-form");
  if (!f) return;
  var msg = document.getElementById("resil-msg"), btn = f.querySelector("button"), slot = document.getElementById("resil-ts");
  var key = f.dataset.sitekey, token = "", wid = null, tries = 0;
  var s = document.createElement("script");
  s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"; s.async = true; document.head.appendChild(s);
  function mount() {
    if (!key) { msg.textContent = "Le formulaire n'est pas encore disponible. Résiliez depuis « Mon abonnement » dans l'application."; btn.disabled = true; return; }
    if (!window.turnstile) { if (++tries < 40) setTimeout(mount, 250); return; }
    wid = window.turnstile.render(slot, { sitekey: key, callback: function (t) { token = t; }, "expired-callback": function () { token = ""; }, "error-callback": function () { token = ""; } });
  }
  mount();
  f.addEventListener("submit", function (e) {
    e.preventDefault(); msg.textContent = "";
    var email = String(new FormData(f).get("email") || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = "Entrez une adresse e-mail valide."; return; }
    if (!token) { msg.textContent = "Validez la vérification anti-robot."; return; }
    btn.disabled = true;
    fetch("/api/resiliation-lien", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email, turnstileToken: token }) })
      .then(function (r) { if (r.status === 403) throw new Error("robot"); if (!r.ok && r.status !== 400) throw new Error("http"); f.hidden = true; msg.textContent = "Si un compte existe pour cette adresse, un lien de connexion vient d'être envoyé. Ouvrez-le pour accéder à la résiliation."; })
      .catch(function (err) {
        msg.textContent = err.message === "robot" ? "La vérification a expiré. Validez-la à nouveau." : "Envoi impossible. Réessayez dans un instant.";
        btn.disabled = false; token = ""; if (wid !== null && window.turnstile) window.turnstile.reset(wid);
      });
  });
})();

// Veille : inscription par e-mail (double opt-in Brevo), après la vérification anti-robot.
(function () {
  var f = document.getElementById("newsletter-form");
  if (!f) return;
  var msg = document.getElementById("newsletter-msg"), btn = f.querySelector("button"), slot = document.getElementById("newsletter-ts");
  var key = f.dataset.sitekey, token = "", wid = null, tries = 0;
  var s = document.createElement("script");
  s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"; s.async = true; document.head.appendChild(s);
  function mount() {
    if (!key) { msg.textContent = "Inscriptions bientôt ouvertes."; btn.disabled = true; return; }
    if (!window.turnstile) { if (++tries < 40) setTimeout(mount, 250); return; }
    wid = window.turnstile.render(slot, { sitekey: key, callback: function (t) { token = t; }, "expired-callback": function () { token = ""; }, "error-callback": function () { token = ""; } });
  }
  mount();
  f.addEventListener("submit", function (e) {
    e.preventDefault(); msg.textContent = "";
    var d = new FormData(f), email = String(d.get("email") || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg.textContent = "Entrez une adresse e-mail valide."; return; }
    if (!d.get("consent")) { msg.textContent = "Cochez la case pour recevoir la veille."; return; }
    if (!token) { msg.textContent = "Validez la vérification anti-robot."; return; }
    btn.disabled = true;
    fetch("/api/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email, consent: true, turnstileToken: token }) })
      .then(function (r) {
        if (r.status === 503) throw new Error("bientot");
        if (r.status === 403) throw new Error("robot");
        if (!r.ok) throw new Error("http");
        f.hidden = true; msg.textContent = "Merci. Confirmez votre inscription depuis l'e-mail que nous venons de vous envoyer.";
      })
      .catch(function (err) {
        msg.textContent = err.message === "bientot" ? "Inscriptions bientôt ouvertes." : err.message === "robot" ? "La vérification a expiré. Validez-la à nouveau." : "Envoi impossible. Réessayez dans un instant.";
        btn.disabled = false; token = ""; if (wid !== null && window.turnstile) window.turnstile.reset(wid);
      });
  });
})();

// Démonstration « Lagon calme » : le tableau de bord change selon le territoire choisi (données fictives).
(function () {
  var dash = document.getElementById("dash");
  if (dash) {
    // Données fictives générées par le build (attribut data-demo), une entrée par territoire.
    var T = {};
    try { T = JSON.parse(dash.getAttribute("data-demo") || "{}"); } catch (e) { T = {}; }
    var boutons = [].slice.call(document.querySelectorAll(".k-chip[data-t]"));
    function montrer(k) {
      var d = T[k]; if (!d) return;
      boutons.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.t === k)); });
      dash.querySelectorAll("[data-f]").forEach(function (el) {
        var cle = { nom: "nom", rent: "rent", spend: "spend", fore: "fore", at: "at", ad: "ad" }[el.dataset.f];
        if (cle) el.textContent = d[cle];
      });
    }
    boutons.forEach(function (b) { b.addEventListener("click", function () { montrer(b.dataset.t); }); });
    var reduit = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if ("IntersectionObserver" in window && !reduit) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { dash.classList.add("in"); io.disconnect(); } }); }, { threshold: 0.3 });
      io.observe(dash);
    } else dash.classList.add("in");
  }
  var reveal = document.querySelector("[data-reveal]");
  if (reveal && "IntersectionObserver" in window) {
    var io2 = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { reveal.classList.add("in"); io2.disconnect(); } }); }, { threshold: 0.3 });
    io2.observe(reveal);
  } else if (reveal) reveal.classList.add("in");
})();

// Bandeau de consentement (CNIL) : trois boutons de même taille, aucun traceur avant un choix, choix conservé 6 mois.
(function () {
  var KEY = "kz_consent", SIX_MOIS = 182 * 864e5;
  function lire() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || "null");
      if (!v || !v.date || Date.now() - v.date > SIX_MOIS) return null;
      return v;
    } catch (e) { return null; }
  }
  function enregistrer(mesure) {
    try { localStorage.setItem(KEY, JSON.stringify({ v: 1, date: Date.now(), mesure: !!mesure })); } catch (e) { /* stockage indisponible : le bandeau reviendra */ }
  }
  // Retrait du consentement : on efface les traceurs de mesure déjà posés.
  function effacerTraceurs() {
    try {
      Object.keys(localStorage).filter(function (k) { return /^ph_|posthog/i.test(k); }).forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { /* sans effet */ }
    document.cookie.split(";").forEach(function (c) {
      var n = c.split("=")[0].trim();
      if (/^ph_|posthog/i.test(n)) document.cookie = n + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    });
  }
  // Aucun outil de mesure n'est encore branché : rien n'est chargé même après acceptation.
  // Lorsque la mesure sera activée, le chargement se fera ici, uniquement si mesure === true.
  function chargerMesure(choix) { if (!choix || !choix.mesure) return; }

  var box = document.getElementById("kz-consent");
  if (!box) return;
  var panneau = box.querySelector(".kz-panel"), mesure = document.getElementById("kz-mesure");

  function ouvrir(avecPanneau) {
    box.hidden = false;
    panneau.hidden = !avecPanneau;
    var v = lire();
    mesure.checked = !!(v && v.mesure);
  }
  function fermer() { box.hidden = true; }
  function choisir(mesureChoisie) {
    if (!mesureChoisie) effacerTraceurs();
    enregistrer(mesureChoisie);
    chargerMesure({ mesure: mesureChoisie });
    fermer();
  }

  box.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-c]");
    if (!b) return;
    var action = b.getAttribute("data-c");
    if (action === "refuser") choisir(false);
    else if (action === "accepter") choisir(true);
    else if (action === "personnaliser") { panneau.hidden = false; mesure.focus(); }
    else if (action === "enregistrer") choisir(mesure.checked);
  });

  var gerer = document.getElementById("kz-gerer");
  if (gerer) gerer.addEventListener("click", function () { ouvrir(true); });

  var v = lire();
  if (v) chargerMesure(v); else ouvrir(false);
})();
