import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { GamificationService } from '#services/gamification/gamification_service'
import type GamificationInstance from '#models/gamification_instance'
import type GamificationEvent from '#models/gamification_event'

/**
 * Unit tests for GamificationService
 *
 * The service orchestrates gamification components:
 * - TriggerEvaluator: evaluates dice rolls for triggers
 * - InstanceManager: manages instance lifecycle
 * - ActionExecutor: executes actions when objectives are met
 *
 * Note: Methods that call Lucid model statics directly (query(), findOrFail())
 * require functional tests with a real DB. These unit tests focus on the
 * orchestration logic through the injected dependencies.
 */

// ========================================
// MOCK FACTORIES
// ========================================

function createMockTriggerEvaluator(overrides: Record<string, unknown> = {}) {
  return {
    evaluate: () => ({ shouldTrigger: false, triggerData: null }),
    evaluateDiceCritical: () => ({ shouldTrigger: false, triggerData: null }),
    isSupportedTriggerType: () => true,
    ...overrides,
  }
}

function createMockInstanceManager(overrides: Record<string, unknown> = {}) {
  return {
    createIndividual: async () => createMockGamificationInstance(),
    createGroup: async () => createMockGamificationInstance(),
    addContribution: async () => ({
      instance: createMockGamificationInstance(),
      objectiveReached: false,
    }),
    complete: async () => createMockGamificationInstance({ status: 'completed' }),
    expire: async () => createMockGamificationInstance({ status: 'expired' }),
    cancel: async () => createMockGamificationInstance({ status: 'cancelled' }),
    isOnCooldown: async () => ({ onCooldown: false, endsAt: null }),
    getActiveInstances: async () => [],
    getActiveInstanceForStreamer: async () => null,
    getActiveOrArmedInstanceForStreamer: async () => null,
    armInstance: async () => createMockGamificationInstance({ status: 'armed' }),
    getArmedInstanceForStreamer: async () => null,
    consumeArmedInstance: async () => createMockGamificationInstance({ status: 'completed' }),
    resetCooldowns: async () => 0,
    setFoundryCommandService: () => {},
    ...overrides,
  }
}

function createMockActionExecutor(overrides: Record<string, unknown> = {}) {
  return {
    setFoundryCommandService: () => {},
    execute: async () => ({ success: true }),
    ...overrides,
  }
}

function createMockGamificationInstance(
  overrides: Partial<GamificationInstance> = {}
): Partial<GamificationInstance> {
  return {
    id: 'instance-123',
    campaignId: 'campaign-123',
    eventId: 'event-123',
    type: 'individual',
    status: 'active',
    objectiveTarget: 100,
    currentProgress: 0,
    duration: 300,
    startsAt: DateTime.now(),
    expiresAt: DateTime.now().plus({ minutes: 5 }),
    completedAt: null,
    resultData: null,
    cooldownEndsAt: null,
    streamerId: 'streamer-123',
    viewerCountAtStart: 50,
    triggerData: null,
    armedAt: null,
    get progressPercentage() {
      return 0
    },
    get isObjectiveReached() {
      return false
    },
    get remainingSeconds() {
      return 300
    },
    get acceptsContributions() {
      return this.status === 'active'
    },
    load: async () => {},
    ...overrides,
  }
}

function createMockGamificationEvent(
  overrides: Partial<GamificationEvent> = {}
): Partial<GamificationEvent> {
  return {
    id: 'event-123',
    slug: 'dice_critical',
    name: 'Dé Critique',
    type: 'individual',
    triggerType: 'dice_critical',
    actionType: 'dice_invert',
    rewardColor: '#FF0000',
    triggerConfig: {
      criticalSuccess: { enabled: true },
      criticalFailure: { enabled: true },
    },
    actionConfig: {},
    ...overrides,
  }
}

function createService(deps: {
  triggerEvaluator?: Record<string, unknown>
  instanceManager?: Record<string, unknown>
  actionExecutor?: Record<string, unknown>
}) {
  return new GamificationService(
    createMockTriggerEvaluator(deps.triggerEvaluator) as any,
    createMockInstanceManager(deps.instanceManager) as any,
    createMockActionExecutor(deps.actionExecutor) as any
  )
}

// ========================================
// TESTS
// ========================================

