import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { InstanceManager } from '#services/gamification/instance_manager'
import type GamificationInstance from '#models/gamification_instance'
import type GamificationEvent from '#models/gamification_event'
import type CampaignGamificationConfig from '#models/campaign_gamification_config'

/**
 * Unit tests for InstanceManager
 *
 * The service manages the full gamification instance lifecycle:
 * - Instance creation (individual and group)
 * - Contribution tracking and objective checking
 * - State transitions: active → armed → completed / expired / cancelled
 * - Cooldown management
 * - Batch expiration via checkAndExpireInstances
 *
 * Note: Methods that call Lucid model statics (GamificationInstance.query(),
 * GamificationContribution.query(), GamificationInstance.create()) require
 * functional tests with a real DB. These unit tests focus on:
 * - State transition logic via mock model instances with stubbed .save()
 * - Orchestration through injected ObjectiveCalculator, ActionExecutor,
 *   ExecutionTracker dependencies
 * - Business logic that does not depend on a live database
 */

// ========================================
// MOCK FACTORIES
// ========================================

function createMockObjectiveCalculator(overrides: Record<string, unknown> = {}) {
  return {
    calculateIndividual: (_viewerCount: number, _config: unknown, _event: unknown) => 50,
    calculateGroup: (_streamersData: unknown[], _config: unknown, _event: unknown) => ({
      totalObjective: 150,
      streamerSnapshots: [],
    }),
    recalculateIfSignificantChange: () => null,
    calculateTotalCost: (objective: number, costPerClick: number) => objective * costPerClick,
    ...overrides,
  }
}

function createMockActionExecutor(overrides: Record<string, unknown> = {}) {
  return {
    setFoundryCommandService: () => {},
    execute: async () => ({ success: true, message: 'Action executed' }),
    ...overrides,
  }
}

function createMockExecutionTracker(overrides: Record<string, unknown> = {}) {
  return {
    markPendingExecution: async () => {},
    markExecuted: async () => null,
    getPendingInstances: async () => [],
    isPending: async () => false,
    ...overrides,
  }
}

function createMockInstance(overrides: Partial<GamificationInstance> = {}): GamificationInstance {
  const instance = {
    id: 'instance-123',
    campaignId: 'campaign-123',
    eventId: 'event-123',
    type: 'individual' as const,
    status: 'active' as const,
    objectiveTarget: 100,
    currentProgress: 0,
    duration: 300,
    startsAt: DateTime.now(),
    expiresAt: DateTime.now().plus({ minutes: 5 }),
    completedAt: null,
    resultData: null,
    cooldownEndsAt: null,
    executionStatus: null,
    executedAt: null,
    armedAt: null,
    streamerId: 'streamer-123',
    viewerCountAtStart: 50,
    triggerData: null,
    streamerSnapshots: null,
    createdAt: DateTime.now(),
    updatedAt: DateTime.now(),
    save: async function (): Promise<GamificationInstance> {
      return this as unknown as GamificationInstance
    },
    load: async () => {},
    get isActive(): boolean {
      return (this.status as string) === 'active' && DateTime.now() < (this.expiresAt as DateTime)
    },
    get isObjectiveReached(): boolean {
      return (this.currentProgress as number) >= (this.objectiveTarget as number)
    },
    get progressPercentage(): number {
      if ((this.objectiveTarget as number) === 0) return 100
      return Math.min(
        100,
        Math.round(((this.currentProgress as number) / (this.objectiveTarget as number)) * 100)
      )
    },
    get remainingSeconds(): number {
      return 300
    },
    get isArmed(): boolean {
      return (this.status as string) === 'armed'
    },
    get canBeConsumed(): boolean {
      return (this.status as string) === 'armed'
    },
    get acceptsContributions(): boolean {
      return (this.status as string) === 'active'
    },
    ...overrides,
  }

  return instance as unknown as GamificationInstance
}

