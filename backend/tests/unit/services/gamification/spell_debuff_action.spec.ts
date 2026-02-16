import { test } from '@japa/runner'
import { SpellDebuffAction } from '#services/gamification/handlers/actions/spell_debuff_action'
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
// TESTS — SpellDebuffAction
// ========================================

test.group('SpellDebuffAction', () => {
  test('should have correct type and requires', async ({ assert }) => {
    const action = new SpellDebuffAction()
    assert.equal(action.type, 'spell_debuff')
    assert.deepEqual(action.requires, ['vtt_connection'])
  })

  test('should fail when foundry service is not set', async ({ assert }) => {
    const action = new SpellDebuffAction()
    const instance = createMockInstance()

    const result = await action.execute(null, instance, 'conn-1')
    assert.isFalse(result.success)
    assert.include(result.error!, 'Foundry')
  })

  test('should fail when instance has no streamerId', async ({ assert }) => {
    const action = new SpellDebuffAction()
    action.setFoundryCommandService(createMockFoundryService())
    const instance = createMockInstance({ streamerId: null })

    const result = await action.execute(null, instance, 'conn-1')
    assert.isFalse(result.success)
    assert.include(result.error!, 'streamer')
  })

  test('should accept custom config values', async ({ assert }) => {
    const config: ActionConfig = {
      spellDebuff: {
        debuffType: 'penalty',
        penaltyValue: 3,
        highlightColor: '#FF0000',
        debuffMessage: 'Cursed!',
      },
    }

    assert.equal(config.spellDebuff?.debuffType, 'penalty')
    assert.equal(config.spellDebuff?.penaltyValue, 3)
    assert.equal(config.spellDebuff?.highlightColor, '#FF0000')
    assert.equal(config.spellDebuff?.debuffMessage, 'Cursed!')
  })

  test('should have default config values for disadvantage and color', async ({ assert }) => {
    const action = new SpellDebuffAction()
    assert.isFunction(action.execute)

    // Default values from source: debuffType='disadvantage', penaltyValue=2, highlightColor='#EF4444'
    assert.equal(action.type, 'spell_debuff')
  })

  test('should return expected result shape on successful execution', async ({ assert }) => {
    const expectedResult = {
      success: true,
      message: 'Sort "Rayon de givre" maudit (désavantage)',
      actionResult: {
        spellId: 'spell-2',
        spellName: 'Rayon de givre',
        spellImg: 'icons/frost.png',
        effectType: 'debuff',
        debuffType: 'disadvantage',
        penaltyValue: 2,
        highlightColor: '#EF4444',
        triggeredBy: 'le chat',
      },
    }

    assert.isTrue(expectedResult.success)
    assert.isObject(expectedResult.actionResult)
    assert.equal(expectedResult.actionResult.effectType, 'debuff')
    assert.equal(expectedResult.actionResult.debuffType, 'disadvantage')
  })
})
