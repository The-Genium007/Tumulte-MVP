// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: true },

  modules: ["@nuxt/ui", "@pinia/nuxt", "@vite-pwa/nuxt"],

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || "http://localhost:3333",
    },
  },

  // @ts-ignore - PWA module types
  pwa: {
    registerType: "autoUpdate",
    manifest: {
      name: "Tumulte - Multi-Stream Polling",
      short_name: "Tumulte",
      description: "Système de sondages Twitch synchronisés multi-streams",
      theme_color: "#8b5cf6",
      background_color: "#030712",
      display: "standalone",
      orientation: "portrait",
      scope: "/",
      start_url: "/",
      icons: [
        {
          src: "/pwa-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "/pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
      ],
    },
    workbox: {
      navigateFallback: "/",
      globPatterns: ["**/*.{js,css,html,png,svg,ico}"],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/api\.twitch\.tv\/.*/i,
          handler: "NetworkFirst",
          options: {
            cacheName: "twitch-api-cache",
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 300,
            },
          },
        },
      ],
    },
    devOptions: {
      enabled: true,
      type: "module",
    },
  },

  app: {
    head: {
      title: "Tumulte - Multi-Stream Polling",
      meta: [
        { charset: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        {
          name: "description",
          content:
            "Système de sondages multi-streams Twitch synchronisés pour sessions RPG",
        },
        { name: "apple-mobile-web-app-capable", content: "yes" },
        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "black-translucent",
        },
        { name: "mobile-web-app-capable", content: "yes" },
      ],
      link: [{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" }],
      script: [
        {
          defer: true,
          src: "http://zerocase-umami-2548df-51-83-45-107.traefik.me/script.js",
          "data-website-id": "07e569f4-6e75-445b-9db9-51a821f38d5b",
        },
      ],
    },
  },

  css: ["~/assets/css/main.css"],

  typescript: {
    strict: true,
    typeCheck: false,
  },

  vite: {
    optimizeDeps: {
      exclude: ["@adonisjs/transmit-client"],
    },
  },
});