function createMockEvent(overrides: Partial<GamificationEvent> = {}): GamificationEvent {
  return {
    id: 'event-123',
    slug: 'dice_critical',
    name: 'Dé Critique',
    type: 'individual',
    triggerType: 'dice_critical',
    actionType: 'dice_invert',
    cooldownType: 'time',
    cooldownConfig: { durationSeconds: 300 },
    defaultCost: 100,
    defaultObjectiveCoefficient: 0.1,
    defaultMinimumObjective: 5,
    defaultDuration: 300,
    triggerConfig: {
      criticalSuccess: { enabled: true },
      criticalFailure: { enabled: true },
    },
    actionConfig: {},
    ...overrides,
  } as unknown as GamificationEvent
}

function createMockConfig(
  overrides: Partial<CampaignGamificationConfig> = {}
): CampaignGamificationConfig {
  return {
    id: 'config-123',
    campaignId: 'campaign-123',
    eventId: 'event-123',
    isEnabled: true,
    cost: null,
    objectiveCoefficient: null,
    minimumObjective: null,
    duration: null,
    cooldown: 300,
    maxClicksPerUserPerSession: 0,
    twitchRewardId: null,
    getEffectiveCost: (event: GamificationEvent) => event.defaultCost,
    getEffectiveCoefficient: (event: GamificationEvent) => event.defaultObjectiveCoefficient,
    getEffectiveMinimumObjective: (event: GamificationEvent) => event.defaultMinimumObjective,
    getEffectiveDuration: (event: GamificationEvent) => event.defaultDuration,
    ...overrides,
  } as unknown as CampaignGamificationConfig
}

function createManager(deps: {
  objectiveCalculator?: Record<string, unknown>
  actionExecutor?: Record<string, unknown>
  executionTracker?: Record<string, unknown>
}) {
  return new InstanceManager(
    createMockObjectiveCalculator(deps.objectiveCalculator) as any,
    createMockActionExecutor(deps.actionExecutor) as any,
    createMockExecutionTracker(deps.executionTracker) as any
  )
}

// ========================================
// TESTS — setFoundryCommandService
// ========================================

test.group('InstanceManager - setFoundryCommandService', () => {
  test('should propagate foundry service to actionExecutor', async ({ assert }) => {
    let setFoundryCalled = false

    const manager = createManager({
      actionExecutor: {
        setFoundryCommandService: () => {
          setFoundryCalled = true
        },
      },
    })

    const mockFoundryService = { sendChatMessage: async () => ({ success: true }) }
    manager.setFoundryCommandService(mockFoundryService as any)

    assert.isTrue(setFoundryCalled)
  })
})

// ========================================
// TESTS — expire
// ========================================

test.group('InstanceManager - expire', () => {
  test('should set status to expired and call save', async ({ assert }) => {
    let saveCalled = false
    const instance = createMockInstance({
      status: 'active',
      save: async function () {
        saveCalled = true
        return this as unknown as GamificationInstance
      },
    })

    const manager = createManager({})
    const result = await manager.expire(instance)

    assert.equal(result.status, 'expired')
    assert.isTrue(saveCalled)
  })

  test('should return the updated instance', async ({ assert }) => {
    const instance = createMockInstance({
      id: 'inst-expire-test',
      status: 'active',
    })

    const manager = createManager({})
    const result = await manager.expire(instance)

    assert.equal(result.id, 'inst-expire-test')
    assert.equal(result.status, 'expired')
  })

  test('should expire an instance regardless of current progress', async ({ assert }) => {
    const partiallyFilledInstance = createMockInstance({
      status: 'active',
      currentProgress: 42,
      objectiveTarget: 100,
    })

    const manager = createManager({})
    const result = await manager.expire(partiallyFilledInstance)

    assert.equal(result.status, 'expired')
    assert.equal(result.currentProgress, 42)
  })
})

// ========================================
// TESTS — cancel
// ========================================

test.group('InstanceManager - cancel', () => {
  test('should set status to cancelled and call save', async ({ assert }) => {
    let saveCalled = false
    const instance = createMockInstance({
      status: 'active',
      save: async function () {
        saveCalled = true
        return this as unknown as GamificationInstance
      },
    })

    const manager = createManager({})
    const result = await manager.cancel(instance)

    assert.equal(result.status, 'cancelled')
    assert.isTrue(saveCalled)
  })

  test('should return the updated instance', async ({ assert }) => {
    const instance = createMockInstance({
      id: 'inst-cancel-test',
      status: 'active',
    })

    const manager = createManager({})
    const result = await manager.cancel(instance)

    assert.equal(result.id, 'inst-cancel-test')
    assert.equal(result.status, 'cancelled')
  })

  test('should cancel an armed instance', async ({ assert }) => {
    const armedInstance = createMockInstance({
      status: 'armed',
    })

    const manager = createManager({})
    const result = await manager.cancel(armedInstance)

    assert.equal(result.status, 'cancelled')
  })
})

