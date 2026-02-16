import { test } from '@japa/runner'
import { ActionExecutor } from '#services/gamification/action_executor'
import { ActionHandlerRegistry } from '#services/gamification/handlers/action_handler_registry'
import type { ActionHandler } from '#services/gamification/handlers/types'
import type { ActionConfig } from '#models/gamification_event'
import type GamificationEvent from '#models/gamification_event'
import type GamificationInstance from '#models/gamification_instance'
import type { ResultData } from '#models/gamification_instance'
import type {
  FoundryCommandService,
  TwitchChatNotifier,
} from '#services/gamification/action_executor'

// ========================================
// HELPERS
// ========================================

function createMockEvent(overrides: Record<string, unknown> = {}): GamificationEvent {
  return {
    id: 'event-1',
    actionType: 'dice_invert',
    actionConfig: null,
    triggerType: 'dice_critical',
    triggerConfig: null,
    ...overrides,
  } as GamificationEvent
}

function createMockInstance(overrides: Partial<GamificationInstance> = {}): GamificationInstance {
  return {
    id: 'instance-1',
    campaignId: 'campaign-1',
    streamerId: 'streamer-1',
    eventId: 'event-1',
    type: 'individual',
    status: 'armed',
    triggerData: null,
    objectiveTarget: 100,
    currentProgress: 100,
    ...overrides,
  } as GamificationInstance
}

function createSuccessHandler(type: string): ActionHandler {
  return {
    type,
    requires: [],
    execute: async () => ({
      success: true,
      message: `Action ${type} executed`,
      actionResult: { type },
    }),
  }
}

function createFailingHandler(type: string, error: string): ActionHandler {
  return {
    type,
    requires: [],
    execute: async () => ({ success: false, error }),
  }
}

function createThrowingHandler(type: string): ActionHandler {
  return {
    type,
    requires: [],
    execute: async () => {
      throw new Error(`Handler ${type} crashed`)
    },
  }
}

function createMockFoundryService(): FoundryCommandService {
  return {
    sendChatMessage: async () => ({ success: true }),
    deleteChatMessage: async () => ({ success: true }),
    rollDice: async () => ({ success: true }),
    modifyActor: async () => ({ success: true }),
    applySpellEffect: async () => ({ success: true }),
    applyMonsterEffect: async () => ({ success: true }),
    cleanupAllEffects: async () => ({ success: true }),
  } as unknown as FoundryCommandService
}

// ========================================
// TESTS — ActionExecutor
// ========================================

test.group('ActionExecutor — registry not set', () => {
  test('should return error when registry is not provided', async ({ assert }) => {
    const executor = new ActionExecutor()
    const event = createMockEvent()
    const instance = createMockInstance()

    const result = await executor.execute(event, instance, 'conn-1')

    assert.isFalse(result.success)
    assert.include(result.error!, 'Registry')
  })
})

test.group('ActionExecutor — handler lookup', () => {
  test('should return error when handler is not found for action type', async ({ assert }) => {
    const registry = new ActionHandlerRegistry()
    const executor = new ActionExecutor(registry)

    const event = createMockEvent({ actionType: 'unknown_action' })
    const instance = createMockInstance()

    const result = await executor.execute(event, instance, 'conn-1')

    assert.isFalse(result.success)
    assert.include(result.error!, 'unknown_action')
  })

  test('should delegate execution to the correct handler', async ({ assert }) => {
    const registry = new ActionHandlerRegistry()
    let executeCalled = false

    const handler: ActionHandler = {
      type: 'dice_invert',
      requires: [],
      execute: async () => {
        executeCalled = true
        return { success: true, message: 'Inverted' }
      },
    }
    registry.register(handler)

    const executor = new ActionExecutor(registry)
    const event = createMockEvent({ actionType: 'dice_invert' })
    const instance = createMockInstance()

    const result = await executor.execute(event, instance, 'conn-1')

    assert.isTrue(executeCalled)
    assert.isTrue(result.success)
    assert.equal(result.message, 'Inverted')
  })

  test('should pass actionConfig, instance and connectionId to handler', async ({ assert }) => {
    const registry = new ActionHandlerRegistry()
    let receivedConfig: ActionConfig | null = null
    let receivedInstance: GamificationInstance | null = null
    let receivedConnectionId: string = ''

    const handler: ActionHandler = {
      type: 'dice_invert',
      requires: [],
      execute: async (config, inst, connId) => {
        receivedConfig = config
        receivedInstance = inst
        receivedConnectionId = connId
        return { success: true }
      },
    }
    registry.register(handler)

    const executor = new ActionExecutor(registry)
    const actionConfig: ActionConfig = { diceInvert: { trollMessage: 'Trolled!' } }
    const event = createMockEvent({ actionType: 'dice_invert', actionConfig })
    const instance = createMockInstance({ id: 'inst-42' })

    await executor.execute(event, instance, 'conn-99')

    assert.deepEqual(receivedConfig, actionConfig)
    assert.equal(receivedInstance!.id, 'inst-42')
    assert.equal(receivedConnectionId, 'conn-99')
  })
})

test.group('ActionExecutor — error handling', () => {
  test('should catch handler exceptions and return error result', async ({ assert }) => {
    const registry = new ActionHandlerRegistry()
    registry.register(createThrowingHandler('dice_invert'))

    const executor = new ActionExecutor(registry)
    const event = createMockEvent({ actionType: 'dice_invert' })
    const instance = createMockInstance()

    const result = await executor.execute(event, instance, 'conn-1')

    assert.isFalse(result.success)
    assert.include(result.error!, 'crashed')
  })

  test('should return handler error result when handler fails gracefully', async ({ assert }) => {
    const registry = new ActionHandlerRegistry()
    registry.register(createFailingHandler('dice_invert', 'Connection lost'))

    const executor = new ActionExecutor(registry)
    const event = createMockEvent({ actionType: 'dice_invert' })
    const instance = createMockInstance()

    const result = await executor.execute(event, instance, 'conn-1')

    assert.isFalse(result.success)
    assert.equal(result.error, 'Connection lost')
  })
})

