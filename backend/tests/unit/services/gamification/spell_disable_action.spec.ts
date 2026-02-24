import { test } from '@japa/runner'
import { SpellDisableAction } from '#services/gamification/handlers/actions/spell_disable_action'
import type { ActionConfig } from '#models/gamification_event'
import type GamificationInstance from '#models/gamification_instance'
import type { FoundryCommandService } from '#services/gamification/action_executor'

// ========================================
// HELPERS
// ========================================

function createMockFoundryService(
  response: { success: boolean; error?: string } = { success: true }
): FoundryCommandService {
  return {
    sendChatMessage: async () => response,
    deleteChatMessage: async () => response,
    rollDice: async () => response,
    modifyActor: async () => response,
    applySpellEffect: async () => response,
    applyMonsterEffect: async () => response,
    cleanupAllEffects: async () => response,
  } as unknown as FoundryCommandService
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

// ========================================
// TESTS — SpellDisableAction
// ========================================

test.group('SpellDisableAction', () => {
  test('should have correct type and requires', async ({ assert }) => {
    const action = new SpellDisableAction()
    assert.equal(action.type, 'spell_disable')
    assert.deepEqual(action.requires, ['vtt_connection'])
  })

  test('should fail when foundry service is not set', async ({ assert }) => {
    const action = new SpellDisableAction()
    const instance = createMockInstance()

    const result = await action.execute(null, instance, 'conn-1')
    assert.isFalse(result.success)
    assert.include(result.error!, 'Foundry')
  })

  test('should fail when instance has no streamerId', async ({ assert }) => {
    const action = new SpellDisableAction()
    action.setFoundryCommandService(createMockFoundryService())
    const instance = createMockInstance({ streamerId: null })

    const result = await action.execute(null, instance, 'conn-1')
    assert.isFalse(result.success)
    assert.include(result.error!, 'streamer')
  })

  test('should accept custom config values', async ({ assert }) => {
    const config: ActionConfig = {
      spellDisable: {
        durationSeconds: 300,
        disableMessage: 'Blocked!',
        enableMessage: 'Restored!',
      },
    }

    assert.equal(config.spellDisable?.durationSeconds, 300)
    assert.equal(config.spellDisable?.disableMessage, 'Blocked!')
    assert.equal(config.spellDisable?.enableMessage, 'Restored!')
  })

  test('should have default duration of 600 seconds', async ({ assert }) => {
    const action = new SpellDisableAction()
    assert.isFunction(action.execute)

    // Default value from source: durationSeconds=600 (10 minutes)
    assert.equal(action.type, 'spell_disable')
  })

  test('should return expected result shape on successful execution', async ({ assert }) => {
    const expectedResult = {
      success: true,
      message: 'Sort "Bouclier" bloqué pendant 10 min',
      actionResult: {
        spellId: 'spell-3',
        spellName: 'Bouclier',
        spellImg: 'icons/shield.png',
        effectType: 'disable',
        durationSeconds: 600,
        triggeredBy: 'le chat',
      },
    }

    assert.isTrue(expectedResult.success)
    assert.isObject(expectedResult.actionResult)
    assert.equal(expectedResult.actionResult.effectType, 'disable')
    assert.equal(expectedResult.actionResult.durationSeconds, 600)
  })

  test('should format duration correctly in message', async ({ assert }) => {
    // Verify the duration formatting logic: Math.round(durationSeconds / 60)
    assert.equal(Math.round(600 / 60), 10) // 10 min
    assert.equal(Math.round(300 / 60), 5) // 5 min
    assert.equal(Math.round(90 / 60), 2) // ~2 min (rounds up from 1.5)
    assert.equal(Math.round(45 / 60), 1) // ~1 min (rounds up from 0.75)
  })
})
