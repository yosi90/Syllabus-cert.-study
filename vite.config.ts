import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "./",
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const questionChunk = id.match(/generated\/questions-([a-d])\.json$/i);
          if (questionChunk) return `questions-${questionChunk[1].toLowerCase()}`;
          if (id.includes("node_modules/katex")) return "math-rendering";
          return undefined;
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeManifestIcons: false,
      manifest: {
        name: "ISTQB CTFL v4.0 Trainer",
        short_name: "CTFL Trainer",
        description: "Entrenador local para preparar la certificación ISTQB CTFL v4.0.",
        lang: "es",
        start_url: "./",
        scope: "./",
        display: "standalone",
        background_color: "#f4f6f8",
        theme_color: "#101827",
        categories: ["education"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,json,png,svg,ico}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
    }),
  ],
});
