import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import { createTestUser, createTestCampaign } from '#tests/helpers/test_utils'
import Character from '#models/character'
import DiceRoll from '#models/dice_roll'
import { DateTime } from 'luxon'

test.group('DiceRollService - recordDiceRoll', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create dice roll record in database', async ({ assert }) => {
    const { default: DiceRollService } = await import('#services/vtt/dice_roll_service')
    const service = new DiceRollService()

    const user = await createTestUser()
    const campaign = await createTestCampaign({ ownerId: user.id })

    // Create a character for the roll
    const character = await Character.create({
      campaignId: campaign.id,
      name: 'Test Character',
      characterType: 'pc',
      vttCharacterId: 'vtt-char-123',
      lastSyncAt: DateTime.now(),
    })

    const rollData = {
      campaignId: campaign.id,
      characterId: character.id,
      vttRollId: 'roll-123',
      rollFormula: '1d20+5',
      result: 18,
      diceResults: [13],
      isCritical: false,
      criticalType: null,
      isHidden: false,
      rollType: 'attack',
      vttData: null,
      skill: null,
      skillRaw: null,
      ability: 'strength',
      abilityRaw: 'str',
      modifiers: ['+5'],
    }

    const diceRoll = await service.recordDiceRoll(rollData)

    assert.exists(diceRoll.id)
    assert.equal(diceRoll.campaignId, campaign.id)
    assert.equal(diceRoll.characterId, character.id)
    assert.equal(diceRoll.rollFormula, '1d20+5')
    assert.equal(diceRoll.result, 18)
    assert.deepEqual(diceRoll.diceResults, [13])
    assert.equal(diceRoll.ability, 'strength')
  })

  test('should record critical success roll', async ({ assert }) => {
    const { default: DiceRollService } = await import('#services/vtt/dice_roll_service')
    const service = new DiceRollService()

    const user = await createTestUser()
    const campaign = await createTestCampaign({ ownerId: user.id })
    const character = await Character.create({
      campaignId: campaign.id,
      name: 'Lucky Character',
      characterType: 'pc',
      vttCharacterId: 'vtt-char-456',
      lastSyncAt: DateTime.now(),
    })

    const rollData = {
      campaignId: campaign.id,
      characterId: character.id,
      vttRollId: 'crit-roll-123',
      rollFormula: '1d20',
      result: 20,
      diceResults: [20],
      isCritical: true,
      criticalType: 'success' as const,
      isHidden: false,
      rollType: 'attack',
      vttData: null,
      skill: null,
      skillRaw: null,
      ability: null,
      abilityRaw: null,
      modifiers: null,
    }

    const diceRoll = await service.recordDiceRoll(rollData)

    assert.isTrue(diceRoll.isCritical)
    assert.equal(diceRoll.criticalType, 'success')
    assert.equal(diceRoll.result, 20)
  })

  test('should record critical failure roll', async ({ assert }) => {
    const { default: DiceRollService } = await import('#services/vtt/dice_roll_service')
    const service = new DiceRollService()

    const user = await createTestUser()
    const campaign = await createTestCampaign({ ownerId: user.id })
    const character = await Character.create({
      campaignId: campaign.id,
      name: 'Unlucky Character',
      characterType: 'pc',
      vttCharacterId: 'vtt-char-789',
      lastSyncAt: DateTime.now(),
    })

    const rollData = {
      campaignId: campaign.id,
      characterId: character.id,
      vttRollId: 'fail-roll-123',
      rollFormula: '1d20',
      result: 1,
      diceResults: [1],
      isCritical: true,
      criticalType: 'failure' as const,
      isHidden: false,
      rollType: 'attack',
      vttData: null,
      skill: null,
      skillRaw: null,
      ability: null,
      abilityRaw: null,
      modifiers: null,
    }

    const diceRoll = await service.recordDiceRoll(rollData)

    assert.isTrue(diceRoll.isCritical)
    assert.equal(diceRoll.criticalType, 'failure')
    assert.equal(diceRoll.result, 1)
  })

  test('should record hidden roll', async ({ assert }) => {
    const { default: DiceRollService } = await import('#services/vtt/dice_roll_service')
    const service = new DiceRollService()

    const user = await createTestUser()
    const campaign = await createTestCampaign({ ownerId: user.id })
    const character = await Character.create({
      campaignId: campaign.id,
      name: 'Sneaky Character',
      characterType: 'pc',
      vttCharacterId: 'vtt-char-hidden',
      lastSyncAt: DateTime.now(),
    })

    const rollData = {
      campaignId: campaign.id,
      characterId: character.id,
      vttRollId: 'hidden-roll-123',
      rollFormula: '1d20+10',
      result: 25,
      diceResults: [15],
      isCritical: false,
      criticalType: null,
      isHidden: true, // Hidden roll
      rollType: 'stealth',
      vttData: null,
      skill: 'Stealth',
      skillRaw: 'stealth',
      ability: 'dexterity',
      abilityRaw: 'dex',
      modifiers: ['+10'],
    }

    const diceRoll = await service.recordDiceRoll(rollData)

    assert.isTrue(diceRoll.isHidden)
    assert.equal(diceRoll.skill, 'Stealth')
  })

  test('should load character and campaign relations', async ({ assert }) => {
    const { default: DiceRollService } = await import('#services/vtt/dice_roll_service')
    const service = new DiceRollService()

    const user = await createTestUser()
    const campaign = await createTestCampaign({ ownerId: user.id, name: 'Test Campaign' })
    const character = await Character.create({
      campaignId: campaign.id,
      name: 'Related Character',
      characterType: 'pc',
      vttCharacterId: 'vtt-char-rel',
      lastSyncAt: DateTime.now(),
    })

    const rollData = {
      campaignId: campaign.id,
      characterId: character.id,
      vttRollId: null,
      rollFormula: '2d6+3',
      result: 10,
      diceResults: [4, 3],
      isCritical: false,
      criticalType: null,
      isHidden: false,
      rollType: 'damage',
      vttData: null,
      skill: null,
      skillRaw: null,
      ability: null,
      abilityRaw: null,
      modifiers: null,
    }

    const diceRoll = await service.recordDiceRoll(rollData)

    // Relations should be loaded
    assert.exists(diceRoll.character)
    assert.exists(diceRoll.campaign)
    assert.equal(diceRoll.character.name, 'Related Character')
    assert.equal(diceRoll.campaign.name, 'Test Campaign')
  })
})

