import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
        ws: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    tailwindcss(),
    reactRouter(),
    tsconfigPaths(),
    VitePWA({
      registerType: "autoUpdate",
      // SSR-safe: inject SW registration via virtual module, not HTML transform
      injectRegister: "script",
      manifest: {
        name: "VárzeaPro",
        short_name: "VárzeaPro",
        description:
          "Plataforma de e-sports que conecta jogadores competitivos e times",
        theme_color: "oklch(0.52 0.14 160)",
        background_color: "#f7faf8",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        lang: "pt-BR",
        icons: [
          {
            src: "/icon-192.svg",
            sizes: "192x192",
            type: "image/svg+xml",
          },
          {
            src: "/icon-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
          },
          {
            src: "/icon-maskable-512.svg",
            sizes: "512x512",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Cache only static assets — API/socket routes must stay network-first
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^\/socket\.io\/.*/i,
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^\/uploads\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "uploads-cache",
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
    }),
  ],
});
