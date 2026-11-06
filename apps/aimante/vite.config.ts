import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// `base: "./"` : l'appli marche à la racine d'un domaine (Netlify, Vercel)
// comme dans un sous-dossier (GitHub Pages).
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Aimanté",
        short_name: "Aimanté",
        description: "Routines, ménage, menus, courses et agenda : ta porte de frigo dans la poche.",
        lang: "fr",
        dir: "ltr",
        start_url: "./",
        scope: "./",
        display: "standalone",
        orientation: "portrait",
        background_color: "#e6ece9",
        theme_color: "#e6ece9",
        categories: ["lifestyle", "productivity"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        // Les écrans de démarrage iPhone sont lus par iOS à l'installation : inutile de les garder en cache.
        globIgnores: ["**/splash/**"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
});
