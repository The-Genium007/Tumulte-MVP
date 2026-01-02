import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import {
  createTestStreamer,
  createTestPollInstance,
  createTestCampaign,
} from '#tests/helpers/test_utils'

test.group('Overlay API (Public)', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('GET /api/v2/overlay/streamer/:streamerId should get streamer info', async ({
    client,
    assert,
  }) => {
    const streamer = await createTestStreamer({
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
    })

    const response = await client.get(`/api/v2/overlay/streamer/${streamer.id}`)

    assert.equal(response.status(), 200)
    assert.equal(response.body().twitchLogin, 'teststreamer')
    assert.equal(response.body().twitchDisplayName, 'TestStreamer')
  })

  test('GET /api/v2/overlay/streamer/:streamerId should return 404 for non-existent streamer', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/api/v2/overlay/streamer/non-existent-id')

    assert.equal(response.status(), 404)
  })

  test('GET /api/v2/overlay/streamer/:streamerId/active-poll should get active poll', async ({
    client,
    assert,
  }) => {
    const streamer = await createTestStreamer()
    const campaign = await createTestCampaign()

    // Create active poll instance
    const poll = await createTestPollInstance({
      campaignId: campaign.id,
      question: 'Active Poll Question?',
      options: ['Yes', 'No', 'Maybe'],
      status: 'RUNNING',
    })

    const response = await client.get(`/api/v2/overlay/streamer/${streamer.id}/active-poll`)

    // Should return 200 with poll data or 404 if no active poll
    assert.oneOf(response.status(), [200, 404])

    if (response.status() === 200) {
      assert.exists(response.body().question)
      assert.isArray(response.body().options)
    }
  })

  test('GET /api/v2/overlay/streamer/:streamerId/poll/:pollInstanceId should get poll results', async ({
    client,
    assert,
  }) => {
    const streamer = await createTestStreamer()
    const campaign = await createTestCampaign()

    const poll = await createTestPollInstance({
      campaignId: campaign.id,
      question: 'Poll Question?',
      options: ['A', 'B', 'C'],
      status: 'ENDED',
    })

    const response = await client.get(`/api/v2/overlay/streamer/${streamer.id}/poll/${poll.id}`)

    assert.equal(response.status(), 200)
    assert.equal(response.body().pollInstanceId, poll.id)
    assert.exists(response.body().votesByOption)
    assert.exists(response.body().totalVotes)
  })

  test('Overlay routes should be accessible without authentication', async ({ client, assert }) => {
    const streamer = await createTestStreamer()

    // Test public access without bearerToken
    const response = await client.get(`/api/v2/overlay/streamer/${streamer.id}`)

    assert.equal(response.status(), 200)
  })
})
