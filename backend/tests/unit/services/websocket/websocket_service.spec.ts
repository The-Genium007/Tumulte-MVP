import { test } from '@japa/runner'
import transmit from '@adonisjs/transmit/services/main'
import { pollInstance as PollInstance } from '#models/poll_instance'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'

// ========================================
// SERVICE METHOD TESTS (with mocked transmit + models)
// ========================================

test.group('WebSocketService - emitPollStart', (group) => {
  let origTransmitBroadcast: typeof transmit.broadcast
  let origPollInstanceFind: typeof PollInstance.find
  let origMembershipQuery: typeof CampaignMembership.query
  let broadcastCalls: Array<{ channel: string; data: unknown }>

  group.each.setup(() => {
    broadcastCalls = []
    origTransmitBroadcast = transmit.broadcast
    origPollInstanceFind = PollInstance.find
    origMembershipQuery = CampaignMembership.query
    ;(transmit as any).broadcast = (channel: string, data: unknown) => {
      broadcastCalls.push({ channel, data })
    }
  })

  group.each.teardown(() => {
    ;(transmit as any).broadcast = origTransmitBroadcast
    ;(PollInstance as any).find = origPollInstanceFind
    ;(CampaignMembership as any).query = origMembershipQuery
  })

  test('should broadcast to poll channel', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    // Stub PollInstance.find to return null (no campaign)
    ;(PollInstance as any).find = async () => null

    await service.emitPollStart({
      pollInstanceId: 'poll-123',
      title: 'Test Poll',
      options: ['A', 'B'],
      durationSeconds: 60,
      started_at: '2024-01-01T00:00:00.000Z',
      endsAt: '2024-01-01T00:01:00.000Z',
    })

    const pollChannelBroadcast = broadcastCalls.find((c) => c.channel === 'poll:poll-123')
    assert.isNotNull(pollChannelBroadcast)
    assert.equal((pollChannelBroadcast!.data as any).event, 'poll:start')
  })

  test('should broadcast to streamer channels when poll has campaign', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    ;(PollInstance as any).find = async () => ({ campaignId: 'campaign-123' })
    ;(CampaignMembership as any).query = () => ({
      where: () => ({
        where: () => Promise.resolve([{ streamerId: 'streamer-1' }, { streamerId: 'streamer-2' }]),
      }),
    })

    await service.emitPollStart({
      pollInstanceId: 'poll-123',
      title: 'Test Poll',
      options: ['A', 'B'],
      durationSeconds: 60,
      started_at: '2024-01-01T00:00:00.000Z',
      endsAt: '2024-01-01T00:01:00.000Z',
    })

    const streamerBroadcasts = broadcastCalls.filter((c) => c.channel.startsWith('streamer:'))
    assert.equal(streamerBroadcasts.length, 2)
    assert.equal(streamerBroadcasts[0].channel, 'streamer:streamer-1:polls')
    assert.equal(streamerBroadcasts[1].channel, 'streamer:streamer-2:polls')
  })

  test('should not throw when PollInstance lookup fails', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    ;(PollInstance as any).find = async () => {
      throw new Error('DB error')
    }

    // Should not throw
    await service.emitPollStart({
      pollInstanceId: 'poll-err',
      title: 'Test',
      options: ['A'],
      durationSeconds: 30,
      started_at: '2024-01-01T00:00:00.000Z',
      endsAt: '2024-01-01T00:00:30.000Z',
    })

    // At minimum the poll channel broadcast should have happened
    const pollBroadcast = broadcastCalls.find((c) => c.channel === 'poll:poll-err')
    assert.isNotNull(pollBroadcast)
  })
})