test.group('GamificationService - setFoundryCommandService', () => {
  test('should propagate foundry service to actionExecutor and instanceManager', async ({
    assert,
  }) => {
    let actionExecutorCalled = false
    let instanceManagerCalled = false

    const service = createService({
      actionExecutor: {
        setFoundryCommandService: () => {
          actionExecutorCalled = true
        },
      },
      instanceManager: {
        setFoundryCommandService: () => {
          instanceManagerCalled = true
        },
      },
    })

    const mockFoundryService = { sendChatMessage: async () => ({ success: true }) }
    service.setFoundryCommandService(mockFoundryService as any)

    assert.isTrue(actionExecutorCalled)
    assert.isTrue(instanceManagerCalled)
  })
})

test.group('GamificationService - getActiveInstances', () => {
  test('should delegate to instanceManager', async ({ assert }) => {
    const mockInstances = [
      createMockGamificationInstance({ id: 'inst-1' }),
      createMockGamificationInstance({ id: 'inst-2' }),
    ]

    const service = createService({
      instanceManager: {
        getActiveInstances: async () => mockInstances,
      },
    })

    const result = await service.getActiveInstances('campaign-123')
    assert.lengthOf(result, 2)
  })
})

test.group('GamificationService - getActiveInstanceForStreamer', () => {
  test('should delegate to instanceManager', async ({ assert }) => {
    const mockInstance = createMockGamificationInstance()

    const service = createService({
      instanceManager: {
        getActiveInstanceForStreamer: async () => mockInstance,
      },
    })

    const result = await service.getActiveInstanceForStreamer('campaign-123', 'streamer-123')
    assert.isNotNull(result)
    assert.equal((result as any).id, 'instance-123')
  })

  test('should return null when no active instance', async ({ assert }) => {
    const service = createService({
      instanceManager: {
        getActiveInstanceForStreamer: async () => null,
      },
    })

    const result = await service.getActiveInstanceForStreamer('campaign-123', 'streamer-123')
    assert.isNull(result)
  })
})

test.group('GamificationService - onSessionStart', () => {
  test('should reset cooldowns via instanceManager', async ({ assert }) => {
    let resetCalled = false
    let resetCampaignId = ''

    const service = createService({
      instanceManager: {
        resetCooldowns: async (campaignId: string) => {
          resetCalled = true
          resetCampaignId = campaignId
          return 3
        },
      },
    })

    await service.onSessionStart('campaign-456')

    assert.isTrue(resetCalled)
    assert.equal(resetCampaignId, 'campaign-456')
  })
})

