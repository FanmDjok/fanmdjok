// Illustrations éditoriales : paysages stylisés, générés, sans photo ni droit d'auteur.
const THEME = {
  guadeloupe: ["volcan", "#fde7c8", "#f6b17a", "#1f6f6b", "#2f855a"],
  martinique: ["volcan", "#fdf0c9", "#f4a261", "#1d6f8a", "#2f7d4f"],
  reunion: ["volcan", "#fbe3d3", "#e76f51", "#1b6a7a", "#3b7d3a"],
  guyane: ["foret", "#e8f3d6", "#a7d28b", "#2a6b4a", "#1f5a3a"],
  mayotte: ["lagon", "#ffeccf", "#f7a35c", "#1aa6b7", "#3d8b5a"],
  "saint-martin": ["plage", "#e3f2fb", "#f9c97c", "#2597c9", "#e9d3a1"],
  "saint-barthelemy": ["plage", "#eaf3fb", "#f4b8a0", "#2a8fbd", "#efd9b0"],
  spm: ["nord", "#e7eef5", "#bcd0e0", "#3f6f95", "#9fb7c9"],
  "nouvelle-caledonie": ["lagon", "#e2f3fa", "#f9c46b", "#14a3b8", "#4a8a55"],
  polynesie: ["lagon", "#ffe9d2", "#f59e6b", "#19b0c0", "#3c8f5c"],
  "wallis-futuna": ["lagon", "#e6f4f0", "#f7c570", "#1b9aa8", "#3f8a58"],
};
const palm = (x, y, h, c) => `<g transform="translate(${x} ${y})"><path d="M0 0 C 4 -${h * .4} 6 -${h * .7} 2 -${h}" stroke="#5b4636" stroke-width="5" fill="none" stroke-linecap="round"/><g fill="${c}"><path d="M2 -${h} q-46 -6 -70 22 q34 -14 70 -22z"/><path d="M2 -${h} q46 -6 70 22 q-34 -14 -70 -22z"/><path d="M2 -${h} q-30 -34 -64 -30 q40 4 64 30z"/><path d="M2 -${h} q30 -34 64 -30 q-40 4 -64 30z"/><path d="M2 -${h} q0 -40 -8 -52 q14 22 8 52z"/></g></g>`;
const waves = (y, c, n = 6) => Array.from({ length: n }, (_, i) => `<path d="M${i * 220 - 40} ${y + (i % 2) * 14} q55 -16 110 0 t110 0" stroke="${c}" stroke-width="3" fill="none" opacity=".45"/>`).join("");

export function scene(id) {
  const [kind, sky1, sun, sea, land] = THEME[id] || THEME.martinique;
  const defs = `<defs><linearGradient id="sk-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="#ffffff"/></linearGradient><linearGradient id="se-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sea}"/><stop offset="1" stop-color="${sea}" stop-opacity=".78"/></linearGradient></defs>`;
  let g = `<rect width="1200" height="420" fill="url(#sk-${id})"/><circle cx="930" cy="108" r="54" fill="${sun}"/><circle cx="930" cy="108" r="86" fill="${sun}" opacity=".18"/>`;
  if (kind === "volcan") {
    g += `<path d="M120 300 L330 150 L420 190 L560 90 L690 200 L760 170 L980 300Z" fill="${land}" opacity=".35"/><path d="M200 300 L430 120 Q470 100 510 126 L760 300Z" fill="${land}"/><path d="M430 120 q40 -20 80 6 l-20 40 q-30 -16 -60 0z" fill="#ffffff" opacity=".35"/>`;
    g += `<rect y="296" width="1200" height="124" fill="url(#se-${id})"/>${waves(330, "#fff")}${palm(180, 300, 120, land)}${palm(1010, 304, 100, land)}`;
  } else if (kind === "lagon") {
    g += `<path d="M300 300 Q420 190 520 230 Q600 200 700 300Z" fill="${land}"/><path d="M820 300 Q900 250 980 300Z" fill="${land}" opacity=".8"/>`;
    g += `<rect y="292" width="1200" height="128" fill="url(#se-${id})"/><path d="M0 330 Q300 300 600 332 T1200 322 V420 H0Z" fill="#ffffff" opacity=".18"/>${waves(352, "#fff")}${palm(380, 296, 110, land)}${palm(850, 298, 80, land)}`;
    g += `<path d="M120 372 q60 -6 120 0 l-14 14 h-92z" fill="#fff" opacity=".85"/><path d="M180 372 v-52 l32 46z" fill="${sun}"/>`;
  } else if (kind === "foret") {
    g += `<path d="M0 300 Q150 210 300 270 Q460 190 640 270 Q820 200 1000 270 Q1120 230 1200 270 V420 H0Z" fill="${land}"/><path d="M0 330 Q200 280 420 340 Q700 270 1200 345 V420 H0Z" fill="#14472d"/>`;
    g += `<path d="M0 392 Q300 360 600 394 T1200 380 V420 H0Z" fill="${sea}" opacity=".85"/><path d="M740 300 L900 90" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".8"/><path d="M906 78 l6 28 l-22 -6z" fill="${sun}"/>`;
  } else if (kind === "plage") {
    g += `<rect y="250" width="1200" height="170" fill="url(#se-${id})"/>${waves(300, "#fff")}${waves(362, "#fff")}<path d="M0 392 Q300 340 640 380 T1200 360 V420 H0Z" fill="${land}"/>`;
    g += `<path d="M300 280 h110 l-18 22 h-74z" fill="#fff"/><path d="M356 280 v-96 l56 84z" fill="#fff"/><path d="M350 280 v-74 l-44 66z" fill="${sun}"/>${palm(1010, 392, 120, "#3d8b5a")}`;
  } else {
    g += `<rect y="270" width="1200" height="150" fill="url(#se-${id})"/>${waves(320, "#fff")}<path d="M0 290 Q200 230 420 280 Q640 220 880 280 Q1040 250 1200 284 V300 H0Z" fill="${land}"/>`;
    const cols = ["#e63946", "#f4a261", "#2a9d8f", "#e9c46a", "#457b9d", "#e76f51", "#8ab17d"];
    g += cols.map((c, i) => `<g transform="translate(${180 + i * 118} ${250 - (i % 3) * 6})"><rect width="76" height="52" fill="${c}"/><path d="M-6 0 L38 -34 L82 0z" fill="#3d405b"/><rect x="28" y="24" width="18" height="28" fill="#ffffff" opacity=".85"/></g>`).join("");
  }
  return `<svg class="scene" viewBox="0 0 1200 420" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustration stylisée du paysage" focusable="false">${defs}${g}</svg>`;
}
