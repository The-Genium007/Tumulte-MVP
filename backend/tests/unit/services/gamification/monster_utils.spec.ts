import { test } from '@japa/runner'
import {
  getHostileMonsters,
  pickRandomMonster,
} from '#services/gamification/handlers/actions/monster_utils'
import type { MonsterInfo } from '#services/gamification/handlers/actions/monster_utils'

// ========================================
// HELPERS
// ========================================

function createCombatant(
  overrides: Partial<{
    id: string
    actorId: string
    name: string
    img: string
    initiative: number | null
    isDefeated: boolean
    isNPC: boolean
    characterType: 'pc' | 'npc' | 'monster'
    isVisible: boolean
    hp: { current: number; max: number; temp: number } | null
  }> = {}
) {
  return {
    id: `combatant-${Math.random().toString(36).slice(2, 8)}`,
    actorId: `actor-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Monster',
    img: '/icons/monster.webp',
    initiative: 15,
    isDefeated: false,
    isNPC: true,
    isVisible: true,
    hp: { current: 30, max: 30, temp: 0 },
    ...overrides,
  }
}

// ========================================
// TESTS — getHostileMonsters
// ========================================

test.group('monster_utils - getHostileMonsters', () => {
  test('should return empty array for empty combatants list', async ({ assert }) => {
    const result = getHostileMonsters([])
    assert.deepEqual(result, [])
  })

  test('should filter out PC combatants (isNPC = false)', async ({ assert }) => {
    const combatants = [
      createCombatant({ name: 'Goblin', isNPC: true }),
      createCombatant({ name: 'Player Character', isNPC: false }),
    ]
    const result = getHostileMonsters(combatants)
    assert.lengthOf(result, 1)
    assert.equal(result[0].name, 'Goblin')
  })

  test('should filter out defeated monsters', async ({ assert }) => {
    const combatants = [
      createCombatant({ name: 'Alive Goblin', isDefeated: false }),
      createCombatant({ name: 'Dead Goblin', isDefeated: true }),
    ]
    const result = getHostileMonsters(combatants)
    assert.lengthOf(result, 1)
    assert.equal(result[0].name, 'Alive Goblin')
  })

  test('should filter out combatants without actorId', async ({ assert }) => {
    const combatants = [
      createCombatant({ name: 'Valid Monster', actorId: 'actor-1' }),
      createCombatant({ name: 'No Actor Monster', actorId: undefined }),
    ]
    const result = getHostileMonsters(combatants)
    assert.lengthOf(result, 1)
    assert.equal(result[0].name, 'Valid Monster')
  })

  test('should return all hostile non-defeated NPC combatants', async ({ assert }) => {
    const combatants = [
      createCombatant({ name: 'Goblin', isNPC: true, isDefeated: false }),
      createCombatant({ name: 'Orc', isNPC: true, isDefeated: false }),
      createCombatant({ name: 'Dragon', isNPC: true, isDefeated: false }),
    ]
    const result = getHostileMonsters(combatants)
    assert.lengthOf(result, 3)
  })

  test('should correctly map combatant data to MonsterInfo', async ({ assert }) => {
    const combatants = [
      createCombatant({
        actorId: 'actor-goblin',
        name: 'Goblin Boss',
        img: '/icons/goblin.webp',
        hp: { current: 20, max: 30, temp: 5 },
      }),
    ]
    const result = getHostileMonsters(combatants)
    assert.lengthOf(result, 1)
    assert.equal(result[0].actorId, 'actor-goblin')
    assert.equal(result[0].name, 'Goblin Boss')
    assert.equal(result[0].img, '/icons/goblin.webp')
    assert.deepEqual(result[0].hp, { current: 20, max: 30, temp: 5 })
  })

  test('should set img to null when combatant has no img', async ({ assert }) => {
    const combatants = [createCombatant({ img: undefined })]
    const result = getHostileMonsters(combatants)
    assert.lengthOf(result, 1)
    assert.isNull(result[0].img)
  })

  test('should return empty array when all are PCs or defeated', async ({ assert }) => {
    const combatants = [
      createCombatant({ name: 'PC Fighter', isNPC: false }),
      createCombatant({ name: 'Dead Goblin', isNPC: true, isDefeated: true }),
    ]
    const result = getHostileMonsters(combatants)
    assert.deepEqual(result, [])
  })

  // --- characterType-based filtering (new Foundry module) ---

  test('should use characterType when available and exclude PCs', async ({ assert }) => {
    const combatants = [
      createCombatant({ name: 'Goblin', isNPC: true, characterType: 'monster' }),
      createCombatant({ name: 'Ally NPC', isNPC: true, characterType: 'npc' }),
      createCombatant({ name: 'PC Wizard', isNPC: false, characterType: 'pc' }),
    ]
    const result = getHostileMonsters(combatants)
    assert.lengthOf(result, 2)
    assert.deepEqual(result.map((m) => m.name).sort(), ['Ally NPC', 'Goblin'])
  })

  test('should exclude PC even when isNPC is incorrectly true (characterType takes priority)', async ({
    assert,
  }) => {
    const combatants = [
      createCombatant({ name: 'Misclassified PC', isNPC: true, characterType: 'pc' }),
      createCombatant({ name: 'Real Monster', isNPC: true, characterType: 'monster' }),
    ]
    const result = getHostileMonsters(combatants)
    assert.lengthOf(result, 1)
    assert.equal(result[0].name, 'Real Monster')
  })

  test('should fall back to isNPC when characterType is absent (older module)', async ({
    assert,
  }) => {
    const combatants = [
      createCombatant({ name: 'Goblin', isNPC: true }),
      createCombatant({ name: 'Player', isNPC: false }),
    ]
    // No characterType field — should behave as before
    const result = getHostileMonsters(combatants)
    assert.lengthOf(result, 1)
    assert.equal(result[0].name, 'Goblin')
  })
})

// ========================================
// TESTS — pickRandomMonster
// ========================================

test.group('monster_utils - pickRandomMonster', () => {
  test('should return null for empty monster list', async ({ assert }) => {
    const result = pickRandomMonster([])
    assert.isNull(result)
  })

  test('should return the only monster when list has one element', async ({ assert }) => {
    const monster: MonsterInfo = {
      actorId: 'actor-1',
      name: 'Lonely Goblin',
      img: null,
      hp: { current: 10, max: 10, temp: 0 },
    }
    const result = pickRandomMonster([monster])
    assert.isNotNull(result)
    assert.equal(result!.actorId, 'actor-1')
  })

  test('should return a monster from the list', async ({ assert }) => {
    const monsters: MonsterInfo[] = [
      { actorId: 'actor-1', name: 'Goblin', img: null, hp: null },
      { actorId: 'actor-2', name: 'Orc', img: null, hp: null },
      { actorId: 'actor-3', name: 'Dragon', img: null, hp: null },
    ]
    const validIds = ['actor-1', 'actor-2', 'actor-3']

    for (let i = 0; i < 50; i++) {
      const result = pickRandomMonster(monsters)
      assert.isNotNull(result)
      assert.isTrue(validIds.includes(result!.actorId))
    }
  })

  test('should eventually select different monsters (uniform distribution)', async ({ assert }) => {
    const monsters: MonsterInfo[] = [
      { actorId: 'actor-a', name: 'Monster A', img: null, hp: null },
      { actorId: 'actor-b', name: 'Monster B', img: null, hp: null },
    ]

    const counts: Record<string, number> = { 'actor-a': 0, 'actor-b': 0 }
    for (let i = 0; i < 200; i++) {
      const result = pickRandomMonster(monsters)
      assert.isNotNull(result)
      counts[result!.actorId]++
    }

    // Both should be selected at least some times (very unlikely to fail with 200 iterations)
    assert.isTrue(counts['actor-a'] > 30, 'Monster A should be selected at least sometimes')
    assert.isTrue(counts['actor-b'] > 30, 'Monster B should be selected at least sometimes')
  })
})