test.group('GamificationService - triggerManualEvent', () => {
  test('should return null when config not found', async ({ assert }) => {
    // getCampaignConfig calls Lucid directly, but triggerManualEvent delegates to it.
    // We need to stub the internal call. Since getCampaignConfig is a method on the class,
    // we can stub it on the instance after construction.
    const service = createService({})

    // Stub getCampaignConfig to return null
    ;(service as any).getCampaignConfig = async () => null

    const result = await service.triggerManualEvent(
      'campaign-123',
      'event-123',
      'streamer-123',
      'TestStreamer',
      100
    )

    assert.isNull(result)
  })

  test('should return null when config is disabled', async ({ assert }) => {
    const service = createService({})

    ;(service as any).getCampaignConfig = async () => ({
      isEnabled: false,
      event: createMockGamificationEvent(),
      load: async () => {},
    })

    const result = await service.triggerManualEvent(
      'campaign-123',
      'event-123',
      'streamer-123',
      'TestStreamer',
      100
    )

    assert.isNull(result)
  })

  test('should return null when on cooldown (non-test mode)', async ({ assert }) => {
    const service = createService({
      instanceManager: {
        isOnCooldown: async () => ({
          onCooldown: true,
          endsAt: DateTime.now().plus({ minutes: 5 }),
        }),
      },
    })

    const mockConfig = {
      isEnabled: true,
      campaignId: 'campaign-123',
      eventId: 'event-123',
      event: createMockGamificationEvent(),
      load: async () => {},
    }
    ;(service as any).getCampaignConfig = async () => mockConfig

    const result = await service.triggerManualEvent(
      'campaign-123',
      'event-123',
      'streamer-123',
      'TestStreamer',
      100
    )

    assert.isNull(result)
  })

  test('should skip cooldown check in test mode', async ({ assert }) => {
    let createIndividualCalled = false
    const mockInstance = createMockGamificationInstance()

    const service = createService({
      instanceManager: {
        isOnCooldown: async () => ({
          onCooldown: true,
          endsAt: DateTime.now().plus({ minutes: 5 }),
        }),
        createIndividual: async () => {
          createIndividualCalled = true
          return mockInstance
        },
      },
    })

    const mockConfig = {
      isEnabled: true,
      campaignId: 'campaign-123',
      eventId: 'event-123',
      event: createMockGamificationEvent(),
      load: async () => {},
    }
    ;(service as any).getCampaignConfig = async () => mockConfig
    // Mock transmit and getWebSocketService to avoid side effects
    ;(service as any).broadcastInstanceCreated = () => {}

    // Stub Campaign.findOrFail
    const originalModule = await import('#models/campaign')
    const origFindOrFail = originalModule.campaign.findOrFail
    ;(originalModule.campaign as any).findOrFail = async () => ({ id: 'campaign-123' })

    try {
      const result = await service.triggerManualEvent(
        'campaign-123',
        'event-123',
        'streamer-123',
        'TestStreamer',
        100,
        { isTest: true }
      )

      assert.isTrue(createIndividualCalled)
      assert.isNotNull(result)
    } finally {
      // Restore
      ;(originalModule.campaign as any).findOrFail = origFindOrFail
    }
  })

  test('should create instance when config enabled and no cooldown', async ({ assert }) => {
    let createIndividualCalled = false
    const mockInstance = createMockGamificationInstance()

    const service = createService({
      instanceManager: {
        isOnCooldown: async () => ({ onCooldown: false, endsAt: null }),
        createIndividual: async () => {
          createIndividualCalled = true
          return mockInstance
        },
      },
    })

    const mockConfig = {
      isEnabled: true,
      campaignId: 'campaign-123',
      eventId: 'event-123',
      event: createMockGamificationEvent(),
      load: async () => {},
    }
    ;(service as any).getCampaignConfig = async () => mockConfig
    ;(service as any).broadcastInstanceCreated = () => {}

    const originalModule = await import('#models/campaign')
    const origFindOrFail = originalModule.campaign.findOrFail
    ;(originalModule.campaign as any).findOrFail = async () => ({ id: 'campaign-123' })

    try {
      const result = await service.triggerManualEvent(
        'campaign-123',
        'event-123',
        'streamer-123',
        'TestStreamer',
        100
      )

      assert.isTrue(createIndividualCalled)
      assert.isNotNull(result)
    } finally {
      ;(originalModule.campaign as any).findOrFail = origFindOrFail
    }
  })
})

test.group('GamificationService - cancelInstance', () => {
  test('should cancel instance and broadcast', async ({ assert }) => {
    let cancelCalled = false
    const cancelledInstance = createMockGamificationInstance({ status: 'cancelled' })

    const service = createService({
      instanceManager: {
        cancel: async () => {
          cancelCalled = true
          return cancelledInstance
        },
      },
    })

    // Stub findOrFail and broadcastInstanceCancelled
    const GamificationInstanceModule = await import('#models/gamification_instance')
    const origFindOrFail = GamificationInstanceModule.default.findOrFail
    ;(GamificationInstanceModule.default as any).findOrFail = async () =>
      createMockGamificationInstance()
    ;(service as any).broadcastInstanceCancelled = () => {}

    try {
      const result = await service.cancelInstance('instance-123')
      assert.isTrue(cancelCalled)
      assert.equal((result as any).status, 'cancelled')
    } finally {
      ;(GamificationInstanceModule.default as any).findOrFail = origFindOrFail
    }
  })
})

