import { describe, test, expect, beforeEach, vi } from 'vitest'
import { useAnalytics } from '~/composables/useAnalytics'

// Mock PostHog API
const mockPosthog = {
  identify: vi.fn(),
  reset: vi.fn(),
  capture: vi.fn(),
  setPersonProperties: vi.fn(),
  setPersonPropertiesOnce: vi.fn(),
  isFeatureEnabled: vi.fn(),
  getFeatureFlag: vi.fn(),
  startSessionRecording: vi.fn(),
  getDistinctId: vi.fn(),
}

describe('useAnalytics Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Override global useNuxtApp mock to provide $posthog
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useNuxtApp).mockReturnValue({
      $posthog: mockPosthog,
    })
  })

  describe('identify', () => {
    test('should call posthog.identify with user ID and properties', () => {
      const { identify } = useAnalytics()

      identify('user-123', { email: 'test@example.com', tier: 'premium' })

      expect(mockPosthog.identify).toHaveBeenCalledWith('user-123', {
        email: 'test@example.com',
        tier: 'premium',
      })
    })

    test('should call posthog.identify with only user ID', () => {
      const { identify } = useAnalytics()

      identify('user-456')

      expect(mockPosthog.identify).toHaveBeenCalledWith('user-456', undefined)
    })
  })

  describe('reset', () => {
    test('should call posthog.reset', () => {
      const { reset } = useAnalytics()

      reset()

      expect(mockPosthog.reset).toHaveBeenCalled()
    })
  })

  describe('track', () => {
    test('should call posthog.capture with event name and properties', () => {
      const { track } = useAnalytics()

      track('campaign_created', { campaign_id: 'camp-123' })

      expect(mockPosthog.capture).toHaveBeenCalledWith('campaign_created', {
        campaign_id: 'camp-123',
      })
    })

    test('should call posthog.capture with only event name', () => {
      const { track } = useAnalytics()

      track('poll_launched')

      expect(mockPosthog.capture).toHaveBeenCalledWith('poll_launched', undefined)
    })

    test('should accept custom event names', () => {
      const { track } = useAnalytics()

      // eslint-disable-next-line camelcase -- PostHog uses snake_case for properties
      track('custom_event', { custom_prop: 'value' })

      expect(mockPosthog.capture).toHaveBeenCalledWith('custom_event', {
        // eslint-disable-next-line camelcase -- PostHog uses snake_case for properties
        custom_prop: 'value',
      })
    })
  })

  describe('setUserProperties', () => {
    test('should call posthog.setPersonProperties', () => {
      const { setUserProperties } = useAnalytics()

      // eslint-disable-next-line camelcase -- PostHog uses snake_case for properties
      setUserProperties({ campaigns_count: 5, tier: 'premium' })

      expect(mockPosthog.setPersonProperties).toHaveBeenCalledWith({
        // eslint-disable-next-line camelcase -- PostHog uses snake_case for properties
        campaigns_count: 5,
        tier: 'premium',
      })
    })
  })

  describe('setUserPropertiesOnce', () => {
    test('should call posthog.setPersonPropertiesOnce', () => {
      const { setUserPropertiesOnce } = useAnalytics()

      // eslint-disable-next-line camelcase -- PostHog uses snake_case for properties
      setUserPropertiesOnce({ first_campaign_at: '2024-01-01' })

      expect(mockPosthog.setPersonPropertiesOnce).toHaveBeenCalledWith({
        // eslint-disable-next-line camelcase -- PostHog uses snake_case for properties
        first_campaign_at: '2024-01-01',
      })
    })
  })

  describe('isFeatureEnabled', () => {
    test('should return true when feature is enabled', () => {
      mockPosthog.isFeatureEnabled.mockReturnValue(true)

      const { isFeatureEnabled } = useAnalytics()
      const result = isFeatureEnabled('new_dashboard')

      expect(mockPosthog.isFeatureEnabled).toHaveBeenCalledWith('new_dashboard')
      expect(result).toBe(true)
    })

    test('should return false when feature is disabled', () => {
      mockPosthog.isFeatureEnabled.mockReturnValue(false)

      const { isFeatureEnabled } = useAnalytics()
      const result = isFeatureEnabled('beta_feature')

      expect(result).toBe(false)
    })

    test('should return false when posthog returns undefined', () => {
      mockPosthog.isFeatureEnabled.mockReturnValue(undefined)

      const { isFeatureEnabled } = useAnalytics()
      const result = isFeatureEnabled('unknown_feature')

      expect(result).toBe(false)
    })
  })

  describe('getFeatureFlag', () => {
    test('should return variant string', () => {
      mockPosthog.getFeatureFlag.mockReturnValue('variant_a')

      const { getFeatureFlag } = useAnalytics()
      const result = getFeatureFlag('ab_test')

      expect(mockPosthog.getFeatureFlag).toHaveBeenCalledWith('ab_test')
      expect(result).toBe('variant_a')
    })

    test('should return boolean value', () => {
      mockPosthog.getFeatureFlag.mockReturnValue(true)

      const { getFeatureFlag } = useAnalytics()
      const result = getFeatureFlag('feature_flag')

      expect(result).toBe(true)
    })

    test('should return undefined when flag is not set', () => {
      mockPosthog.getFeatureFlag.mockReturnValue(undefined)

      const { getFeatureFlag } = useAnalytics()
      const result = getFeatureFlag('nonexistent_flag')

      expect(result).toBeUndefined()
    })
  })

  describe('startSessionRecording', () => {
    test('should call posthog.startSessionRecording', () => {
      const { startSessionRecording } = useAnalytics()

      startSessionRecording()

      expect(mockPosthog.startSessionRecording).toHaveBeenCalled()
    })
  })

  describe('getDistinctId', () => {
    test('should return distinct ID from posthog', () => {
      mockPosthog.getDistinctId.mockReturnValue('distinct-id-123')

      const { getDistinctId } = useAnalytics()
      const result = getDistinctId()

      expect(mockPosthog.getDistinctId).toHaveBeenCalled()
      expect(result).toBe('distinct-id-123')
    })

    test('should return undefined when posthog returns undefined', () => {
      mockPosthog.getDistinctId.mockReturnValue(undefined)

      const { getDistinctId } = useAnalytics()
      const result = getDistinctId()

      expect(result).toBeUndefined()
    })
  })

  describe('when PostHog is not available', () => {
    beforeEach(() => {
      // Override global useNuxtApp mock to return undefined $posthog
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mocked((globalThis as any).useNuxtApp).mockReturnValue({
        $posthog: undefined,
      })
    })

    test('all methods should be safe to call without posthog', () => {
      const analytics = useAnalytics()

      // All of these should not throw
      expect(() => analytics.identify('user-1')).not.toThrow()
      expect(() => analytics.reset()).not.toThrow()
      expect(() => analytics.track('event')).not.toThrow()
      expect(() => analytics.setUserProperties({})).not.toThrow()
      expect(() => analytics.setUserPropertiesOnce({})).not.toThrow()
      expect(analytics.isFeatureEnabled('flag')).toBe(false)
      expect(analytics.getFeatureFlag('flag')).toBeUndefined()
      expect(() => analytics.startSessionRecording()).not.toThrow()
      expect(analytics.getDistinctId()).toBeUndefined()
    })
  })

  describe('returned functions', () => {
    test('should return all analytics functions', () => {
      const analytics = useAnalytics()

      expect(analytics.identify).toBeDefined()
      expect(analytics.reset).toBeDefined()
      expect(analytics.track).toBeDefined()
      expect(analytics.setUserProperties).toBeDefined()
      expect(analytics.setUserPropertiesOnce).toBeDefined()
      expect(analytics.isFeatureEnabled).toBeDefined()
      expect(analytics.getFeatureFlag).toBeDefined()
      expect(analytics.startSessionRecording).toBeDefined()
      expect(analytics.getDistinctId).toBeDefined()
    })
  })
})
