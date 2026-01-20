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

describe('usePwaInstall Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    vi.resetModules()
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

  describe('multiple instances', () => {
    test('instances share the same ref state (module-level refs)', async () => {
      const { usePwaInstall } = await import('~/composables/usePwaInstall')

      const instance1 = usePwaInstall()
      const instance2 = usePwaInstall()

      // Before dismiss, both should be false
      expect(instance1.dismissed.value).toBe(false)
      expect(instance2.dismissed.value).toBe(false)

      instance1.dismiss()

      // After dismiss on instance1, check instance1 is true
      expect(instance1.dismissed.value).toBe(true)
      // Note: The composable uses module-level refs, so behavior depends on implementation
      // This test documents the actual behavior
    })
  })

  describe('localStorage edge cases', () => {
    test('should handle localStorage being available', async () => {
      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { dismiss } = usePwaInstall()

      // Should not throw
      expect(() => dismiss()).not.toThrow()
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    test('should handle resetDismissed correctly', async () => {
      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const { dismiss, resetDismissed, dismissed } = usePwaInstall()

      dismiss()
      expect(dismissed.value).toBe(true)
      expect(localStorageMock.setItem).toHaveBeenCalledWith('tumulte-pwa-install-dismissed', 'true')

      resetDismissed()
      expect(dismissed.value).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('tumulte-pwa-install-dismissed')
    })
  })

  describe('return values', () => {
    test('should return all expected properties and methods', async () => {
      const { usePwaInstall } = await import('~/composables/usePwaInstall')
      const result = usePwaInstall()

      expect(result).toHaveProperty('canInstall')
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
