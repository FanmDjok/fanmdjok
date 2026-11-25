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

// Formulaire de contact : enregistre la demande, sans ouvrir de messagerie.
(function () {
  var f = document.getElementById("contact-form");
  if (!f) return;
  var err = document.getElementById("c-err"), btn = document.getElementById("c-send");
  f.addEventListener("submit", function (e) {
    e.preventDefault(); err.textContent = "";
    var d = new FormData(f);
    if (d.get("website")) return;
    var name = String(d.get("name") || "").trim(), email = String(d.get("email") || "").trim(), msg = String(d.get("message") || "").trim();
    if (!name) { err.textContent = "Indiquez votre nom."; return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { err.textContent = "Entrez une adresse e-mail valide pour que nous puissions vous répondre."; return; }
    if (!msg) { err.textContent = "Écrivez quelques mots sur votre besoin."; return; }
    var url = f.dataset.endpoint, key = f.dataset.key;
    if (!url || !key) { err.textContent = "L'envoi n'est pas encore disponible. Réessayez plus tard."; return; }
    var props = parseInt(String(d.get("properties") || "").replace(/\D/g, ""), 10);
    btn.disabled = true; btn.textContent = "Envoi…";
    fetch(url + "/rest/v1/contact_requests", {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: "Bearer " + key, Prefer: "return=minimal" },
      body: JSON.stringify({ name: name, email: email, topic: d.get("topic") || "question", territory: d.get("territory") || null, properties: isNaN(props) ? null : props, message: msg })
    }).then(function (r) {
      if (!r.ok) throw new Error("http");
      f.hidden = true; document.getElementById("contact-done").hidden = false;
    }).catch(function () {
      err.textContent = "L'envoi a échoué. Vérifiez votre connexion et réessayez."; btn.disabled = false; btn.textContent = "Envoyer ma demande";
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
    document.querySelectorAll(".card, .plan, section h2, .aud > *, .faq details, .lead").forEach(function (el) { if (el.getBoundingClientRect().top > innerHeight) { el.classList.add("rv"); io.observe(el); } });
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

// Récit douleur → solution : le segment au centre de l'écran pilote la démonstration épinglée.
// Sur ordinateur : la douleur s'affiche d'abord, puis la solution s'allume. Sur mobile, tout le texte reste lisible en ligne.
(function () {
  var beats = [].slice.call(document.querySelectorAll(".story .beat"));
  if (!beats.length) return;
  var stage = document.querySelector("[data-stage]");
  var vis = [].slice.call(document.querySelectorAll(".story .vis"));
  var dots = stage ? [].slice.call(stage.querySelectorAll(".stage-dots i")) : [];
  var tag = stage ? stage.querySelector(".stage-tag") : null;
  var lastActive = -1, lastPh = "";
  function update() {
    var mid = innerHeight * 0.5, active = 0;
    beats.forEach(function (b, i) { if (b.getBoundingClientRect().top <= mid) active = i; });
    var r = beats[active].getBoundingClientRect();
    var local = Math.min(1, Math.max(0, (mid - r.top) / Math.max(1, r.height)));
    var ph = local > 0.3 ? "s" : "p";
    beats.forEach(function (b, k) {
      b.classList.toggle("act", k === active);
      b.classList.toggle("sol-on", k < active || (k === active && ph === "s"));
    });
    if (!stage || innerWidth < 900) return;
    if (active === lastActive && ph === lastPh) return;
    lastActive = active; lastPh = ph;
    vis.forEach(function (v, k) { v.classList.toggle("on", k === active); v.classList.toggle("sol", k === active && ph === "s"); });
    dots.forEach(function (d, k) { d.classList.toggle("on", k === active); });
    stage.setAttribute("data-ph", ph);
    if (tag) tag.textContent = ph === "s" ? "Avec KAZONLY" : "Avant";
  }
  var t = false;
  addEventListener("scroll", function () { if (!t) { t = true; requestAnimationFrame(function () { t = false; update(); }); } }, { passive: true });
  addEventListener("resize", update);
  update();
})();
