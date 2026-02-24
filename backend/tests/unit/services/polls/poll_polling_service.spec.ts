import { test } from '@japa/runner'
import { PollPollingService } from '#services/polls/poll_polling_service'

/**
 * Unit tests for PollPollingService
 *
 * The service manages the polling lifecycle:
 * - stopPolling: Cleans all state for a given poll (timeouts, active flags, sentMessages)
 * - sendCancellationMessage: Broadcasts a cancellation message to all channel chat rooms
 * - setAggregationService: Registers the aggregation service to avoid circular deps
 * - setOnPollEndCallback: Registers the end callback to avoid circular deps
 * - mapTwitchStatusToLinkStatus (private): Maps Twitch API statuses to internal link statuses
 */

function createMockDependencies() {
  return {
    pollChannelLinkRepository: {
      findByPollInstance: async () => [],
      updateVotes: async () => {},
      updateStatus: async () => {},
    },
    twitchPollService: {
      withTokenRefresh: async () => ({}),
      getPoll: async () => ({}),
    },
    webSocketService: {
      emitPollStart: () => {},
      emitPollUpdate: async () => {},
      emitPollEnd: () => {},
    },
  }
}

// ========================================
// stopPolling
// ========================================

test.group('PollPollingService - stopPolling', () => {
  test('should remove poll from pollingActive set after stopPolling', async ({ assert }) => {
    const { pollChannelLinkRepository, twitchPollService, webSocketService } =
      createMockDependencies()

    const service = new PollPollingService(
      pollChannelLinkRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    // Manually add the poll to internal state via the private sets
    const pollId = 'poll-stop-001'
    ;(service as any).pollingActive.add(pollId)

    assert.isTrue((service as any).pollingActive.has(pollId))

    service.stopPolling(pollId)

    assert.isFalse((service as any).pollingActive.has(pollId))
  })

  test('should clear pending timeout when stopPolling is called', async ({ assert }) => {
    const { pollChannelLinkRepository, twitchPollService, webSocketService } =
      createMockDependencies()

    const service = new PollPollingService(
      pollChannelLinkRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    const pollId = 'poll-stop-002'

    // Simulate a pending timeout registered by the queue-based polling
    const fakeTimeout = setTimeout(() => {}, 60000)
    ;(service as any).pollingTimeouts.set(pollId, fakeTimeout)
    ;(service as any).pollingActive.add(pollId)

    service.stopPolling(pollId)

    assert.isFalse((service as any).pollingTimeouts.has(pollId))
    assert.isFalse((service as any).pollingActive.has(pollId))
  })

  test('should clean up sentMessages for the poll', async ({ assert }) => {
    const { pollChannelLinkRepository, twitchPollService, webSocketService } =
      createMockDependencies()

    const service = new PollPollingService(
      pollChannelLinkRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    const pollId = 'poll-stop-003'

    // Simulate previously sent messages for this poll
    const sentSet = new Set<string>(['poll-stop-003:30', 'poll-stop-003:10'])
    ;(service as any).sentMessages.set(pollId, sentSet)
    ;(service as any).pollingActive.add(pollId)

    assert.isTrue((service as any).sentMessages.has(pollId))

    service.stopPolling(pollId)

    assert.isFalse((service as any).sentMessages.has(pollId))
  })

  test('should remove cyclesInProgress entry when stopPolling is called', async ({ assert }) => {
    const { pollChannelLinkRepository, twitchPollService, webSocketService } =
      createMockDependencies()

    const service = new PollPollingService(
      pollChannelLinkRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    const pollId = 'poll-stop-004'
    ;(service as any).cyclesInProgress.add(pollId)
    ;(service as any).pollingActive.add(pollId)

    service.stopPolling(pollId)

    assert.isFalse((service as any).cyclesInProgress.has(pollId))
  })

  test('should be idempotent — calling stopPolling twice should not throw', async ({ assert }) => {
    const { pollChannelLinkRepository, twitchPollService, webSocketService } =
      createMockDependencies()

    const service = new PollPollingService(
      pollChannelLinkRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    const pollId = 'poll-stop-005'
    ;(service as any).pollingActive.add(pollId)

    // First call cleans up
    service.stopPolling(pollId)
    // Second call on an already-stopped poll must not throw
    assert.doesNotThrow(() => service.stopPolling(pollId))

    assert.isFalse((service as any).pollingActive.has(pollId))
  })

  test('should stop realtime broadcast interval when stopPolling is called', async ({ assert }) => {
    const { pollChannelLinkRepository, twitchPollService, webSocketService } =
      createMockDependencies()

    const service = new PollPollingService(
      pollChannelLinkRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    const pollId = 'poll-stop-006'

    // Simulate a running broadcast interval
    const fakeInterval = setInterval(() => {}, 1000)
    ;(service as any).broadcastIntervals.set(pollId, fakeInterval)
    ;(service as any).pollingActive.add(pollId)

    service.stopPolling(pollId)

    assert.isFalse((service as any).broadcastIntervals.has(pollId))
  })

  test('should not affect state of other polls when stopping one', async ({ assert }) => {
    const { pollChannelLinkRepository, twitchPollService, webSocketService } =
      createMockDependencies()

    const service = new PollPollingService(
      pollChannelLinkRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    const pollIdA = 'poll-stop-007-a'
    const pollIdB = 'poll-stop-007-b'

    ;(service as any).pollingActive.add(pollIdA)
    ;(service as any).pollingActive.add(pollIdB)

    service.stopPolling(pollIdA)

    assert.isFalse((service as any).pollingActive.has(pollIdA))
    assert.isTrue((service as any).pollingActive.has(pollIdB))
  })
})

// ========================================
// sendCancellationMessage
// ========================================

test.group('PollPollingService - sendCancellationMessage', () => {
  test('should call findByPollInstance with the given poll id', async ({ assert }) => {
    let capturedPollId = ''
    const mockRepository = {
      findByPollInstance: async (pollId: string) => {
        capturedPollId = pollId
        return []
      },
      updateVotes: async () => {},
      updateStatus: async () => {},
    }

    const { twitchPollService, webSocketService } = createMockDependencies()

    const service = new PollPollingService(
      mockRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    // Inject a no-op chat service so broadcastMessage does not reach the real lazy import
    ;(service as any).twitchChatService = { sendMessage: async () => {} }

    await service.sendCancellationMessage('poll-cancel-001')

    assert.equal(capturedPollId, 'poll-cancel-001')
  })

  test('should send cancellation message to each channel link', async ({ assert }) => {
    const sentMessages: Array<{ streamerId: string; message: string }> = []

    const mockRepository = {
      findByPollInstance: async () => [
        { streamerId: 'streamer-1' },
        { streamerId: 'streamer-2' },
        { streamerId: 'streamer-3' },
      ],
      updateVotes: async () => {},
      updateStatus: async () => {},
    }

    const { twitchPollService, webSocketService } = createMockDependencies()

    const service = new PollPollingService(
      mockRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    ;(service as any).twitchChatService = {
      sendMessage: async (streamerId: string, message: string) => {
        sentMessages.push({ streamerId, message })
      },
    }

    await service.sendCancellationMessage('poll-cancel-002')

    assert.lengthOf(sentMessages, 3)
    assert.equal(sentMessages[0].streamerId, 'streamer-1')
    assert.equal(sentMessages[1].streamerId, 'streamer-2')
    assert.equal(sentMessages[2].streamerId, 'streamer-3')
    assert.include(sentMessages[0].message, 'annulé')
  })

  test('should broadcast the exact French cancellation message', async ({ assert }) => {
    const sentMessages: string[] = []

    const mockRepository = {
      findByPollInstance: async () => [{ streamerId: 'streamer-1' }],
      updateVotes: async () => {},
      updateStatus: async () => {},
    }

    const { twitchPollService, webSocketService } = createMockDependencies()

    const service = new PollPollingService(
      mockRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    ;(service as any).twitchChatService = {
      sendMessage: async (_streamerId: string, message: string) => {
        sentMessages.push(message)
      },
    }

    await service.sendCancellationMessage('poll-cancel-003')

    assert.equal(sentMessages[0], '❌ Le sondage a été annulé par le MJ.')
  })

  test('should not throw when repository returns empty channel links', async ({ assert }) => {
    const mockRepository = {
      findByPollInstance: async () => [],
      updateVotes: async () => {},
      updateStatus: async () => {},
    }

    const { twitchPollService, webSocketService } = createMockDependencies()

    const service = new PollPollingService(
      mockRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    ;(service as any).twitchChatService = { sendMessage: async () => {} }

    await assert.doesNotReject(() => service.sendCancellationMessage('poll-cancel-004'))
  })

  test('should not propagate error when repository throws', async ({ assert }) => {
    const mockRepository = {
      findByPollInstance: async () => {
        throw new Error('DB connection lost')
      },
      updateVotes: async () => {},
      updateStatus: async () => {},
    }

    const { twitchPollService, webSocketService } = createMockDependencies()

    const service = new PollPollingService(
      mockRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    // The service catches errors internally and logs them
    await assert.doesNotReject(() => service.sendCancellationMessage('poll-cancel-005'))
  })

  test('should continue sending to other channels when one sendMessage fails', async ({
    assert,
  }) => {
    const successfulDeliveries: string[] = []

    const mockRepository = {
      findByPollInstance: async () => [
        { streamerId: 'streamer-ok-1' },
        { streamerId: 'streamer-fail' },
        { streamerId: 'streamer-ok-2' },
      ],
      updateVotes: async () => {},
      updateStatus: async () => {},
    }

    const { twitchPollService, webSocketService } = createMockDependencies()

    const service = new PollPollingService(
      mockRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    ;(service as any).twitchChatService = {
      sendMessage: async (streamerId: string, _message: string) => {
        if (streamerId === 'streamer-fail') {
          throw new Error('Chat service unavailable')
        }
        successfulDeliveries.push(streamerId)
      },
    }

    // broadcastMessage catches per-streamer errors, so the whole call must not throw
    await assert.doesNotReject(() => service.sendCancellationMessage('poll-cancel-006'))

    // Both healthy streamers must have received the message
    assert.include(successfulDeliveries, 'streamer-ok-1')
    assert.include(successfulDeliveries, 'streamer-ok-2')
    assert.notInclude(successfulDeliveries, 'streamer-fail')
  })
})

// ========================================
// setAggregationService / setOnPollEndCallback
// ========================================

test.group('PollPollingService - configuration methods', () => {
  test('setAggregationService should store the aggregation service reference', async ({
    assert,
  }) => {
    const { pollChannelLinkRepository, twitchPollService, webSocketService } =
      createMockDependencies()

    const service = new PollPollingService(
      pollChannelLinkRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    const mockAggregationService = {
      aggregateAndEmit: async (_pollInstanceId: string) => ({}),
    }

    assert.isUndefined((service as any).aggregationService)

    service.setAggregationService(mockAggregationService)

    assert.strictEqual((service as any).aggregationService, mockAggregationService)
  })

  test('setAggregationService should replace a previously set aggregation service', async ({
    assert,
  }) => {
    const { pollChannelLinkRepository, twitchPollService, webSocketService } =
      createMockDependencies()

    const service = new PollPollingService(
      pollChannelLinkRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    const firstService = { aggregateAndEmit: async () => ({}) }
    const secondService = { aggregateAndEmit: async () => ({}) }

    service.setAggregationService(firstService)
    service.setAggregationService(secondService)

    assert.strictEqual((service as any).aggregationService, secondService)
    assert.notStrictEqual((service as any).aggregationService, firstService)
  })

  test('setOnPollEndCallback should store the callback reference', async ({ assert }) => {
    const { pollChannelLinkRepository, twitchPollService, webSocketService } =
      createMockDependencies()

    const service = new PollPollingService(
      pollChannelLinkRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    const callback = async (_pollInstance: any) => {}

    assert.isUndefined((service as any).onPollEndCallback)

    service.setOnPollEndCallback(callback)

    assert.strictEqual((service as any).onPollEndCallback, callback)
  })

  test('setOnPollEndCallback should replace an existing callback', async ({ assert }) => {
    const { pollChannelLinkRepository, twitchPollService, webSocketService } =
      createMockDependencies()

    const service = new PollPollingService(
      pollChannelLinkRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    const firstCallback = async (_p: any) => {}
    const secondCallback = async (_p: any) => {}

    service.setOnPollEndCallback(firstCallback)
    service.setOnPollEndCallback(secondCallback)

    assert.strictEqual((service as any).onPollEndCallback, secondCallback)
    assert.notStrictEqual((service as any).onPollEndCallback, firstCallback)
  })
})

// ========================================
// mapTwitchStatusToLinkStatus (private, tested via the public surface)
// ========================================

test.group('PollPollingService - mapTwitchStatusToLinkStatus', () => {
  /**
   * The private method is accessed directly via (service as any) to keep the tests
   * focused and avoid the complexity of wiring up a full startPolling cycle.
   */

  function buildService() {
    const { pollChannelLinkRepository, twitchPollService, webSocketService } =
      createMockDependencies()

    const service = new PollPollingService(
      pollChannelLinkRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    const mapStatus = (twitchStatus: string) =>
      (service as any).mapTwitchStatusToLinkStatus(twitchStatus)

    return { service, mapStatus }
  }

  test("'ACTIVE' should map to 'RUNNING'", async ({ assert }) => {
    const { mapStatus } = buildService()
    assert.equal(mapStatus('ACTIVE'), 'RUNNING')
  })

  test("'COMPLETED' should map to 'COMPLETED'", async ({ assert }) => {
    const { mapStatus } = buildService()
    assert.equal(mapStatus('COMPLETED'), 'COMPLETED')
  })

  test("'ARCHIVED' should map to 'COMPLETED'", async ({ assert }) => {
    const { mapStatus } = buildService()
    assert.equal(mapStatus('ARCHIVED'), 'COMPLETED')
  })

  test("'TERMINATED' should map to 'TERMINATED'", async ({ assert }) => {
    const { mapStatus } = buildService()
    assert.equal(mapStatus('TERMINATED'), 'TERMINATED')
  })

  test("'MODERATED' should map to 'TERMINATED'", async ({ assert }) => {
    const { mapStatus } = buildService()
    assert.equal(mapStatus('MODERATED'), 'TERMINATED')
  })

  test("'INVALID' should map to 'TERMINATED'", async ({ assert }) => {
    const { mapStatus } = buildService()
    assert.equal(mapStatus('INVALID'), 'TERMINATED')
  })

  test("an unknown status should fall back to 'CREATED'", async ({ assert }) => {
    const { mapStatus } = buildService()
    assert.equal(mapStatus('UNKNOWN_STATUS'), 'CREATED')
  })

  test("an empty string status should fall back to 'CREATED'", async ({ assert }) => {
    const { mapStatus } = buildService()
    assert.equal(mapStatus(''), 'CREATED')
  })

  test('all terminal Twitch statuses map to TERMINATED', async ({ assert }) => {
    const { mapStatus } = buildService()
    const terminalStatuses = ['TERMINATED', 'MODERATED', 'INVALID']
    for (const status of terminalStatuses) {
      assert.equal(mapStatus(status), 'TERMINATED', `Expected TERMINATED for status ${status}`)
    }
  })
})

// ========================================
// Constructor / initialization
// ========================================

test.group('PollPollingService - constructor and initial state', () => {
  test('should initialize with empty pollingActive set', async ({ assert }) => {
    const { pollChannelLinkRepository, twitchPollService, webSocketService } =
      createMockDependencies()

    const service = new PollPollingService(
      pollChannelLinkRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    assert.equal((service as any).pollingActive.size, 0)
  })

  test('should initialize with empty pollingTimeouts map', async ({ assert }) => {
    const { pollChannelLinkRepository, twitchPollService, webSocketService } =
      createMockDependencies()

    const service = new PollPollingService(
      pollChannelLinkRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    assert.equal((service as any).pollingTimeouts.size, 0)
  })

  test('should initialize with empty sentMessages map', async ({ assert }) => {
    const { pollChannelLinkRepository, twitchPollService, webSocketService } =
      createMockDependencies()

    const service = new PollPollingService(
      pollChannelLinkRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    assert.equal((service as any).sentMessages.size, 0)
  })

  test('should initialize with no aggregation service set', async ({ assert }) => {
    const { pollChannelLinkRepository, twitchPollService, webSocketService } =
      createMockDependencies()

    const service = new PollPollingService(
      pollChannelLinkRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    assert.isUndefined((service as any).aggregationService)
  })

  test('should assign a unique instance id on construction', async ({ assert }) => {
    const { pollChannelLinkRepository, twitchPollService, webSocketService } =
      createMockDependencies()

    const serviceA = new PollPollingService(
      pollChannelLinkRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    const serviceB = new PollPollingService(
      pollChannelLinkRepository as any,
      twitchPollService as any,
      webSocketService as any
    )

    assert.isString((serviceA as any).instanceId)
    assert.isString((serviceB as any).instanceId)
    assert.notEqual((serviceA as any).instanceId, (serviceB as any).instanceId)
  })
})
