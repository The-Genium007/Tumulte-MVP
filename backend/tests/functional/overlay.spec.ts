import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import {
  createTestStreamer,
  createTestPollInstance,
  createTestCampaign,
} from '#tests/helpers/test_utils'
import { streamer as Streamer } from '#models/streamer'
import { pollInstance as PollInstance } from '#models/poll_instance'

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
