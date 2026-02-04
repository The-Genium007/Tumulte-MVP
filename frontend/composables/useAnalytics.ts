import type { PostHogApi } from '@/plugins/posthog.client'

/**
 * Analytics event types for autocomplete and type safety.
 *
 * Organized by AARRR funnel stages:
 * - Acquisition: How users find and sign up
 * - Activation: First "aha" moment
 * - Retention: Users coming back
 * - Revenue: Monetization events (future)
 * - Referral: Users inviting others
 */
export type AnalyticsEvent =
  // === ACQUISITION ===
  | 'landing_page_viewed' // User visits landing page
  | 'cta_clicked' // User clicks a call-to-action
  | 'signup_started' // User begins registration
  | 'signup_completed' // User finishes registration
  | 'email_verified' // User verifies their email
  | 'twitch_linked' // User links their Twitch account

  // === ACTIVATION ===
  | 'campaign_created' // GM creates a campaign
  | 'first_poll_created' // GM creates their first poll
  | 'first_poll_launched' // GM launches their first poll
  | 'streamer_invited' // GM invites a streamer
  | 'invitation_accepted' // Streamer accepts invitation

  // === RETENTION / ENGAGEMENT ===
  | 'poll_launched' // Any poll launch (not just first)
  | 'poll_results_viewed' // User views poll results
  | 'vtt_connected' // User connects VTT integration
  | 'session_started' // User starts a poll session
  | 'dashboard_viewed' // User views their dashboard

  // === REVENUE (future) ===
  | 'pricing_viewed' // User views pricing page
  | 'checkout_started' // User starts checkout
  | 'subscription_created' // User subscribes
  | 'subscription_cancelled' // User cancels

  // === ERRORS / FRICTION ===
  | 'auth_error' // Authentication error occurred
  | 'poll_launch_failed' // Poll failed to launch
  | 'twitch_auth_expired' // Twitch tokens expired

/**
 * Centralized analytics composable for PostHog.
 *
 * IMPORTANT: All methods are safe to call even without consent.
 * They will silently no-op if PostHog is not initialized.
 *
 * Usage:
 * ```ts
 * const { track, identify } = useAnalytics()
 *
 * // Track an event
 * track('cta_clicked', { cta_position: 'hero' })
 *
 * // Identify a user after login
 * identify(user.id, { email: user.email, tier: user.tier })
 * ```
 */
export const useAnalytics = () => {
  const { $posthog } = useNuxtApp()
  const posthog = $posthog as PostHogApi | undefined

  /**
   * Identify a user (call after login).
   * Links anonymous events to this user.
   *
   * @param userId - Unique user ID (usually from database)
   * @param properties - User properties to store (email, tier, etc.)
   */
  const identify = (userId: string, properties?: Record<string, unknown>) => {
    posthog?.identify(userId, properties)
  }

  /**
   * Reset user identity (call after logout).
   * Creates a new anonymous ID for the next session.
   */
  const reset = () => {
    posthog?.reset()
  }

  /**
   * Track a custom event.
   *
   * @param event - Event name (use AnalyticsEvent type for autocomplete)
   * @param properties - Event properties (context-specific data)
   */
  const track = (event: AnalyticsEvent | string, properties?: Record<string, unknown>) => {
    posthog?.capture(event, properties)
  }

  /**
   * Set persistent user properties.
   * These are stored on the user profile and included in all future events.
   *
   * @param properties - Properties to set (campaigns_count, tier, etc.)
   */
  const setUserProperties = (properties: Record<string, unknown>) => {
    posthog?.setPersonProperties(properties)
  }

  /**
   * Set a user property only if it hasn't been set before.
   * Useful for tracking "first time" events (first_campaign_at, etc.)
   *
   * @param properties - Properties to set once
   */
  const setUserPropertiesOnce = (properties: Record<string, unknown>) => {
    posthog?.setPersonPropertiesOnce(properties)
  }

  /**
   * Check if a feature flag is enabled.
   * Used for A/B testing and gradual rollouts.
   *
   * @param flagKey - Feature flag key from PostHog dashboard
   * @returns true if enabled, false otherwise
   */
  const isFeatureEnabled = (flagKey: string): boolean => {
    return posthog?.isFeatureEnabled(flagKey) ?? false
  }

  /**
   * Get the variant of a multivariate feature flag.
   * Returns the variant key (e.g., 'control', 'variant-a').
   *
   * @param flagKey - Feature flag key from PostHog dashboard
   * @returns Variant key or undefined if not set
   */
  const getFeatureFlag = (flagKey: string): string | boolean | undefined => {
    return posthog?.getFeatureFlag(flagKey)
  }

  /**
   * Manually start a session recording.
   * Useful if you want to record specific flows.
   */
  const startSessionRecording = () => {
    posthog?.startSessionRecording()
  }

  /**
   * Get the current distinct ID (anonymous or identified).
   * Useful for debugging or linking with backend.
   */
  const getDistinctId = (): string | undefined => {
    return posthog?.getDistinctId()
  }

  return {
    // User identification
    identify,
    reset,

    // Event tracking
    track,

    // User properties
    setUserProperties,
    setUserPropertiesOnce,

    // Feature flags (A/B testing)
    isFeatureEnabled,
    getFeatureFlag,

    // Session recording
    startSessionRecording,

    // Utilities
    getDistinctId,
  }
}