// ========================================
// TESTS — armInstance
// ========================================

test.group('InstanceManager - armInstance', () => {
  test('should set status to armed and record armedAt', async ({ assert }) => {
    let saveCalled = false
    const instance = createMockInstance({
      status: 'active',
      armedAt: null,
      save: async function () {
        saveCalled = true
        return this as unknown as GamificationInstance
      },
    })

    const manager = createManager({})
    const result = await manager.armInstance(instance)

    assert.equal(result.status, 'armed')
    assert.isNotNull(result.armedAt)
    assert.isTrue(saveCalled)
  })

  test('should return the updated instance', async ({ assert }) => {
    const instance = createMockInstance({
      id: 'inst-arm-test',
      status: 'active',
      armedAt: null,
    })

    const manager = createManager({})
    const result = await manager.armInstance(instance)

    assert.equal(result.id, 'inst-arm-test')
    assert.equal(result.status, 'armed')
  })

  test('should set armedAt to a DateTime close to now', async ({ assert }) => {
    const before = DateTime.now()
    const instance = createMockInstance({ status: 'active', armedAt: null })

    const manager = createManager({})
    const result = await manager.armInstance(instance)

    const after = DateTime.now()

    assert.isNotNull(result.armedAt)
    assert.isTrue(result.armedAt! >= before)
    assert.isTrue(result.armedAt! <= after)
  })
})

// ========================================
// TESTS — complete (immediate execution)
// ========================================

test.group('InstanceManager - complete (executeImmediately=true)', () => {
  test('should mark instance as completed and execute action immediately', async ({ assert }) => {
    let saveCalled = false
    let executeCalled = false
    const instance = createMockInstance({
      status: 'active',
      save: async function () {
        saveCalled = true
        return this as unknown as GamificationInstance
      },
    })

    const manager = createManager({
      actionExecutor: {
        execute: async () => {
          executeCalled = true
          return { success: true, message: 'Dice inverted' }
        },
      },
    })

    const event = createMockEvent()
    const config = createMockConfig()
    const result = await manager.complete(instance, event, config, 'conn-123', true)

    assert.equal(result.status, 'completed')
    assert.isNotNull(result.completedAt)
    assert.isTrue(executeCalled)
    assert.isTrue(saveCalled)
    assert.equal(result.executionStatus, 'executed')
  })

  test('should set executionStatus to failed when action executor fails', async ({ assert }) => {
    const instance = createMockInstance({ status: 'active' })

    const manager = createManager({
      actionExecutor: {
        execute: async () => ({
          success: false,
          error: 'VTT connection lost',
        }),
      },
    })

    const event = createMockEvent()
    const config = createMockConfig()
    const result = await manager.complete(instance, event, config, 'conn-123', true)

    assert.equal(result.status, 'completed')
    assert.equal(result.executionStatus, 'failed')
    assert.isNotNull(result.resultData)
    assert.isFalse(result.resultData!.success)
  })

  test('should calculate cooldownEndsAt from config.cooldown', async ({ assert }) => {
    const instance = createMockInstance({ status: 'active', cooldownEndsAt: null })
    const manager = createManager({})

    const event = createMockEvent()
    const config = createMockConfig({ cooldown: 600 })

    const before = DateTime.now()
    const result = await manager.complete(instance, event, config, 'conn-123', true)
    const after = DateTime.now()

    assert.isNotNull(result.cooldownEndsAt)
    // cooldown is 600s, so cooldownEndsAt should be roughly 10 minutes from now
    const expectedMin = before.plus({ seconds: 590 })
    const expectedMax = after.plus({ seconds: 610 })
    assert.isTrue(result.cooldownEndsAt! >= expectedMin)
    assert.isTrue(result.cooldownEndsAt! <= expectedMax)
  })

  test('should use event cooldownConfig when config.cooldown is null', async ({ assert }) => {
    const instance = createMockInstance({ status: 'active', cooldownEndsAt: null })
    const manager = createManager({})

    const event = createMockEvent({
      cooldownType: 'time',
      cooldownConfig: { durationSeconds: 120 },
    })
    const config = createMockConfig({ cooldown: null })

    const before = DateTime.now()
    const result = await manager.complete(instance, event, config, 'conn-123', true)
    const after = DateTime.now()

    assert.isNotNull(result.cooldownEndsAt)
    const expectedMin = before.plus({ seconds: 110 })
    const expectedMax = after.plus({ seconds: 130 })
    assert.isTrue(result.cooldownEndsAt! >= expectedMin)
    assert.isTrue(result.cooldownEndsAt! <= expectedMax)
  })

  test('should set cooldownEndsAt to null when cooldown is 0', async ({ assert }) => {
    const instance = createMockInstance({ status: 'active', cooldownEndsAt: null })
    const manager = createManager({})

    const config = createMockConfig({ cooldown: 0 })
    const event = createMockEvent({ cooldownConfig: { durationSeconds: 0 } })

    const result = await manager.complete(instance, event, config, 'conn-123', true)

    assert.isNull(result.cooldownEndsAt)
  })
})

