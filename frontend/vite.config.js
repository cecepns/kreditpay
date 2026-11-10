import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  server: {
    port: 5173,
  },
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: [],
      includeManifestIcons: false,
      manifest: {
        id: "/",
        name: "Fastkredit",
        short_name: "Fastkredit",
        description: "Beli apapun, bayar nanti aja.",
        lang: "id",
        theme_color: "#4a3290",
        background_color: "#ffffff",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        prefer_related_applications: false,
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,avif}"],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
});
