/* eslint-disable @typescript-eslint/no-this-alias */
// Tests need to capture 'this' from mock constructors to simulate EventSource behavior
import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest'
import { useWebSocket } from '~/composables/useWebSocket'

/* eslint-disable @typescript-eslint/naming-convention */
// Mock EventSource - static properties match browser API naming
class MockEventSource {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 2

  url: string
  readyState: number = MockEventSource.CONNECTING
  private eventListeners: Map<string, ((event: unknown) => void)[]> = new Map()

  constructor(url: string) {
    this.url = url
  }

  addEventListener(event: string, handler: (event: unknown) => void) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(handler)
  }

  removeEventListener(event: string, handler: (event: unknown) => void) {
    const handlers = this.eventListeners.get(event)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index !== -1) {
        handlers.splice(index, 1)
      }
    }
  }

  close() {
    this.readyState = MockEventSource.CLOSED
    this.dispatchEvent('error', {})
  }

  // Helper to simulate events
  dispatchEvent(eventType: string, eventData: unknown) {
    const handlers = this.eventListeners.get(eventType)
    if (handlers) {
      handlers.forEach((handler) => handler(eventData))
    }
  }

  // Helper to simulate opening connection
  simulateOpen() {
    this.readyState = MockEventSource.OPEN
    this.dispatchEvent('open', {})
  }

  // Helper to simulate receiving message
  simulateMessage(data: string) {
    this.dispatchEvent('message', { data })
  }
}

/* eslint-enable @typescript-eslint/naming-convention */

global.EventSource = MockEventSource as unknown as typeof EventSource

// Mock fetch globally
global.fetch = vi.fn()

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'mock-uuid-123'),
  },
  writable: true,
})

