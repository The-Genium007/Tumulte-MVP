import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import { createTestCampaign, createTestStreamer } from '#tests/helpers/test_utils'
import CampaignMembershipRepository from '#repositories/campaign_membership_repository'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import { DateTime } from 'luxon'

/**
 * Tests d'intégration pour CampaignMembershipRepository
 * Utilise la vraie base de données au lieu de mocks
 */

test.group('CampaignMembershipRepository - findByCampaignAndStreamer', (group) => {
  let repository: CampaignMembershipRepository

  group.each.setup(() => {
    repository = new CampaignMembershipRepository()
    return testUtils.db().truncate()
  })

  test('should find membership by campaign and streamer', async ({ assert }) => {
    const campaign = await createTestCampaign()
    const streamer = await createTestStreamer()

    const membership = await CampaignMembership.create({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      invitedAt: DateTime.now(),
    })

    const result = await repository.findByCampaignAndStreamer(campaign.id, streamer.id)

    assert.isNotNull(result)
    assert.equal(result?.id, membership.id)
  })

  test('should return null if membership not found', async ({ assert }) => {
    const campaign = await createTestCampaign()
    const streamer = await createTestStreamer()

    const result = await repository.findByCampaignAndStreamer(campaign.id, streamer.id)

    assert.isNull(result)
  })
})

test.group('CampaignMembershipRepository - findActiveByCampaign', (group) => {
  let repository: CampaignMembershipRepository

  group.each.setup(() => {
    repository = new CampaignMembershipRepository()
    return testUtils.db().truncate()
  })

  test('should return only ACTIVE memberships', async ({ assert }) => {
    const campaign = await createTestCampaign()
    const streamer1 = await createTestStreamer()
    const streamer2 = await createTestStreamer()
    const streamer3 = await createTestStreamer()

    await CampaignMembership.create({
      campaignId: campaign.id,
      streamerId: streamer1.id,
      status: 'ACTIVE',
      invitedAt: DateTime.now(),
    })
    await CampaignMembership.create({
      campaignId: campaign.id,
      streamerId: streamer2.id,
      status: 'PENDING',
      invitedAt: DateTime.now(),
    })
    await CampaignMembership.create({
      campaignId: campaign.id,
      streamerId: streamer3.id,
      status: 'ACTIVE',
      invitedAt: DateTime.now(),
    })

    const result = await repository.findActiveByCampaign(campaign.id)

    assert.lengthOf(result, 2)
    assert.isTrue(result.every((m) => m.status === 'ACTIVE'))
  })

  test('should preload streamer relation', async ({ assert }) => {
    const campaign = await createTestCampaign()
    const streamer = await createTestStreamer()

    await CampaignMembership.create({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      invitedAt: DateTime.now(),
    })

    const result = await repository.findActiveByCampaign(campaign.id)

    assert.lengthOf(result, 1)
    assert.isDefined(result[0].streamer)
    assert.equal(result[0].streamer.id, streamer.id)
  })
})

test.group('CampaignMembershipRepository - grantPollAuthorization', (group) => {
  let repository: CampaignMembershipRepository

  group.each.setup(() => {
    repository = new CampaignMembershipRepository()
    return testUtils.db().truncate()
  })

  test('should grant 12-hour authorization window', async ({ assert }) => {
    const campaign = await createTestCampaign()
    const streamer = await createTestStreamer()

    const membership = await CampaignMembership.create({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      invitedAt: DateTime.now(),
    })

    const result = await repository.grantPollAuthorization(membership)

    assert.isDefined(result.pollAuthorizationGrantedAt)
    assert.isDefined(result.pollAuthorizationExpiresAt)

    const now = DateTime.now()
    const expectedExpiry = now.plus({ hours: 12 })
    const actualExpiry = result.pollAuthorizationExpiresAt!
    const diffInMinutes = actualExpiry.diff(expectedExpiry, 'minutes').minutes

    assert.isTrue(Math.abs(diffInMinutes) < 1)
  })
})

test.group('CampaignMembershipRepository - revokePollAuthorization', (group) => {
  let repository: CampaignMembershipRepository

  group.each.setup(() => {
    repository = new CampaignMembershipRepository()
    return testUtils.db().truncate()
  })

  test('should revoke authorization', async ({ assert }) => {
    const campaign = await createTestCampaign()
    const streamer = await createTestStreamer()

    const membership = await CampaignMembership.create({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      invitedAt: DateTime.now(),
      pollAuthorizationGrantedAt: DateTime.now(),
      pollAuthorizationExpiresAt: DateTime.now().plus({ hours: 12 }),
    })

    const result = await repository.revokePollAuthorization(membership)

    assert.isNull(result.pollAuthorizationGrantedAt)
    assert.isNull(result.pollAuthorizationExpiresAt)
  })
})
