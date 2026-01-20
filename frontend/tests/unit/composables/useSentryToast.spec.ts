import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock useToast as a global (Nuxt auto-import)
const mockToastAdd = vi.fn()
vi.stubGlobal('useToast', () => ({
  add: mockToastAdd,
}))

// Mock onSentryError
let sentryErrorCallback: (() => void) | null = null
const mockUnsubscribe = vi.fn()
vi.mock('~/sentry.client.config', () => ({
  onSentryError: (callback: () => void) => {
    sentryErrorCallback = callback
    return mockUnsubscribe
  },
}))

// Mock onUnmounted as a global (Vue auto-import)
const unmountCallbacks: (() => void)[] = []
vi.stubGlobal('onUnmounted', (callback: () => void) => {
  unmountCallbacks.push(callback)
})

describe('useSentryToast Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    sentryErrorCallback = null
    unmountCallbacks.length = 0
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('should subscribe to Sentry errors on initialization', async () => {
    const { useSentryToast } = await import('~/composables/useSentryToast')
    useSentryToast()

    expect(sentryErrorCallback).not.toBeNull()
  })

  test('should show toast when Sentry captures an error', async () => {
    const { useSentryToast } = await import('~/composables/useSentryToast')
    useSentryToast()

    // Trigger Sentry error
    sentryErrorCallback?.()

    expect(mockToastAdd).toHaveBeenCalledWith({
      id: 'sentry-error-captured',
      title: 'Erreur détectée',
      description: 'Elle a été automatiquement transmise au support.',
      icon: 'i-lucide-bug',
      color: 'warning',
    })
  })

  test('should debounce multiple errors within 5 seconds', async () => {
    vi.resetModules()

    const { useSentryToast } = await import('~/composables/useSentryToast')
    useSentryToast()

    // Trigger first error
    sentryErrorCallback?.()
    expect(mockToastAdd).toHaveBeenCalledTimes(1)

    // Trigger second error immediately
    sentryErrorCallback?.()
    expect(mockToastAdd).toHaveBeenCalledTimes(1) // Still 1, debounced

    // Trigger third error after 2 seconds
    vi.advanceTimersByTime(2000)
    sentryErrorCallback?.()
    expect(mockToastAdd).toHaveBeenCalledTimes(1) // Still 1, within debounce window
  })

  test('should allow new toast after debounce period', async () => {
    vi.resetModules()

    const { useSentryToast } = await import('~/composables/useSentryToast')
    useSentryToast()

    // Trigger first error
    sentryErrorCallback?.()
    expect(mockToastAdd).toHaveBeenCalledTimes(1)

    // Advance past debounce period (5000ms)
    vi.advanceTimersByTime(5001)

    // Trigger second error
    sentryErrorCallback?.()
    expect(mockToastAdd).toHaveBeenCalledTimes(2)
  })

  test('should expose showErrorCaptured function', async () => {
    const { useSentryToast } = await import('~/composables/useSentryToast')
    const { showErrorCaptured } = useSentryToast()

    expect(typeof showErrorCaptured).toBe('function')
  })

  test('showErrorCaptured should manually trigger toast', async () => {
    vi.resetModules()

    const { useSentryToast } = await import('~/composables/useSentryToast')
    const { showErrorCaptured } = useSentryToast()

    showErrorCaptured()

    expect(mockToastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sentry-error-captured',
        title: 'Erreur détectée',
      })
    )
  })

  test('should unsubscribe from Sentry errors on unmount', async () => {
    const { useSentryToast } = await import('~/composables/useSentryToast')
    useSentryToast()

    // Simulate unmount
    unmountCallbacks.forEach((cb) => cb())

    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  test('should respect debounce even when calling showErrorCaptured manually', async () => {
    vi.resetModules()

    const { useSentryToast } = await import('~/composables/useSentryToast')
    const { showErrorCaptured } = useSentryToast()

    // First call
    showErrorCaptured()
    expect(mockToastAdd).toHaveBeenCalledTimes(1)

    // Second call immediately
    showErrorCaptured()
    expect(mockToastAdd).toHaveBeenCalledTimes(1) // Debounced

    // After debounce period
    vi.advanceTimersByTime(5001)
    showErrorCaptured()
    expect(mockToastAdd).toHaveBeenCalledTimes(2)
  })
})
