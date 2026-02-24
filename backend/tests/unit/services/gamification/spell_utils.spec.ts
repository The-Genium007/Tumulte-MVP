import { test } from '@japa/runner'
import { pickRandomSpell } from '#services/gamification/handlers/actions/spell_utils'
import type { SpellInfo } from '#models/character'

// ========================================
// HELPERS
// ========================================

function createSpell(overrides: Partial<SpellInfo> = {}): SpellInfo {
  return {
    id: `spell-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Spell',
    img: '/icons/magic/fire/beam-jet-stream-orange.webp',
    type: 'spell',
    level: 1,
    school: 'evo',
    prepared: true,
    uses: null,
    ...overrides,
  }
}

// ========================================
// TESTS — pickRandomSpell
// ========================================

test.group('spell_utils - pickRandomSpell', () => {
  test('should return null for empty spell list', async ({ assert }) => {
    const result = pickRandomSpell([])
    assert.isNull(result)
  })

  test('should return null when all spells lack a name', async ({ assert }) => {
    const spells = [createSpell({ name: '' }), createSpell({ name: '' })]
    const result = pickRandomSpell(spells)
    assert.isNull(result)
  })

  test('should return a spell from the list (uniform selection)', async ({ assert }) => {
    const spells = [
      createSpell({ id: 'spell-1', name: 'Fireball' }),
      createSpell({ id: 'spell-2', name: 'Shield' }),
    ]
    const result = pickRandomSpell(spells)
    assert.isNotNull(result)
    assert.isTrue(['spell-1', 'spell-2'].includes(result!.id))
  })

  test('should exclude cantrips when excludeCantrips is true', async ({ assert }) => {
    const cantrip = createSpell({ id: 'cantrip-1', name: 'Fire Bolt', level: 0 })
    const levelOne = createSpell({ id: 'spell-1', name: 'Magic Missile', level: 1 })
    const levelTwo = createSpell({ id: 'spell-2', name: 'Fireball', level: 2 })

    // Run multiple times to be statistically confident
    for (let i = 0; i < 50; i++) {
      const result = pickRandomSpell([cantrip, levelOne, levelTwo], true)
      assert.isNotNull(result)
      assert.notEqual(result!.id, 'cantrip-1')
    }
  })

  test('should return null when all spells are cantrips and excludeCantrips is true', async ({
    assert,
  }) => {
    const spells = [
      createSpell({ level: 0, name: 'Fire Bolt' }),
      createSpell({ level: 0, name: 'Prestidigitation' }),
    ]
    const result = pickRandomSpell(spells, true)
    assert.isNull(result)
  })

  test('should not exclude cantrips when excludeCantrips is false', async ({ assert }) => {
    const cantrip = createSpell({ id: 'cantrip-1', name: 'Fire Bolt', level: 0 })

    // With only one cantrip, it must be selected
    const result = pickRandomSpell([cantrip], false)
    assert.isNotNull(result)
    assert.equal(result!.id, 'cantrip-1')
  })

  test('should use weighted selection when weights are provided', async ({ assert }) => {
    const spellA = createSpell({ id: 'spell-a', name: 'Spell A' })
    const spellB = createSpell({ id: 'spell-b', name: 'Spell B' })
    const spells = [spellA, spellB]

    // Give spell-b an extremely high weight — over many runs it should dominate
    const weights = new Map<string, number>([
      ['spell-a', 0.001],
      ['spell-b', 1000],
    ])

    const counts: Record<string, number> = { 'spell-a': 0, 'spell-b': 0 }
    for (let i = 0; i < 200; i++) {
      const result = pickRandomSpell(spells, false, weights)
      assert.isNotNull(result)
      counts[result!.id]++
    }

    // spell-b should be selected significantly more often
    assert.isTrue(counts['spell-b'] > counts['spell-a'])
    assert.isTrue(counts['spell-b'] > 150, 'Heavily weighted spell should dominate')
  })

  test('should fall back to weight=1 for spells not in the weights map', async ({ assert }) => {
    const spellA = createSpell({ id: 'spell-a', name: 'Spell A' })
    const spellB = createSpell({ id: 'spell-b', name: 'Spell B' })
    const spells = [spellA, spellB]

    // Only spell-a has a weight; spell-b defaults to 1
    const weights = new Map<string, number>([['spell-a', 1]])

    // Both should be selectable
    const counts: Record<string, number> = { 'spell-a': 0, 'spell-b': 0 }
    for (let i = 0; i < 200; i++) {
      const result = pickRandomSpell(spells, false, weights)
      assert.isNotNull(result)
      counts[result!.id]++
    }

    // With equal weights (1:1), both should be selected roughly equally
    assert.isTrue(counts['spell-a'] > 30, 'spell-a should be selected at least sometimes')
    assert.isTrue(counts['spell-b'] > 30, 'spell-b should be selected at least sometimes')
  })

  test('should use uniform selection when weights map is empty', async ({ assert }) => {
    const spellA = createSpell({ id: 'spell-a', name: 'Spell A' })
    const spellB = createSpell({ id: 'spell-b', name: 'Spell B' })
    const spells = [spellA, spellB]

    const weights = new Map<string, number>() // empty

    const result = pickRandomSpell(spells, false, weights)
    assert.isNotNull(result)
    assert.isTrue(['spell-a', 'spell-b'].includes(result!.id))
  })

  test('should handle single spell in list', async ({ assert }) => {
    const spell = createSpell({ id: 'only-one', name: 'Lonely Spell' })
    const result = pickRandomSpell([spell])
    assert.isNotNull(result)
    assert.equal(result!.id, 'only-one')
  })

  test('should filter out unnamed spells before selection', async ({ assert }) => {
    const unnamed = createSpell({ id: 'unnamed', name: '' })
    const named = createSpell({ id: 'named', name: 'Real Spell' })

    for (let i = 0; i < 30; i++) {
      const result = pickRandomSpell([unnamed, named])
      assert.isNotNull(result)
      assert.equal(result!.id, 'named')
    }
  })
})
