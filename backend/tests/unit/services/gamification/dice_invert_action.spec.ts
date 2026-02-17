import { test } from '@japa/runner'
import { DiceInvertAction } from '#services/gamification/handlers/actions/dice_invert_action'
import type GamificationInstance from '#models/gamification_instance'

// ========================================
// HELPERS
// ========================================

function createMockFoundryService(overrides: Record<string, any> = {}) {
  return {
    rollDice: overrides.rollDice || (async () => ({ success: true })),
    deleteChatMessage: overrides.deleteChatMessage || (async () => ({ success: true })),
    sendChatMessage: overrides.sendChatMessage || (async () => ({ success: true })),
    modifyActor: overrides.modifyActor || (async () => ({ success: true })),
    applySpellEffect: overrides.applySpellEffect || (async () => ({ success: true })),
    applyMonsterEffect: overrides.applyMonsterEffect || (async () => ({ success: true })),
    cleanupAllEffects: overrides.cleanupAllEffects || (async () => ({ success: true })),
  }
}

function createMockInstance(overrides: Record<string, unknown> = {}): GamificationInstance {
  return {
    id: 'instance-1',
    campaignId: 'campaign-1',
    eventId: 'event-1',
    streamerId: 'streamer-1',
    triggerData: null,
    ...overrides,
  } as GamificationInstance
}

// ========================================
// TESTS — DiceInvertAction
// ========================================

test.group('DiceInvertAction — execute', () => {
  test('should return error when diceData is missing and not in test mode', async ({ assert }) => {
    const action = new DiceInvertAction()
    action.setFoundryCommandService(createMockFoundryService() as any)

    const instance = createMockInstance({ triggerData: {} })
    const result = await action.execute(null, instance, 'conn-1')

    assert.isFalse(result.success)
    assert.include(result.error!, 'Données du dé manquantes')
  })

  test('should return error when foundry service is not available', async ({ assert }) => {
    const action = new DiceInvertAction()
    // No setFoundryCommandService called

    const instance = createMockInstance({
      triggerData: {
        diceRoll: {
          rollId: 'roll-1',
          characterId: 'char-1',
          characterName: 'Fighter',
          formula: '1d20',
          result: 20,
          diceResults: [20],
          criticalType: 'success',
        },
      },
    })

    const result = await action.execute(null, instance, 'conn-1')

    assert.isFalse(result.success)
    assert.include(result.error!, 'Service Foundry non disponible')
  })

  test('should invert critical success (20) to 1', async ({ assert }) => {
    let rolledResult: number | undefined
    const mockFoundry = createMockFoundryService({
      rollDice: async (_connId: string, _formula: string, forcedResult: number) => {
        rolledResult = forcedResult
        return { success: true }
      },
    })

    const action = new DiceInvertAction()
    action.setFoundryCommandService(mockFoundry as any)

    const instance = createMockInstance({
      triggerData: {
        diceRoll: {
          rollId: 'roll-1',
          characterId: 'char-1',
          characterName: 'Fighter',
          formula: '1d20',
          result: 20,
          diceResults: [20],
          criticalType: 'success',
          messageId: 'msg-1',
        },
      },
    })

    const result = await action.execute(null, instance, 'conn-1')

    assert.isTrue(result.success)
    assert.equal(rolledResult, 1) // 20 inverted to 1
    assert.include(result.message!, '20')
    assert.include(result.message!, '1')
  })

  test('should invert critical failure (1) to 20', async ({ assert }) => {
    let rolledResult: number | undefined
    const mockFoundry = createMockFoundryService({
      rollDice: async (_connId: string, _formula: string, forcedResult: number) => {
        rolledResult = forcedResult
        return { success: true }
      },
    })

    const action = new DiceInvertAction()
    action.setFoundryCommandService(mockFoundry as any)

    const instance = createMockInstance({
      triggerData: {
        diceRoll: {
          rollId: 'roll-1',
          characterId: 'char-1',
          characterName: 'Rogue',
          formula: '1d20',
          result: 1,
          diceResults: [1],
          criticalType: 'failure',
          messageId: 'msg-2',
        },
      },
    })

    const result = await action.execute(null, instance, 'conn-1')

    assert.isTrue(result.success)
    assert.equal(rolledResult, 20) // 1 inverted to 20
  })

  test('should delete original message when configured (default)', async ({ assert }) => {
    let deletedMessageId: string | undefined
    const mockFoundry = createMockFoundryService({
      deleteChatMessage: async (_connId: string, messageId: string) => {
        deletedMessageId = messageId
        return { success: true }
      },
    })

    const action = new DiceInvertAction()
    action.setFoundryCommandService(mockFoundry as any)

    const instance = createMockInstance({
      triggerData: {
        diceRoll: {
          rollId: 'roll-1',
          characterId: 'char-1',
          characterName: 'Fighter',
          formula: '1d20',
          result: 20,
          diceResults: [20],
          criticalType: 'success',
          messageId: 'msg-to-delete',
        },
      },
    })

    await action.execute(null, instance, 'conn-1')

    assert.equal(deletedMessageId, 'msg-to-delete')
  })

  test('should not delete original message when deleteOriginal is false', async ({ assert }) => {
    let deleteCalled = false
    const mockFoundry = createMockFoundryService({
      deleteChatMessage: async () => {
        deleteCalled = true
        return { success: true }
      },
    })

    const action = new DiceInvertAction()
    action.setFoundryCommandService(mockFoundry as any)

    const instance = createMockInstance({
      triggerData: {
        diceRoll: {
          rollId: 'roll-1',
          characterId: 'char-1',
          characterName: 'Fighter',
          formula: '1d20',
          result: 20,
          diceResults: [20],
          criticalType: 'success',
          messageId: 'msg-1',
        },
      },
    })

    const config = { diceInvert: { deleteOriginal: false } }
    await action.execute(config, instance, 'conn-1')

    assert.isFalse(deleteCalled)
  })

  test('should use custom troll message from config', async ({ assert }) => {
    let rollFlavor: string | undefined
    const mockFoundry = createMockFoundryService({
      rollDice: async (
        _connId: string,
        _formula: string,
        _forcedResult: number,
        flavor: string
      ) => {
        rollFlavor = flavor
        return { success: true }
      },
    })

    const action = new DiceInvertAction()
    action.setFoundryCommandService(mockFoundry as any)

    const instance = createMockInstance({
      triggerData: {
        diceRoll: {
          rollId: 'roll-1',
          characterId: 'char-1',
          characterName: 'Fighter',
          formula: '1d20',
          result: 20,
          diceResults: [20],
          criticalType: 'success',
          messageId: 'msg-1',
        },
      },
    })

    const config = { diceInvert: { trollMessage: 'GOTCHA!' } }
    await action.execute(config, instance, 'conn-1')

    assert.include(rollFlavor!, 'GOTCHA!')
  })

  test('should handle roll failure gracefully', async ({ assert }) => {
    const mockFoundry = createMockFoundryService({
      rollDice: async () => ({ success: false, error: 'Foundry timeout' }),
    })

    const action = new DiceInvertAction()
    action.setFoundryCommandService(mockFoundry as any)

    const instance = createMockInstance({
      triggerData: {
        diceRoll: {
          rollId: 'roll-1',
          characterId: 'char-1',
          characterName: 'Fighter',
          formula: '1d20',
          result: 20,
          diceResults: [20],
          criticalType: 'success',
          messageId: 'msg-1',
        },
      },
    })

    const result = await action.execute(null, instance, 'conn-1')

    assert.isFalse(result.success)
    assert.include(result.error!, 'Foundry timeout')
  })
})

