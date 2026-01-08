// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-11-01",
  devtools: { enabled: process.env.NODE_ENV === "development" },
  ssr: false, // SPA mode - variables must be set at build time

  // Disable source maps in production for security
  sourcemap: {
    server: false,
    client: process.env.NODE_ENV === "development",
  },

  modules: ["@nuxt/ui", "@pinia/nuxt", "@vite-pwa/nuxt", "@tresjs/nuxt"],

  tres: {
    devtools: process.env.NODE_ENV === "development",
  },

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
      // Import du script de gestion des notifications push
      importScripts: ["/sw-push.js"],
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
        // Content Security Policy for defense in depth
        {
          "http-equiv": "Content-Security-Policy",
          content: [
            "default-src 'self'",
            // Scripts: self + inline (Vue/Nuxt needs it) + Umami analytics
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://zerocase-umami-2548df-51-83-45-107.traefik.me",
            // Styles: self + inline (Tailwind/Vue needs it)
            "style-src 'self' 'unsafe-inline'",
            // Images: self + data URIs + Twitch CDN for profile images
            "img-src 'self' data: https: blob:",
            // Connect: API backend + Twitch API + GitHub API + WebSocket + Iconify
            "connect-src 'self' http://localhost:3333 https://*.twitch.tv wss://*.twitch.tv https://api.github.com https://api.iconify.design https://zerocase-umami-2548df-51-83-45-107.traefik.me",
            // Fonts: self + data URIs
            "font-src 'self' data:",
            // Workers: self + blob (for PWA service worker)
            "worker-src 'self' blob:",
            // Note: frame-ancestors must be set via HTTP header, not meta tag
            // Base URI: self only
            "base-uri 'self'",
            // Form action: self only
            "form-action 'self'",
          ].join("; "),
        },
        // X-Content-Type-Options works via meta tag
        { "http-equiv": "X-Content-Type-Options", content: "nosniff" },
        // Note: X-Frame-Options and frame-ancestors must be set via HTTP headers on your reverse proxy
      ],
      link: [{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" }],
      script: [
        {
          defer: true,
          src: "https://zerocase-umami-2548df-51-83-45-107.traefik.me/script.js",
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
