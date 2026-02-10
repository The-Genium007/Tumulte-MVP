import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import {
  createTestUser,
  createTestVttProvider,
  createTestVttConnection,
  createTestCampaign,
  createTestStreamer,
} from '#tests/helpers/test_utils'
import Character from '#models/character'
import CharacterAssignment from '#models/character_assignment'
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

    const { diceRoll } = await service.processDiceRoll(connection, payload)

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

    // Create a streamer and assign the character to them
    // (Required for the roll to be attributed to the character)
    const streamer = await createTestStreamer()
    await CharacterAssignment.create({
      campaignId: campaign.id,
      streamerId: streamer.id,
      characterId: existingChar.id,
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

    const { diceRoll } = await service.processDiceRoll(connection, payload)

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
    const { diceRoll: firstRoll } = await service.processDiceRoll(connection, payload)

    // Second call with same rollId should return existing
    const { diceRoll: secondRoll } = await service.processDiceRoll(connection, payload)

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

    const { diceRoll } = await service.processDiceRoll(connection, payload)

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

// ========================================
// GAMIFICATION INTEGRATION TESTS
// ========================================

test.group('VttWebhookService - gamification onDiceRoll integration', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should call gamificationService.onDiceRoll for player character rolls', async ({
    assert,
  }) => {
    let onDiceRollCalled = false
    let capturedCampaignId = ''
    let capturedStreamerId = ''
    let capturedStreamerName = ''

    const mockGamificationService = {
      onDiceRoll: async (
        campaignId: string,
        streamerId: string,
        streamerName: string,
        _viewerCount: number,
        _diceRollData: any
      ) => {
        onDiceRollCalled = true
        capturedCampaignId = campaignId
        capturedStreamerId = streamerId
        capturedStreamerName = streamerName
        return null
      },
    }

    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService(mockGamificationService as any)

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })
    const campaign = await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'gami-campaign-1',
    })

    // Create character and assign to a streamer (player roll)
    const streamer = await createTestStreamer({ twitchDisplayName: 'PlayerOne' })
    const character = await Character.create({
      campaignId: campaign.id,
      vttCharacterId: 'player-char-1',
      name: 'Ragnar',
      characterType: 'pc',
      lastSyncAt: DateTime.now(),
    })
    await CharacterAssignment.create({
      campaignId: campaign.id,
      streamerId: streamer.id,
      characterId: character.id,
    })

    const payload = {
      campaignId: 'gami-campaign-1',
      characterId: 'player-char-1',
      characterName: 'Ragnar',
      rollFormula: '1d20',
      result: 20,
      diceResults: [20],
      isCritical: true,
      criticalType: 'success' as const,
    }

    await service.processDiceRoll(connection, payload)

    assert.isTrue(onDiceRollCalled)
    assert.equal(capturedCampaignId, campaign.id)
    assert.equal(capturedStreamerId, streamer.id)
    assert.equal(capturedStreamerName, 'PlayerOne')
  })

  test('should call gamificationService.onDiceRoll for GM rolls with active character', async ({
    assert,
  }) => {
    let onDiceRollCalled = false
    let capturedStreamerId = ''

    const mockGamificationService = {
      onDiceRoll: async (
        _campaignId: string,
        streamerId: string,
        _streamerName: string,
        _viewerCount: number,
        _diceRollData: any
      ) => {
        onDiceRollCalled = true
        capturedStreamerId = streamerId
        return null
      },
    }

    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService(mockGamificationService as any)

    const user = await createTestUser()
    const gmStreamer = await createTestStreamer({ userId: user.id })
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })

    // Create campaign first (without gmActiveCharacterId)
    const campaign = await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'gami-campaign-2',
    })

    // Create GM active character with correct campaignId
    const gmCharacter = await Character.create({
      campaignId: campaign.id,
      vttCharacterId: 'gm-active-char',
      name: 'GM Character',
      characterType: 'npc',
      lastSyncAt: DateTime.now(),
    })

    // Update campaign to set GM active character
    campaign.gmActiveCharacterId = gmCharacter.id
    await campaign.save()

    const payload = {
      campaignId: 'gami-campaign-2',
      characterId: 'some-npc-id', // NPC not assigned to any player
      characterName: 'Goblin',
      rollFormula: '1d20',
      result: 1,
      diceResults: [1],
      isCritical: true,
      criticalType: 'failure' as const,
    }

    await service.processDiceRoll(connection, payload)

    assert.isTrue(onDiceRollCalled)
    assert.equal(capturedStreamerId, gmStreamer.id)
  })

  test('should NOT call gamificationService.onDiceRoll when pending attribution', async ({
    assert,
  }) => {
    let onDiceRollCalled = false

    const mockGamificationService = {
      onDiceRoll: async () => {
        onDiceRollCalled = true
        return null
      },
    }

    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService(mockGamificationService as any)

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })
    // Campaign with NO gmActiveCharacterId
    await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'gami-campaign-3',
    })

    const payload = {
      campaignId: 'gami-campaign-3',
      characterId: 'unassigned-char',
      characterName: 'Unknown NPC',
      rollFormula: '1d20',
      result: 15,
      diceResults: [15],
      isCritical: false,
    }

    const { pendingAttribution } = await service.processDiceRoll(connection, payload)

    assert.isTrue(pendingAttribution)
    assert.isFalse(onDiceRollCalled)
  })

  test('should NOT call gamificationService.onDiceRoll when service is null', async ({
    assert,
  }) => {
    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService(null)

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })
    const campaign = await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'gami-campaign-4',
    })

    // Create a player character with assignment so it's not pending
    const streamer = await createTestStreamer()
    const character = await Character.create({
      campaignId: campaign.id,
      vttCharacterId: 'assigned-char',
      name: 'Hero',
      characterType: 'pc',
      lastSyncAt: DateTime.now(),
    })
    await CharacterAssignment.create({
      campaignId: campaign.id,
      streamerId: streamer.id,
      characterId: character.id,
    })

    const payload = {
      campaignId: 'gami-campaign-4',
      characterId: 'assigned-char',
      characterName: 'Hero',
      rollFormula: '1d20',
      result: 20,
      diceResults: [20],
      isCritical: true,
      criticalType: 'success' as const,
    }

    // Should not throw — gamification is simply skipped
    const { diceRoll } = await service.processDiceRoll(connection, payload)
    assert.exists(diceRoll.id)
  })

  test('should handle gamificationService.onDiceRoll errors gracefully', async ({ assert }) => {
    const mockGamificationService = {
      onDiceRoll: async () => {
        throw new Error('Gamification failed')
      },
    }

    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService(mockGamificationService as any)

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })
    const campaign = await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'gami-campaign-5',
    })

    const streamer = await createTestStreamer()
    const character = await Character.create({
      campaignId: campaign.id,
      vttCharacterId: 'error-char',
      name: 'Error Hero',
      characterType: 'pc',
      lastSyncAt: DateTime.now(),
    })
    await CharacterAssignment.create({
      campaignId: campaign.id,
      streamerId: streamer.id,
      characterId: character.id,
    })

    const payload = {
      campaignId: 'gami-campaign-5',
      characterId: 'error-char',
      characterName: 'Error Hero',
      rollFormula: '1d20',
      result: 20,
      diceResults: [20],
      isCritical: true,
      criticalType: 'success' as const,
    }

    // Should NOT throw — error is caught and logged
    const { diceRoll } = await service.processDiceRoll(connection, payload)
    assert.exists(diceRoll.id)
    assert.equal(diceRoll.result, 20)
  })
})

