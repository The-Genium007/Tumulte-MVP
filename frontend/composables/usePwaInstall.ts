import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { BeforeInstallPromptEvent } from '@/types/pwa'

const DISMISSED_KEY = 'tumulte-pwa-install-dismissed'

/**
 * Platform types for PWA installation
 */
export type PwaPlatform = 'chrome' | 'safari-mac' | 'safari-ios' | 'firefox' | 'unknown'

/**
 * Detects the current platform for PWA installation guidance.
 */
function detectPlatform(): PwaPlatform {
  if (typeof navigator === 'undefined') return 'unknown'

  const ua = navigator.userAgent
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua)
  const isMac = /Macintosh/.test(ua)
  const isFirefox = /Firefox/.test(ua)
  const isChromium = (/Chrome/.test(ua) && !/Edg/.test(ua)) || /Edg/.test(ua)

  if (isIOS && isSafari) return 'safari-ios'
  if (isMac && isSafari && !isChromium) return 'safari-mac'
  if (isFirefox) return 'firefox'
  if (isChromium) return 'chrome'

  return 'unknown'
}

/**
 * Checks if the app is running in standalone mode (already installed).
 */
function checkIsInstalled(): boolean {
  if (typeof window === 'undefined') return false

  // Check display-mode media query
  if (window.matchMedia('(display-mode: standalone)').matches) return true

  // iOS Safari standalone check
  if ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
    return true

  return false
}

/**
 * Composable for PWA installation management.
 * Handles the beforeinstallprompt event for Chrome/Edge and provides
 * installation guidance for Safari (macOS and iOS).
 *
 * @returns PWA install state and methods
 *
 * @example
 * const { canInstall, canShowGuide, platform, install, dismiss } = usePwaInstall()
 */
export function usePwaInstall() {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const dismissed = ref(false)
  // Initialize with SSR-safe defaults to avoid hydration mismatch
  // Real values are set in onMounted (client-side only)
  const platform = ref<PwaPlatform>('unknown')
  const isInstalled = ref(false)
  const isHydrated = ref(false)

  /**
   * Can the app be installed via Chrome/Edge prompt?
   */
  const canInstall = computed(() => {
    return deferredPrompt.value !== null && !dismissed.value && !isInstalled.value
  })

  /**
   * Should we show installation guide for Safari?
   * Only shows for Safari (mac/iOS) when not dismissed and not already installed.
   */
  const canShowGuide = computed(() => {
    const isSafari = platform.value === 'safari-mac' || platform.value === 'safari-ios'
    return isSafari && !dismissed.value && !isInstalled.value
  })

  /**
   * Should we show any installation UI (prompt or guide)?
   * Only shows after hydration to avoid SSR mismatch.
   */
  const shouldShowInstallUI = computed(() => {
    if (!isHydrated.value) return false
    return canInstall.value || canShowGuide.value
  })

  /**
   * Triggers the PWA installation prompt (Chrome/Edge only).
   */
  async function install(): Promise<void> {
    if (!deferredPrompt.value) {
      console.warn('[usePwaInstall] No install prompt available')
      return
    }

    try {
      await deferredPrompt.value.prompt()
      const choiceResult = await deferredPrompt.value.userChoice

      if (choiceResult.outcome === 'accepted') {
        console.log('[usePwaInstall] User accepted the install prompt')
        isInstalled.value = true
      } else {
        console.log('[usePwaInstall] User dismissed the install prompt')
        dismiss()
      }

      // Reset the prompt after use
      deferredPrompt.value = null
    } catch (error) {
      console.error('[usePwaInstall] Error during installation:', error)
    }
  }

  /**
   * Dismisses the install prompt/guide and saves the preference.
   */
  function dismiss(): void {
    dismissed.value = true
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DISMISSED_KEY, 'true')
    }
  }

  /**
   * Resets the dismissed state (for testing purposes).
   */
  function resetDismissed(): void {
    dismissed.value = false
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(DISMISSED_KEY)
    }
  }

  /**
   * Handles the beforeinstallprompt event.
   */
  const handleBeforeInstallPrompt = (e: Event) => {
    // Prevent the default browser install prompt
    e.preventDefault()
    // Store the event for later use
    deferredPrompt.value = e as BeforeInstallPromptEvent
    console.log('[usePwaInstall] Install prompt captured')
  }

  // Initialize dismissed state from localStorage (synchronous, safe outside onMounted)
  if (typeof localStorage !== 'undefined') {
    const wasDismissed = localStorage.getItem(DISMISSED_KEY)
    dismissed.value = wasDismissed === 'true'
  }

  onMounted(() => {
    // Detect platform and installation status client-side only
    // This prevents SSR hydration mismatch on Safari
    platform.value = detectPlatform()
    isInstalled.value = checkIsInstalled()
    isHydrated.value = true

    // Listen for the beforeinstallprompt event (Chrome/Edge only)
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  })

  onUnmounted(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  })

  return {
    // State
    canInstall,
    canShowGuide,
    shouldShowInstallUI,
    platform,
    isInstalled,
    dismissed,
    // Actions
    install,
    dismiss,
    resetDismissed,
  }
}
