import { test } from '@japa/runner'
import { FoundryCommandAdapter } from '#services/gamification/foundry_command_adapter'

// ========================================
// HELPERS
// ========================================

function createMockVttWebSocketService(overrides: Record<string, any> = {}) {
  return {
    broadcast: overrides.broadcast || (async () => true),
    ...overrides,
  } as any
}

/**
 * The FoundryCommandAdapter checks VttConnection status before sending.
 * We need to mock the VttConnection.find() call.
 * Since this uses a static model method, we test the adapter through its public API
 * using a mock that skips the DB check by making the sendCommand method testable.
 */

// ========================================
// TESTS — sendCommand (private, tested via public methods)
// ========================================

test.group('FoundryCommandAdapter — sendChatMessage', () => {
  test('should broadcast chat_message command via WebSocket', async ({ assert }) => {
    let broadcastedEvent: string | undefined
    let broadcastedData: any

    const mockWs = createMockVttWebSocketService({
      broadcast: async (_connId: string, event: string, data: any) => {
        broadcastedEvent = event
        broadcastedData = data
        return true
      },
    })

    // We need to bypass the VttConnection.find() check
    // Test the sendCommand logic directly by accessing it through the prototype
    const adapter = new FoundryCommandAdapter(mockWs)

    // Call sendCommand directly (private method, accessed for testing)
    const result = await (adapter as any).sendCommand('conn-1', 'chat_message', {
      content: 'Hello world',
    })

    assert.isTrue(result.success)
    assert.equal(broadcastedEvent, 'command:chat_message')
    assert.equal(broadcastedData.content, 'Hello world')
    assert.exists(broadcastedData.requestId)
    assert.exists(broadcastedData.timestamp)
  })

  test('should return error when broadcast throws', async ({ assert }) => {
    const mockWs = createMockVttWebSocketService({
      broadcast: async () => {
        throw new Error('WebSocket disconnected')
      },
    })

    const adapter = new FoundryCommandAdapter(mockWs)
    const result = await (adapter as any).sendCommand('conn-1', 'chat_message', {
      content: 'Hello',
    })

    assert.isFalse(result.success)
    assert.include(result.error!, 'WebSocket disconnected')
  })
})

test.group('FoundryCommandAdapter — rollDice via sendCommand', () => {
  test('should send roll_dice command with correct data', async ({ assert }) => {
    let broadcastedData: any

    const mockWs = createMockVttWebSocketService({
      broadcast: async (_connId: string, _event: string, data: any) => {
        broadcastedData = data
        return true
      },
    })

    const adapter = new FoundryCommandAdapter(mockWs)
    const result = await (adapter as any).sendCommand('conn-1', 'roll_dice', {
      formula: '1d20',
      forcedResult: 15,
      flavor: 'Attack roll',
    })

    assert.isTrue(result.success)
    assert.equal(broadcastedData.formula, '1d20')
    assert.equal(broadcastedData.forcedResult, 15)
    assert.equal(broadcastedData.flavor, 'Attack roll')
  })
})

test.group('FoundryCommandAdapter — modifyActor via sendCommand', () => {
  test('should send modify_actor command', async ({ assert }) => {
    let broadcastedEvent: string | undefined
    let broadcastedData: any

    const mockWs = createMockVttWebSocketService({
      broadcast: async (_connId: string, event: string, data: any) => {
        broadcastedEvent = event
        broadcastedData = data
        return true
      },
    })

    const adapter = new FoundryCommandAdapter(mockWs)
    const result = await (adapter as any).sendCommand('conn-1', 'modify_actor', {
      actorId: 'actor-1',
      updates: { 'system.attributes.hp.value': 50 },
    })

    assert.isTrue(result.success)
    assert.equal(broadcastedEvent, 'command:modify_actor')
    assert.equal(broadcastedData.actorId, 'actor-1')
  })
})