test.group('GamificationService - forceCompleteInstance', () => {
  test('should set progress to target and complete', async ({ assert }) => {
    let completeCalled = false
    const mockInstance = createMockGamificationInstance({
      objectiveTarget: 100,
      currentProgress: 0,
      campaignId: 'campaign-123',
      eventId: 'event-123',
      event: createMockGamificationEvent() as any,
    })

    const service = createService({
      instanceManager: {
        complete: async () => {
          completeCalled = true
          return createMockGamificationInstance({ status: 'completed' })
        },
      },
    })

    // Stub external calls
    const GamificationInstanceModule = await import('#models/gamification_instance')
    const origFindOrFail = GamificationInstanceModule.default.findOrFail
    ;(GamificationInstanceModule.default as any).findOrFail = async () => mockInstance
    ;(service as any).getCampaignConfig = async () => ({
      isEnabled: true,
      event: createMockGamificationEvent(),
    })
    ;(service as any).getVttConnectionId = async () => 'vtt-conn-123'
    ;(service as any).broadcastInstanceCompleted = () => {}

    try {
      await service.forceCompleteInstance('instance-123')
      assert.isTrue(completeCalled)
      // The instance's currentProgress should be set to objectiveTarget
      assert.equal(mockInstance.currentProgress, 100)
    } finally {
      ;(GamificationInstanceModule.default as any).findOrFail = origFindOrFail
    }
  })

  test('should throw when config not found', async ({ assert }) => {
    const mockInstance = createMockGamificationInstance({
      event: createMockGamificationEvent() as any,
    })

    const service = createService({})

    const GamificationInstanceModule = await import('#models/gamification_instance')
    const origFindOrFail = GamificationInstanceModule.default.findOrFail
    ;(GamificationInstanceModule.default as any).findOrFail = async () => mockInstance
    ;(service as any).getCampaignConfig = async () => null

    try {
      await assert.rejects(
        () => service.forceCompleteInstance('instance-123'),
        /Configuration non trouvée/
      )
    } finally {
      ;(GamificationInstanceModule.default as any).findOrFail = origFindOrFail
    }
  })
})

test.group('GamificationService - onRedemption', () => {
  test('should return processed:false when no config for reward', async ({ assert }) => {
    const service = createService({})

    // Stub CampaignGamificationConfig.query to return null
    const CampaignConfigModule = await import('#models/campaign_gamification_config')
    const origQuery = CampaignConfigModule.default.query
    ;(CampaignConfigModule.default as any).query = () => ({
      where: () => ({
        where: () => ({
          preload: () => ({
            first: async () => null,
          }),
        }),
      }),
    })

    try {
      const result = await service.onRedemption({
        redemptionId: 'red-123',
        rewardId: 'reward-unknown',
        streamerId: 'streamer-123',
        twitchUserId: 'twitch-user-123',
        twitchUsername: 'TestViewer',
        amount: 1,
      })

      assert.isFalse(result.processed)
    } finally {
      ;(CampaignConfigModule.default as any).query = origQuery
    }
  })

  test('should return processed:false when no active instance', async ({ assert }) => {
    const service = createService({
      instanceManager: {
        getActiveInstanceForStreamer: async () => null,
      },
    })

    // Stub config query
    const CampaignConfigModule = await import('#models/campaign_gamification_config')
    const origQuery = CampaignConfigModule.default.query
    ;(CampaignConfigModule.default as any).query = () => ({
      where: () => ({
        where: () => ({
          preload: () => ({
            first: async () => ({
              campaignId: 'campaign-123',
              event: createMockGamificationEvent(),
            }),
          }),
        }),
      }),
    })

    try {
      const result = await service.onRedemption({
        redemptionId: 'red-123',
        rewardId: 'reward-123',
        streamerId: 'streamer-123',
        twitchUserId: 'twitch-user-123',
        twitchUsername: 'TestViewer',
        amount: 1,
      })

      assert.isFalse(result.processed)
    } finally {
      ;(CampaignConfigModule.default as any).query = origQuery
    }
  })

  test('should process contribution and return progression', async ({ assert }) => {
    const updatedInstance = createMockGamificationInstance({ currentProgress: 10 })

    const service = createService({
      instanceManager: {
        getActiveInstanceForStreamer: async () => createMockGamificationInstance(),
        addContribution: async () => ({
          instance: updatedInstance,
          objectiveReached: false,
        }),
      },
    })

    // Stub config query
    const CampaignConfigModule = await import('#models/campaign_gamification_config')
    const origQuery = CampaignConfigModule.default.query
    ;(CampaignConfigModule.default as any).query = () => ({
      where: () => ({
        where: () => ({
          preload: () => ({
            first: async () => ({
              campaignId: 'campaign-123',
              event: createMockGamificationEvent(),
            }),
          }),
        }),
      }),
    })

    // Stub broadcasts
    ;(service as any).broadcastProgress = () => {}

    try {
      const result = await service.onRedemption({
        redemptionId: 'red-123',
        rewardId: 'reward-123',
        streamerId: 'streamer-123',
        twitchUserId: 'twitch-user-123',
        twitchUsername: 'TestViewer',
        amount: 1,
      })

      assert.isTrue(result.processed)
      assert.isFalse(result.objectiveReached)
      assert.equal((result.instance as any).currentProgress, 10)
    } finally {
      ;(CampaignConfigModule.default as any).query = origQuery
    }
  })

  test('should complete instance when objective reached with VTT connection', async ({
    assert,
  }) => {
    let completeCalled = false
    const updatedInstance = createMockGamificationInstance({
      currentProgress: 100,
      objectiveTarget: 100,
    })

    const service = createService({
      instanceManager: {
        getActiveInstanceForStreamer: async () => createMockGamificationInstance(),
        addContribution: async () => ({
          instance: updatedInstance,
          objectiveReached: true,
        }),
        complete: async () => {
          completeCalled = true
          return createMockGamificationInstance({ status: 'completed' })
        },
      },
    })

    const CampaignConfigModule = await import('#models/campaign_gamification_config')
    const origQuery = CampaignConfigModule.default.query
    ;(CampaignConfigModule.default as any).query = () => ({
      where: () => ({
        where: () => ({
          preload: () => ({
            first: async () => ({
              campaignId: 'campaign-123',
              event: createMockGamificationEvent(),
            }),
          }),
        }),
      }),
    })
    ;(service as any).broadcastProgress = () => {}
    ;(service as any).broadcastInstanceCompleted = () => {}
    ;(service as any).getVttConnectionId = async () => 'vtt-conn-123'

    try {
      const result = await service.onRedemption({
        redemptionId: 'red-123',
        rewardId: 'reward-123',
        streamerId: 'streamer-123',
        twitchUserId: 'twitch-user-123',
        twitchUsername: 'TestViewer',
        amount: 1,
      })

      assert.isTrue(result.processed)
      assert.isTrue(result.objectiveReached)
      assert.isTrue(completeCalled)
    } finally {
      ;(CampaignConfigModule.default as any).query = origQuery
    }
  })
})