test.group('WebSocketService - emitPollUpdate', (group) => {
  let origTransmitBroadcast: typeof transmit.broadcast
  let origPollInstanceFind: typeof PollInstance.find
  let origMembershipQuery: typeof CampaignMembership.query
  let broadcastCalls: Array<{ channel: string; data: unknown }>

  group.each.setup(() => {
    broadcastCalls = []
    origTransmitBroadcast = transmit.broadcast
    origPollInstanceFind = PollInstance.find
    origMembershipQuery = CampaignMembership.query
    ;(transmit as any).broadcast = (channel: string, data: unknown) => {
      broadcastCalls.push({ channel, data })
    }
  })

  group.each.teardown(() => {
    ;(transmit as any).broadcast = origTransmitBroadcast
    ;(PollInstance as any).find = origPollInstanceFind
    ;(CampaignMembership as any).query = origMembershipQuery
  })

  test('should broadcast aggregated votes to poll channel', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    ;(PollInstance as any).find = async () => null

    await service.emitPollUpdate('poll-upd-1', {
      pollInstanceId: 'poll-upd-1',
      votesByOption: { '0': 10, '1': 15 },
      totalVotes: 25,
      percentages: { '0': 40, '1': 60 },
    })

    const pollBroadcast = broadcastCalls.find((c) => c.channel === 'poll:poll-upd-1')
    assert.isNotNull(pollBroadcast)
    assert.equal((pollBroadcast!.data as any).event, 'poll:update')
    assert.equal((pollBroadcast!.data as any).data.totalVotes, 25)
  })

  test('should propagate to streamer channels', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    ;(PollInstance as any).find = async () => ({ campaignId: 'campaign-123' })
    ;(CampaignMembership as any).query = () => ({
      where: () => ({
        where: () => Promise.resolve([{ streamerId: 'streamer-1' }]),
      }),
    })

    await service.emitPollUpdate('poll-upd-2', {
      pollInstanceId: 'poll-upd-2',
      votesByOption: { '0': 5 },
      totalVotes: 5,
      percentages: { '0': 100 },
    })

    const streamerBroadcast = broadcastCalls.find((c) => c.channel === 'streamer:streamer-1:polls')
    assert.isNotNull(streamerBroadcast)
    assert.equal((streamerBroadcast!.data as any).event, 'poll:update')
  })
})

test.group('WebSocketService - emitPollEnd', (group) => {
  let origTransmitBroadcast: typeof transmit.broadcast
  let origPollInstanceFind: typeof PollInstance.find
  let origMembershipQuery: typeof CampaignMembership.query
  let broadcastCalls: Array<{ channel: string; data: unknown }>

  group.each.setup(() => {
    broadcastCalls = []
    origTransmitBroadcast = transmit.broadcast
    origPollInstanceFind = PollInstance.find
    origMembershipQuery = CampaignMembership.query
    ;(transmit as any).broadcast = (channel: string, data: unknown) => {
      broadcastCalls.push({ channel, data })
    }
  })

  group.each.teardown(() => {
    ;(transmit as any).broadcast = origTransmitBroadcast
    ;(PollInstance as any).find = origPollInstanceFind
    ;(CampaignMembership as any).query = origMembershipQuery
  })

  test('should broadcast end event with winner index', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    ;(PollInstance as any).find = async () => null

    await service.emitPollEnd('poll-end-1', {
      pollInstanceId: 'poll-end-1',
      votesByOption: { '0': 10, '1': 25 },
      totalVotes: 35,
      percentages: { '0': 28.57, '1': 71.43 },
    })

    const pollBroadcast = broadcastCalls.find((c) => c.channel === 'poll:poll-end-1')
    assert.isNotNull(pollBroadcast)
    const data = (pollBroadcast!.data as any).data
    assert.equal(data.winnerIndex, 1)
    assert.isFalse(data.cancelled)
  })

  test('should broadcast cancelled poll', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    ;(PollInstance as any).find = async () => null

    await service.emitPollEnd(
      'poll-cancel-1',
      {
        pollInstanceId: 'poll-cancel-1',
        votesByOption: {},
        totalVotes: 0,
        percentages: {},
      },
      true
    )

    const pollBroadcast = broadcastCalls.find((c) => c.channel === 'poll:poll-cancel-1')
    assert.isNotNull(pollBroadcast)
    assert.isTrue((pollBroadcast!.data as any).data.cancelled)
  })

  test('should serialize NaN/Infinity values in end data', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    ;(PollInstance as any).find = async () => null

    await service.emitPollEnd('poll-nan-1', {
      pollInstanceId: 'poll-nan-1',
      votesByOption: { '0': Number.NaN },
      totalVotes: 0,
      percentages: { '0': Infinity },
    })

    const pollBroadcast = broadcastCalls.find((c) => c.channel === 'poll:poll-nan-1')
    const data = (pollBroadcast!.data as any).data
    assert.equal(data.votesByOption['0'], 0)
    assert.equal(data.percentages['0'], 0)
  })

  test('should not throw when individual streamer broadcast fails', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    let callCount = 0
    ;(transmit as any).broadcast = (channel: string, data: unknown) => {
      callCount++
      // First call (general poll channel) succeeds, second call (streamer) throws
      if (channel.startsWith('streamer:')) {
        throw new Error('Broadcast failed')
      }
      broadcastCalls.push({ channel, data })
    }
    ;(PollInstance as any).find = async () => ({ campaignId: 'campaign-123' })
    ;(CampaignMembership as any).query = () => ({
      where: () => ({
        where: () => Promise.resolve([{ streamerId: 'streamer-fail' }]),
      }),
    })

    // Should not throw
    await service.emitPollEnd('poll-fail-1', {
      pollInstanceId: 'poll-fail-1',
      votesByOption: { '0': 5 },
      totalVotes: 5,
      percentages: { '0': 100 },
    })

    // The general poll channel should have been broadcast
    assert.isTrue(callCount >= 2)
  })
})