describe('useWebSocket Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useRuntimeConfig
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: 'http://localhost:3333/api/v2',
      },
    } as ReturnType<typeof useRuntimeConfig>)

    // Mock successful subscribe/unsubscribe responses
    vi.mocked(fetch).mockImplementation(async (url) => {
      if (
        typeof url === 'string' &&
        (url.includes('/__transmit/subscribe') || url.includes('/__transmit/unsubscribe'))
      ) {
        return {
          ok: true,
          status: 200,
          text: async () => 'OK',
        } as Response
      }
      return {
        ok: false,
        status: 404,
      } as Response
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  test('should initialize with disconnected state', () => {
    const { connected } = useWebSocket()

    expect(connected.value).toBe(false)
  })

  test('connect() should initialize SSE client', () => {
    const { connect, connected } = useWebSocket()

    connect()

    expect(connected.value).toBe(true)
  })

  test('connect() should not create duplicate clients', () => {
    const { connect, connected } = useWebSocket()

    connect()
    expect(connected.value).toBe(true)

    // Second call should not throw and client should remain connected
    connect()
    expect(connected.value).toBe(true)
  })

  test('subscribeToPoll() should create SSE connection', async () => {
    const { subscribeToPoll } = useWebSocket()

    const mockEventSourceConstructor = vi.fn((url: string) => new MockEventSource(url))
    global.EventSource = mockEventSourceConstructor as unknown as typeof EventSource

    subscribeToPoll('poll-123', {
      onStart: vi.fn(),
      onUpdate: vi.fn(),
      onEnd: vi.fn(),
    })

    // Wait for async initialization
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(mockEventSourceConstructor).toHaveBeenCalledWith(
      'http://localhost:3333/api/v2/__transmit/events?uid=mock-uuid-123',
      { withCredentials: true }
    )
  })

  test('subscribeToPoll() should subscribe to correct channel', async () => {
    const { subscribeToPoll } = useWebSocket()

    let eventSourceInstance: MockEventSource
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url)
        eventSourceInstance = this
      }
    } as unknown as typeof EventSource

    subscribeToPoll('poll-456', {
      onUpdate: vi.fn(),
    })

    // Wait for EventSource to be created
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Simulate connection opened to trigger subscribe
    eventSourceInstance!.simulateOpen()

    // Wait for async subscribe call
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3333/api/v2/__transmit/subscribe',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          uid: 'mock-uuid-123',
          channel: 'poll:poll-456',
        }),
      })
    )
  })

  test('subscribeToPoll() should handle poll:start events', async () => {
    const { subscribeToPoll } = useWebSocket()

    const onStart = vi.fn()
    const onUpdate = vi.fn()
    const onEnd = vi.fn()

    // Track the EventSource instance
    let eventSourceInstance: MockEventSource
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url)
        eventSourceInstance = this
      }
    } as unknown as typeof EventSource

    subscribeToPoll('poll-789', {
      onStart,
      onUpdate,
      onEnd,
    })

    // Wait for EventSource to be created
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Simulate connection opened
    eventSourceInstance!.simulateOpen()

    // Wait for subscription to complete
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Simulate receiving poll:start event
    const startData = {
      pollInstanceId: 'poll-789',
      question: 'Test Question?',
      options: ['Option 1', 'Option 2'],
      durationSeconds: 60,
    }

    eventSourceInstance!.simulateMessage(
      JSON.stringify({
        channel: 'poll:poll-789',
        payload: {
          event: 'poll:start',
          data: startData,
        },
      })
    )

    expect(onStart).toHaveBeenCalledWith(startData)
    expect(onUpdate).not.toHaveBeenCalled()
    expect(onEnd).not.toHaveBeenCalled()
  })

  test('subscribeToPoll() should handle poll:update events', async () => {
    const { subscribeToPoll } = useWebSocket()

    const onUpdate = vi.fn()

    let eventSourceInstance: MockEventSource
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url)
        eventSourceInstance = this
      }
    } as unknown as typeof EventSource

    subscribeToPoll('poll-update-1', {
      onUpdate,
    })

    await new Promise((resolve) => setTimeout(resolve, 10))
    eventSourceInstance!.simulateOpen()
    await new Promise((resolve) => setTimeout(resolve, 10))

    const updateData = {
      pollInstanceId: 'poll-update-1',
      votesByOption: { '0': 10, '1': 5 },
      totalVotes: 15,
      percentages: { '0': 66.67, '1': 33.33 },
    }

    eventSourceInstance!.simulateMessage(
      JSON.stringify({
        channel: 'poll:poll-update-1',
        payload: {
          event: 'poll:update',
          data: updateData,
        },
      })
    )

    expect(onUpdate).toHaveBeenCalledWith(updateData)
  })

  test('subscribeToPoll() should handle poll:end events', async () => {
    const { subscribeToPoll } = useWebSocket()

    const onEnd = vi.fn()

    let eventSourceInstance: MockEventSource
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url)
        eventSourceInstance = this
      }
    } as unknown as typeof EventSource

    subscribeToPoll('poll-end-1', {
      onEnd,
    })

    await new Promise((resolve) => setTimeout(resolve, 10))
    eventSourceInstance!.simulateOpen()
    await new Promise((resolve) => setTimeout(resolve, 10))

    const endData = {
      pollInstanceId: 'poll-end-1',
      finalVotes: { '0': 20, '1': 15 },
      totalVotes: 35,
      percentages: { '0': 57.14, '1': 42.86 },
      winnerIndex: 0,
    }

    eventSourceInstance!.simulateMessage(
      JSON.stringify({
        channel: 'poll:poll-end-1',
        payload: {
          event: 'poll:end',
          data: endData,
        },
      })
    )

    expect(onEnd).toHaveBeenCalledWith(endData)
  })

  test('subscribeToPoll() should filter messages by channel', async () => {
    const { subscribeToPoll } = useWebSocket()

    const onUpdate = vi.fn()

    let eventSourceInstance: MockEventSource
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url)
        eventSourceInstance = this
      }
    } as unknown as typeof EventSource

    subscribeToPoll('poll-channel-1', {
      onUpdate,
    })

    await new Promise((resolve) => setTimeout(resolve, 10))
    eventSourceInstance!.simulateOpen()

    // Send message for different channel
    eventSourceInstance!.simulateMessage(
      JSON.stringify({
        channel: 'poll:poll-channel-2', // Different channel
        payload: {
          event: 'poll:update',
          data: { pollInstanceId: 'poll-channel-2' },
        },
      })
    )

    expect(onUpdate).not.toHaveBeenCalled()
  })

  test('subscribeToPoll() cleanup function should unsubscribe', async () => {
    const { subscribeToPoll } = useWebSocket()

    const cleanup = subscribeToPoll('poll-cleanup-1', {
      onUpdate: vi.fn(),
    })

    await new Promise((resolve) => setTimeout(resolve, 10))

    // Clear previous fetch calls
    vi.clearAllMocks()

    // Call cleanup
    await cleanup()

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3333/api/v2/__transmit/unsubscribe',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          uid: 'mock-uuid-123',
          channel: 'poll:poll-cleanup-1',
        }),
      })
    )
  })

  test('subscribeToStreamerPolls() should subscribe to streamer channel', async () => {
    const { subscribeToStreamerPolls } = useWebSocket()

    let eventSourceInstance: MockEventSource
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url)
        eventSourceInstance = this
      }
    } as unknown as typeof EventSource

    subscribeToStreamerPolls('streamer-123', {
      onPollStart: vi.fn(),
      onPollEnd: vi.fn(),
    })

    await new Promise((resolve) => setTimeout(resolve, 10))
    eventSourceInstance!.simulateOpen()
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3333/api/v2/__transmit/subscribe',
      expect.objectContaining({
        body: JSON.stringify({
          uid: 'mock-uuid-123',
          channel: 'streamer:streamer-123:polls',
        }),
      })
    )
  })

  test('subscribeToStreamerPolls() should handle poll:start events', async () => {
    const { subscribeToStreamerPolls } = useWebSocket()

    const onPollStart = vi.fn()

    let eventSourceInstance: MockEventSource
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url)
        eventSourceInstance = this
      }
    } as unknown as typeof EventSource

    subscribeToStreamerPolls('streamer-456', {
      onPollStart,
    })

    await new Promise((resolve) => setTimeout(resolve, 10))
    eventSourceInstance!.simulateOpen()
    await new Promise((resolve) => setTimeout(resolve, 10))

    const startData = {
      pollInstanceId: 'poll-789',
      question: 'Streamer Poll?',
      options: ['A', 'B'],
      durationSeconds: 30,
    }

    eventSourceInstance!.simulateMessage(
      JSON.stringify({
        channel: 'streamer:streamer-456:polls',
        payload: {
          event: 'poll:start',
          data: startData,
        },
      })
    )

    expect(onPollStart).toHaveBeenCalledWith(startData)
  })

  test('subscribeToStreamerPolls() should handle streamer:joined-campaign events', async () => {
    const { subscribeToStreamerPolls } = useWebSocket()

    const onJoinedCampaign = vi.fn()

    let eventSourceInstance: MockEventSource
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url)
        eventSourceInstance = this
      }
    } as unknown as typeof EventSource

    subscribeToStreamerPolls('streamer-789', {
      onJoinedCampaign,
    })

    await new Promise((resolve) => setTimeout(resolve, 10))
    eventSourceInstance!.simulateOpen()
    await new Promise((resolve) => setTimeout(resolve, 10))

    eventSourceInstance!.simulateMessage(
      JSON.stringify({
        channel: 'streamer:streamer-789:polls',
        payload: {
          event: 'streamer:joined-campaign',
          data: { campaign_id: 'campaign-abc' },
        },
      })
    )

    expect(onJoinedCampaign).toHaveBeenCalledWith({
      campaign_id: 'campaign-abc',
    })
  })

  test('disconnect() should close SSE connection', () => {
    const { connect, disconnect, connected } = useWebSocket()

    connect()
    expect(connected.value).toBe(true)

    disconnect()
    expect(connected.value).toBe(false)
  })

  test('should handle malformed SSE messages gracefully', async () => {
    const { subscribeToPoll } = useWebSocket()

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    let eventSourceInstance: MockEventSource
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url)
        eventSourceInstance = this
      }
    } as unknown as typeof EventSource

    subscribeToPoll('poll-malformed', {
      onUpdate: vi.fn(),
    })

    await new Promise((resolve) => setTimeout(resolve, 10))
    eventSourceInstance!.simulateOpen()

    // Send malformed JSON
    eventSourceInstance!.simulateMessage('{ invalid json')

    // Logger now uses format: "[WebSocket]", "message:", error, data
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[WebSocket]',
      'Failed to parse SSE message:',
      expect.any(SyntaxError),
      '{ invalid json'
    )

    consoleErrorSpy.mockRestore()
  })

  test('should handle subscribe API errors', async () => {
    const { subscribeToPoll } = useWebSocket()

    let eventSourceInstance: MockEventSource
    global.EventSource = class extends MockEventSource {
      constructor(url: string) {
        super(url)
        eventSourceInstance = this
      }
    } as unknown as typeof EventSource

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock failed subscribe response
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as Response)

    subscribeToPoll('poll-error', {
      onUpdate: vi.fn(),
    })

    await new Promise((resolve) => setTimeout(resolve, 10))
    eventSourceInstance!.simulateOpen()

    // Wait for subscribe call and error
    await new Promise((resolve) => setTimeout(resolve, 20))

    // Logger now uses format: "[WebSocket]", "message:", ...args
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[WebSocket]',
      expect.stringContaining('Failed to subscribe'),
      expect.anything()
    )

    consoleErrorSpy.mockRestore()
  })

  describe('subscribeToCampaignReadiness', () => {
    test('should subscribe to readiness channel', async () => {
      const { subscribeToCampaignReadiness } = useWebSocket()

      let eventSourceInstance: MockEventSource
      global.EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url)
          eventSourceInstance = this
        }
      } as unknown as typeof EventSource

      subscribeToCampaignReadiness('campaign-123', {
        onStreamerReady: vi.fn(),
        onStreamerNotReady: vi.fn(),
      })

      await new Promise((resolve) => setTimeout(resolve, 10))
      eventSourceInstance!.simulateOpen()
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/__transmit/subscribe',
        expect.objectContaining({
          body: JSON.stringify({
            uid: 'mock-uuid-123',
            channel: 'campaign:campaign-123:readiness',
          }),
        })
      )
    })

    test('should handle streamer:ready events', async () => {
      const { subscribeToCampaignReadiness } = useWebSocket()

      const onStreamerReady = vi.fn()

      let eventSourceInstance: MockEventSource
      global.EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url)
          eventSourceInstance = this
        }
      } as unknown as typeof EventSource

      subscribeToCampaignReadiness('campaign-ready-1', {
        onStreamerReady,
      })

      await new Promise((resolve) => setTimeout(resolve, 10))
      eventSourceInstance!.simulateOpen()
      await new Promise((resolve) => setTimeout(resolve, 10))

      const readyData = {
        streamerId: 'streamer-123',
        displayName: 'TestStreamer',
        isReady: true,
      }

      eventSourceInstance!.simulateMessage(
        JSON.stringify({
          channel: 'campaign:campaign-ready-1:readiness',
          payload: {
            event: 'streamer:ready',
            data: readyData,
          },
        })
      )

      expect(onStreamerReady).toHaveBeenCalledWith(readyData)
    })

    test('should handle streamer:not-ready events', async () => {
      const { subscribeToCampaignReadiness } = useWebSocket()

      const onStreamerNotReady = vi.fn()

      let eventSourceInstance: MockEventSource
      global.EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url)
          eventSourceInstance = this
        }
      } as unknown as typeof EventSource

      subscribeToCampaignReadiness('campaign-not-ready-1', {
        onStreamerNotReady,
      })

      await new Promise((resolve) => setTimeout(resolve, 10))
      eventSourceInstance!.simulateOpen()
      await new Promise((resolve) => setTimeout(resolve, 10))

      const notReadyData = {
        streamerId: 'streamer-456',
        displayName: 'AnotherStreamer',
        isReady: false,
      }

      eventSourceInstance!.simulateMessage(
        JSON.stringify({
          channel: 'campaign:campaign-not-ready-1:readiness',
          payload: {
            event: 'streamer:not-ready',
            data: notReadyData,
          },
        })
      )

      expect(onStreamerNotReady).toHaveBeenCalledWith(notReadyData)
    })
  })

  describe('subscribeToStreamerPolls - additional events', () => {
    test('should handle streamer:left-campaign events', async () => {
      const { subscribeToStreamerPolls } = useWebSocket()

      const onLeftCampaign = vi.fn()

      let eventSourceInstance: MockEventSource
      global.EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url)
          eventSourceInstance = this
        }
      } as unknown as typeof EventSource

      subscribeToStreamerPolls('streamer-left-1', {
        onLeftCampaign,
      })

      await new Promise((resolve) => setTimeout(resolve, 10))
      eventSourceInstance!.simulateOpen()
      await new Promise((resolve) => setTimeout(resolve, 10))

      eventSourceInstance!.simulateMessage(
        JSON.stringify({
          channel: 'streamer:streamer-left-1:polls',
          payload: {
            event: 'streamer:left-campaign',
            data: { campaign_id: 'campaign-xyz' },
          },
        })
      )

      expect(onLeftCampaign).toHaveBeenCalledWith({
        campaign_id: 'campaign-xyz',
      })
    })

    test('should handle poll:update events', async () => {
      const { subscribeToStreamerPolls } = useWebSocket()

      const onPollUpdate = vi.fn()

      let eventSourceInstance: MockEventSource
      global.EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url)
          eventSourceInstance = this
        }
      } as unknown as typeof EventSource

      subscribeToStreamerPolls('streamer-update-1', {
        onPollUpdate,
      })

      await new Promise((resolve) => setTimeout(resolve, 10))
      eventSourceInstance!.simulateOpen()
      await new Promise((resolve) => setTimeout(resolve, 10))

      const updateData = {
        pollInstanceId: 'poll-abc',
        votesByOption: { '0': 5 },
        totalVotes: 5,
      }

      eventSourceInstance!.simulateMessage(
        JSON.stringify({
          channel: 'streamer:streamer-update-1:polls',
          payload: {
            event: 'poll:update',
            data: updateData,
          },
        })
      )

      expect(onPollUpdate).toHaveBeenCalledWith(updateData)
    })

    test('should handle poll:end events', async () => {
      const { subscribeToStreamerPolls } = useWebSocket()

      const onPollEnd = vi.fn()

      let eventSourceInstance: MockEventSource
      global.EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url)
          eventSourceInstance = this
        }
      } as unknown as typeof EventSource

      subscribeToStreamerPolls('streamer-end-1', {
        onPollEnd,
      })

      await new Promise((resolve) => setTimeout(resolve, 10))
      eventSourceInstance!.simulateOpen()
      await new Promise((resolve) => setTimeout(resolve, 10))

      const endData = {
        pollInstanceId: 'poll-ended',
        finalVotes: { '0': 10 },
        totalVotes: 10,
      }

      eventSourceInstance!.simulateMessage(
        JSON.stringify({
          channel: 'streamer:streamer-end-1:polls',
          payload: {
            event: 'poll:end',
            data: endData,
          },
        })
      )

      expect(onPollEnd).toHaveBeenCalledWith(endData)
    })

    test('should handle preview:command events', async () => {
      const { subscribeToStreamerPolls } = useWebSocket()

      const onPreviewCommand = vi.fn()

      let eventSourceInstance: MockEventSource
      global.EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url)
          eventSourceInstance = this
        }
      } as unknown as typeof EventSource

      subscribeToStreamerPolls('streamer-preview-1', {
        onPreviewCommand,
      })

      await new Promise((resolve) => setTimeout(resolve, 10))
      eventSourceInstance!.simulateOpen()
      await new Promise((resolve) => setTimeout(resolve, 10))

      const previewData = {
        command: 'overlay:show',
        params: { elementId: 'test' },
      }

      eventSourceInstance!.simulateMessage(
        JSON.stringify({
          channel: 'streamer:streamer-preview-1:polls',
          payload: {
            event: 'preview:command',
            data: previewData,
          },
        })
      )

      expect(onPreviewCommand).toHaveBeenCalledWith(previewData)
    })

    test('should handle dice-roll:new events', async () => {
      const { subscribeToStreamerPolls } = useWebSocket()

      const onDiceRoll = vi.fn()

      let eventSourceInstance: MockEventSource
      global.EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url)
          eventSourceInstance = this
        }
      } as unknown as typeof EventSource

      subscribeToStreamerPolls('streamer-dice-1', {
        onDiceRoll,
      })

      await new Promise((resolve) => setTimeout(resolve, 10))
      eventSourceInstance!.simulateOpen()
      await new Promise((resolve) => setTimeout(resolve, 10))

      const diceData = {
        formula: '2d6+3',
        result: 12,
        rolls: [4, 5],
      }

      eventSourceInstance!.simulateMessage(
        JSON.stringify({
          channel: 'streamer:streamer-dice-1:polls',
          payload: {
            event: 'dice-roll:new',
            data: diceData,
          },
        })
      )

      expect(onDiceRoll).toHaveBeenCalledWith(diceData)
    })

    test('should handle dice-roll:critical events', async () => {
      const { subscribeToStreamerPolls } = useWebSocket()

      const onDiceRollCritical = vi.fn()

      let eventSourceInstance: MockEventSource
      global.EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url)
          eventSourceInstance = this
        }
      } as unknown as typeof EventSource

      subscribeToStreamerPolls('streamer-crit-1', {
        onDiceRollCritical,
      })

      await new Promise((resolve) => setTimeout(resolve, 10))
      eventSourceInstance!.simulateOpen()
      await new Promise((resolve) => setTimeout(resolve, 10))

      const critData = {
        formula: '1d20',
        result: 20,
        rolls: [20],
        isCritical: true,
      }

      eventSourceInstance!.simulateMessage(
        JSON.stringify({
          channel: 'streamer:streamer-crit-1:polls',
          payload: {
            event: 'dice-roll:critical',
            data: critData,
          },
        })
      )

      expect(onDiceRollCritical).toHaveBeenCalledWith(critData)
    })

    test('should handle gamification:start events', async () => {
      const { subscribeToStreamerPolls } = useWebSocket()

      const onGamificationStart = vi.fn()

      let eventSourceInstance: MockEventSource
      global.EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url)
          eventSourceInstance = this
        }
      } as unknown as typeof EventSource

      subscribeToStreamerPolls('streamer-gam-1', {
        onGamificationStart,
      })

      await new Promise((resolve) => setTimeout(resolve, 10))
      eventSourceInstance!.simulateOpen()
      await new Promise((resolve) => setTimeout(resolve, 10))

      const gamificationData = {
        instanceId: 'gam-123',
        templateId: 'template-1',
        type: 'collective_goal',
      }

      eventSourceInstance!.simulateMessage(
        JSON.stringify({
          channel: 'streamer:streamer-gam-1:polls',
          payload: {
            event: 'gamification:start',
            data: gamificationData,
          },
        })
      )

      expect(onGamificationStart).toHaveBeenCalledWith(gamificationData)
    })

    test('should handle gamification:progress events', async () => {
      const { subscribeToStreamerPolls } = useWebSocket()

      const onGamificationProgress = vi.fn()

      let eventSourceInstance: MockEventSource
      global.EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url)
          eventSourceInstance = this
        }
      } as unknown as typeof EventSource

      subscribeToStreamerPolls('streamer-gam-2', {
        onGamificationProgress,
      })

      await new Promise((resolve) => setTimeout(resolve, 10))
      eventSourceInstance!.simulateOpen()
      await new Promise((resolve) => setTimeout(resolve, 10))

      const progressData = {
        instanceId: 'gam-123',
        currentValue: 50,
        targetValue: 100,
        percentage: 50,
      }

      eventSourceInstance!.simulateMessage(
        JSON.stringify({
          channel: 'streamer:streamer-gam-2:polls',
          payload: {
            event: 'gamification:progress',
            data: progressData,
          },
        })
      )

      expect(onGamificationProgress).toHaveBeenCalledWith(progressData)
    })

    test('should handle gamification:complete events', async () => {
      const { subscribeToStreamerPolls } = useWebSocket()

      const onGamificationComplete = vi.fn()

      let eventSourceInstance: MockEventSource
      global.EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url)
          eventSourceInstance = this
        }
      } as unknown as typeof EventSource

      subscribeToStreamerPolls('streamer-gam-3', {
        onGamificationComplete,
      })

      await new Promise((resolve) => setTimeout(resolve, 10))
      eventSourceInstance!.simulateOpen()
      await new Promise((resolve) => setTimeout(resolve, 10))

      const completeData = {
        instanceId: 'gam-123',
        success: true,
        reward: 'Achievement unlocked',
      }

      eventSourceInstance!.simulateMessage(
        JSON.stringify({
          channel: 'streamer:streamer-gam-3:polls',
          payload: {
            event: 'gamification:complete',
            data: completeData,
          },
        })
      )

      expect(onGamificationComplete).toHaveBeenCalledWith(completeData)
    })

    test('should handle gamification:expired events', async () => {
      const { subscribeToStreamerPolls } = useWebSocket()

      const onGamificationExpired = vi.fn()

      let eventSourceInstance: MockEventSource
      global.EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url)
          eventSourceInstance = this
        }
      } as unknown as typeof EventSource

      subscribeToStreamerPolls('streamer-gam-4', {
        onGamificationExpired,
      })

      await new Promise((resolve) => setTimeout(resolve, 10))
      eventSourceInstance!.simulateOpen()
      await new Promise((resolve) => setTimeout(resolve, 10))

      const expiredData = {
        instanceId: 'gam-123',
      }

      eventSourceInstance!.simulateMessage(
        JSON.stringify({
          channel: 'streamer:streamer-gam-4:polls',
          payload: {
            event: 'gamification:expired',
            data: expiredData,
          },
        })
      )

      expect(onGamificationExpired).toHaveBeenCalledWith(expiredData)
    })

    test('should handle gamification:action_executed events', async () => {
      const { subscribeToStreamerPolls } = useWebSocket()

      const onGamificationActionExecuted = vi.fn()

      let eventSourceInstance: MockEventSource
      global.EventSource = class extends MockEventSource {
        constructor(url: string) {
          super(url)
          eventSourceInstance = this
        }
      } as unknown as typeof EventSource

      subscribeToStreamerPolls('streamer-gam-5', {
        onGamificationActionExecuted,
      })

      await new Promise((resolve) => setTimeout(resolve, 10))
      eventSourceInstance!.simulateOpen()
      await new Promise((resolve) => setTimeout(resolve, 10))

      const actionData = {
        instanceId: 'gam-123',
        actionType: 'reward',
        actionData: { points: 100 },
      }

      eventSourceInstance!.simulateMessage(
        JSON.stringify({
          channel: 'streamer:streamer-gam-5:polls',
          payload: {
            event: 'gamification:action_executed',
            data: actionData,
          },
        })
      )

      expect(onGamificationActionExecuted).toHaveBeenCalledWith(actionData)
    })
  })

  describe('connection state', () => {
    test('getConnectionState should return disconnected state when no client', () => {
      const { getConnectionState } = useWebSocket()

      const state = getConnectionState()

      expect(state).toEqual({
        connected: false,
        reconnecting: false,
        attempts: 0,
      })
    })

    test('reconnecting and reconnectAttempts refs should be accessible', () => {
      const { reconnecting, reconnectAttempts } = useWebSocket()

      expect(reconnecting.value).toBe(false)
      expect(reconnectAttempts.value).toBe(0)
    })
  })

  describe('forceReconnect', () => {
    test('should do nothing when no client exists', async () => {
      const { forceReconnect, connected } = useWebSocket()

      // Should not throw
      await forceReconnect()

      expect(connected.value).toBe(false)
    })
  })
})