// ========================================
// CHARACTER RESOLUTION TESTS
// ========================================

test.group('VttWebhookService - resolveCharacterForRoll character name', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should use GM active character name when roll is re-attributed', async ({ assert }) => {
    let capturedCharacterName = ''

    const mockGamificationService = {
      onDiceRoll: async (
        _campaignId: string,
        _streamerId: string,
        _streamerName: string,
        _viewerCount: number,
        diceRollData: any
      ) => {
        capturedCharacterName = diceRollData.characterName
        return null
      },
    }

    const { default: VttWebhookService } = await import('#services/vtt/vtt_webhook_service')
    const service = new VttWebhookService(mockGamificationService as any)

    const user = await createTestUser()
    await createTestStreamer({ userId: user.id })
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })

    // Create campaign first, then character, then link them
    const campaign = await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'name-test-campaign',
    })

    const gmChar = await Character.create({
      campaignId: campaign.id,
      vttCharacterId: 'gm-char-name-test',
      name: 'Maître du Donjon',
      characterType: 'npc',
      lastSyncAt: DateTime.now(),
    })

    campaign.gmActiveCharacterId = gmChar.id
    await campaign.save()

    // The VTT sends roll from "Goblin" but it should be re-attributed to "Maître du Donjon"
    const payload = {
      campaignId: 'name-test-campaign',
      characterId: 'goblin-npc-id',
      characterName: 'Goblin',
      rollFormula: '1d20',
      result: 20,
      diceResults: [20],
      isCritical: true,
      criticalType: 'success' as const,
    }

    await service.processDiceRoll(connection, payload)

    // The gamification should receive the GM active character name, not 'Goblin'
    assert.equal(capturedCharacterName, 'Maître du Donjon')
  })

  test('should set pendingAttribution when no player assignment and no GM active character', async ({
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
    await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'pending-test-campaign',
      // No gmActiveCharacterId
    })

    const payload = {
      campaignId: 'pending-test-campaign',
      characterId: 'npc-no-owner',
      characterName: 'Random NPC',
      rollFormula: '1d20',
      result: 10,
      diceResults: [10],
      isCritical: false,
    }

    const { pendingAttribution, diceRoll } = await service.processDiceRoll(connection, payload)

    assert.isTrue(pendingAttribution)
    assert.isNull(diceRoll.characterId)
  })

  test('should attribute roll to GM active character ID', async ({ assert }) => {
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
      vttCampaignId: 'attrib-test-campaign',
    })

    const gmChar = await Character.create({
      campaignId: campaign.id,
      vttCharacterId: 'gm-active-for-attrib',
      name: 'GM Char',
      characterType: 'npc',
      lastSyncAt: DateTime.now(),
    })

    campaign.gmActiveCharacterId = gmChar.id
    await campaign.save()

    const payload = {
      campaignId: 'attrib-test-campaign',
      characterId: 'some-npc',
      characterName: 'Some NPC',
      rollFormula: '1d20',
      result: 12,
      diceResults: [12],
      isCritical: false,
    }

    const { diceRoll, pendingAttribution } = await service.processDiceRoll(connection, payload)

    assert.isFalse(pendingAttribution)
    assert.equal(diceRoll.characterId, gmChar.id)
  })
})
