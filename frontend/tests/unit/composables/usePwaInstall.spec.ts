import { describe, test, expect, beforeEach, vi } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get store() {
      return store
    },
  }
})()

vi.stubGlobal('localStorage', localStorageMock)

// Mock matchMedia
const matchMediaMock = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

vi.stubGlobal('matchMedia', matchMediaMock)

describe('usePwaInstall Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    vi.resetModules()
    // Reset navigator mock
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0.0.0 Safari/537.36',
      configurable: true,
    })
  })

  describe('Initial State', () => {
    test('should initialize with canInstall false', async () => {
      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { canInstall } = usePwaInstall()

      expect(canInstall.value).toBe(false)
    })

    test('should initialize with dismissed false by default', async () => {
      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { dismissed } = usePwaInstall()

      expect(dismissed.value).toBe(false)
    })

    test('should initialize with isInstalled false when not in standalone mode', async () => {
      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { isInstalled } = usePwaInstall()

      expect(isInstalled.value).toBe(false)
    })
  })

  describe('Platform Detection', () => {
    test('should detect Chrome browser', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        configurable: true,
      })

      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { platform } = usePwaInstall()

      expect(platform.value).toBe('chrome')
    })

    test('should detect Safari on macOS', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        configurable: true,
      })

      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { platform } = usePwaInstall()

      expect(platform.value).toBe('safari-mac')
    })

    test('should detect Firefox', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
        configurable: true,
      })

      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { platform } = usePwaInstall()

      expect(platform.value).toBe('firefox')
    })
  })

  describe('canShowGuide computed', () => {
    test('should be false for Chrome (uses native prompt instead)', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36',
        configurable: true,
      })

      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { canShowGuide } = usePwaInstall()

      expect(canShowGuide.value).toBe(false)
    })

    test('should be true for Safari macOS when not dismissed', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        configurable: true,
      })

      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { canShowGuide } = usePwaInstall()

      expect(canShowGuide.value).toBe(true)
    })

    test('should be false for Firefox (no PWA support)', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 Firefox/121.0',
        configurable: true,
      })

      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { canShowGuide } = usePwaInstall()

      expect(canShowGuide.value).toBe(false)
    })

    test('should be false for Safari when dismissed', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
        configurable: true,
      })

      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { canShowGuide, dismiss } = usePwaInstall()

      dismiss()

      expect(canShowGuide.value).toBe(false)
    })
  })

  describe('shouldShowInstallUI computed', () => {
    test('should be true when canShowGuide is true (Safari)', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
        configurable: true,
      })

      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { shouldShowInstallUI } = usePwaInstall()

      expect(shouldShowInstallUI.value).toBe(true)
    })

    test('should be false when dismissed', async () => {
      Object.defineProperty(navigator, 'userAgent', {
        value:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15',
        configurable: true,
      })

      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { shouldShowInstallUI, dismiss } = usePwaInstall()

      dismiss()

      expect(shouldShowInstallUI.value).toBe(false)
    })
  })

  describe('dismiss function', () => {
    test('should set dismissed to true', async () => {
      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { dismiss, dismissed } = usePwaInstall()

      expect(dismissed.value).toBe(false)

      dismiss()

      expect(dismissed.value).toBe(true)
    })

    test('should save dismissed state to localStorage', async () => {
      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { dismiss } = usePwaInstall()

      dismiss()

      expect(localStorageMock.setItem).toHaveBeenCalledWith('tumulte-pwa-install-dismissed', 'true')
    })
  })

  describe('resetDismissed function', () => {
    test('should set dismissed to false', async () => {
      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { dismiss, resetDismissed, dismissed } = usePwaInstall()

      dismiss()
      expect(dismissed.value).toBe(true)

      resetDismissed()
      expect(dismissed.value).toBe(false)
    })

    test('should remove dismissed state from localStorage', async () => {
      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { dismiss, resetDismissed } = usePwaInstall()

      dismiss()
      resetDismissed()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('tumulte-pwa-install-dismissed')
    })
  })

  describe('canInstall computed', () => {
    test('should be false when no prompt available', async () => {
      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { canInstall } = usePwaInstall()

      expect(canInstall.value).toBe(false)
    })

    test('should remain false when dismissed is true even without prompt', async () => {
      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { canInstall, dismiss } = usePwaInstall()

      dismiss()

      expect(canInstall.value).toBe(false)
    })
  })

  describe('install function', () => {
    test('should warn when no prompt available', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { install } = usePwaInstall()

      await install()

      expect(consoleSpy).toHaveBeenCalledWith('[usePwaInstall] No install prompt available')

      consoleSpy.mockRestore()
    })
  })

  describe('return values', () => {
    test('should return all expected properties and methods', async () => {
      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const result = usePwaInstall()

      expect(result).toHaveProperty('canInstall')
      expect(result).toHaveProperty('canShowGuide')
      expect(result).toHaveProperty('shouldShowInstallUI')
      expect(result).toHaveProperty('platform')
      expect(result).toHaveProperty('isInstalled')
      expect(result).toHaveProperty('dismissed')
      expect(result).toHaveProperty('install')
      expect(result).toHaveProperty('dismiss')
      expect(result).toHaveProperty('resetDismissed')

      expect(typeof result.install).toBe('function')
      expect(typeof result.dismiss).toBe('function')
      expect(typeof result.resetDismissed).toBe('function')
    })
  })

  describe('dismissed state persistence', () => {
    test('dismiss should persist to localStorage', async () => {
      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { dismiss } = usePwaInstall()

      dismiss()

      expect(localStorageMock.store['tumulte-pwa-install-dismissed']).toBe('true')
    })

    test('resetDismissed should clear from localStorage', async () => {
      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { dismiss, resetDismissed } = usePwaInstall()

      dismiss()
      expect(localStorageMock.store['tumulte-pwa-install-dismissed']).toBe('true')

      resetDismissed()
      expect(localStorageMock.store['tumulte-pwa-install-dismissed']).toBeUndefined()
    })
  })
})
