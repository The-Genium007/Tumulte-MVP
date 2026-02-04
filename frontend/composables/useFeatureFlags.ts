import { useAnalytics } from '@/composables/useAnalytics'

/**
 * Feature flags keys définies dans PostHog
 *
 * Ajouter ici les nouveaux feature flags pour bénéficier
 * de l'autocomplétion et du typage.
 */
export type FeatureFlagKey =
  // UI/UX experiments
  | 'dashboard_v2' // Nouveau dashboard MJ
  | 'new_onboarding' // Nouveau flow d'onboarding

  // Feature rollouts
  | 'vtt_integration' // Intégration VTT (Foundry, etc.)
  | 'premium_trial' // Essai premium gratuit
  | 'gamification' // Système de gamification

  // A/B tests
  | 'cta_variant' // Variante du CTA sur la landing
  | 'pricing_layout' // Layout de la page pricing

/**
 * Composable typé pour les feature flags PostHog.
 *
 * Fournit des helpers typés pour vérifier les feature flags
 * configurés dans le dashboard PostHog.
 *
 * @example
 * ```ts
 * const { isNewDashboardEnabled, getOnboardingVariant } = useFeatureFlags()
 *
 * // Vérifier un flag booléen
 * if (isNewDashboardEnabled()) {
 *   // Afficher le nouveau dashboard
 * }
 *
 * // Récupérer une variante A/B
 * const variant = getOnboardingVariant()
 * if (variant === 'variant_a') {
 *   // Flow d'onboarding A
 * }
 * ```
 */
export const useFeatureFlags = () => {
  const { isFeatureEnabled, getFeatureFlag } = useAnalytics()

  // ========== Feature Flags Booléens ==========

  /**
   * Vérifie si le nouveau dashboard V2 est activé pour cet utilisateur
   */
  const isNewDashboardEnabled = (): boolean => {
    return isFeatureEnabled('dashboard_v2')
  }

  /**
   * Vérifie si l'intégration VTT est activée
   */
  const isVttIntegrationEnabled = (): boolean => {
    return isFeatureEnabled('vtt_integration')
  }

  /**
   * Vérifie si l'essai premium est activé
   */
  const isPremiumTrialEnabled = (): boolean => {
    return isFeatureEnabled('premium_trial')
  }

  /**
   * Vérifie si le système de gamification est activé
   */
  const isGamificationEnabled = (): boolean => {
    return isFeatureEnabled('gamification')
  }

  // ========== Feature Flags Multivariés (A/B Tests) ==========

  /**
   * Récupère la variante du flow d'onboarding
   */
  const getOnboardingVariant = (): 'control' | 'variant_a' | 'variant_b' | undefined => {
    const variant = getFeatureFlag('new_onboarding')
    if (typeof variant === 'string') {
      return variant as 'control' | 'variant_a' | 'variant_b'
    }
    return undefined
  }

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
    // Feature flags booléens
    isNewDashboardEnabled,
    isVttIntegrationEnabled,
    isPremiumTrialEnabled,
    isGamificationEnabled,

    // A/B tests (variantes)
    getOnboardingVariant,
    getCtaVariant,

    // Helpers génériques
    checkFlag,
    getFlagValue,
  }
}