test.group('GamificationService - onStreamerRedemption', () => {
  test('should return processed:false when campaign config disabled', async ({ assert }) => {
    const service = createService({})
    ;(service as any).getCampaignConfig = async () => null

    const result = await service.onStreamerRedemption({
      redemptionId: 'red-123',
      rewardId: 'reward-123',
      streamerId: 'streamer-123',
      streamerConfigId: 'sconfig-123',
      campaignId: 'campaign-123',
      eventId: 'event-123',
      twitchUserId: 'twitch-user-123',
      twitchUsername: 'TestViewer',
      amount: 1,
    })

    assert.isFalse(result.processed)
  })

  test('should return processed:false when on cooldown and no active instance', async ({
    assert,
  }) => {
    const service = createService({
      instanceManager: {
        getActiveOrArmedInstanceForStreamer: async () => null,
        isOnCooldown: async () => ({
          onCooldown: true,
          endsAt: DateTime.now().plus({ minutes: 5 }),
        }),
      },
    })

    ;(service as any).getCampaignConfig = async () => ({
      isEnabled: true,
      campaignId: 'campaign-123',
      eventId: 'event-123',
      event: createMockGamificationEvent(),
      load: async () => {},
    })

    const result = await service.onStreamerRedemption({
      redemptionId: 'red-123',
      rewardId: 'reward-123',
      streamerId: 'streamer-123',
      streamerConfigId: 'sconfig-123',
      campaignId: 'campaign-123',
      eventId: 'event-123',
      twitchUserId: 'twitch-user-123',
      twitchUsername: 'TestViewer',
      amount: 1,
    })

    assert.isFalse(result.processed)
  })

  test('should create new instance when none active and add contribution', async ({ assert }) => {
    let createIndividualCalled = false
    let addContributionCalled = false
    const mockInstance = createMockGamificationInstance()

    const service = createService({
      instanceManager: {
        getActiveOrArmedInstanceForStreamer: async () => null,
        isOnCooldown: async () => ({ onCooldown: false, endsAt: null }),
        createIndividual: async () => {
          createIndividualCalled = true
          return mockInstance
        },
        addContribution: async () => {
          addContributionCalled = true
          return { instance: mockInstance, objectiveReached: false }
        },
      },
    })

    ;(service as any).getCampaignConfig = async () => ({
      isEnabled: true,
      campaignId: 'campaign-123',
      eventId: 'event-123',
      event: createMockGamificationEvent(),
      load: async () => {},
    })
    ;(service as any).broadcastInstanceCreated = () => {}
    ;(service as any).broadcastProgress = () => {}

    const CampaignModule = await import('#models/campaign')
    const origFindOrFail = CampaignModule.campaign.findOrFail
    ;(CampaignModule.campaign as any).findOrFail = async () => ({ id: 'campaign-123' })

    try {
      const result = await service.onStreamerRedemption({
        redemptionId: 'red-123',
        rewardId: 'reward-123',
        streamerId: 'streamer-123',
        streamerConfigId: 'sconfig-123',
        campaignId: 'campaign-123',
        eventId: 'event-123',
        twitchUserId: 'twitch-user-123',
        twitchUsername: 'TestViewer',
        amount: 1,
      })

      assert.isTrue(result.processed)
      assert.isTrue(result.isNewInstance)
      assert.isTrue(createIndividualCalled)
      assert.isTrue(addContributionCalled)
    } finally {
      ;(CampaignModule.campaign as any).findOrFail = origFindOrFail
    }
  })

  test('should add contribution to existing instance', async ({ assert }) => {
    let addContributionCalled = false
    const existingInstance = createMockGamificationInstance({ status: 'active' })

    const service = createService({
      instanceManager: {
        getActiveOrArmedInstanceForStreamer: async () => existingInstance,
        addContribution: async () => {
          addContributionCalled = true
          return { instance: existingInstance, objectiveReached: false }
        },
      },
    })

    ;(service as any).getCampaignConfig = async () => ({
      isEnabled: true,
      campaignId: 'campaign-123',
      eventId: 'event-123',
      event: createMockGamificationEvent(),
      load: async () => {},
    })
    ;(service as any).broadcastProgress = () => {}

    const result = await service.onStreamerRedemption({
      redemptionId: 'red-123',
      rewardId: 'reward-123',
      streamerId: 'streamer-123',
      streamerConfigId: 'sconfig-123',
      campaignId: 'campaign-123',
      eventId: 'event-123',
      twitchUserId: 'twitch-user-123',
      twitchUsername: 'TestViewer',
      amount: 1,
    })

    assert.isTrue(result.processed)
    assert.isFalse(result.isNewInstance)
    assert.isTrue(addContributionCalled)
  })

  test('should arm instance when objective reached', async ({ assert }) => {
    let armCalled = false
    const activeInstance = createMockGamificationInstance({ status: 'active' })

    const service = createService({
      instanceManager: {
        getActiveOrArmedInstanceForStreamer: async () => activeInstance,
        addContribution: async () => ({
          instance: { ...activeInstance, status: 'active' },
          objectiveReached: true,
        }),
        armInstance: async () => {
          armCalled = true
          return createMockGamificationInstance({ status: 'armed' })
        },
      },
    })

    ;(service as any).getCampaignConfig = async () => ({
      isEnabled: true,
      campaignId: 'campaign-123',
      eventId: 'event-123',
      event: createMockGamificationEvent(),
      load: async () => {},
    })
    ;(service as any).broadcastProgress = () => {}
    ;(service as any).broadcastInstanceArmed = () => {}

    const result = await service.onStreamerRedemption({
      redemptionId: 'red-123',
      rewardId: 'reward-123',
      streamerId: 'streamer-123',
      streamerConfigId: 'sconfig-123',
      campaignId: 'campaign-123',
      eventId: 'event-123',
      twitchUserId: 'twitch-user-123',
      twitchUsername: 'TestViewer',
      amount: 1,
    })

    assert.isTrue(result.processed)
    assert.isTrue(result.objectiveReached)
    assert.isTrue(result.isArmed)
    assert.isTrue(armCalled)
  })

  test('should return processed:false when instance does not accept contributions', async ({
    assert,
  }) => {
    const armedInstance = createMockGamificationInstance({
      status: 'armed',
      get acceptsContributions() {
        return false
      },
    })

    const service = createService({
      instanceManager: {
        getActiveOrArmedInstanceForStreamer: async () => armedInstance,
      },
    })

    ;(service as any).getCampaignConfig = async () => ({
      isEnabled: true,
      campaignId: 'campaign-123',
      eventId: 'event-123',
      event: createMockGamificationEvent(),
      load: async () => {},
    })

    const result = await service.onStreamerRedemption({
      redemptionId: 'red-123',
      rewardId: 'reward-123',
      streamerId: 'streamer-123',
      streamerConfigId: 'sconfig-123',
      campaignId: 'campaign-123',
      eventId: 'event-123',
      twitchUserId: 'twitch-user-123',
      twitchUsername: 'TestViewer',
      amount: 1,
    })

    assert.isFalse(result.processed)
  })
})
