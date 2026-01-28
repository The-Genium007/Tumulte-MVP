import { test } from '@japa/runner'
import { CampaignRepository } from '#repositories/campaign_repository'
import testUtils from '#tests/helpers/database'
import { createTestUser } from '#tests/helpers/test_utils'

/**
 * Tests d'intégration pour CampaignRepository
 * Utilise la vraie base de données avec de vraies données de test
 */

test.group('CampaignRepository', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('create should create a new campaign', async ({ assert }) => {
    const user = await createTestUser()
    const repository = new CampaignRepository()

    const campaign = await repository.create({
      ownerId: user.id,
      name: 'Test Campaign',
      description: 'A test campaign',
    })

    assert.exists(campaign.id)
    assert.equal(campaign.name, 'Test Campaign')
    assert.equal(campaign.description, 'A test campaign')
    assert.equal(campaign.ownerId, user.id)
  })

  test('findById should return campaign by id', async ({ assert }) => {
    const user = await createTestUser()
    const repository = new CampaignRepository()

    const created = await repository.create({
      ownerId: user.id,
      name: 'Test Campaign',
      description: null,
    })

    const found = await repository.findById(created.id)

    assert.isNotNull(found)
    assert.equal(found!.id, created.id)
    assert.equal(found!.name, 'Test Campaign')
  })

  test('findById should return null if not found', async ({ assert }) => {
    const repository = new CampaignRepository()

    const found = await repository.findById('00000000-0000-4000-c000-000000000999')

    assert.isNull(found)
  })

  test('findByOwnerId should return campaigns for owner', async ({ assert }) => {
    const user1 = await createTestUser()
    const user2 = await createTestUser()
    const repository = new CampaignRepository()

    await repository.create({
      ownerId: user1.id,
      name: 'Campaign 1',
      description: null,
    })

    await repository.create({
      ownerId: user1.id,
      name: 'Campaign 2',
      description: null,
    })

    await repository.create({
      ownerId: user2.id,
      name: 'Campaign 3',
      description: null,
    })

    const campaigns = await repository.findByOwnerId(user1.id)

    assert.equal(campaigns.length, 2)
    assert.isTrue(campaigns.every((c) => c.ownerId === user1.id))
  })

  test('update should update campaign', async ({ assert }) => {
    const user = await createTestUser()
    const repository = new CampaignRepository()

    const campaign = await repository.create({
      ownerId: user.id,
      name: 'Old Name',
      description: 'Old Description',
    })

    campaign.name = 'New Name'
    campaign.description = 'New Description'

    const updated = await repository.update(campaign)

    assert.equal(updated.name, 'New Name')
    assert.equal(updated.description, 'New Description')
  })

  test('delete should delete campaign', async ({ assert }) => {
    const user = await createTestUser()
    const repository = new CampaignRepository()

    const campaign = await repository.create({
      ownerId: user.id,
      name: 'Test Campaign',
      description: null,
    })

    await repository.delete(campaign)

    const found = await repository.findById(campaign.id)

    assert.isNull(found)
  })

  test('isOwner should return true if user is owner', async ({ assert }) => {
    const user = await createTestUser()
    const repository = new CampaignRepository()

    const campaign = await repository.create({
      ownerId: user.id,
      name: 'Test Campaign',
      description: null,
    })

    const isOwner = await repository.isOwner(campaign.id, user.id)

    assert.isTrue(isOwner)
  })

  test('isOwner should return false if user is not owner', async ({ assert }) => {
    const user1 = await createTestUser()
    const user2 = await createTestUser()
    const repository = new CampaignRepository()

    const campaign = await repository.create({
      ownerId: user1.id,
      name: 'Test Campaign',
      description: null,
    })

    const isOwner = await repository.isOwner(campaign.id, user2.id)

    assert.isFalse(isOwner)
  })

  test('countByOwnerId should return correct count', async ({ assert }) => {
    const user = await createTestUser()
    const repository = new CampaignRepository()

    await repository.create({
      ownerId: user.id,
      name: 'Campaign 1',
      description: null,
    })

    await repository.create({
      ownerId: user.id,
      name: 'Campaign 2',
      description: null,
    })

    const count = await repository.countByOwnerId(user.id)

    assert.equal(count, 2)
  })
})