test.group('WebSocketService - emitStreamerLeftCampaign', (group) => {
  let origTransmitBroadcast: typeof transmit.broadcast
  let broadcastCalls: Array<{ channel: string; data: unknown }>

  group.each.setup(() => {
    broadcastCalls = []
    origTransmitBroadcast = transmit.broadcast
    ;(transmit as any).broadcast = (channel: string, data: unknown) => {
      broadcastCalls.push({ channel, data })
    }
  })

  group.each.teardown(() => {
    ;(transmit as any).broadcast = origTransmitBroadcast
  })

  test('should broadcast to streamer channel with correct event', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    service.emitStreamerLeftCampaign('streamer-abc', 'campaign-xyz')

    assert.equal(broadcastCalls.length, 1)
    assert.equal(broadcastCalls[0].channel, 'streamer:streamer-abc:polls')
    assert.equal((broadcastCalls[0].data as any).event, 'streamer:left-campaign')
    assert.equal((broadcastCalls[0].data as any).data.campaign_id, 'campaign-xyz')
  })
})

test.group('WebSocketService - emitStreamerReadinessChange', (group) => {
  let origTransmitBroadcast: typeof transmit.broadcast
  let broadcastCalls: Array<{ channel: string; data: unknown }>

  group.each.setup(() => {
    broadcastCalls = []
    origTransmitBroadcast = transmit.broadcast
    ;(transmit as any).broadcast = (channel: string, data: unknown) => {
      broadcastCalls.push({ channel, data })
    }
  })

  group.each.teardown(() => {
    ;(transmit as any).broadcast = origTransmitBroadcast
  })

  test('should broadcast streamer:ready when isReady is true', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    service.emitStreamerReadinessChange('campaign-123', 'streamer-1', true, 'TestStreamer')

    assert.equal(broadcastCalls.length, 1)
    assert.equal(broadcastCalls[0].channel, 'campaign:campaign-123:readiness')
    assert.equal((broadcastCalls[0].data as any).event, 'streamer:ready')
    assert.equal((broadcastCalls[0].data as any).data.streamerId, 'streamer-1')
    assert.isTrue((broadcastCalls[0].data as any).data.isReady)
  })

  test('should broadcast streamer:not-ready when isReady is false', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    service.emitStreamerReadinessChange('campaign-456', 'streamer-2', false, 'OtherStreamer')

    assert.equal(broadcastCalls.length, 1)
    assert.equal((broadcastCalls[0].data as any).event, 'streamer:not-ready')
    assert.isFalse((broadcastCalls[0].data as any).data.isReady)
  })
})

