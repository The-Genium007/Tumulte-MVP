import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import {
  createTestUser,
  createTestVttProvider,
  createTestVttConnection,
  createTestCampaign,
} from '#tests/helpers/test_utils'
import { campaign as Campaign } from '#models/campaign'
import { DateTime } from 'luxon'

test.group('VttSyncService - fetchCampaignsFromVtt', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should return empty array (campaigns are created via pairing flow)', async ({ assert }) => {
    const { default: VttSyncService } = await import('#services/vtt/vtt_sync_service')
    const service = new VttSyncService()

    const user = await createTestUser()
    const provider = await createTestVttProvider({ name: 'foundry' })
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })

    const campaigns = await service.fetchCampaignsFromVtt(connection)

    // Should return empty array - campaigns are now created via pairWithCode()
    assert.isArray(campaigns)
    assert.lengthOf(campaigns, 0)
  })
})

test.group('VttSyncService - syncCampaignsFromWebSocket', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create new campaign from VTT data', async ({ assert }) => {
    const { default: VttSyncService } = await import('#services/vtt/vtt_sync_service')
    const service = new VttSyncService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })

    const vttCampaigns = [
      {
        id: 'vtt-campaign-123',
        name: 'Test Campaign from VTT',
        description: 'A test campaign',
      },
    ]

    const syncedCampaigns = await service.syncCampaignsFromWebSocket(connection, vttCampaigns)

    assert.lengthOf(syncedCampaigns, 1)
    assert.equal(syncedCampaigns[0].name, 'Test Campaign from VTT')
    assert.equal(syncedCampaigns[0].vttCampaignId, 'vtt-campaign-123')
    assert.equal(syncedCampaigns[0].vttConnectionId, connection.id)
    assert.equal(syncedCampaigns[0].ownerId, user.id)
  })

  test('should update existing campaign on sync', async ({ assert }) => {
    const { default: VttSyncService } = await import('#services/vtt/vtt_sync_service')
    const service = new VttSyncService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })

    // Create existing campaign
    const existingCampaign = await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'vtt-campaign-123',
      name: 'Old Name',
    })

    const vttCampaigns = [
      {
        id: 'vtt-campaign-123',
        name: 'Updated Name from VTT',
        description: 'Updated description',
      },
    ]

    const syncedCampaigns = await service.syncCampaignsFromWebSocket(connection, vttCampaigns)

    assert.lengthOf(syncedCampaigns, 1)
    assert.equal(syncedCampaigns[0].id, existingCampaign.id)
    assert.equal(syncedCampaigns[0].name, 'Updated Name from VTT')
  })

  test('should sync multiple campaigns at once', async ({ assert }) => {
    const { default: VttSyncService } = await import('#services/vtt/vtt_sync_service')
    const service = new VttSyncService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })

    const vttCampaigns = [
      { id: 'vtt-campaign-1', name: 'Campaign One' },
      { id: 'vtt-campaign-2', name: 'Campaign Two' },
      { id: 'vtt-campaign-3', name: 'Campaign Three' },
    ]

    const syncedCampaigns = await service.syncCampaignsFromWebSocket(connection, vttCampaigns)

    assert.lengthOf(syncedCampaigns, 3)

    const names = syncedCampaigns.map((c) => c.name)
    assert.include(names, 'Campaign One')
    assert.include(names, 'Campaign Two')
    assert.include(names, 'Campaign Three')
  })

  test('should handle empty campaign array', async ({ assert }) => {
    const { default: VttSyncService } = await import('#services/vtt/vtt_sync_service')
    const service = new VttSyncService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })

    const syncedCampaigns = await service.syncCampaignsFromWebSocket(connection, [])

    assert.lengthOf(syncedCampaigns, 0)
  })

  test('should set lastVttSyncAt timestamp on sync', async ({ assert }) => {
    const { default: VttSyncService } = await import('#services/vtt/vtt_sync_service')
    const service = new VttSyncService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })

    const beforeSync = DateTime.now()

    const vttCampaigns = [{ id: 'vtt-campaign-123', name: 'Test Campaign' }]

    const syncedCampaigns = await service.syncCampaignsFromWebSocket(connection, vttCampaigns)

    const afterSync = DateTime.now()

    assert.isNotNull(syncedCampaigns[0].lastVttSyncAt)
    const syncTime = syncedCampaigns[0].lastVttSyncAt!
    assert.isTrue(syncTime >= beforeSync)
    assert.isTrue(syncTime <= afterSync)
  })

  test('should preserve existing description if VTT does not provide one', async ({ assert }) => {
    const { default: VttSyncService } = await import('#services/vtt/vtt_sync_service')
    const service = new VttSyncService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })

    // Create existing campaign with description
    await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'vtt-campaign-123',
      name: 'Campaign',
      description: 'Existing description',
    })

    // Sync without description
    const vttCampaigns = [{ id: 'vtt-campaign-123', name: 'Updated Campaign' }]

    const syncedCampaigns = await service.syncCampaignsFromWebSocket(connection, vttCampaigns)

    // Description should be preserved
    assert.equal(syncedCampaigns[0].description, 'Existing description')
  })
})

test.group('VttSyncService - Campaign Query Patterns', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should find campaign by vtt_connection_id and vtt_campaign_id', async ({ assert }) => {
    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })

    const campaign = await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'specific-vtt-id',
    })

    // Query pattern used in VttSyncService
    const foundCampaign = await Campaign.query()
      .where('vtt_connection_id', connection.id)
      .where('vtt_campaign_id', 'specific-vtt-id')
      .first()

    assert.isNotNull(foundCampaign)
    assert.equal(foundCampaign!.id, campaign.id)
  })

  test('should not find campaign with wrong vtt_campaign_id', async ({ assert }) => {
    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })

    await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
      vttCampaignId: 'correct-vtt-id',
    })

    const foundCampaign = await Campaign.query()
      .where('vtt_connection_id', connection.id)
      .where('vtt_campaign_id', 'wrong-vtt-id')
      .first()

    assert.isNull(foundCampaign)
  })
})
