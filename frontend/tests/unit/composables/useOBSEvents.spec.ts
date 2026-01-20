import { describe, test, expect, beforeEach, vi } from 'vitest'

// Mock Vue lifecycle hooks to execute immediately
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    onMounted: (fn: () => void) => fn(),
    onUnmounted: vi.fn(),
  }
})

// Mock window.obsstudio
const createMockOBSStudio = (overrides: Record<string, unknown> = {}) => ({
  pluginVersion: '2.0.0',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onVisibilityChange: vi.fn(),
  onActiveChange: vi.fn(),
  getControlLevel: vi.fn(),
  getCurrentScene: vi.fn(),
  ...overrides,
})

describe('useOBSEvents Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    // Reset window.obsstudio
    if (globalThis.window && 'obsstudio' in globalThis.window) {
      delete (globalThis.window as unknown as Record<string, unknown>).obsstudio
    }
  })

  describe('Non-OBS environment', () => {
    test('should detect non-OBS environment', async () => {
      // Ensure no obsstudio
      vi.stubGlobal('window', {})

      const { useOBSEvents } = await import('~/composables/useOBSEvents')
      const { isOBS, pluginVersion } = useOBSEvents()

      expect(isOBS.value).toBe(false)
      expect(pluginVersion.value).toBeNull()
    })

    test('should initialize with default visibility values', async () => {
      vi.stubGlobal('window', {})

      const { useOBSEvents } = await import('~/composables/useOBSEvents')
      const { isSourceVisible, isSourceActive } = useOBSEvents()

      expect(isSourceVisible.value).toBe(true)
      expect(isSourceActive.value).toBe(true)
    })
  })

  describe('OBS environment - new API (OBS 28+)', () => {
    test('should detect OBS environment', async () => {
      const mockOBS = createMockOBSStudio()
      vi.stubGlobal('window', { obsstudio: mockOBS })

      const { useOBSEvents } = await import('~/composables/useOBSEvents')
      const { isOBS, pluginVersion } = useOBSEvents()

      expect(isOBS.value).toBe(true)
      expect(pluginVersion.value).toBe('2.0.0')
    })

    test('should register event listeners with new API', async () => {
      const mockOBS = createMockOBSStudio()
      vi.stubGlobal('window', { obsstudio: mockOBS })

      const { useOBSEvents } = await import('~/composables/useOBSEvents')
      useOBSEvents()

      expect(mockOBS.addEventListener).toHaveBeenCalledWith(
        'obsSourceVisibleChanged',
        expect.any(Function)
      )
      expect(mockOBS.addEventListener).toHaveBeenCalledWith(
        'obsSourceActiveChanged',
        expect.any(Function)
      )
    })
  })

  describe('OBS environment - legacy API', () => {
    test('should use legacy callback API when addEventListener not available', async () => {
      const mockOBS = createMockOBSStudio({
        addEventListener: undefined,
        removeEventListener: undefined,
      })
      vi.stubGlobal('window', { obsstudio: mockOBS })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { useOBSEvents } = await import('~/composables/useOBSEvents')
      useOBSEvents()

      expect(mockOBS.onVisibilityChange).toHaveBeenCalledWith(expect.any(Function))
      expect(mockOBS.onActiveChange).toHaveBeenCalledWith(expect.any(Function))

      consoleSpy.mockRestore()
    })

    test('should handle visibility change via legacy API', async () => {
      let visibilityCallback: ((visible: boolean) => void) | null = null

      const mockOBS = createMockOBSStudio({
        addEventListener: undefined,
        removeEventListener: undefined,
        onVisibilityChange: vi.fn((cb: (visible: boolean) => void) => {
          visibilityCallback = cb
        }),
      })
      vi.stubGlobal('window', { obsstudio: mockOBS })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { useOBSEvents } = await import('~/composables/useOBSEvents')
      const { isSourceVisible } = useOBSEvents()

      expect(isSourceVisible.value).toBe(true)

      // Simulate visibility change
      visibilityCallback!(false)

      expect(isSourceVisible.value).toBe(false)

      consoleSpy.mockRestore()
    })
  })

  describe('onVisibilityChange callback', () => {
    test('should register and call visibility callbacks', async () => {
      const mockOBS = createMockOBSStudio()
      vi.stubGlobal('window', { obsstudio: mockOBS })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { useOBSEvents } = await import('~/composables/useOBSEvents')
      const { onVisibilityChange } = useOBSEvents()

      const callback = vi.fn()
      const unsubscribe = onVisibilityChange(callback)

      // Get the registered handler
      const visibilityHandler = mockOBS.addEventListener.mock.calls.find(
        (call) => call[0] === 'obsSourceVisibleChanged'
      )?.[1] as ((event: CustomEvent) => void) | undefined

      // Simulate visibility event
      visibilityHandler?.({ detail: { visible: false } } as CustomEvent)

      expect(callback).toHaveBeenCalledWith(false)

      // Unsubscribe
      unsubscribe()

      // Callback should not be called again
      callback.mockClear()
      visibilityHandler?.({ detail: { visible: true } } as CustomEvent)

      expect(callback).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    test('should handle multiple visibility callbacks', async () => {
      const mockOBS = createMockOBSStudio()
      vi.stubGlobal('window', { obsstudio: mockOBS })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { useOBSEvents } = await import('~/composables/useOBSEvents')
      const { onVisibilityChange } = useOBSEvents()

      const callback1 = vi.fn()
      const callback2 = vi.fn()

      onVisibilityChange(callback1)
      onVisibilityChange(callback2)

      // Get the registered handler
      const visibilityHandler = mockOBS.addEventListener.mock.calls.find(
        (call) => call[0] === 'obsSourceVisibleChanged'
      )?.[1] as ((event: CustomEvent) => void) | undefined

      visibilityHandler?.({ detail: { visible: false } } as CustomEvent)

      expect(callback1).toHaveBeenCalledWith(false)
      expect(callback2).toHaveBeenCalledWith(false)

      consoleSpy.mockRestore()
    })
  })

  describe('onActiveChange callback', () => {
    test('should register and call active callbacks', async () => {
      const mockOBS = createMockOBSStudio()
      vi.stubGlobal('window', { obsstudio: mockOBS })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { useOBSEvents } = await import('~/composables/useOBSEvents')
      const { onActiveChange } = useOBSEvents()

      const callback = vi.fn()
      const unsubscribe = onActiveChange(callback)

      // Get the registered handler
      const activeHandler = mockOBS.addEventListener.mock.calls.find(
        (call) => call[0] === 'obsSourceActiveChanged'
      )?.[1] as ((event: CustomEvent) => void) | undefined

      // Simulate active event
      activeHandler?.({ detail: { active: false } } as CustomEvent)

      expect(callback).toHaveBeenCalledWith(false)

      // Unsubscribe
      unsubscribe()

      consoleSpy.mockRestore()
    })
  })

  describe('getControlLevel', () => {
    test('should call getControlLevel when available', async () => {
      const mockOBS = createMockOBSStudio({
        getControlLevel: vi.fn((cb: (level: number) => void) => cb(1)),
      })
      vi.stubGlobal('window', { obsstudio: mockOBS })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { useOBSEvents } = await import('~/composables/useOBSEvents')
      useOBSEvents()

      expect(mockOBS.getControlLevel).toHaveBeenCalledWith(expect.any(Function))

      consoleSpy.mockRestore()
    })
  })

  describe('Error handling', () => {
    test('should handle callback errors gracefully', async () => {
      const mockOBS = createMockOBSStudio()
      vi.stubGlobal('window', { obsstudio: mockOBS })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { useOBSEvents } = await import('~/composables/useOBSEvents')
      const { onVisibilityChange } = useOBSEvents()

      const errorCallback = vi.fn(() => {
        throw new Error('Callback error')
      })

      onVisibilityChange(errorCallback)

      // Get the registered handler
      const visibilityHandler = mockOBS.addEventListener.mock.calls.find(
        (call) => call[0] === 'obsSourceVisibleChanged'
      )?.[1] as ((event: CustomEvent) => void) | undefined

      // Should not throw
      expect(() => {
        visibilityHandler?.({ detail: { visible: false } } as CustomEvent)
      }).not.toThrow()

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[OBS] Error in visibility callback:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
      consoleErrorSpy.mockRestore()
    })

    test('should handle addEventListener failure gracefully', async () => {
      const mockOBS = createMockOBSStudio({
        addEventListener: vi.fn(() => {
          throw new Error('addEventListener failed')
        }),
      })
      vi.stubGlobal('window', { obsstudio: mockOBS })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { useOBSEvents } = await import('~/composables/useOBSEvents')

      // Should not throw
      expect(() => useOBSEvents()).not.toThrow()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[OBS] Failed to use addEventListener:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
      consoleWarnSpy.mockRestore()
    })
  })

  describe('Return values', () => {
    test('should return all expected properties', async () => {
      vi.stubGlobal('window', {})

      const { useOBSEvents } = await import('~/composables/useOBSEvents')
      const result = useOBSEvents()

      expect(result).toHaveProperty('isOBS')
      expect(result).toHaveProperty('isSourceVisible')
      expect(result).toHaveProperty('isSourceActive')
      expect(result).toHaveProperty('pluginVersion')
      expect(result).toHaveProperty('onVisibilityChange')
      expect(result).toHaveProperty('onActiveChange')

      expect(typeof result.onVisibilityChange).toBe('function')
      expect(typeof result.onActiveChange).toBe('function')
    })
  })

  describe('Plugin version handling', () => {
    test('should handle missing plugin version', async () => {
      const mockOBS = createMockOBSStudio({
        pluginVersion: undefined,
      })
      vi.stubGlobal('window', { obsstudio: mockOBS })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { useOBSEvents } = await import('~/composables/useOBSEvents')
      const { pluginVersion } = useOBSEvents()

      expect(pluginVersion.value).toBe('unknown')

      consoleSpy.mockRestore()
    })
  })

  describe('Event detail handling', () => {
    test('should handle missing event detail gracefully', async () => {
      const mockOBS = createMockOBSStudio()
      vi.stubGlobal('window', { obsstudio: mockOBS })

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { useOBSEvents } = await import('~/composables/useOBSEvents')
      const { isSourceVisible } = useOBSEvents()

      // Get the registered handler
      const visibilityHandler = mockOBS.addEventListener.mock.calls.find(
        (call) => call[0] === 'obsSourceVisibleChanged'
      )?.[1] as ((event: CustomEvent) => void) | undefined

      // Simulate event without detail
      visibilityHandler?.({} as CustomEvent)

      // Should default to true
      expect(isSourceVisible.value).toBe(true)

      consoleSpy.mockRestore()
    })
  })
})