test.group('WebSocketService - gamification broadcasts', (group) => {
  let origTransmitBroadcast: typeof transmit.broadcast
  let origMembershipQuery: typeof CampaignMembership.query
  let broadcastCalls: Array<{ channel: string; data: unknown }>

  group.each.setup(() => {
    broadcastCalls = []
    origTransmitBroadcast = transmit.broadcast
    origMembershipQuery = CampaignMembership.query
    ;(transmit as any).broadcast = (channel: string, data: unknown) => {
      broadcastCalls.push({ channel, data })
    }
    ;(CampaignMembership as any).query = () => ({
      where: () => ({
        where: () => Promise.resolve([{ streamerId: 'streamer-1' }, { streamerId: 'streamer-2' }]),
      }),
    })
  })

  group.each.teardown(() => {
    ;(transmit as any).broadcast = origTransmitBroadcast
    ;(CampaignMembership as any).query = origMembershipQuery
  })

  test('emitGamificationStart should broadcast to all active streamers', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    await service.emitGamificationStart({
      id: 'inst-1',
      campaignId: 'campaign-123',
      eventId: 'evt-1',
      event: {
        id: 'evt-1',
        slug: 'dice_crit',
        name: 'Critique',
        type: 'individual',
        actionType: 'dice_invert',
        rewardColor: '#FF0000',
      },
      type: 'individual',
      status: 'active',
      objectiveTarget: 100,
      currentProgress: 0,
      progressPercentage: 0,
      isObjectiveReached: false,
      duration: 300,
      startsAt: '2024-01-01T00:00:00.000Z',
      expiresAt: '2024-01-01T00:05:00.000Z',
      completedAt: null,
      streamerId: 'streamer-1',
      viewerCountAtStart: 50,
      triggerData: null,
    })

    assert.equal(broadcastCalls.length, 2)
    assert.equal(broadcastCalls[0].channel, 'streamer:streamer-1:polls')
    assert.equal(broadcastCalls[1].channel, 'streamer:streamer-2:polls')
    assert.equal((broadcastCalls[0].data as any).event, 'gamification:start')
  })

  test('emitGamificationProgress should broadcast progress data', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    await service.emitGamificationProgress({
      instanceId: 'inst-1',
      campaignId: 'campaign-123',
      currentProgress: 50,
      objectiveTarget: 100,
      progressPercentage: 50,
      isObjectiveReached: false,
      contributorUsername: 'viewer1',
    })

    assert.equal(broadcastCalls.length, 2)
    assert.equal((broadcastCalls[0].data as any).event, 'gamification:progress')
  })

  test('emitGamificationArmed should broadcast armed state', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    await service.emitGamificationArmed({
      instanceId: 'inst-1',
      campaignId: 'campaign-123',
      armedAt: '2024-01-01T00:03:00.000Z',
      streamerId: 'streamer-1',
      eventId: 'evt-1',
    })

    assert.equal(broadcastCalls.length, 2)
    assert.equal((broadcastCalls[0].data as any).event, 'gamification:armed')
  })

  test('emitGamificationComplete should broadcast completion', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    await service.emitGamificationComplete({
      instanceId: 'inst-1',
      campaignId: 'campaign-123',
      success: true,
      message: 'Dice inverted!',
    })

    assert.equal(broadcastCalls.length, 2)
    assert.equal((broadcastCalls[0].data as any).event, 'gamification:complete')
  })

  test('emitGamificationExpired should broadcast expiration', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    await service.emitGamificationExpired({
      instanceId: 'inst-1',
      campaignId: 'campaign-123',
    })

    assert.equal(broadcastCalls.length, 2)
    assert.equal((broadcastCalls[0].data as any).event, 'gamification:expired')
  })

  test('emitGamificationActionExecuted should broadcast action data', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    await service.emitGamificationActionExecuted({
      instanceId: 'inst-1',
      campaignId: 'campaign-123',
      eventName: 'Dice Critical',
      actionType: 'dice_invert',
      success: true,
      originalValue: 1,
      invertedValue: 20,
    })

    assert.equal(broadcastCalls.length, 2)
    assert.equal((broadcastCalls[0].data as any).event, 'gamification:action_executed')
  })

  test('broadcastToStreamerOverlays should not throw on query error', async ({ assert }) => {
    const { webSocketService: WebSocketService } =
      await import('#services/websocket/websocket_service')
    const service = new WebSocketService()

    ;(CampaignMembership as any).query = () => ({
      where: () => ({
        where: () => Promise.reject(new Error('DB error')),
      }),
    })

    // Should not throw
    await service.emitGamificationStart({
      id: 'inst-err',
      campaignId: 'campaign-err',
      eventId: 'evt-err',
      event: {
        id: 'evt-err',
        slug: 'dice_crit',
        name: 'Critique',
        type: 'individual',
        actionType: 'dice_invert',
        rewardColor: '#FF0000',
      },
      type: 'individual',
      status: 'active',
      objectiveTarget: 100,
      currentProgress: 0,
      progressPercentage: 0,
      isObjectiveReached: false,
      duration: 300,
      startsAt: '2024-01-01T00:00:00.000Z',
      expiresAt: '2024-01-01T00:05:00.000Z',
      completedAt: null,
      streamerId: null,
      viewerCountAtStart: null,
      triggerData: null,
    })

    // No broadcasts should have happened (all failed)
    assert.equal(broadcastCalls.length, 0)
  })
})

// ========================================
// ORIGINAL TESTS (existing coverage)
// ========================================

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
