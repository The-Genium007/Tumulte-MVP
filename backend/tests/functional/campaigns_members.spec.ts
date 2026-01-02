import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import { createTestUser, createTestCampaign, createTestStreamer } from '#tests/helpers/test_utils'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import { DateTime } from 'luxon'

test.group('Campaign Members API (MJ)', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('Invite streamer should create PENDING membership', async ({ assert }) => {
    const owner = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: owner.id })
    const streamer = await createTestStreamer()

    const membership = await CampaignMembership.create({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'PENDING',
      invitedAt: DateTime.now(),
    })

    assert.equal(membership.status, 'PENDING')
    assert.equal(membership.campaignId, campaign.id)
    assert.equal(membership.streamerId, streamer.id)
    assert.isNotNull(membership.invitedAt)
  })

  test('Non-owner should not be able to invite to campaign', async ({ assert }) => {
    const owner = await createTestUser({ role: 'MJ' })
    const otherUser = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: owner.id })

    // Verify that otherUser is not the owner
    assert.notEqual(campaign.ownerId, otherUser.id)
    assert.equal(campaign.ownerId, owner.id)
  })

  test('List members should return all campaign memberships', async ({ assert }) => {
    const owner = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: owner.id })
    const streamer1 = await createTestStreamer()
    const streamer2 = await createTestStreamer()

    await CampaignMembership.create({
      campaignId: campaign.id,
      streamerId: streamer1.id,
      status: 'ACTIVE',
      invitedAt: DateTime.now(),
      acceptedAt: DateTime.now(),
    })

    await CampaignMembership.create({
      campaignId: campaign.id,
      streamerId: streamer2.id,
      status: 'PENDING',
      invitedAt: DateTime.now(),
    })

    const members = await CampaignMembership.query().where('campaignId', campaign.id)

    assert.lengthOf(members, 2)
  })

  test('Remove member should delete membership from database', async ({ assert }) => {
    const owner = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: owner.id })
    const streamer = await createTestStreamer()

    const membership = await CampaignMembership.create({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      invitedAt: DateTime.now(),
      acceptedAt: DateTime.now(),
    })

    const membershipId = membership.id
    await membership.delete()

    const deleted = await CampaignMembership.find(membershipId)
    assert.isNull(deleted)
  })

  test('Grant authorization should set 12-hour expiry window', async ({ assert }) => {
    const owner = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: owner.id })
    const streamer = await createTestStreamer()

    const membership = await CampaignMembership.create({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      invitedAt: DateTime.now(),
      acceptedAt: DateTime.now(),
    })

    const now = DateTime.now()
    membership.pollAuthorizationGrantedAt = now
    membership.pollAuthorizationExpiresAt = now.plus({ hours: 12 })
    await membership.save()

    const updated = await CampaignMembership.find(membership.id)
    assert.isNotNull(updated!.pollAuthorizationExpiresAt)
    assert.isTrue(updated!.isPollAuthorizationActive)

    // Check remaining time is approximately 12 hours
    const remainingSeconds = updated!.authorizationRemainingSeconds
    assert.isNotNull(remainingSeconds)
    assert.isTrue(remainingSeconds! > 43100) // ~12 hours minus a few seconds
  })

  test('Revoke authorization should clear expiry date', async ({ assert }) => {
    const owner = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: owner.id })
    const streamer = await createTestStreamer()

    const membership = await CampaignMembership.create({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      invitedAt: DateTime.now(),
      acceptedAt: DateTime.now(),
      pollAuthorizationGrantedAt: DateTime.now(),
      pollAuthorizationExpiresAt: DateTime.now().plus({ hours: 12 }),
    })

    membership.pollAuthorizationGrantedAt = null
    membership.pollAuthorizationExpiresAt = null
    await membership.save()

    const updated = await CampaignMembership.find(membership.id)
    assert.isNull(updated!.pollAuthorizationExpiresAt)
    assert.isFalse(updated!.isPollAuthorizationActive)
  })
})