test.group('DiceRollService - getCampaignRollHistory', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should return rolls for a campaign', async ({ assert }) => {
    const { default: DiceRollService } = await import('#services/vtt/dice_roll_service')
    const service = new DiceRollService()

    const user = await createTestUser()
    const campaign = await createTestCampaign({ ownerId: user.id })
    const character = await Character.create({
      campaignId: campaign.id,
      name: 'History Character',
      characterType: 'pc',
      vttCharacterId: 'vtt-char-hist',
      lastSyncAt: DateTime.now(),
    })

    // Create some rolls
    await DiceRoll.create({
      campaignId: campaign.id,
      characterId: character.id,
      rollFormula: '1d20',
      result: 15,
      diceResults: [15],
      isCritical: false,
      isHidden: false,
    })
    await DiceRoll.create({
      campaignId: campaign.id,
      characterId: character.id,
      rollFormula: '1d20',
      result: 10,
      diceResults: [10],
      isCritical: false,
      isHidden: false,
    })

    const history = await service.getCampaignRollHistory(campaign.id)

    assert.lengthOf(history, 2)
  })

  test('should exclude hidden rolls by default', async ({ assert }) => {
    const { default: DiceRollService } = await import('#services/vtt/dice_roll_service')
    const service = new DiceRollService()

    const user = await createTestUser()
    const campaign = await createTestCampaign({ ownerId: user.id })
    const character = await Character.create({
      campaignId: campaign.id,
      name: 'Hidden Test Character',
      characterType: 'pc',
      vttCharacterId: 'vtt-char-hidden-test',
      lastSyncAt: DateTime.now(),
    })

    // Create visible roll
    await DiceRoll.create({
      campaignId: campaign.id,
      characterId: character.id,
      rollFormula: '1d20',
      result: 15,
      diceResults: [15],
      isCritical: false,
      isHidden: false,
    })

    // Create hidden roll
    await DiceRoll.create({
      campaignId: campaign.id,
      characterId: character.id,
      rollFormula: '1d20',
      result: 20,
      diceResults: [20],
      isCritical: false,
      isHidden: true,
    })

    const history = await service.getCampaignRollHistory(campaign.id)

    // Should only include visible roll
    assert.lengthOf(history, 1)
    assert.isFalse(history[0].isHidden)
  })

  test('should include hidden rolls when requested', async ({ assert }) => {
    const { default: DiceRollService } = await import('#services/vtt/dice_roll_service')
    const service = new DiceRollService()

    const user = await createTestUser()
    const campaign = await createTestCampaign({ ownerId: user.id })
    const character = await Character.create({
      campaignId: campaign.id,
      name: 'Include Hidden Character',
      characterType: 'pc',
      vttCharacterId: 'vtt-char-include-hidden',
      lastSyncAt: DateTime.now(),
    })

    await DiceRoll.create({
      campaignId: campaign.id,
      characterId: character.id,
      rollFormula: '1d20',
      result: 15,
      diceResults: [15],
      isCritical: false,
      isHidden: false,
    })

    await DiceRoll.create({
      campaignId: campaign.id,
      characterId: character.id,
      rollFormula: '1d20',
      result: 20,
      diceResults: [20],
      isCritical: false,
      isHidden: true,
    })

    const history = await service.getCampaignRollHistory(campaign.id, 50, true)

    // Should include both rolls
    assert.lengthOf(history, 2)
  })

  test('should respect limit parameter', async ({ assert }) => {
    const { default: DiceRollService } = await import('#services/vtt/dice_roll_service')
    const service = new DiceRollService()

    const user = await createTestUser()
    const campaign = await createTestCampaign({ ownerId: user.id })
    const character = await Character.create({
      campaignId: campaign.id,
      name: 'Limit Test Character',
      characterType: 'pc',
      vttCharacterId: 'vtt-char-limit',
      lastSyncAt: DateTime.now(),
    })

    // Create 10 rolls
    for (let i = 0; i < 10; i++) {
      await DiceRoll.create({
        campaignId: campaign.id,
        characterId: character.id,
        rollFormula: '1d20',
        result: i + 1,
        diceResults: [i + 1],
        isCritical: false,
        isHidden: false,
      })
    }

    const history = await service.getCampaignRollHistory(campaign.id, 5)

    assert.lengthOf(history, 5)
  })

  test('should order rolls by rolled_at descending', async ({ assert }) => {
    const { default: DiceRollService } = await import('#services/vtt/dice_roll_service')
    const service = new DiceRollService()

    const user = await createTestUser()
    const campaign = await createTestCampaign({ ownerId: user.id })
    const character = await Character.create({
      campaignId: campaign.id,
      name: 'Order Test Character',
      characterType: 'pc',
      vttCharacterId: 'vtt-char-order',
      lastSyncAt: DateTime.now(),
    })

    // Create rolls with different results to track order
    await DiceRoll.create({
      campaignId: campaign.id,
      characterId: character.id,
      rollFormula: '1d20',
      result: 1, // First roll
      diceResults: [1],
      isCritical: false,
      isHidden: false,
    })

    // Small delay to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 10))

    await DiceRoll.create({
      campaignId: campaign.id,
      characterId: character.id,
      rollFormula: '1d20',
      result: 20, // Second roll (most recent)
      diceResults: [20],
      isCritical: false,
      isHidden: false,
    })

    const history = await service.getCampaignRollHistory(campaign.id)

    // Most recent should be first
    assert.equal(history[0].result, 20)
    assert.equal(history[1].result, 1)
  })
})