// ========================================
// TESTS — complete (default: pending mode)
// ========================================

test.group('InstanceManager - complete (executeImmediately=false)', () => {
  test('should mark instance as completed with pending execution status', async ({ assert }) => {
    let markPendingCalled = false
    let saveCalled = false
    const instance = createMockInstance({ status: 'active' })

    const manager = createManager({
      executionTracker: {
        markPendingExecution: async () => {
          markPendingCalled = true
        },
      },
      actionExecutor: {
        execute: async () => {
          // Should NOT be called in non-immediate mode
          throw new Error('execute should not be called in pending mode')
        },
      },
    })
    // Stub save to track calls
    instance.save = async function () {
      saveCalled = true
      return this as unknown as GamificationInstance
    }

    const event = createMockEvent()
    const config = createMockConfig()
    const result = await manager.complete(instance, event, config, 'conn-123', false)

    assert.equal(result.status, 'completed')
    assert.equal(result.executionStatus, 'pending')
    assert.isNotNull(result.resultData)
    assert.isTrue(markPendingCalled)
    assert.isTrue(saveCalled)
  })

  test('should use pending mode by default (no executeImmediately arg)', async ({ assert }) => {
    let markPendingCalled = false
    const instance = createMockInstance({ status: 'active' })

    const manager = createManager({
      executionTracker: {
        markPendingExecution: async () => {
          markPendingCalled = true
        },
      },
    })

    const event = createMockEvent()
    const config = createMockConfig()

    // No fifth argument → defaults to false
    await manager.complete(instance, event, config, 'conn-123')

    assert.isTrue(markPendingCalled)
  })

  test('should pass event name and actionType to executionTracker.markPendingExecution', async ({
    assert,
  }) => {
    let receivedEventName = ''
    let receivedActionType = ''
    const instance = createMockInstance({ status: 'active' })

    const manager = createManager({
      executionTracker: {
        markPendingExecution: async (_inst: unknown, eventName: string, actionType: string) => {
          receivedEventName = eventName
          receivedActionType = actionType
        },
      },
    })

    const event = createMockEvent({ name: 'Dé Critique', actionType: 'dice_invert' })
    const config = createMockConfig()

    await manager.complete(instance, event, config, 'conn-123')

    assert.equal(receivedEventName, 'Dé Critique')
    assert.equal(receivedActionType, 'dice_invert')
  })
})

// ========================================
// TESTS — markExecuted
// ========================================

