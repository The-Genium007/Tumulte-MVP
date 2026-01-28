import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import {
  createTestCampaign,
  createTestStreamer,
  createTestMembership,
  grantPollAuthorization,
} from '#tests/helpers/test_utils'
import { ReadinessService } from '#services/campaigns/readiness_service'
import { CampaignMembershipRepository } from '#repositories/campaign_membership_repository'
import { DateTime } from 'luxon'

/**
 * Tests unitaires pour ReadinessService
 * Vérifie la logique de calcul de readiness des streamers
 */

test.group('ReadinessService - getCampaignReadiness', (group) => {
  let service: ReadinessService
  let membershipRepository: CampaignMembershipRepository

  group.each.setup(() => {
    membershipRepository = new CampaignMembershipRepository()
    service = new ReadinessService(membershipRepository)
    return testUtils.db().withGlobalTransaction()
  })

  test('should return allReady=true when all streamers have valid tokens and authorization', async ({
    assert,
  }) => {
    const campaign = await createTestCampaign()
    const streamer1 = await createTestStreamer({
      tokenExpiresAt: DateTime.now().plus({ hours: 2 }),
    })
    const streamer2 = await createTestStreamer({
      tokenExpiresAt: DateTime.now().plus({ hours: 2 }),
    })

    const membership1 = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer1.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })
    const membership2 = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer2.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })

    await grantPollAuthorization(membership1)
    await grantPollAuthorization(membership2)

    const result = await service.getCampaignReadiness(campaign.id)

    assert.isTrue(result.allReady)
    assert.equal(result.readyCount, 2)
    assert.equal(result.totalCount, 2)
    assert.lengthOf(result.streamers, 2)
    assert.isTrue(result.streamers.every((s) => s.isReady))
  })

  test('should return allReady=false when a streamer has expired token', async ({ assert }) => {
    const campaign = await createTestCampaign()
    const streamerValid = await createTestStreamer({
      tokenExpiresAt: DateTime.now().plus({ hours: 2 }),
    })
    const streamerExpired = await createTestStreamer({
      tokenExpiresAt: DateTime.now().minus({ hours: 1 }),
    })

    const membership1 = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamerValid.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })
    const membership2 = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamerExpired.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })

    await grantPollAuthorization(membership1)
    await grantPollAuthorization(membership2)

    const result = await service.getCampaignReadiness(campaign.id)

    assert.isFalse(result.allReady)
    assert.equal(result.readyCount, 1)
    assert.equal(result.totalCount, 2)

    const expiredStreamer = result.streamers.find((s) => s.streamerId === streamerExpired.id)
    assert.isDefined(expiredStreamer)
    assert.isFalse(expiredStreamer?.isReady)
    assert.include(expiredStreamer?.issues, 'token_expired')
  })

  test('should return allReady=false when a streamer has no authorization', async ({ assert }) => {
    const campaign = await createTestCampaign()
    const streamer1 = await createTestStreamer({
      tokenExpiresAt: DateTime.now().plus({ hours: 2 }),
    })
    const streamer2 = await createTestStreamer({
      tokenExpiresAt: DateTime.now().plus({ hours: 2 }),
    })

    const membership1 = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer1.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })
    await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer2.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })

    // Only grant authorization to streamer1
    await grantPollAuthorization(membership1)

    const result = await service.getCampaignReadiness(campaign.id)

    assert.isFalse(result.allReady)
    assert.equal(result.readyCount, 1)
    assert.equal(result.totalCount, 2)

    const unauthorizedStreamer = result.streamers.find((s) => s.streamerId === streamer2.id)
    assert.isDefined(unauthorizedStreamer)
    assert.isFalse(unauthorizedStreamer?.isReady)
    assert.include(unauthorizedStreamer?.issues, 'authorization_missing')
  })

  test('should return allReady=false when a streamer has expired authorization', async ({
    assert,
  }) => {
    const campaign = await createTestCampaign()
    const streamer = await createTestStreamer({
      tokenExpiresAt: DateTime.now().plus({ hours: 2 }),
    })

    await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
      pollAuthorizationGrantedAt: DateTime.now().minus({ hours: 13 }),
      pollAuthorizationExpiresAt: DateTime.now().minus({ hours: 1 }),
    })

    const result = await service.getCampaignReadiness(campaign.id)

    assert.isFalse(result.allReady)
    assert.equal(result.readyCount, 0)
    assert.equal(result.totalCount, 1)

    const expiredAuth = result.streamers.find((s) => s.streamerId === streamer.id)
    assert.isDefined(expiredAuth)
    assert.isFalse(expiredAuth?.isReady)
    assert.include(expiredAuth?.issues, 'authorization_expired')
  })

  test('should detect inactive streamer', async ({ assert }) => {
    const campaign = await createTestCampaign()
    const streamer = await createTestStreamer({
      tokenExpiresAt: DateTime.now().plus({ hours: 2 }),
      isActive: false,
    })

    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })
    await grantPollAuthorization(membership)

    const result = await service.getCampaignReadiness(campaign.id)

    assert.isFalse(result.allReady)
    assert.equal(result.readyCount, 0)
    assert.equal(result.totalCount, 1)

    const inactiveStreamer = result.streamers.find((s) => s.streamerId === streamer.id)
    assert.isDefined(inactiveStreamer)
    assert.isFalse(inactiveStreamer?.isReady)
    assert.include(inactiveStreamer?.issues, 'streamer_inactive')
  })

  test('should detect token_refresh_failed', async ({ assert }) => {
    const campaign = await createTestCampaign()
    const streamer = await createTestStreamer({
      tokenExpiresAt: DateTime.now().plus({ hours: 2 }),
      tokenRefreshFailedAt: DateTime.now().minus({ hours: 1 }),
    })

    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })
    await grantPollAuthorization(membership)

    const result = await service.getCampaignReadiness(campaign.id)

    assert.isFalse(result.allReady)

    const failedStreamer = result.streamers.find((s) => s.streamerId === streamer.id)
    assert.isDefined(failedStreamer)
    assert.isFalse(failedStreamer?.isReady)
    assert.include(failedStreamer?.issues, 'token_refresh_failed')
  })

  test('should only consider ACTIVE memberships', async ({ assert }) => {
    const campaign = await createTestCampaign()
    const activeStreamer = await createTestStreamer({
      tokenExpiresAt: DateTime.now().plus({ hours: 2 }),
    })
    const pendingStreamer = await createTestStreamer({
      tokenExpiresAt: DateTime.now().plus({ hours: 2 }),
    })

    const activeMembership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: activeStreamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })
    await createTestMembership({
      campaignId: campaign.id,
      streamerId: pendingStreamer.id,
      status: 'PENDING',
    })

    await grantPollAuthorization(activeMembership)

    const result = await service.getCampaignReadiness(campaign.id)

    // Should only include the ACTIVE member
    assert.equal(result.totalCount, 1)
    assert.lengthOf(result.streamers, 1)
    assert.equal(result.streamers[0].streamerId, activeStreamer.id)
  })

  test('should return empty list when no active members', async ({ assert }) => {
    const campaign = await createTestCampaign()

    const result = await service.getCampaignReadiness(campaign.id)

    // No members = allReady is false (totalCount must be > 0 for allReady to be true)
    assert.isFalse(result.allReady)
    assert.equal(result.readyCount, 0)
    assert.equal(result.totalCount, 0)
    assert.lengthOf(result.streamers, 0)
  })

  test('should accumulate token and authorization issues for same streamer', async ({ assert }) => {
    const campaign = await createTestCampaign()
    // Active streamer with expired token and no authorization
    const streamer = await createTestStreamer({
      tokenExpiresAt: DateTime.now().minus({ hours: 1 }), // Expired token
      isActive: true, // Active (so we check other issues)
    })

    await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
      // No authorization
    })

    const result = await service.getCampaignReadiness(campaign.id)

    assert.isFalse(result.allReady)
    const problematicStreamer = result.streamers[0]

    // Should have both token_expired and authorization_missing
    assert.isTrue(problematicStreamer.issues.length >= 2)
    assert.include(problematicStreamer.issues, 'token_expired')
    assert.include(problematicStreamer.issues, 'authorization_missing')
  })
})
