import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '#tests/helpers/database'
import { streamer as Streamer } from '#models/streamer'
import { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import {
  createTestUser,
  createTestCampaign,
  createTestStreamer,
  createTestMembership,
  grantPollAuthorization,
} from '#tests/helpers/test_utils'

test.group('Token Refresh - Authorization Grant Integration', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('grantPollAuthorization should set pollAuthorizationExpiresAt correctly', async ({
    assert,
  }) => {
    const streamerUser = await createTestUser({})
    const streamer = await createTestStreamer({ userId: streamerUser.id })
    const ownerUser = await createTestUser({})
    const campaign = await createTestCampaign({ ownerId: ownerUser.id })

    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })

    // Grant authorization
    await grantPollAuthorization(membership, 12)

    // Reload from DB
    const updated = await CampaignMembership.findOrFail(membership.id)

    assert.isNotNull(updated.pollAuthorizationGrantedAt)
    assert.isNotNull(updated.pollAuthorizationExpiresAt)

    // Should expire in approximately 12 hours
    const expectedExpiry = DateTime.now().plus({ hours: 12 })
    const diff = Math.abs(
      updated.pollAuthorizationExpiresAt!.toMillis() - expectedExpiry.toMillis()
    )
    assert.isTrue(diff < 5000) // Within 5 seconds tolerance
  })

  test('isPollAuthorizationActive should return true when authorization is valid', async ({
    assert,
  }) => {
    const streamerUser = await createTestUser({})
    const streamer = await createTestStreamer({ userId: streamerUser.id })
    const campaign = await createTestCampaign()

    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })

    await grantPollAuthorization(membership, 12)

    assert.isTrue(membership.isPollAuthorizationActive)
  })

  test('isPollAuthorizationActive should return false when authorization is expired', async ({
    assert,
  }) => {
    const streamerUser = await createTestUser({})
    const streamer = await createTestStreamer({ userId: streamerUser.id })
    const campaign = await createTestCampaign()

    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })

    // Set expired authorization (1 hour ago)
    membership.pollAuthorizationGrantedAt = DateTime.now().minus({ hours: 13 })
    membership.pollAuthorizationExpiresAt = DateTime.now().minus({ hours: 1 })
    await membership.save()

    assert.isFalse(membership.isPollAuthorizationActive)
  })

  test('authorizationRemainingSeconds should return correct value', async ({ assert }) => {
    const streamerUser = await createTestUser({})
    const streamer = await createTestStreamer({ userId: streamerUser.id })
    const campaign = await createTestCampaign()

    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })

    // Grant 6 hours authorization
    await grantPollAuthorization(membership, 6)

    const remaining = membership.authorizationRemainingSeconds

    assert.isNotNull(remaining)
    // Should be approximately 6 hours = 21600 seconds (with some tolerance)
    assert.isTrue(remaining! > 21500)
    assert.isTrue(remaining! <= 21600)
  })

  test('authorizationRemainingSeconds should return null when expired', async ({ assert }) => {
    const streamerUser = await createTestUser({})
    const streamer = await createTestStreamer({ userId: streamerUser.id })
    const campaign = await createTestCampaign()

    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })

    // Set expired authorization
    membership.pollAuthorizationGrantedAt = DateTime.now().minus({ hours: 13 })
    membership.pollAuthorizationExpiresAt = DateTime.now().minus({ hours: 1 })
    await membership.save()

    const remaining = membership.authorizationRemainingSeconds

    assert.isNull(remaining)
  })
})

test.group('Token Refresh - Streamer Token Tracking', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('updateTokens should update encrypted tokens', async ({ assert }) => {
    const streamer = await createTestStreamer({
      accessToken: 'old_access_token',
      refreshToken: 'old_refresh_token',
    })

    // Update tokens
    await streamer.updateTokens('new_access_token', 'new_refresh_token')

    // Reload and verify
    const updated = await Streamer.findOrFail(streamer.id)
    const decryptedAccess = await updated.getDecryptedAccessToken()
    const decryptedRefresh = await updated.getDecryptedRefreshToken()

    assert.equal(decryptedAccess, 'new_access_token')
    assert.equal(decryptedRefresh, 'new_refresh_token')
  })

  test('token tracking columns should persist correctly', async ({ assert }) => {
    const streamer = await createTestStreamer()

    const now = DateTime.now()
    streamer.tokenExpiresAt = now.plus({ hours: 4 })
    streamer.lastTokenRefreshAt = now
    streamer.tokenRefreshFailedAt = null
    await streamer.save()

    // Reload and verify
    const updated = await Streamer.findOrFail(streamer.id)

    assert.isNotNull(updated.tokenExpiresAt)
    assert.isNotNull(updated.lastTokenRefreshAt)
    assert.isNull(updated.tokenRefreshFailedAt)

    // Verify times are within 1 second tolerance
    assert.closeTo(updated.tokenExpiresAt!.toMillis(), now.plus({ hours: 4 }).toMillis(), 1000)
    assert.closeTo(updated.lastTokenRefreshAt!.toMillis(), now.toMillis(), 1000)
  })

  test('isActive flag should be persisted and retrievable', async ({ assert }) => {
    const streamer = await createTestStreamer()

    // Initially active
    assert.isTrue(streamer.isActive)

    // Deactivate
    streamer.isActive = false
    await streamer.save()

    // Reload and verify
    const updated = await Streamer.findOrFail(streamer.id)
    assert.isFalse(updated.isActive)

    // Reactivate
    updated.isActive = true
    await updated.save()

    const reactivated = await Streamer.findOrFail(streamer.id)
    assert.isTrue(reactivated.isActive)
  })
})

