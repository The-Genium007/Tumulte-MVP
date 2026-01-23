import posthog from 'posthog-js'

/**
 * PostHog Analytics Plugin
 *
 * Initializes PostHog for:
 * - Automatic page view tracking
 * - Session replay (to see where users get stuck)
 * - Feature flags (for A/B testing)
 * - User identification (linked to auth)
 *
 * Data is stored in EU (eu.i.posthog.com) for GDPR compliance.
 *
 * Environment filtering:
 * All events include an 'environment' property ('development' or 'production')
 * to filter data in the PostHog dashboard (single project, free tier).
 */
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const posthogKey = config.public.posthogKey as string
  const posthogHost = config.public.posthogHost as string

  // Determine environment for filtering in PostHog dashboard
  const environment = import.meta.env.PROD ? 'production' : 'development'

  // Don't initialize if no API key (local dev without config)
  if (!posthogKey) {
    if (import.meta.env.DEV) {
      console.warn('[PostHog] No API key configured, analytics disabled')
    }
    return
  }

  posthog.init(posthogKey, {
    api_host: posthogHost,

    // Automatic tracking
    capture_pageview: true, // Track page changes (SPA navigation)
    capture_pageleave: true, // Track when user leaves

    // Session Replay - see user sessions to identify UX issues
    disable_session_recording: false,
    enable_recording_console_log: true, // Capture console logs in recordings

    // Privacy / GDPR
    persistence: 'localStorage+cookie',
    respect_dnt: true, // Respect Do Not Track browser setting
    secure_cookie: import.meta.env.PROD, // HTTPS only in production

    // Performance
    autocapture: true, // Auto-capture clicks, form submissions
    capture_performance: true, // Web vitals

    // Feature flags - bootstrap for faster initial load
    bootstrap: {
      featureFlags: {}, // Will be populated by PostHog
    },

    // Callback when PostHog is ready
    loaded: (ph) => {
      // Register super properties - included in ALL events automatically
      // This allows filtering by environment in PostHog dashboard
      ph.register({
        environment,
        app_version: config.public.appVersion || 'unknown',
      })

      // Enable debug mode in development
      if (import.meta.env.DEV) {
        ph.debug()
        console.info(`[PostHog] Initialized in DEVELOPMENT mode (environment: ${environment})`)
      } else {
        console.info(`[PostHog] Initialized in PRODUCTION mode (environment: ${environment})`)
      }
    },
  })

  // Expose PostHog instance globally for the composable
  return {
    provide: {
      posthog,
    },
  }
})
