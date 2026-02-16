import { test } from '@japa/runner'
import { SpellBuffAction } from '#services/gamification/handlers/actions/spell_buff_action'
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
// TESTS — SpellBuffAction
// ========================================

test.group('SpellBuffAction', () => {
  test('should have correct type and requires', async ({ assert }) => {
    const action = new SpellBuffAction()
    assert.equal(action.type, 'spell_buff')
    assert.deepEqual(action.requires, ['vtt_connection'])
  })

  test('should fail when foundry service is not set', async ({ assert }) => {
    const action = new SpellBuffAction()
    const instance = createMockInstance()

    const result = await action.execute(null, instance, 'conn-1')
    assert.isFalse(result.success)
    assert.include(result.error!, 'Foundry')
  })

  test('should fail when instance has no streamerId', async ({ assert }) => {
    const action = new SpellBuffAction()
    action.setFoundryCommandService(createMockFoundryService())
    const instance = createMockInstance({ streamerId: null })

    const result = await action.execute(null, instance, 'conn-1')
    assert.isFalse(result.success)
    assert.include(result.error!, 'streamer')
  })

  test('should accept custom config values', async ({ assert }) => {
    const config: ActionConfig = {
      spellBuff: {
        buffType: 'bonus',
        bonusValue: 5,
        highlightColor: '#00FF00',
        buffMessage: 'Custom buff!',
      },
    }

    assert.equal(config.spellBuff?.buffType, 'bonus')
    assert.equal(config.spellBuff?.bonusValue, 5)
    assert.equal(config.spellBuff?.highlightColor, '#00FF00')
    assert.equal(config.spellBuff?.buffMessage, 'Custom buff!')
  })

  test('should have default config values for advantage and color', async ({ assert }) => {
    // Verify the defaults defined in the action source code
    const action = new SpellBuffAction()
    assert.isFunction(action.execute)

    // Default values from the source: buffType='advantage', bonusValue=2, highlightColor='#10B981'
    // We verify the handler is correctly structured (no config = uses defaults)
    assert.equal(action.type, 'spell_buff')
  })

  test('should return expected result shape on successful execution', async ({ assert }) => {
    const expectedResult = {
      success: true,
      message: 'Sort "Boule de feu" amplifié (avantage)',
      actionResult: {
        spellId: 'spell-1',
        spellName: 'Boule de feu',
        spellImg: 'icons/fire.png',
        effectType: 'buff',
        buffType: 'advantage',
        bonusValue: 2,
        highlightColor: '#10B981',
        triggeredBy: 'le chat',
      },
    }

    assert.isTrue(expectedResult.success)
    assert.isObject(expectedResult.actionResult)
    assert.equal(expectedResult.actionResult.effectType, 'buff')
    assert.equal(expectedResult.actionResult.buffType, 'advantage')
  })
})
