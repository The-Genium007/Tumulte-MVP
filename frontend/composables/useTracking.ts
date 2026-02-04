import { useCookieConsent } from './useCookieConsent'
import type { AnalyticsEvent } from './useAnalytics'

/**
 * Composable de tracking unifié avec respect du consentement RGPD
 *
 * @deprecated Préférer `useAnalytics()` pour le tracking PostHog.
 * Ce composable est conservé pour une future intégration GTM (campagnes marketing).
 * GTM n'est actuellement pas utilisé dans l'application.
 *
 * Fournit une API unique pour tracker vers:
 * - PostHog (analytics) - si consentement analytics
 * - GTM (marketing) - si consentement marketing
 *
 * @example
 * ```ts
 * const { trackEvent, trackConversion, trackBoth } = useTracking()
 *
 * // Track vers PostHog (analytics consent requis)
 * trackEvent('signup_completed', { method: 'email' })
 *
 * // Track vers GTM (marketing consent requis)
 * trackConversion('sign_up', { value: 0 })
 *
 * // Track vers les deux (respecte chaque consentement)
 * trackBoth('purchase', { amount: 29.99 })
 * ```
 */
export function useTracking() {
  const { $posthog, $gtm } = useNuxtApp()
  const { analyticsAllowed, marketingAllowed } = useCookieConsent()

  /**
   * Track un event vers PostHog (necessite consentement analytics)
   */
  const trackEvent = (event: AnalyticsEvent | string, properties?: Record<string, unknown>) => {
    if (!analyticsAllowed.value) {
      if (import.meta.env.DEV) {
        console.debug('[Tracking] PostHog event ignored - no analytics consent:', event)
      }
      return
    }

    try {
      $posthog?.capture?.(event, properties)
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[Tracking] PostHog error:', error)
      }
    }
  }

  /**
   * Track une conversion vers GTM (necessite consentement marketing)
   */
  const trackConversion = (event: string, data?: Record<string, unknown>) => {
    if (!marketingAllowed.value) {
      if (import.meta.env.DEV) {
        console.debug('[Tracking] GTM event ignored - no marketing consent:', event)
      }
      return
    }

    try {
      $gtm?.push?.({
        event,
        ...data,
      })
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn('[Tracking] GTM error:', error)
      }
    }
  }

  /**
   * Track vers PostHog ET GTM (respecte les consentements individuels)
   */
  const trackBoth = (event: string, properties?: Record<string, unknown>) => {
    trackEvent(event, properties)
    trackConversion(event, properties)
  }

  /**
   * Identifie l'utilisateur sur toutes les plateformes
   */
  const identifyUser = (userId: string, traits?: Record<string, unknown>) => {
    // PostHog (analytics)
    if (analyticsAllowed.value) {
      try {
        $posthog?.identify?.(userId, traits)
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[Tracking] PostHog identify error:', error)
        }
      }
    }

    // GTM (marketing)
    if (marketingAllowed.value) {
      try {
        $gtm?.push?.({
          event: 'user_identified',
          user_id: userId,
          ...traits,
        })
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[Tracking] GTM identify error:', error)
        }
      }
    }
  }

  /**
   * Reset l'identification sur toutes les plateformes (logout)
   */
  const resetIdentity = () => {
    if (analyticsAllowed.value) {
      try {
        $posthog?.reset?.()
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[Tracking] PostHog reset error:', error)
        }
      }
    }
  }

  return {
    // Methodes de tracking
    trackEvent,
    trackConversion,
    trackBoth,
    identifyUser,
    resetIdentity,

    // Etat du consentement (pour UI conditionnelle)
    analyticsAllowed,
    marketingAllowed,
  }
}