test.group('InstanceManager - markExecuted', () => {
  test('should delegate to executionTracker and return instance', async ({ assert }) => {
    const mockInstance = createMockInstance({ status: 'completed', executionStatus: 'executed' })

    const manager = createManager({
      executionTracker: {
        markExecuted: async (_instanceId: string, _success: boolean, _message?: string) => ({
          instance: mockInstance,
          payload: {
            instanceId: 'instance-123',
            eventName: 'Test',
            actionType: 'dice_invert',
            success: true,
          },
        }),
      },
    })

    const result = await manager.markExecuted('instance-123', true, 'Success')

    assert.isNotNull(result)
    assert.equal(result!.status, 'completed')
    assert.equal(result!.executionStatus, 'executed')
  })

  test('should return null when executionTracker returns null', async ({ assert }) => {
    const manager = createManager({
      executionTracker: {
        markExecuted: async () => null,
      },
    })

    const result = await manager.markExecuted('nonexistent-id', true)

    assert.isNull(result)
  })

  test('should pass success=false to executionTracker on failure', async ({ assert }) => {
    let receivedSuccess: boolean | null = null
    let receivedMessage: string | undefined

    const manager = createManager({
      executionTracker: {
        markExecuted: async (_id: string, success: boolean, message?: string) => {
          receivedSuccess = success
          receivedMessage = message
          return null
        },
      },
    })

    await manager.markExecuted('instance-123', false, 'VTT error')

    assert.isFalse(receivedSuccess)
    assert.equal(receivedMessage, 'VTT error')
  })
})

// ========================================
// TESTS — checkAndExpireInstances
// ========================================

test.group('InstanceManager - checkAndExpireInstances', () => {
  test('should expire all returned expired instances and return count', async ({ assert }) => {
    const expiredInstance1 = createMockInstance({ id: 'expired-1', status: 'active' })
    const expiredInstance2 = createMockInstance({ id: 'expired-2', status: 'active' })

    const manager = createManager({})

    // Stub the static query to return a thenable chain resolving to expired instances
    const GamificationInstanceModule = await import('#models/gamification_instance')
    const origQuery = GamificationInstanceModule.default.query

    ;(GamificationInstanceModule.default as any).query = () => {
      const chain: any = {
        where: () => chain,
        // When awaited, it resolves to the array of instances
        then: (resolve: (v: GamificationInstance[]) => void) =>
          Promise.resolve([expiredInstance1, expiredInstance2]).then(resolve),
        catch: (reject: (e: unknown) => void) =>
          Promise.resolve([expiredInstance1, expiredInstance2]).catch(reject),
      }
      return chain
    }

    try {
      const count = await manager.checkAndExpireInstances()

      assert.equal(count, 2)
      assert.equal(expiredInstance1.status, 'expired')
      assert.equal(expiredInstance2.status, 'expired')
    } finally {
      ;(GamificationInstanceModule.default as any).query = origQuery
    }
  })

  test('should return 0 when there are no expired instances', async ({ assert }) => {
    const manager = createManager({})

    const GamificationInstanceModule = await import('#models/gamification_instance')
    const origQuery = GamificationInstanceModule.default.query

    ;(GamificationInstanceModule.default as any).query = () => {
      const chain: any = {
        where: () => chain,
        then: (resolve: (v: GamificationInstance[]) => void) => Promise.resolve([]).then(resolve),
        catch: (reject: (e: unknown) => void) => Promise.resolve([]).catch(reject),
      }
      return chain
    }

    try {
      const count = await manager.checkAndExpireInstances()
      assert.equal(count, 0)
    } finally {
      ;(GamificationInstanceModule.default as any).query = origQuery
    }
  })
})

// ========================================
// TESTS — isOnCooldown (via static query stub)
// ========================================