test.group('ActionExecutor — Twitch chat notification', () => {
  test('should send Twitch chat notification on successful action with known type', async ({
    assert,
  }) => {
    const registry = new ActionHandlerRegistry()
    registry.register({
      type: 'dice_invert',
      requires: [],
      execute: async (): Promise<ResultData> => ({
        success: true,
        message: 'Inverted',
        actionResult: { originalResult: 18, invertedResult: 3 },
      }),
    })

    const executor = new ActionExecutor(registry)

    let sentMessage: string = ''
    let sentStreamerId: string = ''
    const mockNotifier: TwitchChatNotifier = {
      sendMessage: async (streamerId, message) => {
        sentStreamerId = streamerId
        sentMessage = message
      },
    }
    executor.setTwitchChatNotifier(mockNotifier)

    const event = createMockEvent({ actionType: 'dice_invert' })
    const instance = createMockInstance({ streamerId: 'streamer-42' })

    await executor.execute(event, instance, 'conn-1')

    // Give the fire-and-forget promise a tick to resolve
    await new Promise((resolve) => setTimeout(resolve, 10))

    assert.equal(sentStreamerId, 'streamer-42')
    assert.isTrue(sentMessage.length > 0)
  })

  test('should NOT send notification when action fails', async ({ assert }) => {
    const registry = new ActionHandlerRegistry()
    registry.register(createFailingHandler('dice_invert', 'Oops'))

    const executor = new ActionExecutor(registry)

    let notified = false
    const mockNotifier: TwitchChatNotifier = {
      sendMessage: async () => {
        notified = true
      },
    }
    executor.setTwitchChatNotifier(mockNotifier)

    const event = createMockEvent({ actionType: 'dice_invert' })
    const instance = createMockInstance()

    await executor.execute(event, instance, 'conn-1')
    await new Promise((resolve) => setTimeout(resolve, 10))

    assert.isFalse(notified)
  })

  test('should NOT send notification when streamerId is null', async ({ assert }) => {
    const registry = new ActionHandlerRegistry()
    registry.register(createSuccessHandler('dice_invert'))

    const executor = new ActionExecutor(registry)

    let notified = false
    const mockNotifier: TwitchChatNotifier = {
      sendMessage: async () => {
        notified = true
      },
    }
    executor.setTwitchChatNotifier(mockNotifier)

    const event = createMockEvent({ actionType: 'dice_invert' })
    const instance = createMockInstance({ streamerId: null })

    await executor.execute(event, instance, 'conn-1')
    await new Promise((resolve) => setTimeout(resolve, 10))

    assert.isFalse(notified)
  })

  test('should NOT crash when Twitch chat notification fails', async ({ assert }) => {
    const registry = new ActionHandlerRegistry()
    registry.register(createSuccessHandler('dice_invert'))

    const executor = new ActionExecutor(registry)

    const mockNotifier: TwitchChatNotifier = {
      sendMessage: async () => {
        throw new Error('Twitch chat is down')
      },
    }
    executor.setTwitchChatNotifier(mockNotifier)

    const event = createMockEvent({ actionType: 'dice_invert' })
    const instance = createMockInstance()

    // Should not throw
    const result = await executor.execute(event, instance, 'conn-1')
    await new Promise((resolve) => setTimeout(resolve, 10))

    assert.isTrue(result.success)
  })

  test('should NOT send notification when notifier is not set', async ({ assert }) => {
    const registry = new ActionHandlerRegistry()
    registry.register(createSuccessHandler('dice_invert'))

    const executor = new ActionExecutor(registry)
    // Do NOT call setTwitchChatNotifier

    const event = createMockEvent({ actionType: 'dice_invert' })
    const instance = createMockInstance()

    // Should not throw
    const result = await executor.execute(event, instance, 'conn-1')
    assert.isTrue(result.success)
  })
})

test.group('ActionExecutor — Foundry service propagation', () => {
  test('should propagate FoundryCommandService to all handlers with setter', async ({ assert }) => {
    const registry = new ActionHandlerRegistry()

    let serviceReceived = false
    const handlerWithSetter: ActionHandler & {
      setFoundryCommandService: (s: FoundryCommandService) => void
    } = {
      type: 'spell_buff',
      requires: ['vtt_connection'],
      execute: async () => ({ success: true }),
      setFoundryCommandService: () => {
        serviceReceived = true
      },
    }

    const handlerWithout: ActionHandler = {
      type: 'chat_message',
      requires: [],
      execute: async () => ({ success: true }),
    }

    registry.register(handlerWithSetter)
    registry.register(handlerWithout)

    const executor = new ActionExecutor(registry)
    executor.setFoundryCommandService(createMockFoundryService())

    assert.isTrue(serviceReceived)
  })

  test('should not crash when propagating to handlers without setter', async ({ assert }) => {
    const registry = new ActionHandlerRegistry()
    registry.register(createSuccessHandler('chat_message'))

    const executor = new ActionExecutor(registry)

    // Should not throw
    executor.setFoundryCommandService(createMockFoundryService())

    assert.isTrue(true)
  })

  test('should handle empty registry for Foundry propagation', async ({ assert }) => {
    const registry = new ActionHandlerRegistry()
    const executor = new ActionExecutor(registry)

    // Should not throw
    executor.setFoundryCommandService(createMockFoundryService())

    assert.isTrue(true)
  })
})