// ========================================
// TESTS — Test mode
// ========================================

test.group('DiceInvertAction — test mode', () => {
  test('should build diceData from customData in test mode', async ({ assert }) => {
    let rollCount = 0
    let firstForcedResult: number | undefined
    let secondForcedResult: number | undefined

    const mockFoundry = createMockFoundryService({
      rollDice: async (_connId: string, _formula: string, forcedResult: number) => {
        rollCount++
        if (rollCount === 1) firstForcedResult = forcedResult
        if (rollCount === 2) secondForcedResult = forcedResult
        return { success: true }
      },
    })

    const action = new DiceInvertAction()
    action.setFoundryCommandService(mockFoundry as any)

    const instance = createMockInstance({
      triggerData: {
        custom: { diceValue: 20, isTest: true },
      },
    })

    const result = await action.execute(null, instance, 'conn-1')

    assert.isTrue(result.success)
    assert.equal(rollCount, 2) // Original + inverted
    assert.equal(firstForcedResult, 20) // Original roll
    assert.equal(secondForcedResult, 1) // Inverted roll
    assert.include(result.message!, '[TEST]')
  })

  test('should handle test mode with critical failure value', async ({ assert }) => {
    let secondForcedResult: number | undefined
    let rollCount = 0

    const mockFoundry = createMockFoundryService({
      rollDice: async (_connId: string, _formula: string, forcedResult: number) => {
        rollCount++
        if (rollCount === 2) secondForcedResult = forcedResult
        return { success: true }
      },
    })

    const action = new DiceInvertAction()
    action.setFoundryCommandService(mockFoundry as any)

    const instance = createMockInstance({
      triggerData: {
        custom: { diceValue: 1, isTest: true },
      },
    })

    const result = await action.execute(null, instance, 'conn-1')

    assert.isTrue(result.success)
    assert.equal(secondForcedResult, 20) // 1 inverted to 20
  })

  test('should return error if original roll fails in test mode', async ({ assert }) => {
    const mockFoundry = createMockFoundryService({
      rollDice: async () => ({ success: false, error: 'Roll failed' }),
    })

    const action = new DiceInvertAction()
    action.setFoundryCommandService(mockFoundry as any)

    const instance = createMockInstance({
      triggerData: {
        custom: { diceValue: 20, isTest: true },
      },
    })

    const result = await action.execute(null, instance, 'conn-1')

    assert.isFalse(result.success)
    assert.include(result.error!, 'original')
  })
})

// ========================================
// TESTS — calculateInvertedResult
// ========================================

test.group('DiceInvertAction — calculateInvertedResult', () => {
  test('should return 1 for critical success', async ({ assert }) => {
    const action = new DiceInvertAction()
    const result = (action as any).calculateInvertedResult('success')
    assert.equal(result, 1)
  })

  test('should return 20 for critical failure', async ({ assert }) => {
    const action = new DiceInvertAction()
    const result = (action as any).calculateInvertedResult('failure')
    assert.equal(result, 20)
  })
})

// ========================================
// TESTS — metadata
// ========================================

test.group('DiceInvertAction — metadata', () => {
  test('should have correct type and requirements', async ({ assert }) => {
    const action = new DiceInvertAction()
    assert.equal(action.type, 'dice_invert')
    assert.deepEqual(action.requires, ['vtt_connection'])
  })
})