test.group('InstanceManager - isOnCooldown', () => {
  test('should return onCooldown=true when a completed instance has future cooldownEndsAt', async ({
    assert,
  }) => {
    const futureDateTime = DateTime.now().plus({ minutes: 5 })
    const completedInstance = createMockInstance({
      status: 'completed',
      cooldownEndsAt: futureDateTime,
    })

    const manager = createManager({})

    const GamificationInstanceModule = await import('#models/gamification_instance')
    const origQuery = GamificationInstanceModule.default.query

    ;(GamificationInstanceModule.default as any).query = () => {
      const chain: any = {
        where: () => chain,
        whereNotNull: () => chain,
        orderBy: () => chain,
        first: async () => completedInstance,
      }
      return chain
    }

    try {
      const result = await manager.isOnCooldown('campaign-123', 'event-123')

      assert.isTrue(result.onCooldown)
      assert.isNotNull(result.endsAt)
    } finally {
      ;(GamificationInstanceModule.default as any).query = origQuery
    }
  })

  test('should return onCooldown=false when no completed instance found', async ({ assert }) => {
    const manager = createManager({})

    const GamificationInstanceModule = await import('#models/gamification_instance')
    const origQuery = GamificationInstanceModule.default.query

    ;(GamificationInstanceModule.default as any).query = () => {
      const chain: any = {
        where: () => chain,
        whereNotNull: () => chain,
        orderBy: () => chain,
        first: async () => null,
      }
      return chain
    }

    try {
      const result = await manager.isOnCooldown('campaign-123', 'event-123')

      assert.isFalse(result.onCooldown)
      assert.isNull(result.endsAt)
    } finally {
      ;(GamificationInstanceModule.default as any).query = origQuery
    }
  })

  test('should filter by streamerId when provided', async ({ assert }) => {
    const capturedWhereArgs: Array<[string, string]> = []
    const manager = createManager({})

    const GamificationInstanceModule = await import('#models/gamification_instance')
    const origQuery = GamificationInstanceModule.default.query

    ;(GamificationInstanceModule.default as any).query = () => {
      const chain: any = {
        where: (col: string, val: string) => {
          capturedWhereArgs.push([col, val])
          return chain
        },
        whereNotNull: () => chain,
        orderBy: () => chain,
        first: async () => null,
      }
      return chain
    }

    try {
      await manager.isOnCooldown('campaign-123', 'event-123', 'streamer-456')

      // Verify streamerId was passed to a where clause
      const streamerWhereCall = capturedWhereArgs.find(([, val]) => val === 'streamer-456')
      assert.isNotNull(streamerWhereCall)
    } finally {
      ;(GamificationInstanceModule.default as any).query = origQuery
    }
  })

  test('should not add streamerId filter when streamerId is undefined', async ({ assert }) => {
    const capturedWhereArgs: Array<[string, string]> = []
    const manager = createManager({})

    const GamificationInstanceModule = await import('#models/gamification_instance')
    const origQuery = GamificationInstanceModule.default.query

    ;(GamificationInstanceModule.default as any).query = () => {
      const chain: any = {
        where: (col: string, val: string) => {
          capturedWhereArgs.push([col, val])
          return chain
        },
        whereNotNull: () => chain,
        orderBy: () => chain,
        first: async () => null,
      }
      return chain
    }

    try {
      await manager.isOnCooldown('campaign-123', 'event-123')

      // No streamerId in where args
      const streamerWhereCall = capturedWhereArgs.find(([col]) => col === 'streamerId')
      assert.isUndefined(streamerWhereCall)
    } finally {
      ;(GamificationInstanceModule.default as any).query = origQuery
    }
  })
})

// ========================================
// TESTS — resetCooldowns (via static query stub)
// ========================================

test.group('InstanceManager - resetCooldowns', () => {
  test('should return the number of updated rows', async ({ assert }) => {
    const manager = createManager({})

    const GamificationInstanceModule = await import('#models/gamification_instance')
    const origQuery = GamificationInstanceModule.default.query

    ;(GamificationInstanceModule.default as any).query = () => {
      const chain: any = {
        where: () => chain,
        whereNotNull: () => chain,
        update: async () => [7],
      }
      return chain
    }

    try {
      const count = await manager.resetCooldowns('campaign-123')
      assert.equal(count, 7)
    } finally {
      ;(GamificationInstanceModule.default as any).query = origQuery
    }
  })

  test('should return 0 when no cooldowns were reset', async ({ assert }) => {
    const manager = createManager({})

    const GamificationInstanceModule = await import('#models/gamification_instance')
    const origQuery = GamificationInstanceModule.default.query

    ;(GamificationInstanceModule.default as any).query = () => {
      const chain: any = {
        where: () => chain,
        whereNotNull: () => chain,
        update: async () => [0],
      }
      return chain
    }

    try {
      const count = await manager.resetCooldowns('campaign-123')
      assert.equal(count, 0)
    } finally {
      ;(GamificationInstanceModule.default as any).query = origQuery
    }
  })
})

// ========================================
// TESTS — consumeArmedInstance
// ========================================

