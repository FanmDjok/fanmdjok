import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// L'application vit sous /app/ ; le site vitrine (statique, indexable) est généré à la racine
// par scripts/build-site.mjs.
export default defineConfig({
  base: "/app/",
  // Seule la clé publique Turnstile est exposée au navigateur (préfixe exact, pas TURNSTILE_SECRET_KEY).
  envPrefix: ["VITE_", "TURNSTILE_SITE_KEY"],
  plugins: [react(), tailwindcss()],
  build: { outDir: "dist/app", emptyOutDir: true },
  test: { environment: "node" },
});
