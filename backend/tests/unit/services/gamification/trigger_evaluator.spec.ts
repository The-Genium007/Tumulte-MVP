import { test } from '@japa/runner'
import { TriggerEvaluator } from '#services/gamification/trigger_evaluator'
import { TriggerHandlerRegistry } from '#services/gamification/handlers/trigger_handler_registry'
import type { TriggerHandler, TriggerEvaluationResult } from '#services/gamification/handlers/types'
import type GamificationEvent from '#models/gamification_event'

// ========================================
// HELPERS
// ========================================

function createMockEvent(overrides: Partial<GamificationEvent> = {}): GamificationEvent {
  return {
    id: 'event-1',
    triggerType: 'critical_success',
    triggerConfig: null,
    actionType: 'dice_invert',
    actionConfig: null,
    ...overrides,
  } as GamificationEvent
}

function createTriggerHandler(type: string, result: TriggerEvaluationResult): TriggerHandler {
  return {
    type,
    evaluate: () => result,
  }
}

// ========================================
// TESTS — TriggerEvaluator
// ========================================

test.group('TriggerEvaluator — handler lookup', () => {
  test('should return shouldTrigger=false when handler is not found', async ({ assert }) => {
    const registry = new TriggerHandlerRegistry()
    const evaluator = new TriggerEvaluator(registry)

    const event = createMockEvent({ triggerType: 'unknown_trigger' })
    const result = evaluator.evaluate(event, {})

    assert.isFalse(result.shouldTrigger)
    assert.isNull(result.triggerData)
    assert.include(result.reason!, 'unknown_trigger')
  })

  test('should delegate evaluation to the correct handler', async ({ assert }) => {
    const registry = new TriggerHandlerRegistry()
    registry.register(
      createTriggerHandler('critical_success', {
        shouldTrigger: true,
        triggerData: {
          diceRoll: {
            rollId: 'roll-1',
            formula: '1d20',
            result: 20,
            diceResults: [20],
            characterId: null,
            characterName: null,
          },
        },
      })
    )

    const evaluator = new TriggerEvaluator(registry)
    const event = createMockEvent({ triggerType: 'critical_success' })

    const result = evaluator.evaluate(event, { result: 20 })

    assert.isTrue(result.shouldTrigger)
    assert.isNotNull(result.triggerData)
    assert.equal(result.triggerData!.diceRoll!.result, 20)
  })

  test('should pass triggerConfig and data to handler', async ({ assert }) => {
    const registry = new TriggerHandlerRegistry()

    let receivedConfig: unknown = null
    let receivedData: unknown = null

    const handler: TriggerHandler = {
      type: 'critical_success',
      evaluate: (config, data) => {
        receivedConfig = config
        receivedData = data
        return { shouldTrigger: false, triggerData: null }
      },
    }
    registry.register(handler)

    const evaluator = new TriggerEvaluator(registry)
    const triggerConfig = { threshold: 20 }
    const event = createMockEvent({ triggerType: 'critical_success', triggerConfig })
    const inputData = { formula: '1d20', result: 15 }

    evaluator.evaluate(event, inputData)

    assert.deepEqual(receivedConfig, triggerConfig)
    assert.deepEqual(receivedData, inputData)
  })
})

test.group('TriggerEvaluator — trigger results', () => {
  test('should return shouldTrigger=false when handler says no', async ({ assert }) => {
    const registry = new TriggerHandlerRegistry()
    registry.register(
      createTriggerHandler('critical_success', {
        shouldTrigger: false,
        triggerData: null,
        reason: 'Roll was 15, not a critical',
      })
    )

    const evaluator = new TriggerEvaluator(registry)
    const event = createMockEvent({ triggerType: 'critical_success' })

    const result = evaluator.evaluate(event, {})

    assert.isFalse(result.shouldTrigger)
    assert.isNull(result.triggerData)
    assert.include(result.reason!, 'not a critical')
  })

  test('should return full trigger data when handler says yes', async ({ assert }) => {
    const registry = new TriggerHandlerRegistry()
    const triggerData = {
      diceRoll: {
        rollId: 'roll-99',
        characterId: 'char-1',
        characterName: 'Gandalf',
        formula: '1d20',
        result: 1,
        diceResults: [1],
        criticalType: 'failure' as const,
      },
    }

    registry.register(
      createTriggerHandler('critical_failure', {
        shouldTrigger: true,
        triggerData,
      })
    )

    const evaluator = new TriggerEvaluator(registry)
    const event = createMockEvent({ triggerType: 'critical_failure' })

    const result = evaluator.evaluate(event, {})

    assert.isTrue(result.shouldTrigger)
    assert.equal(result.triggerData!.diceRoll!.rollId, 'roll-99')
    assert.equal(result.triggerData!.diceRoll!.characterName, 'Gandalf')
    assert.equal(result.triggerData!.diceRoll!.criticalType, 'failure')
  })
})

test.group('TriggerEvaluator — isSupportedTriggerType', () => {
  test('should return true for registered trigger type', async ({ assert }) => {
    const registry = new TriggerHandlerRegistry()
    registry.register(
      createTriggerHandler('critical_success', {
        shouldTrigger: false,
        triggerData: null,
      })
    )

    const evaluator = new TriggerEvaluator(registry)

    assert.isTrue(evaluator.isSupportedTriggerType('critical_success'))
  })

  test('should return false for unregistered trigger type', async ({ assert }) => {
    const registry = new TriggerHandlerRegistry()
    const evaluator = new TriggerEvaluator(registry)

    assert.isFalse(evaluator.isSupportedTriggerType('unknown'))
  })
})

test.group('TriggerEvaluator — multiple handlers', () => {
  test('should select the correct handler among multiple registered', async ({ assert }) => {
    const registry = new TriggerHandlerRegistry()

    registry.register(
      createTriggerHandler('critical_success', {
        shouldTrigger: true,
        triggerData: {
          diceRoll: {
            rollId: 'crit-success',
            formula: '1d20',
            result: 20,
            diceResults: [20],
            characterId: null,
            characterName: null,
          },
        },
      })
    )

    registry.register(
      createTriggerHandler('critical_failure', {
        shouldTrigger: true,
        triggerData: {
          diceRoll: {
            rollId: 'crit-failure',
            formula: '1d20',
            result: 1,
            diceResults: [1],
            characterId: null,
            characterName: null,
          },
        },
      })
    )

    registry.register(
      createTriggerHandler('twitch_activation', {
        shouldTrigger: true,
        triggerData: {
          activation: { triggeredBy: 'viewer-1', twitchUserId: 'twitch-1', redemptionId: 'red-1' },
        },
      })
    )

    const evaluator = new TriggerEvaluator(registry)

    // Test critical_failure handler
    const event = createMockEvent({ triggerType: 'critical_failure' })
    const result = evaluator.evaluate(event, {})

    assert.isTrue(result.shouldTrigger)
    assert.equal(result.triggerData!.diceRoll!.rollId, 'crit-failure')

    // Test twitch_activation handler
    const event2 = createMockEvent({ triggerType: 'twitch_activation' })
    const result2 = evaluator.evaluate(event2, {})

    assert.isTrue(result2.shouldTrigger)
    assert.equal(result2.triggerData!.activation!.triggeredBy, 'viewer-1')
  })
})
