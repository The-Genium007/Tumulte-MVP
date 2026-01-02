import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import { createAuthenticatedUser, createTestCampaign } from '#tests/helpers/test_utils'

test.group('Campaigns CRUD API (MJ)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /api/v2/mj/campaigns should return empty list for new user', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })

    const response = await client.get('/api/v2/mj/campaigns').bearerToken(token)

    assert.equal(response.status(), 200)
    assert.isArray(response.body())
    assert.lengthOf(response.body(), 0)
  })

  test('GET /api/v2/mj/campaigns should return campaigns list for owner', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })

    // Create 2 campaigns for this user
    const campaign1 = await createTestCampaign({ ownerId: user.id, name: 'Campaign 1' })
    const campaign2 = await createTestCampaign({ ownerId: user.id, name: 'Campaign 2' })

    const response = await client.get('/api/v2/mj/campaigns').bearerToken(token)

    assert.equal(response.status(), 200)
    assert.isArray(response.body())
    assert.lengthOf(response.body(), 2)
    assert.equal(response.body()[0].name, 'Campaign 1')
    assert.equal(response.body()[1].name, 'Campaign 2')
  })

  test('GET /api/v2/mj/campaigns should return 401 without authentication', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/api/v2/mj/campaigns')

    assert.equal(response.status(), 401)
  })

  test('POST /api/v2/mj/campaigns should create campaign', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })

    const response = await client
      .post('/api/v2/mj/campaigns')
      .json({
        name: 'New Campaign',
        description: 'A test campaign',
      })
      .bearerToken(token)

    assert.equal(response.status(), 201)
    assert.equal(response.body().name, 'New Campaign')
    assert.equal(response.body().description, 'A test campaign')
    assert.equal(response.body().ownerId, user.id)
    assert.exists(response.body().id)
  })

  test('POST /api/v2/mj/campaigns should validate campaign name', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })

    const response = await client
      .post('/api/v2/mj/campaigns')
      .json({
        name: 'AB', // Too short (< 3 chars)
        description: 'Test',
      })
      .bearerToken(token)

    assert.equal(response.status(), 422)
    assert.exists(response.body().errors)
  })

  test('GET /api/v2/mj/campaigns/:id should return campaign details', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id, name: 'Test Campaign' })

    const response = await client.get(`/api/v2/mj/campaigns/${campaign.id}`).bearerToken(token)

    assert.equal(response.status(), 200)
    assert.equal(response.body().id, campaign.id)
    assert.equal(response.body().name, 'Test Campaign')
    assert.equal(response.body().ownerId, user.id)
  })

  test('GET /api/v2/mj/campaigns/:id should return 404 for non-existent campaign', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })

    const response = await client.get('/api/v2/mj/campaigns/non-existent-id').bearerToken(token)

    assert.equal(response.status(), 404)
  })

  test('GET /api/v2/mj/campaigns/:id should return 403 for non-owner', async ({
    client,
    assert,
  }) => {
    const { user: otherUser, token } = await createAuthenticatedUser({ role: 'MJ' })
    const { user: owner } = await createAuthenticatedUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: owner.id })

    const response = await client.get(`/api/v2/mj/campaigns/${campaign.id}`).bearerToken(token)

    assert.equal(response.status(), 403)
  })

  test('PUT /api/v2/mj/campaigns/:id should update campaign', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id, name: 'Old Name' })

    const response = await client
      .put(`/api/v2/mj/campaigns/${campaign.id}`)
      .json({
        name: 'Updated Name',
        description: 'Updated description',
      })
      .bearerToken(token)

    assert.equal(response.status(), 200)
    assert.equal(response.body().name, 'Updated Name')
    assert.equal(response.body().description, 'Updated description')
  })

  test('PUT /api/v2/mj/campaigns/:id should return 403 for non-owner', async ({
    client,
    assert,
  }) => {
    const { user: otherUser, token } = await createAuthenticatedUser({ role: 'MJ' })
    const { user: owner } = await createAuthenticatedUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: owner.id })

    const response = await client
      .put(`/api/v2/mj/campaigns/${campaign.id}`)
      .json({ name: 'Hacked Name' })
      .bearerToken(token)

    assert.equal(response.status(), 403)
  })

  test('DELETE /api/v2/mj/campaigns/:id should delete campaign', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })

    const response = await client.delete(`/api/v2/mj/campaigns/${campaign.id}`).bearerToken(token)

    assert.equal(response.status(), 204)

    // Verify campaign is deleted
    const getResponse = await client.get(`/api/v2/mj/campaigns/${campaign.id}`).bearerToken(token)
    assert.equal(getResponse.status(), 404)
  })

  test('DELETE /api/v2/mj/campaigns/:id should return 403 for non-owner', async ({
    client,
    assert,
  }) => {
    const { user: otherUser, token } = await createAuthenticatedUser({ role: 'MJ' })
    const { user: owner } = await createAuthenticatedUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: owner.id })

    const response = await client.delete(`/api/v2/mj/campaigns/${campaign.id}`).bearerToken(token)

    assert.equal(response.status(), 403)
  })
})
