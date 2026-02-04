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
    test('isNewDashboardEnabled() should return true when flag is enabled', () => {
      mockIsFeatureEnabled.mockReturnValue(true)

      const { isNewDashboardEnabled } = useFeatureFlags()
      const result = isNewDashboardEnabled()

      expect(mockIsFeatureEnabled).toHaveBeenCalledWith('dashboard_v2')
      expect(result).toBe(true)
    })

    test('isNewDashboardEnabled() should return false when flag is disabled', () => {
      mockIsFeatureEnabled.mockReturnValue(false)

      const { isNewDashboardEnabled } = useFeatureFlags()
      const result = isNewDashboardEnabled()

      expect(mockIsFeatureEnabled).toHaveBeenCalledWith('dashboard_v2')
      expect(result).toBe(false)
    })

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

    test('isPremiumTrialEnabled() should check premium_trial flag', () => {
      mockIsFeatureEnabled.mockReturnValue(true)

      const { isPremiumTrialEnabled } = useFeatureFlags()
      const result = isPremiumTrialEnabled()

      expect(mockIsFeatureEnabled).toHaveBeenCalledWith('premium_trial')
      expect(result).toBe(true)
    })

    test('isPremiumTrialEnabled() should return false when disabled', () => {
      mockIsFeatureEnabled.mockReturnValue(false)

      const { isPremiumTrialEnabled } = useFeatureFlags()
      const result = isPremiumTrialEnabled()

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
    test('getOnboardingVariant() should return variant string when set', () => {
      mockGetFeatureFlag.mockReturnValue('variant_a')

      const { getOnboardingVariant } = useFeatureFlags()
      const result = getOnboardingVariant()

      expect(mockGetFeatureFlag).toHaveBeenCalledWith('new_onboarding')
      expect(result).toBe('variant_a')
    })

    test('getOnboardingVariant() should return control variant', () => {
      mockGetFeatureFlag.mockReturnValue('control')

      const { getOnboardingVariant } = useFeatureFlags()
      const result = getOnboardingVariant()

      expect(result).toBe('control')
    })

    test('getOnboardingVariant() should return variant_b', () => {
      mockGetFeatureFlag.mockReturnValue('variant_b')

      const { getOnboardingVariant } = useFeatureFlags()
      const result = getOnboardingVariant()

      expect(result).toBe('variant_b')
    })

    test('getOnboardingVariant() should return undefined when flag is boolean', () => {
      mockGetFeatureFlag.mockReturnValue(true)

      const { getOnboardingVariant } = useFeatureFlags()
      const result = getOnboardingVariant()

      expect(result).toBeUndefined()
    })

    test('getOnboardingVariant() should return undefined when flag is not set', () => {
      mockGetFeatureFlag.mockReturnValue(undefined)

      const { getOnboardingVariant } = useFeatureFlags()
      const result = getOnboardingVariant()

      expect(result).toBeUndefined()
    })

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
      const result = checkFlag('dashboard_v2')

      expect(mockIsFeatureEnabled).toHaveBeenCalledWith('dashboard_v2')
      expect(result).toBe(true)
    })

    test('checkFlag() should return false for disabled flag', () => {
      mockIsFeatureEnabled.mockReturnValue(false)

      const { checkFlag } = useFeatureFlags()
      const result = checkFlag('vtt_integration')

      expect(mockIsFeatureEnabled).toHaveBeenCalledWith('vtt_integration')
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
      const result = getFlagValue('dashboard_v2')

      expect(mockGetFeatureFlag).toHaveBeenCalledWith('dashboard_v2')
      expect(result).toBe(true)
    })

    test('getFlagValue() should return undefined when not set', () => {
      mockGetFeatureFlag.mockReturnValue(undefined)

      const { getFlagValue } = useFeatureFlags()
      const result = getFlagValue('pricing_layout')

      expect(mockGetFeatureFlag).toHaveBeenCalledWith('pricing_layout')
      expect(result).toBeUndefined()
    })
  })

  describe('All returned functions', () => {
    test('should return all feature flag helpers', () => {
      const featureFlags = useFeatureFlags()

      // Boolean flags
      expect(featureFlags.isNewDashboardEnabled).toBeDefined()
      expect(featureFlags.isVttIntegrationEnabled).toBeDefined()
      expect(featureFlags.isPremiumTrialEnabled).toBeDefined()
      expect(featureFlags.isGamificationEnabled).toBeDefined()

      // A/B tests
      expect(featureFlags.getOnboardingVariant).toBeDefined()
      expect(featureFlags.getCtaVariant).toBeDefined()

      // Generic helpers
      expect(featureFlags.checkFlag).toBeDefined()
      expect(featureFlags.getFlagValue).toBeDefined()
    })
  })
})
