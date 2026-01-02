import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import { DateTime } from 'luxon'
import {
  createAuthenticatedUser,
  createTestCampaign,
  createTestStreamer,
  createTestMembership,
} from '#tests/helpers/test_utils'

test.group('Streamer Campaigns API', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /api/v2/streamer/invitations should list pending invitations', async ({
    client,
    assert,
  }) => {
    const streamerUser = await createAuthenticatedUser({ role: 'STREAMER' })
    const streamer = await createTestStreamer({ userId: streamerUser.user.id })

    // Create campaign with pending invitation
    const campaign = await createTestCampaign()
    await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'PENDING',
    })

    const response = await client
      .get('/api/v2/streamer/invitations')
      .bearerToken(streamerUser.token)

    assert.equal(response.status(), 200)
    assert.isArray(response.body())
    assert.lengthOf(response.body(), 1)
    assert.equal(response.body()[0].status, 'PENDING')
  })

  test('POST /api/v2/streamer/invitations/:id/accept should accept invitation', async ({
    client,
    assert,
  }) => {
    const streamerUser = await createAuthenticatedUser({ role: 'STREAMER' })
    const streamer = await createTestStreamer({ userId: streamerUser.user.id })

    const campaign = await createTestCampaign()
    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'PENDING',
    })

    const response = await client
      .post(`/api/v2/streamer/invitations/${membership.id}/accept`)
      .bearerToken(streamerUser.token)

    assert.equal(response.status(), 200)
    assert.equal(response.body().status, 'ACTIVE')
    assert.exists(response.body().acceptedAt)
  })

  test('POST /api/v2/streamer/invitations/:id/decline should decline invitation', async ({
    client,
    assert,
  }) => {
    const streamerUser = await createAuthenticatedUser({ role: 'STREAMER' })
    const streamer = await createTestStreamer({ userId: streamerUser.user.id })

    const campaign = await createTestCampaign()
    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'PENDING',
    })

    const response = await client
      .post(`/api/v2/streamer/invitations/${membership.id}/decline`)
      .bearerToken(streamerUser.token)

    assert.equal(response.status(), 200)
    assert.equal(response.body().status, 'DECLINED')
  })

  test('GET /api/v2/streamer/campaigns should list active campaigns', async ({
    client,
    assert,
  }) => {
    const streamerUser = await createAuthenticatedUser({ role: 'STREAMER' })
    const streamer = await createTestStreamer({ userId: streamerUser.user.id })

    // Create active campaign
    const campaign1 = await createTestCampaign({ name: 'Active Campaign' })
    await createTestMembership({
      campaignId: campaign1.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })

    // Create pending campaign (should not appear)
    const campaign2 = await createTestCampaign({ name: 'Pending Campaign' })
    await createTestMembership({
      campaignId: campaign2.id,
      streamerId: streamer.id,
      status: 'PENDING',
    })

    const response = await client.get('/api/v2/streamer/campaigns').bearerToken(streamerUser.token)

    assert.equal(response.status(), 200)
    assert.isArray(response.body())
    assert.lengthOf(response.body(), 1)
    assert.equal(response.body()[0].name, 'Active Campaign')
  })

  test('POST /api/v2/streamer/campaigns/:id/leave should leave campaign', async ({
    client,
    assert,
  }) => {
    const streamerUser = await createAuthenticatedUser({ role: 'STREAMER' })
    const streamer = await createTestStreamer({ userId: streamerUser.user.id })

    const campaign = await createTestCampaign()
    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
    })

    const response = await client
      .post(`/api/v2/streamer/campaigns/${campaign.id}/leave`)
      .bearerToken(streamerUser.token)

    assert.equal(response.status(), 200)

    // Verify membership is deleted
    const campaignsResponse = await client
      .get('/api/v2/streamer/campaigns')
      .bearerToken(streamerUser.token)
    assert.lengthOf(campaignsResponse.body(), 0)
  })

  test('GET /api/v2/streamer/campaigns/:id/authorization should get authorization status', async ({
    client,
    assert,
  }) => {
    const streamerUser = await createAuthenticatedUser({ role: 'STREAMER' })
    const streamer = await createTestStreamer({ userId: streamerUser.user.id })

    const campaign = await createTestCampaign()
    await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      isPollAuthorized: true,
      pollAuthorizationExpiresAt: DateTime.now().plus({ hours: 6 }),
    })

    const response = await client
      .get(`/api/v2/streamer/campaigns/${campaign.id}/authorization`)
      .bearerToken(streamerUser.token)

    assert.equal(response.status(), 200)
    assert.equal(response.body().isPollAuthorized, true)
    assert.exists(response.body().remainingSeconds)
  })
})
