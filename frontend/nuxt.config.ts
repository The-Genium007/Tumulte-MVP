// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: process.env.NODE_ENV === 'development' },
  ssr: false, // SPA mode - variables must be set at build time

  // Source maps: hidden mode — maps are generated for Sentry upload but not served to clients.
  // This prevents exposing full source code via browser DevTools in production.
  sourcemap: {
    server: false,
    client: 'hidden',
  },

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@vite-pwa/nuxt',
    '@tresjs/nuxt',
    '@nuxt/fonts',
    '@sentry/nuxt/module',
    '@vueuse/motion/nuxt',
  ],

  // VueUse Motion - Animation presets (bidirectional: play on scroll up & down)
  motion: {
    directives: {
      // Fade in depuis le bas (sections principales)
      'fade-up': {
        initial: { opacity: 0, y: 50 },
        visible: { opacity: 1, y: 0, transition: { duration: 600, ease: 'easeOut' } },
        leave: { opacity: 0, y: 50, transition: { duration: 400, ease: 'easeIn' } },
      },
      // Fade in depuis la gauche
      'fade-left': {
        initial: { opacity: 0, x: -50 },
        visible: { opacity: 1, x: 0, transition: { duration: 600, ease: 'easeOut' } },
        leave: { opacity: 0, x: -50, transition: { duration: 400, ease: 'easeIn' } },
      },
      // Fade in depuis la droite
      'fade-right': {
        initial: { opacity: 0, x: 50 },
        visible: { opacity: 1, x: 0, transition: { duration: 600, ease: 'easeOut' } },
        leave: { opacity: 0, x: 50, transition: { duration: 400, ease: 'easeIn' } },
      },
      // Scale up (pour les cards)
      'scale-up': {
        initial: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1, transition: { duration: 500, ease: 'easeOut' } },
        leave: { opacity: 0, scale: 0.9, transition: { duration: 300, ease: 'easeIn' } },
      },
      // Pop (pour les icônes/badges) - avec spring
      pop: {
        initial: { opacity: 0, scale: 0.5 },
        visible: {
          opacity: 1,
          scale: 1,
          transition: { type: 'spring', stiffness: 300, damping: 20 },
        },
        leave: { opacity: 0, scale: 0.5, transition: { duration: 200, ease: 'easeIn' } },
      },
    },
  },

  sentry: {
    sourceMapsUploadOptions: {
      org: process.env.SENTRY_ORG || '',
      project: process.env.SENTRY_PROJECT || '',
      authToken: process.env.SENTRY_AUTH_TOKEN || '',
    },
  },

  // Auto-detect system theme (dark/light)
  colorMode: {
    preference: 'system',
    fallback: 'dark',
  },

  // Google Fonts configuration
  fonts: {
    families: [
      {
        name: 'Inter',
        provider: 'google',
        weights: [400, 500, 600, 700],
      },
      {
        name: 'Aoboshi One',
        provider: 'google',
        weights: [400],
      },
    ],
  },

  tres: {
    devtools: process.env.NODE_ENV === 'development',
  },

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3333',
      sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN || '',
      envSuffix: process.env.ENV_SUFFIX || 'dev',
      appVersion: process.env.npm_package_version || '1.0.0',
      // PostHog Analytics (EU)
      posthogKey: process.env.NUXT_PUBLIC_POSTHOG_KEY || '',
      posthogHost: process.env.NUXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      posthogEnv: process.env.NUXT_PUBLIC_POSTHOG_ENV || '',
    },
  },

  // @ts-ignore - PWA module types
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Tumulte - Multi-Stream Polling',
      short_name: 'Tumulte',
      description: 'Gestion de sondages multi-chaînes pour MJ de JDR',
      theme_color: '#0f0b04',
      background_color: '#f2e4d4',
      display: 'standalone',
      orientation: 'portrait',
      scope: '/',
      start_url: '/',
      categories: ['games', 'utilities'],
      icons: [
        {
          src: '/web-app-manifest-192x192.png',
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: '/web-app-manifest-512x512.png',
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: '/web-app-manifest-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
      shortcuts: [
        {
          name: 'Mes Campagnes',
          url: '/mj/campaigns',
          icons: [{ src: '/favicon-96x96.png', sizes: '96x96' }],
        },
        {
          name: 'Invitations',
          url: '/dashboard/invitations',
          icons: [{ src: '/favicon-96x96.png', sizes: '96x96' }],
        },
      ],
    },
    workbox: {
      // En mode SPA, toutes les navigations doivent être redirigées vers
      // la route racine (le client-side router gère ensuite la navigation)
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api/, /^\/auth/, /^\/offline/],
      globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      // Import du script de gestion des notifications push
      importScripts: ['/sw-push.js'],
      runtimeCaching: [
        // Twitch API
        {
          urlPattern: /^https:\/\/api\.twitch\.tv\/.*/i,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'twitch-api-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 300,
            },
          },
        },
        // Backend API - Campaigns (7 days cache)
        {
          urlPattern: /\/mj\/campaigns(\/.*)?$/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'tumulte-campaigns-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 604800, // 7 days
            },
            networkTimeoutSeconds: 3,
          },
        },
        // Backend API - Poll templates (7 days cache)
        {
          urlPattern: /\/mj\/poll-templates(\/.*)?$/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'tumulte-templates-cache',
            expiration: {
              maxEntries: 200,
              maxAgeSeconds: 604800,
            },
            networkTimeoutSeconds: 3,
          },
        },
        // Backend API - Sessions (7 days cache)
        {
          urlPattern: /\/mj\/sessions(\/.*)?$/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'tumulte-sessions-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 604800,
            },
            networkTimeoutSeconds: 3,
          },
        },
        // Backend API - Streamer routes (7 days cache)
        {
          urlPattern: /\/dashboard\/campaigns(\/.*)?$/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'tumulte-streamer-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 604800,
            },
            networkTimeoutSeconds: 3,
          },
        },
        // Backend API - Auth (1 day cache)
        {
          urlPattern: /\/auth\/me$/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'tumulte-auth-cache',
            expiration: {
              maxEntries: 1,
              maxAgeSeconds: 86400, // 1 day
            },
            networkTimeoutSeconds: 3,
          },
        },
      ],
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  },

  app: {
    head: {
      title: 'Tumulte - Multi-Stream Polling',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Système de sondages multi-streams Twitch synchronisés pour sessions RPG',
        },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        {
          name: 'apple-mobile-web-app-status-bar-style',
          content: 'black-translucent',
        },
        { name: 'apple-mobile-web-app-title', content: 'Tumulte' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'format-detection', content: 'telephone=no' },
        // Theme color - Brand color (marron foncé)
        { name: 'theme-color', content: '#0f0b04' },
        // Content Security Policy for defense in depth
        {
          'http-equiv': 'Content-Security-Policy',
          content: [
            "default-src 'self'",
            // Scripts: self + inline (Vue/Nuxt needs it) + GTM
            // SECURITY NOTE: 'unsafe-inline' is required by Vue 3/Nuxt for runtime rendering.
            // Migrating to nonce-based CSP requires the nuxt-security module — tracked as future work.
            // Note: unsafe-eval only needed in dev for HMR, removed in production for security
            `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com ${process.env.NODE_ENV === 'development' ? "'unsafe-eval'" : ''}`,
            // Styles: self + inline (Tailwind/Vue dynamic styles require unsafe-inline — accepted risk)
            "style-src 'self' 'unsafe-inline'",
            // Images: self + data URIs + Twitch CDN for profile images
            "img-src 'self' data: https: blob:",
            // Connect: API backend + Twitch API + GitHub API + WebSocket + Iconify + PostHog + GTM
            // Note: Backend URL is dynamic based on environment
            `connect-src 'self' ${process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3333'} https://*.twitch.tv wss://*.twitch.tv https://api.github.com https://api.iconify.design https://*.traefik.me https://eu.i.posthog.com https://eu-assets.i.posthog.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com`,
            // Fonts: self + data URIs
            "font-src 'self' data:",
            // Workers: self + blob (for PWA service worker)
            "worker-src 'self' blob:",
            // Note: frame-ancestors must be set via HTTP header, not meta tag
            // Base URI: self only
            "base-uri 'self'",
            // Form action: self only
            "form-action 'self'",
          ].join('; '),
        },
        // X-Content-Type-Options works via meta tag
        { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
        // Note: X-Frame-Options and frame-ancestors must be set via HTTP headers on your reverse proxy
      ],
      link: [
        // Preconnect Google Fonts pour optimisation
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: 'anonymous',
        },
        // Favicon configuration for cross-browser compatibility
        // Generated by RealFaviconGenerator (2025)
        //
        // 1. PNG favicon (96x96 for high-DPI displays)
        {
          rel: 'icon',
          type: 'image/png',
          sizes: '96x96',
          href: '/favicon-96x96.png',
        },
        // 2. SVG for modern browsers (Chrome, Firefox, Edge) - scalable
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        // 3. ICO for Safari and legacy browsers
        { rel: 'shortcut icon', href: '/favicon.ico' },
        // 4. Apple Touch Icon (180x180)
        {
          rel: 'apple-touch-icon',
          sizes: '180x180',
          href: '/apple-touch-icon.png',
        },
        // Apple splash screens pour différents appareils iOS
        {
          rel: 'apple-touch-startup-image',
          href: '/apple-splash-1170-2532.png',
          media:
            '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
        },
        {
          rel: 'apple-touch-startup-image',
          href: '/apple-splash-1284-2778.png',
          media:
            '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)',
        },
        {
          rel: 'apple-touch-startup-image',
          href: '/apple-splash-1179-2556.png',
          media:
            '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)',
        },
        {
          rel: 'apple-touch-startup-image',
          href: '/apple-splash-1290-2796.png',
          media:
            '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)',
        },
        {
          rel: 'apple-touch-startup-image',
          href: '/apple-splash-1125-2436.png',
          media:
            '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
        },
        {
          rel: 'apple-touch-startup-image',
          href: '/apple-splash-1242-2688.png',
          media:
            '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)',
        },
        {
          rel: 'apple-touch-startup-image',
          href: '/apple-splash-828-1792.png',
          media:
            '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)',
        },
        {
          rel: 'apple-touch-startup-image',
          href: '/apple-splash-1536-2048.png',
          media:
            '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)',
        },
        {
          rel: 'apple-touch-startup-image',
          href: '/apple-splash-1668-2388.png',
          media:
            '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)',
        },
        {
          rel: 'apple-touch-startup-image',
          href: '/apple-splash-2048-2732.png',
          media:
            '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)',
        },
      ],
      // PostHog is initialized via plugin, no external script needed
    },
  },

  css: ['~/assets/css/main.css'],

  typescript: {
    strict: true,
    typeCheck: false,
  },

  vite: {
    optimizeDeps: {
      exclude: ['@adonisjs/transmit-client'],
    },
  },

  // Nitro server configuration for Docker Swarm scaling
  nitro: {
    // Enable compression at build time for static assets
    compressPublicAssets: {
      gzip: true,
      brotli: true,
    },

    // Route rules for caching (complements middleware)
    routeRules: {
      // Health endpoints - no caching
      '/health/**': {
        cache: false,
        headers: { 'Cache-Control': 'no-store' },
      },

      // Metrics endpoint - no caching
      '/metrics': {
        cache: false,
        headers: { 'Cache-Control': 'no-store' },
      },

      // Static assets - aggressive caching
      '/_nuxt/**': {
        headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
      },

      // PWA manifest
      '/manifest.webmanifest': {
        headers: { 'Cache-Control': 'public, max-age=86400' },
      },
    },
  },
})
