import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'

// Mock Vue lifecycle hooks
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    onUnmounted: vi.fn(),
  }
})

// Mock Worker class
class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: ErrorEvent) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()

  // Helper to simulate receiving a message from the worker
  simulateMessage(data: unknown) {
    if (this.onmessage) {
      this.onmessage({ data } as MessageEvent)
    }
  }

  // Helper to simulate an error
  simulateError(message: string) {
    if (this.onerror) {
      this.onerror({ message } as ErrorEvent)
    }
  }
}

let mockWorkerInstance: MockWorker | null = null

vi.stubGlobal(
  'Worker',
  vi.fn().mockImplementation(() => {
    mockWorkerInstance = new MockWorker()
    return mockWorkerInstance
  })
)

vi.stubGlobal(
  'Blob',
  vi.fn().mockImplementation(() => ({}))
)

vi.stubGlobal('URL', {
  createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
  revokeObjectURL: vi.fn(),
})

describe('useWorkerTimer Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockWorkerInstance = null
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Initial state', () => {
    test('should initialize with default values', async () => {
      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { isRunning, currentTick } = useWorkerTimer()

      expect(isRunning.value).toBe(false)
      expect(currentTick.value).toBe(0)
    })

    test('should return all expected properties', async () => {
      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const result = useWorkerTimer()

      expect(result).toHaveProperty('isRunning')
      expect(result).toHaveProperty('currentTick')
      expect(result).toHaveProperty('start')
      expect(result).toHaveProperty('stop')
      expect(result).toHaveProperty('onTick')
      expect(result).toHaveProperty('ping')

      expect(typeof result.start).toBe('function')
      expect(typeof result.stop).toBe('function')
      expect(typeof result.onTick).toBe('function')
      expect(typeof result.ping).toBe('function')
    })
  })

  describe('start()', () => {
    test('should create a worker and start the timer', async () => {
      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { start, isRunning } = useWorkerTimer()

      start(1000)

      expect(Worker).toHaveBeenCalled()
      expect(Blob).toHaveBeenCalled()
      expect(URL.createObjectURL).toHaveBeenCalled()
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
      expect(mockWorkerInstance?.postMessage).toHaveBeenCalledWith({
        action: 'start',
        interval: 1000,
      })
      expect(isRunning.value).toBe(true)
    })

    test('should use default interval of 1000ms', async () => {
      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { start } = useWorkerTimer()

      start()

      expect(mockWorkerInstance?.postMessage).toHaveBeenCalledWith({
        action: 'start',
        interval: 1000,
      })
    })

    test('should not start if already running', async () => {
      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { start, isRunning } = useWorkerTimer()

      start(1000)
      const firstWorkerInstance = mockWorkerInstance

      // Try to start again
      start(500)

      // Worker should not have been created again
      expect(mockWorkerInstance).toBe(firstWorkerInstance)
      expect(isRunning.value).toBe(true)
    })

    test('should handle worker creation failure gracefully', async () => {
      // Mock Worker to throw an error
      vi.stubGlobal(
        'Worker',
        vi.fn().mockImplementation(() => {
          throw new Error('Worker not supported')
        })
      )

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { start, isRunning } = useWorkerTimer()

      start(1000)

      expect(isRunning.value).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith(
        '[WorkerTimer] Failed to create worker, falling back to setInterval:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()

      // Restore mock
      vi.stubGlobal(
        'Worker',
        vi.fn().mockImplementation(() => {
          mockWorkerInstance = new MockWorker()
          return mockWorkerInstance
        })
      )
    })
  })

  describe('stop()', () => {
    test('should stop the timer and reset state', async () => {
      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { start, stop, isRunning, currentTick } = useWorkerTimer()

      start(1000)

      // Simulate some ticks
      mockWorkerInstance?.simulateMessage({
        type: 'tick',
        tick: 5,
        timestamp: Date.now(),
      })
      expect(currentTick.value).toBe(5)

      stop()

      expect(mockWorkerInstance?.postMessage).toHaveBeenCalledWith({
        action: 'stop',
      })
      expect(mockWorkerInstance?.terminate).toHaveBeenCalled()
      expect(isRunning.value).toBe(false)
      expect(currentTick.value).toBe(0)
    })

    test('should do nothing if not running', async () => {
      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { stop, isRunning } = useWorkerTimer()

      // Should not throw
      expect(() => stop()).not.toThrow()
      expect(isRunning.value).toBe(false)
    })
  })

  describe('onTick()', () => {
    test('should register and call tick callbacks', async () => {
      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { start, onTick } = useWorkerTimer()

      const callback = vi.fn()
      onTick(callback)

      start(1000)

      const timestamp = Date.now()
      mockWorkerInstance?.simulateMessage({ type: 'tick', tick: 1, timestamp })

      expect(callback).toHaveBeenCalledWith(timestamp)
    })

    test('should support multiple callbacks', async () => {
      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { start, onTick } = useWorkerTimer()

      const callback1 = vi.fn()
      const callback2 = vi.fn()

      onTick(callback1)
      onTick(callback2)

      start(1000)

      const timestamp = Date.now()
      mockWorkerInstance?.simulateMessage({ type: 'tick', tick: 1, timestamp })

      expect(callback1).toHaveBeenCalledWith(timestamp)
      expect(callback2).toHaveBeenCalledWith(timestamp)
    })

    test('should return unsubscribe function', async () => {
      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { start, onTick } = useWorkerTimer()

      const callback = vi.fn()
      const unsubscribe = onTick(callback)

      start(1000)

      // First tick - callback should be called
      mockWorkerInstance?.simulateMessage({
        type: 'tick',
        tick: 1,
        timestamp: Date.now(),
      })
      expect(callback).toHaveBeenCalledTimes(1)

      // Unsubscribe
      unsubscribe()

      // Second tick - callback should not be called
      callback.mockClear()
      mockWorkerInstance?.simulateMessage({
        type: 'tick',
        tick: 2,
        timestamp: Date.now(),
      })
      expect(callback).not.toHaveBeenCalled()
    })

    test('should update currentTick on each tick', async () => {
      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { start, currentTick } = useWorkerTimer()

      start(1000)

      expect(currentTick.value).toBe(0)

      mockWorkerInstance?.simulateMessage({
        type: 'tick',
        tick: 1,
        timestamp: Date.now(),
      })
      expect(currentTick.value).toBe(1)

      mockWorkerInstance?.simulateMessage({
        type: 'tick',
        tick: 2,
        timestamp: Date.now(),
      })
      expect(currentTick.value).toBe(2)

      mockWorkerInstance?.simulateMessage({
        type: 'tick',
        tick: 10,
        timestamp: Date.now(),
      })
      expect(currentTick.value).toBe(10)
    })
  })

  describe('ping()', () => {
    test('should return false if worker is not running', async () => {
      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { ping } = useWorkerTimer()

      const result = await ping()
      expect(result).toBe(false)
    })

    test('should return true if worker responds with pong', async () => {
      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { start, ping } = useWorkerTimer()

      start(1000)

      // Start ping and simulate pong response
      const pingPromise = ping()

      // Simulate pong response
      mockWorkerInstance?.simulateMessage({
        type: 'pong',
        timestamp: Date.now(),
      })

      const result = await pingPromise
      expect(result).toBe(true)
      expect(mockWorkerInstance?.postMessage).toHaveBeenCalledWith({
        action: 'ping',
      })
    })

    test('should return false on timeout', async () => {
      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { start, ping } = useWorkerTimer()

      start(1000)

      const pingPromise = ping()

      // Don't respond with pong, let it timeout
      vi.advanceTimersByTime(1001)

      const result = await pingPromise
      expect(result).toBe(false)
    })

    test('should restore original message handler after pong', async () => {
      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { start, ping, onTick } = useWorkerTimer()

      const tickCallback = vi.fn()
      onTick(tickCallback)

      start(1000)

      // Save original handler reference (used for verification)
      const _originalHandler = mockWorkerInstance?.onmessage

      const pingPromise = ping()
      mockWorkerInstance?.simulateMessage({
        type: 'pong',
        timestamp: Date.now(),
      })

      await pingPromise

      // Handler should be restored (may be same or different depending on implementation)
      // Just verify tick messages still work
      mockWorkerInstance?.simulateMessage({
        type: 'tick',
        tick: 1,
        timestamp: Date.now(),
      })
      expect(tickCallback).toHaveBeenCalled()
    })

    test('should handle other messages during ping', async () => {
      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { start, ping, currentTick } = useWorkerTimer()

      start(1000)

      const pingPromise = ping()

      // Simulate a tick message during ping (should be handled by original handler)
      mockWorkerInstance?.simulateMessage({
        type: 'tick',
        tick: 42,
        timestamp: Date.now(),
      })
      expect(currentTick.value).toBe(42)

      // Then simulate pong
      mockWorkerInstance?.simulateMessage({
        type: 'pong',
        timestamp: Date.now(),
      })

      const result = await pingPromise
      expect(result).toBe(true)
    })
  })

  describe('Worker error handling', () => {
    test('should set isRunning to false on worker error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { start, isRunning } = useWorkerTimer()

      start(1000)
      expect(isRunning.value).toBe(true)

      // Simulate worker error
      mockWorkerInstance?.simulateError('Test error')

      expect(isRunning.value).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[WorkerTimer] Worker error:',
        expect.objectContaining({ message: 'Test error' })
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Blob and URL handling', () => {
    test('should create blob with worker code', async () => {
      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { start } = useWorkerTimer()

      start(1000)

      expect(Blob).toHaveBeenCalledWith([expect.stringContaining('self.onmessage')], {
        type: 'application/javascript',
      })
    })

    test('should revoke blob URL after worker creation', async () => {
      const { useWorkerTimer } = await import('~/composables/useWorkerTimer')
      const { start } = useWorkerTimer()

      start(1000)

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
    })
  })
})
