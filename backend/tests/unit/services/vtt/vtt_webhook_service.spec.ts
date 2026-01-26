import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import {
  createTestUser,
  createTestVttProvider,
  createTestVttConnection,
  createTestCampaign,
} from '#tests/helpers/test_utils'
import Character from '#models/character'
import DiceRoll from '#models/dice_roll'
import { DateTime } from 'luxon'

test.group('VttWebhookService - processDiceRoll', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should process dice roll and create record', async ({ assert }) => {
    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })
    const campaign = await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'vtt-campaign-123',
    })

    const payload = {
      campaignId: 'vtt-campaign-123',
      characterId: 'vtt-char-456',
      characterName: 'Test Hero',
      rollFormula: '1d20+5',
      result: 18,
      diceResults: [13],
      isCritical: false,
    }

    const diceRoll = await service.processDiceRoll(connection, payload)

    assert.exists(diceRoll.id)
    assert.equal(diceRoll.campaignId, campaign.id)
    assert.equal(diceRoll.rollFormula, '1d20+5')
    assert.equal(diceRoll.result, 18)
  })

  test('should create character if not exists', async ({ assert }) => {
    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })
    await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'vtt-campaign-new',
    })

    const payload = {
      campaignId: 'vtt-campaign-new',
      characterId: 'new-char-id',
      characterName: 'New Character',
      rollFormula: '1d20',
      result: 15,
      diceResults: [15],
      isCritical: false,
    }

    await service.processDiceRoll(connection, payload)

    // Check character was created
    const character = await Character.query().where('vtt_character_id', 'new-char-id').firstOrFail()

    assert.equal(character.name, 'New Character')
    assert.equal(character.characterType, 'pc')
  })

  test('should reuse existing character on subsequent rolls', async ({ assert }) => {
    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })
    const campaign = await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'vtt-campaign-reuse',
    })

    // Create existing character
    const existingChar = await Character.create({
      campaignId: campaign.id,
      vttCharacterId: 'existing-char-id',
      name: 'Existing Hero',
      characterType: 'pc',
      lastSyncAt: DateTime.now(),
    })

    const payload = {
      campaignId: 'vtt-campaign-reuse',
      characterId: 'existing-char-id',
      characterName: 'Existing Hero',
      rollFormula: '1d20',
      result: 10,
      diceResults: [10],
      isCritical: false,
    }

    const diceRoll = await service.processDiceRoll(connection, payload)

    assert.equal(diceRoll.characterId, existingChar.id)

    // Should not create duplicate
    const characterCount = await Character.query()
      .where('vtt_character_id', 'existing-char-id')
      .count('* as total')

    assert.equal(characterCount[0].$extras.total, 1)
  })

  test('should update character name if changed in VTT', async ({ assert }) => {
    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })
    const campaign = await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'vtt-campaign-rename',
    })

    // Create existing character with old name
    await Character.create({
      campaignId: campaign.id,
      vttCharacterId: 'rename-char-id',
      name: 'Old Name',
      characterType: 'pc',
      lastSyncAt: DateTime.now(),
    })

    const payload = {
      campaignId: 'vtt-campaign-rename',
      characterId: 'rename-char-id',
      characterName: 'New Updated Name', // Changed name
      rollFormula: '1d20',
      result: 10,
      diceResults: [10],
      isCritical: false,
    }

    await service.processDiceRoll(connection, payload)

    const character = await Character.query()
      .where('vtt_character_id', 'rename-char-id')
      .firstOrFail()

    assert.equal(character.name, 'New Updated Name')
  })

  test('should deduplicate rolls by rollId', async ({ assert }) => {
    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })
    const campaign = await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'vtt-campaign-dedup',
    })

    const payload = {
      campaignId: 'vtt-campaign-dedup',
      characterId: 'dedup-char-id',
      characterName: 'Dedup Hero',
      rollId: 'unique-roll-123', // Unique roll ID
      rollFormula: '1d20',
      result: 15,
      diceResults: [15],
      isCritical: false,
    }

    // First call should create roll
    const firstRoll = await service.processDiceRoll(connection, payload)

    // Second call with same rollId should return existing
    const secondRoll = await service.processDiceRoll(connection, payload)

    assert.equal(firstRoll.id, secondRoll.id)

    // Should only have one roll in DB
    const rollCount = await DiceRoll.query()
      .where('campaign_id', campaign.id)
      .where('vtt_roll_id', 'unique-roll-123')
      .count('* as total')

    assert.equal(rollCount[0].$extras.total, 1)
  })

  test('should include enriched flavor data in roll', async ({ assert }) => {
    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })
    await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'vtt-campaign-flavor',
    })

    const payload = {
      campaignId: 'vtt-campaign-flavor',
      characterId: 'flavor-char-id',
      characterName: 'Skilled Hero',
      rollFormula: '1d20+8',
      result: 22,
      diceResults: [14],
      isCritical: false,
      skill: 'Acrobatics',
      skillRaw: 'acrobatics',
      ability: 'Dexterity',
      abilityRaw: 'dex',
      modifiers: ['+5 proficiency', '+3 dex'],
    }

    const diceRoll = await service.processDiceRoll(connection, payload)

    assert.equal(diceRoll.skill, 'Acrobatics')
    assert.equal(diceRoll.skillRaw, 'acrobatics')
    assert.equal(diceRoll.ability, 'Dexterity')
    assert.equal(diceRoll.abilityRaw, 'dex')
    assert.deepEqual(diceRoll.modifiers, ['+5 proficiency', '+3 dex'])
  })

  test('should throw error for unknown campaign', async ({ assert }) => {
    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })

    const payload = {
      campaignId: 'non-existent-campaign',
      characterId: 'char-id',
      characterName: 'Hero',
      rollFormula: '1d20',
      result: 10,
      diceResults: [10],
      isCritical: false,
    }

    await assert.rejects(async () => {
      await service.processDiceRoll(connection, payload)
    })
  })
})

