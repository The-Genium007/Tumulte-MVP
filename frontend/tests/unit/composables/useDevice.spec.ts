import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick } from 'vue'

describe('useDevice Composable', () => {
  let originalWindow: typeof window
  let mockAddEventListener: ReturnType<typeof vi.fn>
  let mockRemoveEventListener: ReturnType<typeof vi.fn>
  let _resizeCallback: (() => void) | null = null

  beforeEach(() => {
    vi.resetModules()

    mockAddEventListener = vi.fn((event: string, callback: () => void) => {
      if (event === 'resize') {
        _resizeCallback = callback
      }
    })
    mockRemoveEventListener = vi.fn()

    // Store original window
    originalWindow = globalThis.window

    // Mock window
    Object.defineProperty(globalThis, 'window', {
      value: {
        innerWidth: 1024,
        addEventListener: mockAddEventListener,
        removeEventListener: mockRemoveEventListener,
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    // Restore window
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true,
    })
    _resizeCallback = null
  })

  test('should initialize with current window width', async () => {
    const { useDevice } = await import('~/composables/useDevice')

    // Simulate mounted lifecycle
    const { windowWidth } = useDevice()

    // Initially 0 before mount
    expect(windowWidth.value).toBe(0)
  })

  test('should detect mobile device (width < 640px)', async () => {
    Object.defineProperty(globalThis.window, 'innerWidth', {
      value: 375,
      writable: true,
    })

    const { useDevice } = await import('~/composables/useDevice')
    const { windowWidth, isMobile, isTablet, isDesktop, deviceType } = useDevice()

    // Simulate mount by calling the resize callback after setting width
    windowWidth.value = 375
    await nextTick()

    expect(isMobile.value).toBe(true)
    expect(isTablet.value).toBe(false)
    expect(isDesktop.value).toBe(false)
    expect(deviceType.value).toBe('mobile')
  })

  test('should detect tablet device (640px <= width < 1024px)', async () => {
    const { useDevice } = await import('~/composables/useDevice')
    const { windowWidth, isMobile, isTablet, isDesktop, deviceType } = useDevice()

    windowWidth.value = 768
    await nextTick()

    expect(isMobile.value).toBe(false)
    expect(isTablet.value).toBe(true)
    expect(isDesktop.value).toBe(false)
    expect(deviceType.value).toBe('tablet')
  })

  test('should detect desktop device (width >= 1024px)', async () => {
    const { useDevice } = await import('~/composables/useDevice')
    const { windowWidth, isMobile, isTablet, isDesktop, deviceType } = useDevice()

    windowWidth.value = 1440
    await nextTick()

    expect(isMobile.value).toBe(false)
    expect(isTablet.value).toBe(false)
    expect(isDesktop.value).toBe(true)
    expect(deviceType.value).toBe('desktop')
  })

  test('should handle exact breakpoint at 640px (tablet)', async () => {
    const { useDevice } = await import('~/composables/useDevice')
    const { windowWidth, isMobile, isTablet } = useDevice()

    windowWidth.value = 640
    await nextTick()

    expect(isMobile.value).toBe(false)
    expect(isTablet.value).toBe(true)
  })

  test('should handle exact breakpoint at 1024px (desktop)', async () => {
    const { useDevice } = await import('~/composables/useDevice')
    const { windowWidth, isTablet, isDesktop } = useDevice()

    windowWidth.value = 1024
    await nextTick()

    expect(isTablet.value).toBe(false)
    expect(isDesktop.value).toBe(true)
  })

  test('should handle edge case at 639px (mobile)', async () => {
    const { useDevice } = await import('~/composables/useDevice')
    const { windowWidth, isMobile, isTablet } = useDevice()

    windowWidth.value = 639
    await nextTick()

    expect(isMobile.value).toBe(true)
    expect(isTablet.value).toBe(false)
  })

  test('should handle edge case at 1023px (tablet)', async () => {
    const { useDevice } = await import('~/composables/useDevice')
    const { windowWidth, isTablet, isDesktop } = useDevice()

    windowWidth.value = 1023
    await nextTick()

    expect(isTablet.value).toBe(true)
    expect(isDesktop.value).toBe(false)
  })

  test('should return all expected properties', async () => {
    const { useDevice } = await import('~/composables/useDevice')
    const result = useDevice()

    expect(result).toHaveProperty('windowWidth')
    expect(result).toHaveProperty('isMobile')
    expect(result).toHaveProperty('isTablet')
    expect(result).toHaveProperty('isDesktop')
    expect(result).toHaveProperty('deviceType')
  })

  test('should handle very large screen sizes', async () => {
    const { useDevice } = await import('~/composables/useDevice')
    const { windowWidth, isDesktop, deviceType } = useDevice()

    windowWidth.value = 3840 // 4K
    await nextTick()

    expect(isDesktop.value).toBe(true)
    expect(deviceType.value).toBe('desktop')
  })

  test('should handle zero width', async () => {
    const { useDevice } = await import('~/composables/useDevice')
    const { windowWidth, isMobile, deviceType } = useDevice()

    windowWidth.value = 0
    await nextTick()

    expect(isMobile.value).toBe(true)
    expect(deviceType.value).toBe('mobile')
  })
})