test.group('InstanceManager - consumeArmedInstance', () => {
  test('should call complete with executeImmediately=true', async ({ assert }) => {
    let executeImmediately: boolean | undefined
    const instance = createMockInstance({ status: 'armed' })
    const event = createMockEvent()
    const config = createMockConfig()

    const manager = createManager({
      executionTracker: {
        markPendingExecution: async () => {},
      },
      actionExecutor: {
        execute: async () => {
          return { success: true }
        },
      },
    })

    // Spy on complete by stubbing the method
    const originalComplete = manager.complete.bind(manager)
    manager.complete = async (inst, ev, cfg, connId, execImm) => {
      executeImmediately = execImm
      return originalComplete(inst, ev, cfg, connId, execImm)
    }

    await manager.consumeArmedInstance(instance, event, config, 'conn-123')

    assert.isTrue(executeImmediately)
  })

  test('should merge diceRollData into triggerData before completing', async ({ assert }) => {
    const instance = createMockInstance({
      status: 'armed',
      triggerData: {
        activation: { triggeredBy: 'viewer', twitchUserId: 'u1', redemptionId: 'r1' },
      },
    })
    const event = createMockEvent()
    const config = createMockConfig()

    const manager = createManager({
      actionExecutor: {
        execute: async () => ({ success: true }),
      },
    })

    const diceRollData = {
      rollId: 'roll-999',
      characterId: 'char-1',
      vttCharacterId: 'vtt-char-1',
      characterName: 'Aragorn',
      formula: '1d20',
      result: 20,
      diceResults: [20],
      criticalType: 'success' as const,
      messageId: 'msg-1',
    }

    await manager.consumeArmedInstance(instance, event, config, 'conn-123', diceRollData)

    // triggerData should now contain diceRoll
    assert.isNotNull(instance.triggerData)
    assert.deepEqual(instance.triggerData!.diceRoll, diceRollData)
    // Original triggerData fields should be preserved
    assert.isNotNull(instance.triggerData!.activation)
  })

  test('should not modify triggerData when no diceRollData provided', async ({ assert }) => {
    const originalTriggerData = {
      activation: { triggeredBy: 'viewer', twitchUserId: 'u1', redemptionId: 'r1' },
    }
    const instance = createMockInstance({
      status: 'armed',
      triggerData: originalTriggerData,
    })
    const event = createMockEvent()
    const config = createMockConfig()

    const manager = createManager({
      actionExecutor: {
        execute: async () => ({ success: true }),
      },
    })

    await manager.consumeArmedInstance(instance, event, config, 'conn-123')

    assert.deepEqual(instance.triggerData, originalTriggerData)
  })
})

// ========================================
// TESTS — addContribution (static model stubs)
// ========================================

