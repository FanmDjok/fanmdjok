import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// L'application vit sous /app/ ; le site vitrine (statique, indexable) est généré à la racine
// par scripts/build-site.mjs.
export default defineConfig({
  base: "/app/",
  plugins: [react(), tailwindcss()],
  build: { outDir: "dist/app", emptyOutDir: true },
  test: { environment: "node" },
});
