import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CookieConsentPreferences, ConsentCategory } from '@/types'

const STORAGE_KEY = 'tumulte_cookie_consent'
/**
 * Version du consentement - incrementer pour re-demander le consentement
 * apres un changement de politique de cookies
 */
const CURRENT_VERSION = '1.0.0'

/**
 * Store Pinia pour la gestion du consentement aux cookies (RGPD)
 *
 * Gere 3 categories de cookies:
 * - required: Toujours actif (session, authentification)
 * - analytics: PostHog (tracking comportemental)
 * - marketing: GTM, pixels publicitaires (Facebook, etc.)
 *
 * Le consentement est persiste en localStorage et versionne
 * pour permettre de re-demander si la politique change.
 */
export const useCookieConsentStore = defineStore('cookieConsent', () => {
  // ===== State =====
  const preferences = ref<CookieConsentPreferences | null>(null)
  const bannerVisible = ref(false)
  const initialized = ref(false)

  // ===== Computed =====

  /** Le visiteur a-t-il donne son consentement ? */
  const hasConsent = computed(() => preferences.value !== null)

  /** Les cookies analytiques sont-ils autorises ? */
  const analyticsAllowed = computed(() => preferences.value?.analytics ?? false)

  /** Les cookies marketing sont-ils autorises ? */
  const marketingAllowed = computed(() => preferences.value?.marketing ?? false)

  /** Le consentement doit-il etre redemande (changement de version) ? */
  const needsConsentUpdate = computed(() => {
    if (!preferences.value) return true
    return preferences.value.consentVersion !== CURRENT_VERSION
  })

  // ===== Actions =====

  /**
   * Initialise le store depuis localStorage
   * A appeler au demarrage de l'application
   */
  function initialize(): void {
    if (initialized.value) return

    // SSR-safe: verifier que localStorage existe
    if (typeof localStorage === 'undefined') {
      initialized.value = true
      return
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as CookieConsentPreferences
        preferences.value = parsed

        // Re-afficher la banniere si la version a change
        if (needsConsentUpdate.value) {
          bannerVisible.value = true
        }
      } else {
        // Pas de consentement stocke -> afficher la banniere
        bannerVisible.value = true
      }
    } catch {
      // Erreur de parsing -> afficher la banniere
      bannerVisible.value = true
    }

    initialized.value = true
  }

  /**
   * Sauvegarde les preferences de consentement
   */
  function savePreferences(
    newPreferences: Omit<
      CookieConsentPreferences,
      'required' | 'consentVersion' | 'consentTimestamp'
    >
  ): void {
    const fullPreferences: CookieConsentPreferences = {
      required: true,
      analytics: newPreferences.analytics,
      marketing: newPreferences.marketing,
      consentVersion: CURRENT_VERSION,
      consentTimestamp: new Date().toISOString(),
    }

    preferences.value = fullPreferences
    bannerVisible.value = false

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fullPreferences))
    }
  }

  /**
   * Accepte tous les cookies (analytics + marketing)
   */
  function acceptAll(): void {
    savePreferences({
      analytics: true,
      marketing: true,
    })
  }

  /**
   * Refuse tous les cookies optionnels (uniquement required)
   */
  function rejectAll(): void {
    savePreferences({
      analytics: false,
      marketing: false,
    })
  }

  /**
   * Met a jour une categorie specifique
   */
  function updateCategory(category: ConsentCategory, value: boolean): void {
    if (category === 'required') return // Ne peut pas etre change

    if (preferences.value) {
      savePreferences({
        analytics: category === 'analytics' ? value : preferences.value.analytics,
        marketing: category === 'marketing' ? value : preferences.value.marketing,
      })
    }
  }

  /**
   * Affiche la banniere de consentement
   * Utile pour le lien "Gerer mes cookies" dans les settings
   */
  function showBanner(): void {
    bannerVisible.value = true
  }

  /**
   * Cache la banniere sans sauvegarder
   */
  function hideBanner(): void {
    bannerVisible.value = false
  }

  /**
   * Reset complet du consentement
   * Supprime les preferences et reaffiche la banniere
   */
  function reset(): void {
    preferences.value = null
    bannerVisible.value = true

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  return {
    // State
    preferences,
    bannerVisible,
    initialized,

    // Computed
    hasConsent,
    analyticsAllowed,
    marketingAllowed,
    needsConsentUpdate,

    // Actions
    initialize,
    savePreferences,
    acceptAll,
    rejectAll,
    updateCategory,
    showBanner,
    hideBanner,
    reset,
  }
})
