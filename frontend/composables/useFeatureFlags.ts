import { useAnalytics } from '@/composables/useAnalytics'

/**
 * Feature flags keys définies dans PostHog
 *
 * Ajouter ici les nouveaux feature flags pour bénéficier
 * de l'autocomplétion et du typage.
 */
export type FeatureFlagKey =
  // A/B tests
  'cta_variant' // Variante du CTA sur la landing

/**
 * Composable typé pour les feature flags PostHog.
 *
 * Fournit des helpers typés pour vérifier les feature flags
 * configurés dans le dashboard PostHog.
 *
 * @example
 * ```ts
 * const { getCtaVariant } = useFeatureFlags()
 *
 * // Récupérer une variante A/B
 * const variant = getCtaVariant()
 * if (variant === 'variant_a') {
 *   // CTA alternatif
 * }
 * ```
 */
export const useFeatureFlags = () => {
  const { isFeatureEnabled, getFeatureFlag } = useAnalytics()

  // ========== Feature Flags Multivariés (A/B Tests) ==========

  /**
   * Récupère la variante du CTA sur la landing
   */
  const getCtaVariant = (): 'control' | 'variant_a' | undefined => {
    const variant = getFeatureFlag('cta_variant')
    if (typeof variant === 'string') {
      return variant as 'control' | 'variant_a'
    }
    return undefined
  }

  // ========== Helpers Génériques ==========

  /**
   * Vérifie un feature flag par sa clé (pour les flags non encore typés)
   */
  const checkFlag = (key: FeatureFlagKey): boolean => {
    return isFeatureEnabled(key)
  }

  /**
   * Récupère la valeur d'un feature flag par sa clé
   */
  const getFlagValue = (key: FeatureFlagKey): string | boolean | undefined => {
    return getFeatureFlag(key)
  }

  return {
    // A/B tests (variantes)
    getCtaVariant,

    // Helpers génériques
    checkFlag,
    getFlagValue,
  }
}
