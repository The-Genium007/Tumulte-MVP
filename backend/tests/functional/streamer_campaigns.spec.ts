import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import { DateTime } from 'luxon'
import { createTestUser, createTestCampaign, createTestStreamer } from '#tests/helpers/test_utils'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'

test.group('Streamer Campaigns API', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('List pending invitations should return PENDING memberships', async ({ assert }) => {
    const streamerUser = await createTestUser({})
    const streamer = await createTestStreamer({ userId: streamerUser.id })

    const campaign = await createTestCampaign()
    await CampaignMembership.create({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'PENDING',
      invitedAt: DateTime.now(),
    })

    const invitations = await CampaignMembership.query()
      .where('streamerId', streamer.id)
      .where('status', 'PENDING')

    assert.isArray(invitations)
    assert.lengthOf(invitations, 1)
    assert.equal(invitations[0].status, 'PENDING')
  })

  test('Accept invitation should change status to ACTIVE', async ({ assert }) => {
    const streamerUser = await createTestUser({})
    const streamer = await createTestStreamer({ userId: streamerUser.id })

    const campaign = await createTestCampaign()
    const membership = await CampaignMembership.create({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'PENDING',
      invitedAt: DateTime.now(),
    })

    membership.status = 'ACTIVE'
    membership.acceptedAt = DateTime.now()
    await membership.save()

    const updated = await CampaignMembership.find(membership.id)
    assert.equal(updated!.status, 'ACTIVE')
    assert.isNotNull(updated!.acceptedAt)
  })

  test('Decline invitation should delete membership', async ({ assert }) => {
    const streamerUser = await createTestUser({})
    const streamer = await createTestStreamer({ userId: streamerUser.id })

    const campaign = await createTestCampaign()
    const membership = await CampaignMembership.create({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'PENDING',
      invitedAt: DateTime.now(),
    })

    const membershipId = membership.id
    await membership.delete()

    const deleted = await CampaignMembership.find(membershipId)
    assert.isNull(deleted)
  })

  test('List active campaigns should return only ACTIVE memberships', async ({ assert }) => {
    const streamerUser = await createTestUser({})
    const streamer = await createTestStreamer({ userId: streamerUser.id })

    // Create active campaign
    const campaign1 = await createTestCampaign({ name: 'Active Campaign' })
    await CampaignMembership.create({
      campaignId: campaign1.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      invitedAt: DateTime.now(),
      acceptedAt: DateTime.now(),
    })

    // Create pending campaign (should not appear)
    const campaign2 = await createTestCampaign({ name: 'Pending Campaign' })
    await CampaignMembership.create({
      campaignId: campaign2.id,
      streamerId: streamer.id,
      status: 'PENDING',
      invitedAt: DateTime.now(),
    })

    const activeMemberships = await CampaignMembership.query()
      .where('streamerId', streamer.id)
      .where('status', 'ACTIVE')
      .preload('campaign')

    assert.isArray(activeMemberships)
    assert.lengthOf(activeMemberships, 1)
    assert.equal(activeMemberships[0].campaign.name, 'Active Campaign')
  })

  test('Leave campaign should delete membership', async ({ assert }) => {
    const streamerUser = await createTestUser({})
    const streamer = await createTestStreamer({ userId: streamerUser.id })

    const campaign = await createTestCampaign()
    const membership = await CampaignMembership.create({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      invitedAt: DateTime.now(),
      acceptedAt: DateTime.now(),
    })

    await membership.delete()

    const remaining = await CampaignMembership.query()
      .where('streamerId', streamer.id)
      .where('status', 'ACTIVE')

    assert.lengthOf(remaining, 0)
  })

  test('Authorization status should reflect expiry time', async ({ assert }) => {
    const streamerUser = await createTestUser({})
    const streamer = await createTestStreamer({ userId: streamerUser.id })

    const campaign = await createTestCampaign()
    const membership = await CampaignMembership.create({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      invitedAt: DateTime.now(),
      acceptedAt: DateTime.now(),
      pollAuthorizationGrantedAt: DateTime.now(),
      pollAuthorizationExpiresAt: DateTime.now().plus({ hours: 6 }),
    })

    assert.isTrue(membership.isPollAuthorizationActive)

    const remainingSeconds = membership.authorizationRemainingSeconds
    assert.isNotNull(remainingSeconds)
    assert.isTrue(remainingSeconds! > 21500) // ~6 hours minus a few seconds
  })
})