test.group('DiceRollService - getCharacterRollHistory', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should return rolls for a specific character', async ({ assert }) => {
    const { default: DiceRollService } = await import('#services/vtt/dice_roll_service')
    const service = new DiceRollService()

    const user = await createTestUser()
    const campaign = await createTestCampaign({ ownerId: user.id })

    const character1 = await Character.create({
      campaignId: campaign.id,
      name: 'Character One',
      characterType: 'pc',
      vttCharacterId: 'vtt-char-one',
      lastSyncAt: DateTime.now(),
    })

    const character2 = await Character.create({
      campaignId: campaign.id,
      name: 'Character Two',
      characterType: 'pc',
      vttCharacterId: 'vtt-char-two',
      lastSyncAt: DateTime.now(),
    })

    // Create rolls for character 1
    await DiceRoll.create({
      campaignId: campaign.id,
      characterId: character1.id,
      rollFormula: '1d20',
      result: 15,
      diceResults: [15],
      isCritical: false,
      isHidden: false,
    })

    // Create rolls for character 2
    await DiceRoll.create({
      campaignId: campaign.id,
      characterId: character2.id,
      rollFormula: '1d20',
      result: 10,
      diceResults: [10],
      isCritical: false,
      isHidden: false,
    })

    const history = await service.getCharacterRollHistory(character1.id)

    // Should only return character 1's rolls
    assert.lengthOf(history, 1)
    assert.equal(history[0].characterId, character1.id)
  })
})