test.group('VttWebhookService - syncCharacter', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create new character with full data', async ({ assert }) => {
    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })
    await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'sync-campaign-123',
    })

    const characterData = {
      vttCharacterId: 'sync-char-id',
      name: 'Synced Hero',
      avatarUrl: 'https://example.com/avatar.png',
      characterType: 'pc' as const,
      stats: { strength: 16, dexterity: 14 },
      inventory: { gold: 100 },
      vttData: { level: 5, class: 'Fighter' },
    }

    const character = await service.syncCharacter(connection, 'sync-campaign-123', characterData)

    assert.exists(character.id)
    assert.equal(character.name, 'Synced Hero')
    assert.equal(character.avatarUrl, 'https://example.com/avatar.png')
    assert.equal(character.characterType, 'pc')
    assert.deepEqual(character.stats, { strength: 16, dexterity: 14 })
    assert.deepEqual(character.inventory, { gold: 100 })
    assert.deepEqual(character.vttData, { level: 5, class: 'Fighter' })
  })

  test('should update existing character', async ({ assert }) => {
    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })
    const campaign = await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'update-campaign-123',
    })

    // Create existing character
    await Character.create({
      campaignId: campaign.id,
      vttCharacterId: 'update-char-id',
      name: 'Old Name',
      characterType: 'pc',
      stats: { strength: 10 },
      lastSyncAt: DateTime.now(),
    })

    const characterData = {
      vttCharacterId: 'update-char-id',
      name: 'Updated Name',
      avatarUrl: 'https://example.com/new-avatar.png',
      stats: { strength: 18 }, // Updated stats
    }

    const character = await service.syncCharacter(connection, 'update-campaign-123', characterData)

    assert.equal(character.name, 'Updated Name')
    assert.equal(character.avatarUrl, 'https://example.com/new-avatar.png')
    assert.deepEqual(character.stats, { strength: 18 })
  })

  test('should find campaign by connection only when vtt_campaign_id not set', async ({
    assert,
  }) => {
    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })

    // Create campaign without vttCampaignId
    await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: null, // Not set initially
    })

    const characterData = {
      vttCharacterId: 'fallback-char-id',
      name: 'Fallback Hero',
    }

    // Should find campaign by connection ID and update vttCampaignId
    const character = await service.syncCharacter(connection, 'new-vtt-campaign-id', characterData)

    assert.exists(character.id)
    assert.equal(character.name, 'Fallback Hero')
  })

  test('should throw error for non-existent campaign', async ({ assert }) => {
    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })

    // No campaign created for this connection

    const characterData = {
      vttCharacterId: 'orphan-char-id',
      name: 'Orphan Hero',
    }

    await assert.rejects(async () => {
      await service.syncCharacter(connection, 'non-existent-campaign', characterData)
    }, /Campaign not found/)
  })

  test('should preserve existing data when partial update', async ({ assert }) => {
    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })
    const campaign = await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'preserve-campaign-123',
    })

    // Create character with full data
    await Character.create({
      campaignId: campaign.id,
      vttCharacterId: 'preserve-char-id',
      name: 'Full Hero',
      characterType: 'pc',
      avatarUrl: 'https://example.com/original.png',
      stats: { strength: 16, dexterity: 14 },
      inventory: { gold: 500 },
      vttData: { level: 10 },
      lastSyncAt: DateTime.now(),
    })

    // Partial update - only name
    const characterData = {
      vttCharacterId: 'preserve-char-id',
      name: 'Renamed Hero',
      // No other fields provided
    }

    const character = await service.syncCharacter(
      connection,
      'preserve-campaign-123',
      characterData
    )

    // Name should be updated
    assert.equal(character.name, 'Renamed Hero')

    // Other fields should be preserved
    assert.equal(character.characterType, 'pc')
    assert.deepEqual(character.stats, { strength: 16, dexterity: 14 })
    assert.deepEqual(character.inventory, { gold: 500 })
    assert.deepEqual(character.vttData, { level: 10 })
  })

  test('should handle NPC character type', async ({ assert }) => {
    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })
    await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'npc-campaign-123',
    })

    const characterData = {
      vttCharacterId: 'npc-char-id',
      name: 'Goblin Enemy',
      characterType: 'npc' as const,
    }

    const character = await service.syncCharacter(connection, 'npc-campaign-123', characterData)

    assert.equal(character.characterType, 'npc')
  })
})
