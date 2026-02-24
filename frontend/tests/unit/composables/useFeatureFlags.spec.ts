import { describe, test, expect, beforeEach, vi } from 'vitest'
import { useFeatureFlags } from '~/composables/useFeatureFlags'

// Mock useAnalytics composable
const mockIsFeatureEnabled = vi.fn()
const mockGetFeatureFlag = vi.fn()

vi.mock('@/composables/useAnalytics', () => ({
  useAnalytics: vi.fn(() => ({
    isFeatureEnabled: mockIsFeatureEnabled,
    getFeatureFlag: mockGetFeatureFlag,
  })),
}))

describe('useFeatureFlags Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Boolean feature flags', () => {
    test('isVttIntegrationEnabled() should check vtt_integration flag', () => {
      mockIsFeatureEnabled.mockReturnValue(true)

      const { isVttIntegrationEnabled } = useFeatureFlags()
      const result = isVttIntegrationEnabled()

      expect(mockIsFeatureEnabled).toHaveBeenCalledWith('vtt_integration')
      expect(result).toBe(true)
    })

    test('isVttIntegrationEnabled() should return false when disabled', () => {
      mockIsFeatureEnabled.mockReturnValue(false)

      const { isVttIntegrationEnabled } = useFeatureFlags()
      const result = isVttIntegrationEnabled()

      expect(result).toBe(false)
    })

    test('isGamificationEnabled() should check gamification flag', () => {
      mockIsFeatureEnabled.mockReturnValue(true)

      const { isGamificationEnabled } = useFeatureFlags()
      const result = isGamificationEnabled()

      expect(mockIsFeatureEnabled).toHaveBeenCalledWith('gamification')
      expect(result).toBe(true)
    })

    test('isGamificationEnabled() should return false when disabled', () => {
      mockIsFeatureEnabled.mockReturnValue(false)

      const { isGamificationEnabled } = useFeatureFlags()
      const result = isGamificationEnabled()

      expect(result).toBe(false)
    })
  })

  describe('Multivariate feature flags (A/B tests)', () => {
    test('getCtaVariant() should return variant string when set', () => {
      mockGetFeatureFlag.mockReturnValue('variant_a')

      const { getCtaVariant } = useFeatureFlags()
      const result = getCtaVariant()

      expect(mockGetFeatureFlag).toHaveBeenCalledWith('cta_variant')
      expect(result).toBe('variant_a')
    })

    test('getCtaVariant() should return control variant', () => {
      mockGetFeatureFlag.mockReturnValue('control')

      const { getCtaVariant } = useFeatureFlags()
      const result = getCtaVariant()

      expect(result).toBe('control')
    })

    test('getCtaVariant() should return undefined when flag is boolean', () => {
      mockGetFeatureFlag.mockReturnValue(false)

      const { getCtaVariant } = useFeatureFlags()
      const result = getCtaVariant()

      expect(result).toBeUndefined()
    })

    test('getCtaVariant() should return undefined when flag is not set', () => {
      mockGetFeatureFlag.mockReturnValue(undefined)

      const { getCtaVariant } = useFeatureFlags()
      const result = getCtaVariant()

      expect(result).toBeUndefined()
    })
  })

  describe('Generic helpers', () => {
    test('checkFlag() should check any feature flag by key', () => {
      mockIsFeatureEnabled.mockReturnValue(true)

      const { checkFlag } = useFeatureFlags()
      const result = checkFlag('vtt_integration')

      expect(mockIsFeatureEnabled).toHaveBeenCalledWith('vtt_integration')
      expect(result).toBe(true)
    })

    test('checkFlag() should return false for disabled flag', () => {
      mockIsFeatureEnabled.mockReturnValue(false)

      const { checkFlag } = useFeatureFlags()
      const result = checkFlag('gamification')

      expect(mockIsFeatureEnabled).toHaveBeenCalledWith('gamification')
      expect(result).toBe(false)
    })

    test('getFlagValue() should return string value', () => {
      mockGetFeatureFlag.mockReturnValue('variant_a')

      const { getFlagValue } = useFeatureFlags()
      const result = getFlagValue('cta_variant')

      expect(mockGetFeatureFlag).toHaveBeenCalledWith('cta_variant')
      expect(result).toBe('variant_a')
    })

    test('getFlagValue() should return boolean value', () => {
      mockGetFeatureFlag.mockReturnValue(true)

      const { getFlagValue } = useFeatureFlags()
      const result = getFlagValue('gamification')

      expect(mockGetFeatureFlag).toHaveBeenCalledWith('gamification')
      expect(result).toBe(true)
    })

    test('getFlagValue() should return undefined when not set', () => {
      mockGetFeatureFlag.mockReturnValue(undefined)

      const { getFlagValue } = useFeatureFlags()
      const result = getFlagValue('cta_variant')

      expect(mockGetFeatureFlag).toHaveBeenCalledWith('cta_variant')
      expect(result).toBeUndefined()
    })
  })

  describe('All returned functions', () => {
    test('should return all feature flag helpers', () => {
      const featureFlags = useFeatureFlags()

      // Boolean flags
      expect(featureFlags.isVttIntegrationEnabled).toBeDefined()
      expect(featureFlags.isGamificationEnabled).toBeDefined()

      // A/B tests
      expect(featureFlags.getCtaVariant).toBeDefined()

      // Generic helpers
      expect(featureFlags.checkFlag).toBeDefined()
      expect(featureFlags.getFlagValue).toBeDefined()
    })
  })
})
