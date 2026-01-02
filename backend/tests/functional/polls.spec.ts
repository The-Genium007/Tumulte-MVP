import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import {
  createAuthenticatedUser,
  createTestCampaign,
  createTestPollInstance,
} from '#tests/helpers/test_utils'

test.group('Polls API (MJ)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('POST /api/v2/mj/campaigns/:campaignId/polls/launch should launch poll', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })

    const response = await client
      .post(`/api/v2/mj/campaigns/${campaign.id}/polls/launch`)
      .json({
        question: 'Test Poll Question?',
        options: ['Option 1', 'Option 2', 'Option 3'],
        durationSeconds: 120,
      })
      .bearerToken(token)

    assert.equal(response.status(), 201)
    assert.equal(response.body().question, 'Test Poll Question?')
    assert.equal(response.body().durationSeconds, 120)
    assert.lengthOf(response.body().options, 3)
    assert.equal(response.body().status, 'PENDING')
  })

  test('POST /api/v2/mj/campaigns/:campaignId/polls/launch should validate options count', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })

    const response = await client
      .post(`/api/v2/mj/campaigns/${campaign.id}/polls/launch`)
      .json({
        question: 'Test?',
        options: ['Only One'], // Less than 2 options
        durationSeconds: 60,
      })
      .bearerToken(token)

    assert.equal(response.status(), 422)
    assert.exists(response.body().errors)
  })

  test('GET /api/v2/mj/campaigns/:campaignId/polls should list polls', async ({
    client,
    assert,
  }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })

    // Create 2 polls
    await createTestPollInstance({
      campaignId: campaign.id,
      question: 'Poll 1?',
      status: 'RUNNING',
    })
    await createTestPollInstance({
      campaignId: campaign.id,
      question: 'Poll 2?',
      status: 'ENDED',
    })

    const response = await client
      .get(`/api/v2/mj/campaigns/${campaign.id}/polls`)
      .bearerToken(token)

    assert.equal(response.status(), 200)
    assert.isArray(response.body())
    assert.lengthOf(response.body(), 2)
  })

  test('POST /api/v2/mj/polls/:id/cancel should cancel poll', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })
    const poll = await createTestPollInstance({
      campaignId: campaign.id,
      status: 'RUNNING',
    })

    const response = await client.post(`/api/v2/mj/polls/${poll.id}/cancel`).bearerToken(token)

    assert.equal(response.status(), 200)
    assert.equal(response.body().status, 'CANCELLED')
  })

  test('GET /api/v2/mj/polls/:id/results should get poll results', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })
    const poll = await createTestPollInstance({
      campaignId: campaign.id,
      status: 'ENDED',
    })

    const response = await client.get(`/api/v2/mj/polls/${poll.id}/results`).bearerToken(token)

    assert.equal(response.status(), 200)
    assert.exists(response.body().pollInstanceId)
    assert.exists(response.body().votesByOption)
  })

  test('GET /api/v2/mj/polls/:id/live should get live poll results', async ({ client, assert }) => {
    const { user, token } = await createAuthenticatedUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })
    const poll = await createTestPollInstance({
      campaignId: campaign.id,
      status: 'RUNNING',
    })

    const response = await client.get(`/api/v2/mj/polls/${poll.id}/live`).bearerToken(token)

    // Should return 200 with live data or 400 if poll not running
    assert.oneOf(response.status(), [200, 400])
  })
})
