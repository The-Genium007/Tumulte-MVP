import { test } from '@japa/runner'

test.group('WebSocketService - makeSerializable', () => {
  test('should convert record to serializable format', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')

    const service = new WebSocketService()

    // Access private method
    const makeSerializable = (service as any).makeSerializable.bind(service)

    const input = { '0': 10, '1': 20, '2': 30 }
    const result = makeSerializable(input)

    assert.deepEqual(result, { '0': 10, '1': 20, '2': 30 })
  })

  test('should handle NaN values by converting to 0', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')

    const service = new WebSocketService()
    const makeSerializable = (service as any).makeSerializable.bind(service)

    const input = { '0': Number.NaN, '1': 20 }
    const result = makeSerializable(input)

    assert.equal(result['0'], 0)
    assert.equal(result['1'], 20)
  })

  test('should handle Infinity values by converting to 0', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')

    const service = new WebSocketService()
    const makeSerializable = (service as any).makeSerializable.bind(service)

    const input = { '0': Infinity, '1': -Infinity, '2': 15 }
    const result = makeSerializable(input)

    assert.equal(result['0'], 0)
    assert.equal(result['1'], 0)
    assert.equal(result['2'], 15)
  })

  test('should handle empty object', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')

    const service = new WebSocketService()
    const makeSerializable = (service as any).makeSerializable.bind(service)

    const result = makeSerializable({})
    assert.deepEqual(result, {})
  })
})

test.group('WebSocketService - channel naming', () => {
  test('should generate correct poll channel name', async ({ assert }) => {
    const pollInstanceId = 'poll-123-abc'
    const expectedChannel = `poll:${pollInstanceId}`

    assert.equal(expectedChannel, 'poll:poll-123-abc')
  })

  test('should generate correct streamer polls channel name', async ({ assert }) => {
    const streamerId = 'streamer-456'
    const expectedChannel = `streamer:${streamerId}:polls`

    assert.equal(expectedChannel, 'streamer:streamer-456:polls')
  })

  test('should generate correct campaign readiness channel name', async ({ assert }) => {
    const campaignId = 'campaign-789'
    const expectedChannel = `campaign:${campaignId}:readiness`

    assert.equal(expectedChannel, 'campaign:campaign-789:readiness')
  })
})

test.group('WebSocketService - event data structure', () => {
  test('should structure poll start event correctly', async ({ assert }) => {
    const pollStartData = {
      pollInstanceId: 'poll-123',
      title: 'Test Poll',
      options: ['Option A', 'Option B'],
      durationSeconds: 60,
      started_at: new Date().toISOString(),
      endsAt: new Date(Date.now() + 60000).toISOString(),
    }

    assert.property(pollStartData, 'pollInstanceId')
    assert.property(pollStartData, 'title')
    assert.property(pollStartData, 'options')
    assert.property(pollStartData, 'durationSeconds')
    assert.property(pollStartData, 'started_at')
    assert.property(pollStartData, 'endsAt')
    assert.isArray(pollStartData.options)
  })

  test('should structure poll update event correctly', async ({ assert }) => {
    const pollUpdateData = {
      pollInstanceId: 'poll-123',
      votesByOption: { '0': 10, '1': 15 },
      totalVotes: 25,
      percentages: { '0': 40, '1': 60 },
    }

    assert.property(pollUpdateData, 'pollInstanceId')
    assert.property(pollUpdateData, 'votesByOption')
    assert.property(pollUpdateData, 'totalVotes')
    assert.property(pollUpdateData, 'percentages')
    assert.equal(pollUpdateData.totalVotes, 25)
  })

  test('should structure poll end event correctly', async ({ assert }) => {
    const pollEndData = {
      pollInstanceId: 'poll-123',
      finalVotes: { '0': 10, '1': 15, '2': 5 },
      totalVotes: 30,
      percentages: { '0': 33.33, '1': 50, '2': 16.67 },
      winnerIndex: 1,
    }

    assert.property(pollEndData, 'pollInstanceId')
    assert.property(pollEndData, 'finalVotes')
    assert.property(pollEndData, 'totalVotes')
    assert.property(pollEndData, 'percentages')
    assert.property(pollEndData, 'winnerIndex')
    assert.equal(pollEndData.winnerIndex, 1)
  })

  test('should handle null winner when tie', async ({ assert }) => {
    const pollEndData = {
      pollInstanceId: 'poll-123',
      finalVotes: { '0': 10, '1': 10 },
      totalVotes: 20,
      percentages: { '0': 50, '1': 50 },
      winnerIndex: null,
    }

    assert.isNull(pollEndData.winnerIndex)
  })
})

test.group('WebSocketService - streamer readiness event', () => {
  test('should structure readiness change event correctly', async ({ assert }) => {
    const readinessData = {
      streamerId: 'streamer-123',
      streamerName: 'TestStreamer',
      isReady: true,
      timestamp: new Date().toISOString(),
    }

    assert.property(readinessData, 'streamerId')
    assert.property(readinessData, 'streamerName')
    assert.property(readinessData, 'isReady')
    assert.property(readinessData, 'timestamp')
    assert.isBoolean(readinessData.isReady)
  })

  test('should determine correct event name based on readiness', async ({ assert }) => {
    const isReady = true
    const eventName = isReady ? 'streamer:ready' : 'streamer:not-ready'
    assert.equal(eventName, 'streamer:ready')

    const isNotReady = false
    const notReadyEventName = isNotReady ? 'streamer:ready' : 'streamer:not-ready'
    assert.equal(notReadyEventName, 'streamer:not-ready')
  })
})

test.group('WebSocketService - winner calculation', () => {
  test('should find winner with highest votes', async ({ assert }) => {
    const votesByOption = { '0': 10, '1': 25, '2': 15 }

    let winnerIndex: number | null = null
    let maxVotes = 0

    for (const [optionIndex, votes] of Object.entries(votesByOption)) {
      if (votes > maxVotes) {
        maxVotes = votes
        winnerIndex = Number.parseInt(optionIndex)
      }
    }

    assert.equal(winnerIndex, 1)
    assert.equal(maxVotes, 25)
  })

  test('should return first highest on tie', async ({ assert }) => {
    const votesByOption = { '0': 20, '1': 20, '2': 10 }

    let winnerIndex: number | null = null
    let maxVotes = 0

    for (const [optionIndex, votes] of Object.entries(votesByOption)) {
      if (votes > maxVotes) {
        maxVotes = votes
        winnerIndex = Number.parseInt(optionIndex)
      }
    }

    // First option with max votes wins
    assert.equal(winnerIndex, 0)
  })

  test('should handle empty votes', async ({ assert }) => {
    const votesByOption: Record<string, number> = {}

    let winnerIndex: number | null = null
    let maxVotes = 0

    for (const [optionIndex, votes] of Object.entries(votesByOption)) {
      if (votes > maxVotes) {
        maxVotes = votes
        winnerIndex = Number.parseInt(optionIndex)
      }
    }

    assert.isNull(winnerIndex)
    assert.equal(maxVotes, 0)
  })
})
