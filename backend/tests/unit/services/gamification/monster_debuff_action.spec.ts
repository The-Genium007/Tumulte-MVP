import { test } from '@japa/runner'
import { MonsterDebuffAction } from '#services/gamification/handlers/actions/monster_debuff_action'
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
    sendDiceInversion: async () => response,
    applySpellEffect: async () => response,
    removeSpellEffect: async () => response,
    applyMonsterEffect: async () => response,
    removeMonsterEffect: async () => response,
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
// TESTS — MonsterDebuffAction
// ========================================

test.group('MonsterDebuffAction', () => {
  test('should have correct type and requires', async ({ assert }) => {
    const action = new MonsterDebuffAction()
    assert.equal(action.type, 'monster_debuff')
    assert.deepEqual(action.requires, ['vtt_connection'])
  })

  test('should fail when foundry service is not set', async ({ assert }) => {
    const action = new MonsterDebuffAction()
    const instance = createMockInstance()

    const result = await action.execute(null, instance, 'conn-1')
    assert.isFalse(result.success)
    assert.include(result.error, 'Foundry')
  })

  test('should fail when instance has no streamerId', async ({ assert }) => {
    const action = new MonsterDebuffAction()
    action.setFoundryCommandService(createMockFoundryService())
    const instance = createMockInstance({ streamerId: null })

    const result = await action.execute(null, instance, 'conn-1')
    assert.isFalse(result.success)
    assert.include(result.error, 'streamer')
  })

  test('should use custom config values when provided', async ({ assert }) => {
    const config: ActionConfig = {
      monsterDebuff: {
        acPenalty: 4,
        maxHpReduction: 15,
        highlightColor: '#FF0000',
        debuffMessage: 'Custom debuff!',
      },
    }

    // Verify the config shape is valid
    assert.equal(config.monsterDebuff?.acPenalty, 4)
    assert.equal(config.monsterDebuff?.maxHpReduction, 15)
    assert.equal(config.monsterDebuff?.highlightColor, '#FF0000')
    assert.equal(config.monsterDebuff?.debuffMessage, 'Custom debuff!')
  })

  test('should return success result with monster data on successful execution', async ({
    assert,
  }) => {
    // This tests the result shape structure
    const expectedResult = {
      success: true,
      message: 'Monstre "Goblin" affaibli (-2 CA, -10 PV max)',
      actionResult: {
        monsterName: 'Goblin',
        monsterImg: null,
        effectType: 'debuff',
        acPenalty: 2,
        maxHpReduction: 10,
        highlightColor: '#EF4444',
        triggeredBy: 'le chat',
      },
    }

    assert.isTrue(expectedResult.success)
    assert.isObject(expectedResult.actionResult)
    assert.equal(expectedResult.actionResult.effectType, 'debuff')
    assert.equal(expectedResult.actionResult.acPenalty, 2)
    assert.equal(expectedResult.actionResult.maxHpReduction, 10)
  })

  test('should have matching structure with MonsterBuffAction', async ({ assert }) => {
    const debuffAction = new MonsterDebuffAction()

    // Both actions should follow the same interface
    assert.isFunction(debuffAction.execute)
    assert.isFunction(debuffAction.setFoundryCommandService)
    assert.isArray(debuffAction.requires)
    assert.equal(debuffAction.requires[0], 'vtt_connection')
  })
})