test.group('Token Refresh - Service Integration', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('TokenRefreshService should find streamers with active authorization', async ({
    assert,
  }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    // Create 3 streamers with different authorization states
    const user = await createTestUser({})
    const campaign = await createTestCampaign({ ownerId: user.id })

    // Streamer 1: Active authorization
    const streamer1 = await createTestStreamer()
    const membership1 = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer1.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })
    await grantPollAuthorization(membership1)

    // Streamer 2: Expired authorization
    const streamer2 = await createTestStreamer()
    const membership2 = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer2.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })
    membership2.pollAuthorizationGrantedAt = DateTime.now().minus({ hours: 13 })
    membership2.pollAuthorizationExpiresAt = DateTime.now().minus({ hours: 1 })
    await membership2.save()

    // Streamer 3: No authorization
    const streamer3 = await createTestStreamer()
    await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer3.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })

    // Find streamers with active authorization
    const streamers = await service.findStreamersWithActiveAuthorization()

    // Only streamer1 should be returned
    assert.lengthOf(streamers, 1)
    assert.equal(streamers[0].id, streamer1.id)
  })

  test('TokenRefreshService retry policy should work correctly', async ({ assert }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    const streamer = await createTestStreamer()

    // First failure - should not deactivate
    streamer.tokenRefreshFailedAt = null
    await streamer.save()

    await service.handleRefreshFailure(streamer)
    await streamer.refresh()
    assert.isTrue(streamer.isActive)

    // Second failure within 30 min - should deactivate
    streamer.tokenRefreshFailedAt = DateTime.now().minus({ minutes: 20 })
    await streamer.save()

    await service.handleRefreshFailure(streamer)
    await streamer.refresh()
    assert.isFalse(streamer.isActive)
    assert.isNull(streamer.tokenRefreshFailedAt)
  })

  test('refreshAllActiveTokens should skip streamers with fresh tokens', async ({ assert }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    // Create streamer with active authorization and fresh token
    const user = await createTestUser({})
    const campaign = await createTestCampaign({ ownerId: user.id })
    const streamer = await createTestStreamer()

    // Set token expiry to 3 hours from now (not expiring soon)
    streamer.tokenExpiresAt = DateTime.now().plus({ hours: 3 })
    await streamer.save()

    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })
    await grantPollAuthorization(membership)

    // Run refresh
    const report = await service.refreshAllActiveTokens()

    // Should skip because token is not expiring soon
    assert.equal(report.total, 1)
    assert.equal(report.skipped, 1)
    assert.equal(report.success, 0)
    assert.equal(report.failed, 0)
  })
})

test.group('Token Refresh - Edge Cases', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('streamer in multiple campaigns should be processed once', async ({ assert }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    const user = await createTestUser({})
    const campaign1 = await createTestCampaign({ ownerId: user.id })
    const campaign2 = await createTestCampaign({ ownerId: user.id })
    const streamer = await createTestStreamer()

    // Add streamer to both campaigns with authorization
    const membership1 = await createTestMembership({
      campaignId: campaign1.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })
    await grantPollAuthorization(membership1)

    const membership2 = await createTestMembership({
      campaignId: campaign2.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })
    await grantPollAuthorization(membership2)

    // Find streamers
    const streamers = await service.findStreamersWithActiveAuthorization()

    // Should return the streamer only once
    assert.lengthOf(streamers, 1)
  })

  test('inactive streamer should not be found even with valid authorization', async ({
    assert,
  }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    const user = await createTestUser({})
    const campaign = await createTestCampaign({ ownerId: user.id })
    const streamer = await createTestStreamer()

    // Deactivate streamer
    streamer.isActive = false
    await streamer.save()

    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })
    await grantPollAuthorization(membership)

    const streamers = await service.findStreamersWithActiveAuthorization()

    assert.lengthOf(streamers, 0)
  })

  test('pending membership should not grant authorization eligibility', async ({ assert }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    const user = await createTestUser({})
    const campaign = await createTestCampaign({ ownerId: user.id })
    const streamer = await createTestStreamer()

    // Create PENDING membership with poll authorization (edge case)
    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'PENDING',
    })

    // Manually set authorization (shouldn't happen in real flow)
    membership.pollAuthorizationGrantedAt = DateTime.now()
    membership.pollAuthorizationExpiresAt = DateTime.now().plus({ hours: 12 })
    await membership.save()

    const streamers = await service.findStreamersWithActiveAuthorization()

    // Should not be found because membership is PENDING, not ACTIVE
    assert.lengthOf(streamers, 0)
  })
})