test.group('InstanceManager - addContribution', () => {
  test('should skip duplicate redemptions and return current state', async ({ assert }) => {
    const manager = createManager({})

    const existingContribution = { id: 'contrib-1', twitchRedemptionId: 'redemption-dup' }
    const mockInstance = createMockInstance({ currentProgress: 5, objectiveTarget: 10 })

    const GamificationContributionModule = await import('#models/gamification_contribution')
    const GamificationInstanceModule = await import('#models/gamification_instance')

    const origContribQuery = GamificationContributionModule.default.query
    const origFindOrFail = GamificationInstanceModule.default.findOrFail

    ;(GamificationContributionModule.default as any).query = () => ({
      where: () => ({
        first: async () => existingContribution,
      }),
    })
    ;(GamificationInstanceModule.default as any).findOrFail = async () => mockInstance

    try {
      const result = await manager.addContribution('instance-123', {
        streamerId: 'streamer-123',
        twitchUserId: 'twitch-user-1',
        twitchUsername: 'Viewer1',
        amount: 1,
        twitchRedemptionId: 'redemption-dup',
      })

      // Should return existing state without modifying progress
      assert.equal(result.instance.currentProgress, 5)
    } finally {
      ;(GamificationContributionModule.default as any).query = origContribQuery
      ;(GamificationInstanceModule.default as any).findOrFail = origFindOrFail
    }
  })

  test('should increment currentProgress by 1 for a valid contribution', async ({ assert }) => {
    const manager = createManager({})

    const mockInstance = createMockInstance({
      status: 'active',
      currentProgress: 3,
      objectiveTarget: 10,
      expiresAt: DateTime.now().plus({ minutes: 10 }),
    })

    const GamificationContributionModule = await import('#models/gamification_contribution')
    const GamificationInstanceModule = await import('#models/gamification_instance')

    const origContribQuery = GamificationContributionModule.default.query
    const origFindOrFail = GamificationInstanceModule.default.findOrFail
    const origContribCreate = GamificationContributionModule.default.create

    ;(GamificationContributionModule.default as any).query = () => ({
      where: () => ({
        first: async () => null, // No duplicate
      }),
    })
    ;(GamificationInstanceModule.default as any).findOrFail = async () => mockInstance
    ;(GamificationContributionModule.default as any).create = async () => ({})

    try {
      const result = await manager.addContribution('instance-123', {
        streamerId: 'streamer-123',
        twitchUserId: 'twitch-user-1',
        twitchUsername: 'Viewer1',
        amount: 1,
        twitchRedemptionId: 'redemption-new',
      })

      assert.equal(result.instance.currentProgress, 4)
    } finally {
      ;(GamificationContributionModule.default as any).query = origContribQuery
      ;(GamificationInstanceModule.default as any).findOrFail = origFindOrFail
      ;(GamificationContributionModule.default as any).create = origContribCreate
    }
  })

  test('should return objectiveReached=true when progress meets target', async ({ assert }) => {
    const manager = createManager({})

    const mockInstance = createMockInstance({
      status: 'active',
      currentProgress: 9,
      objectiveTarget: 10,
      expiresAt: DateTime.now().plus({ minutes: 10 }),
    })

    const GamificationContributionModule = await import('#models/gamification_contribution')
    const GamificationInstanceModule = await import('#models/gamification_instance')

    const origContribQuery = GamificationContributionModule.default.query
    const origFindOrFail = GamificationInstanceModule.default.findOrFail
    const origContribCreate = GamificationContributionModule.default.create

    ;(GamificationContributionModule.default as any).query = () => ({
      where: () => ({
        first: async () => null,
      }),
    })
    ;(GamificationInstanceModule.default as any).findOrFail = async () => mockInstance
    ;(GamificationContributionModule.default as any).create = async () => ({})

    try {
      const result = await manager.addContribution('instance-123', {
        streamerId: 'streamer-123',
        twitchUserId: 'twitch-user-1',
        twitchUsername: 'Viewer1',
        amount: 1,
        twitchRedemptionId: 'redemption-last',
      })

      // After incrementing, progress is 10 which equals target of 10
      assert.equal(result.instance.currentProgress, 10)
      assert.isTrue(result.objectiveReached)
    } finally {
      ;(GamificationContributionModule.default as any).query = origContribQuery
      ;(GamificationInstanceModule.default as any).findOrFail = origFindOrFail
      ;(GamificationContributionModule.default as any).create = origContribCreate
    }
  })

  test('should return objectiveReached=false and not modify progress for inactive instance', async ({
    assert,
  }) => {
    const manager = createManager({})

    // An expired instance (status active but past expiresAt) — isActive returns false
    const mockInstance = createMockInstance({
      status: 'active',
      currentProgress: 3,
      objectiveTarget: 10,
      expiresAt: DateTime.now().minus({ minutes: 5 }), // Already expired
    })

    const GamificationContributionModule = await import('#models/gamification_contribution')
    const GamificationInstanceModule = await import('#models/gamification_instance')

    const origContribQuery = GamificationContributionModule.default.query
    const origFindOrFail = GamificationInstanceModule.default.findOrFail

    ;(GamificationContributionModule.default as any).query = () => ({
      where: () => ({
        first: async () => null,
      }),
    })
    ;(GamificationInstanceModule.default as any).findOrFail = async () => mockInstance

    try {
      const result = await manager.addContribution('instance-123', {
        streamerId: 'streamer-123',
        twitchUserId: 'twitch-user-1',
        twitchUsername: 'Viewer1',
        amount: 1,
        twitchRedemptionId: 'redemption-expired',
      })

      // Progress should NOT be modified for an inactive instance
      assert.equal(result.instance.currentProgress, 3)
      assert.isFalse(result.objectiveReached)
    } finally {
      ;(GamificationContributionModule.default as any).query = origContribQuery
      ;(GamificationInstanceModule.default as any).findOrFail = origFindOrFail
    }
  })
})