test.group('FoundryCommandAdapter — applySpellEffect via sendCommand', () => {
  test('should send apply_spell_effect command', async ({ assert }) => {
    let broadcastedEvent: string | undefined
    let broadcastedData: any

    const mockWs = createMockVttWebSocketService({
      broadcast: async (_connId: string, event: string, data: any) => {
        broadcastedEvent = event
        broadcastedData = data
        return true
      },
    })

    const adapter = new FoundryCommandAdapter(mockWs)
    const result = await (adapter as any).sendCommand('conn-1', 'apply_spell_effect', {
      actorId: 'actor-1',
      spellId: 'spell-1',
      spellName: 'Fireball',
      effect: {
        type: 'disable',
        durationSeconds: 60,
      },
    })

    assert.isTrue(result.success)
    assert.equal(broadcastedEvent, 'command:apply_spell_effect')
    assert.equal(broadcastedData.spellName, 'Fireball')
    assert.equal(broadcastedData.effect.type, 'disable')
  })
})

test.group('FoundryCommandAdapter — applyMonsterEffect via sendCommand', () => {
  test('should send apply_monster_effect command', async ({ assert }) => {
    let broadcastedData: any

    const mockWs = createMockVttWebSocketService({
      broadcast: async (_connId: string, _event: string, data: any) => {
        broadcastedData = data
        return true
      },
    })

    const adapter = new FoundryCommandAdapter(mockWs)
    const result = await (adapter as any).sendCommand('conn-1', 'apply_monster_effect', {
      actorId: 'actor-1',
      monsterName: 'Goblin',
      effect: {
        type: 'debuff',
        acPenalty: 2,
      },
    })

    assert.isTrue(result.success)
    assert.equal(broadcastedData.monsterName, 'Goblin')
    assert.equal(broadcastedData.effect.acPenalty, 2)
  })
})

test.group('FoundryCommandAdapter — cleanupAllEffects via sendCommand', () => {
  test('should send cleanup_all_effects command', async ({ assert }) => {
    let broadcastedEvent: string | undefined
    let broadcastedData: any

    const mockWs = createMockVttWebSocketService({
      broadcast: async (_connId: string, event: string, data: any) => {
        broadcastedEvent = event
        broadcastedData = data
        return true
      },
    })

    const adapter = new FoundryCommandAdapter(mockWs)
    const result = await (adapter as any).sendCommand('conn-1', 'cleanup_all_effects', {
      cleanChat: true,
    })

    assert.isTrue(result.success)
    assert.equal(broadcastedEvent, 'command:cleanup_all_effects')
    assert.isTrue(broadcastedData.cleanChat)
  })
})

test.group('FoundryCommandAdapter — requestId generation', () => {
  test('should generate unique requestId per command', async ({ assert }) => {
    const requestIds: string[] = []

    const mockWs = createMockVttWebSocketService({
      broadcast: async (_connId: string, _event: string, data: any) => {
        requestIds.push(data.requestId)
        return true
      },
    })

    const adapter = new FoundryCommandAdapter(mockWs)

    await (adapter as any).sendCommand('conn-1', 'test', {})
    await (adapter as any).sendCommand('conn-1', 'test', {})
    await (adapter as any).sendCommand('conn-1', 'test', {})

    // All requestIds should be unique
    const unique = new Set(requestIds)
    assert.equal(unique.size, 3)
  })

  test('should include timestamp in every command', async ({ assert }) => {
    let broadcastedData: any

    const mockWs = createMockVttWebSocketService({
      broadcast: async (_connId: string, _event: string, data: any) => {
        broadcastedData = data
        return true
      },
    })

    const adapter = new FoundryCommandAdapter(mockWs)
    await (adapter as any).sendCommand('conn-1', 'test', {})

    assert.exists(broadcastedData.timestamp)
    // Verify it's a valid ISO date
    const date = new Date(broadcastedData.timestamp)
    assert.isFalse(Number.isNaN(date.getTime()))
  })
})

test.group('FoundryCommandAdapter — deleteChatMessage via sendCommand', () => {
  test('should send delete_message command', async ({ assert }) => {
    let broadcastedEvent: string | undefined
    let broadcastedData: any

    const mockWs = createMockVttWebSocketService({
      broadcast: async (_connId: string, event: string, data: any) => {
        broadcastedEvent = event
        broadcastedData = data
        return true
      },
    })

    const adapter = new FoundryCommandAdapter(mockWs)
    const result = await (adapter as any).sendCommand('conn-1', 'delete_message', {
      messageId: 'msg-123',
    })

    assert.isTrue(result.success)
    assert.equal(broadcastedEvent, 'command:delete_message')
    assert.equal(broadcastedData.messageId, 'msg-123')
  })
})
