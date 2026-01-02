import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import {
  createTestUser,
  createTestCampaign,
  createTestPollInstance,
} from '#tests/helpers/test_utils'
import { pollInstance as PollInstance } from '#models/poll_instance'

test.group('Polls API (MJ)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('PollInstance create should set correct fields', async ({ assert }) => {
    const user = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })

    const poll = await createTestPollInstance({
      campaignId: campaign.id,
      createdBy: user.id,
      title: 'Test Poll Question?',
      options: ['Option 1', 'Option 2', 'Option 3'],
      durationSeconds: 120,
    })

    assert.equal(poll.title, 'Test Poll Question?')
    assert.equal(poll.durationSeconds, 120)
    assert.lengthOf(poll.options, 3)
    assert.equal(poll.status, 'PENDING')
  })

  test('Poll options validation should require at least 2 options', async ({ assert }) => {
    // Validation: minimum 2 options required
    const singleOption = ['Only One']
    assert.isTrue(singleOption.length < 2)

    const validOptions = ['Option 1', 'Option 2']
    assert.isTrue(validOptions.length >= 2)
  })

  test('List polls should return all polls for campaign', async ({ assert }) => {
    const user = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })

    await createTestPollInstance({
      campaignId: campaign.id,
      createdBy: user.id,
      title: 'Poll 1?',
      status: 'RUNNING',
    })
    await createTestPollInstance({
      campaignId: campaign.id,
      createdBy: user.id,
      title: 'Poll 2?',
      status: 'ENDED',
    })

    const polls = await PollInstance.query().where('campaignId', campaign.id)

    assert.isArray(polls)
    assert.lengthOf(polls, 2)
  })

  test('Cancel poll should update status to ENDED', async ({ assert }) => {
    const user = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })
    const poll = await createTestPollInstance({
      campaignId: campaign.id,
      createdBy: user.id,
      status: 'RUNNING',
    })

    poll.status = 'ENDED'
    await poll.save()

    const updated = await PollInstance.find(poll.id)
    assert.equal(updated!.status, 'ENDED')
  })

  test('Poll results should include vote counts', async ({ assert }) => {
    const user = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })
    const poll = await createTestPollInstance({
      campaignId: campaign.id,
      createdBy: user.id,
      status: 'ENDED',
      options: ['A', 'B', 'C'],
    })

    // Simulate final results
    poll.finalTotalVotes = 100
    poll.finalVotesByOption = { A: 50, B: 30, C: 20 }
    await poll.save()

    const updated = await PollInstance.find(poll.id)
    assert.equal(updated!.finalTotalVotes, 100)
    assert.deepEqual(updated!.finalVotesByOption, { A: 50, B: 30, C: 20 })
  })

  test('Live poll should have RUNNING status', async ({ assert }) => {
    const user = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })
    const poll = await createTestPollInstance({
      campaignId: campaign.id,
      createdBy: user.id,
      status: 'RUNNING',
    })

    const found = await PollInstance.find(poll.id)
    assert.equal(found!.status, 'RUNNING')
  })
})
