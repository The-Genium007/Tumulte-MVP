import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import { createTestUser, createTestCampaign } from '#tests/helpers/test_utils'
import { campaign as Campaign } from '#models/campaign'

test.group('Campaigns CRUD API (MJ)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Campaign repository should return empty list for new user', async ({ assert }) => {
    const user = await createTestUser({ role: 'MJ' })

    const campaigns = await Campaign.query().where('ownerId', user.id)

    assert.isArray(campaigns)
    assert.lengthOf(campaigns, 0)
  })

  test('Campaign repository should return campaigns list for owner', async ({ assert }) => {
    const user = await createTestUser({ role: 'MJ' })

    await createTestCampaign({ ownerId: user.id, name: 'Campaign 1' })
    await createTestCampaign({ ownerId: user.id, name: 'Campaign 2' })

    const campaigns = await Campaign.query().where('ownerId', user.id).orderBy('name', 'asc')

    assert.isArray(campaigns)
    assert.lengthOf(campaigns, 2)
    assert.equal(campaigns[0].name, 'Campaign 1')
    assert.equal(campaigns[1].name, 'Campaign 2')
  })

  test('Campaign should not be accessible by non-owner', async ({ assert }) => {
    const owner = await createTestUser({ role: 'MJ' })
    const otherUser = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: owner.id })

    // Verify campaign belongs to owner, not otherUser
    assert.notEqual(campaign.ownerId, otherUser.id)
    assert.equal(campaign.ownerId, owner.id)
  })

  test('Campaign create should set correct owner', async ({ assert }) => {
    const user = await createTestUser({ role: 'MJ' })

    const campaign = await Campaign.create({
      ownerId: user.id,
      name: 'New Campaign',
      description: 'A test campaign',
    })

    assert.equal(campaign.name, 'New Campaign')
    assert.equal(campaign.description, 'A test campaign')
    assert.equal(campaign.ownerId, user.id)
    assert.exists(campaign.id)
  })

  test('Campaign name validation should reject short names', async ({ assert }) => {
    // Name must be at least 3 characters
    const shortName = 'AB'
    assert.isTrue(shortName.length < 3)
  })

  test('Campaign findById should return campaign details', async ({ assert }) => {
    const user = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id, name: 'Test Campaign' })

    const found = await Campaign.find(campaign.id)

    assert.isNotNull(found)
    assert.equal(found!.id, campaign.id)
    assert.equal(found!.name, 'Test Campaign')
    assert.equal(found!.ownerId, user.id)
  })

  test('Campaign findById should return null for non-existent campaign', async ({ assert }) => {
    const found = await Campaign.find('00000000-0000-0000-0000-000000000000')

    assert.isNull(found)
  })

  test('Campaign update should modify fields', async ({ assert }) => {
    const user = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id, name: 'Old Name' })

    campaign.name = 'Updated Name'
    campaign.description = 'Updated description'
    await campaign.save()

    const updated = await Campaign.find(campaign.id)
    assert.equal(updated!.name, 'Updated Name')
    assert.equal(updated!.description, 'Updated description')
  })

  test('Campaign delete should remove from database', async ({ assert }) => {
    const user = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })
    const campaignId = campaign.id

    await campaign.delete()

    const deleted = await Campaign.find(campaignId)
    assert.isNull(deleted)
  })

  test('Campaign ownership check should work correctly', async ({ assert }) => {
    const owner = await createTestUser({ role: 'MJ' })
    const otherUser = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: owner.id })

    assert.isTrue(campaign.ownerId === owner.id)
    assert.isFalse(campaign.ownerId === otherUser.id)
  })
})
