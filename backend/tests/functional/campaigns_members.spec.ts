import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import {
  createAuthenticatedUser,
  createTestCampaign,
  createTestStreamer,
  createTestMembership,
} from '#tests/helpers/test_utils'

test.group('Campaign Members API (MJ)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST /api/v2/mj/campaigns/:id/invite should invite streamer', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })
    const streamer = await createTestStreamer()

    const response = await client
      .post(`/api/v2/mj/campaigns/${campaign.id}/invite`)
      .json({
        streamerId: streamer.id,
      })
      .bearerToken(token)

    assert.equal(response.status(), 201)
    assert.equal(response.body().campaignId, campaign.id)
    assert.equal(response.body().streamerId, streamer.id)
    assert.equal(response.body().status, 'PENDING')
    assert.exists(response.body().invitedAt)
  })

  test('POST /api/v2/mj/campaigns/:id/invite should return 403 for non-owner', async ({
    client,
    assert,
  }) => {
    const { user: otherUser, token } = await createAuthenticatedUser({ role: 'MJ' })
    const { user: owner } = await createAuthenticatedUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: owner.id })
    const streamer = await createTestStreamer()

    const response = await client
      .post(`/api/v2/mj/campaigns/${campaign.id}/invite`)
      .json({ streamerId: streamer.id })
      .bearerToken(token)

    assert.equal(response.status(), 403)
  })

  test('GET /api/v2/mj/campaigns/:id/members should list members', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })

    // Create 2 members
    const streamer1 = await createTestStreamer()
    const streamer2 = await createTestStreamer()
    await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer1.id,
      status: 'ACTIVE',
    })
    await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer2.id,
      status: 'PENDING',
    })

    const response = await client
      .get(`/api/v2/mj/campaigns/${campaign.id}/members`)
      .bearerToken(token)

    assert.equal(response.status(), 200)
    assert.isArray(response.body())
    assert.lengthOf(response.body(), 2)
  })

  test('DELETE /api/v2/mj/campaigns/:id/members/:memberId should remove member', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })
    const streamer = await createTestStreamer()
    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
    })

    const response = await client
      .delete(`/api/v2/mj/campaigns/${campaign.id}/members/${membership.id}`)
      .bearerToken(token)

    assert.equal(response.status(), 204)

    // Verify member is removed
    const listResponse = await client
      .get(`/api/v2/mj/campaigns/${campaign.id}/members`)
      .bearerToken(token)
    assert.lengthOf(listResponse.body(), 0)
  })

  test('POST /api/v2/mj/campaigns/:id/members/:memberId/grant-auth should grant authorization', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })
    const streamer = await createTestStreamer()
    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
    })

    const response = await client
      .post(`/api/v2/mj/campaigns/${campaign.id}/members/${membership.id}/grant-auth`)
      .bearerToken(token)

    assert.equal(response.status(), 200)
    assert.equal(response.body().isPollAuthorized, true)
    assert.exists(response.body().pollAuthorizationGrantedAt)
    assert.exists(response.body().pollAuthorizationExpiresAt)
  })

  test('POST /api/v2/mj/campaigns/:id/members/:memberId/revoke-auth should revoke authorization', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })
    const streamer = await createTestStreamer()
    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      isPollAuthorized: true,
    })

    const response = await client
      .post(`/api/v2/mj/campaigns/${campaign.id}/members/${membership.id}/revoke-auth`)
      .bearerToken(token)

    assert.equal(response.status(), 200)
    assert.equal(response.body().isPollAuthorized, false)
    assert.isNull(response.body().pollAuthorizationExpiresAt)
  })
})