test.group('DiceRollService - getCharacterRollStats', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should calculate correct statistics', async ({ assert }) => {
    const { default: DiceRollService } = await import('#services/vtt/dice_roll_service')
    const service = new DiceRollService()

    const user = await createTestUser()
    const campaign = await createTestCampaign({ ownerId: user.id })
    const character = await Character.create({
      campaignId: campaign.id,
      name: 'Stats Character',
      characterType: 'pc',
      vttCharacterId: 'vtt-char-stats',
      lastSyncAt: DateTime.now(),
    })

    // Create various rolls
    await DiceRoll.create({
      campaignId: campaign.id,
      characterId: character.id,
      rollFormula: '1d20',
      result: 20,
      diceResults: [20],
      isCritical: true,
      criticalType: 'success',
      isHidden: false,
    })

    await DiceRoll.create({
      campaignId: campaign.id,
      characterId: character.id,
      rollFormula: '1d20',
      result: 1,
      diceResults: [1],
      isCritical: true,
      criticalType: 'failure',
      isHidden: false,
    })

    await DiceRoll.create({
      campaignId: campaign.id,
      characterId: character.id,
      rollFormula: '1d20',
      result: 10,
      diceResults: [10],
      isCritical: false,
      isHidden: false,
    })

    await DiceRoll.create({
      campaignId: campaign.id,
      characterId: character.id,
      rollFormula: '1d20',
      result: 15,
      diceResults: [15],
      isCritical: false,
      isHidden: false,
    })

    const stats = await service.getCharacterRollStats(character.id)

    assert.equal(stats.totalRolls, 4)
    assert.equal(stats.criticalSuccesses, 1)
    assert.equal(stats.criticalFailures, 1)
    // Average: (20 + 1 + 10 + 15) / 4 = 11.5
    assert.equal(stats.averageRoll, 11.5)
  })

  test('should return zero stats for character with no rolls', async ({ assert }) => {
    const { default: DiceRollService } = await import('#services/vtt/dice_roll_service')
    const service = new DiceRollService()

    const user = await createTestUser()
    const campaign = await createTestCampaign({ ownerId: user.id })
    const character = await Character.create({
      campaignId: campaign.id,
      name: 'No Rolls Character',
      characterType: 'pc',
      vttCharacterId: 'vtt-char-no-rolls',
      lastSyncAt: DateTime.now(),
    })

    const stats = await service.getCharacterRollStats(character.id)

    assert.equal(stats.totalRolls, 0)
    assert.equal(stats.criticalSuccesses, 0)
    assert.equal(stats.criticalFailures, 0)
    assert.equal(stats.averageRoll, 0)
  })

  test('should round average to 2 decimal places', async ({ assert }) => {
    const { default: DiceRollService } = await import('#services/vtt/dice_roll_service')
    const service = new DiceRollService()

    const user = await createTestUser()
    const campaign = await createTestCampaign({ ownerId: user.id })
    const character = await Character.create({
      campaignId: campaign.id,
      name: 'Rounding Character',
      characterType: 'pc',
      vttCharacterId: 'vtt-char-round',
      lastSyncAt: DateTime.now(),
    })

    // Create rolls that produce a repeating decimal average
    // 10 + 11 + 12 = 33 / 3 = 11
    await DiceRoll.create({
      campaignId: campaign.id,
      characterId: character.id,
      rollFormula: '1d20',
      result: 7,
      diceResults: [7],
      isCritical: false,
      isHidden: false,
    })

    await DiceRoll.create({
      campaignId: campaign.id,
      characterId: character.id,
      rollFormula: '1d20',
      result: 8,
      diceResults: [8],
      isCritical: false,
      isHidden: false,
    })

    await DiceRoll.create({
      campaignId: campaign.id,
      characterId: character.id,
      rollFormula: '1d20',
      result: 9,
      diceResults: [9],
      isCritical: false,
      isHidden: false,
    })

    const stats = await service.getCharacterRollStats(character.id)

    // (7 + 8 + 9) / 3 = 8
    assert.equal(stats.averageRoll, 8)
  })
})
