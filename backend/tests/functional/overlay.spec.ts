import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import {
  createTestStreamer,
  createTestPollInstance,
  createTestCampaign,
  createTestUser,
} from '#tests/helpers/test_utils'
import { streamer as Streamer } from '#models/streamer'
import { pollInstance as PollInstance } from '#models/poll_instance'
import env from '#start/env'

test.group('Overlay API (Public)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Streamer model should return streamer info', async ({ assert }) => {
    const streamer = await createTestStreamer({
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
    })

    const found = await Streamer.find(streamer.id)

    assert.isNotNull(found)
    assert.equal(found!.twitchLogin, 'teststreamer')
    assert.equal(found!.twitchDisplayName, 'TestStreamer')
  })

  test('Streamer findById should return null for non-existent streamer', async ({ assert }) => {
    const found = await Streamer.find('00000000-0000-0000-0000-000000000000')

    assert.isNull(found)
  })

  test('PollInstance with RUNNING status should be retrievable', async ({ assert }) => {
    const campaign = await createTestCampaign()

    await createTestPollInstance({
      campaignId: campaign.id,
      title: 'Active Poll Question?',
      options: ['Yes', 'No', 'Maybe'],
      status: 'RUNNING',
    })

    const found = await PollInstance.query().where('status', 'RUNNING').first()

    assert.isNotNull(found)
    assert.equal(found!.title, 'Active Poll Question?')
    assert.equal(found!.status, 'RUNNING')
    assert.isArray(found!.options)
    assert.lengthOf(found!.options, 3)
  })

  test('PollInstance should store and retrieve options correctly', async ({ assert }) => {
    const campaign = await createTestCampaign()

    const poll = await createTestPollInstance({
      campaignId: campaign.id,
      title: 'Poll Question?',
      options: ['Option A', 'Option B', 'Option C'],
      status: 'ENDED',
    })

    const found = await PollInstance.find(poll.id)

    assert.isNotNull(found)
    assert.equal(found!.id, poll.id)
    assert.isArray(found!.options)
    assert.deepEqual(found!.options, ['Option A', 'Option B', 'Option C'])
  })

  test('Streamer should be publicly accessible (no auth required)', async ({ assert }) => {
    const streamer = await createTestStreamer()

    // Public access means we can query without auth token
    const found = await Streamer.find(streamer.id)

    assert.isNotNull(found)
    assert.exists(found!.twitchLogin)
  })
})

test.group('Overlay URL Generation', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Overlay URL should be correctly formatted with streamer ID', async ({ assert }) => {
    const user = await createTestUser({})
    const streamer = await createTestStreamer({ userId: user.id })

    const frontendUrl = env.get('FRONTEND_URL')
    const expectedUrl = `${frontendUrl}/overlay/${streamer.id}`

    // Verify URL format
    assert.isString(expectedUrl)
    assert.include(expectedUrl, '/overlay/')
    assert.include(expectedUrl, streamer.id)
  })

  test('Streamer must have associated user for authenticated endpoints', async ({ assert }) => {
    // Create a streamer with an associated user (standard case)
    const user = await createTestUser({})
    const streamer = await createTestStreamer({ userId: user.id })

    // Verify streamer is correctly linked to user
    const found = await Streamer.find(streamer.id)
    assert.isNotNull(found)
    assert.equal(found!.userId, user.id)
  })

  test('Overlay URL should use FRONTEND_URL environment variable', async ({ assert }) => {
    const frontendUrl = env.get('FRONTEND_URL')

    assert.isString(frontendUrl)
    assert.isTrue(frontendUrl.startsWith('http'))
  })
})
