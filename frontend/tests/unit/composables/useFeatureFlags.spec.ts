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
      const result = checkFlag('cta_variant')

      expect(mockIsFeatureEnabled).toHaveBeenCalledWith('cta_variant')
      expect(result).toBe(true)
    })

    test('checkFlag() should return false for disabled flag', () => {
      mockIsFeatureEnabled.mockReturnValue(false)

      const { checkFlag } = useFeatureFlags()
      const result = checkFlag('cta_variant')

      expect(mockIsFeatureEnabled).toHaveBeenCalledWith('cta_variant')
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
      const result = getFlagValue('cta_variant')

      expect(mockGetFeatureFlag).toHaveBeenCalledWith('cta_variant')
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

      // A/B tests
      expect(featureFlags.getCtaVariant).toBeDefined()

      // Generic helpers
      expect(featureFlags.checkFlag).toBeDefined()
      expect(featureFlags.getFlagValue).toBeDefined()
    })
  })
})
