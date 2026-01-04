import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '#tests/helpers/database'
import { streamer as Streamer } from '#models/streamer'
import {
  createTestUser,
  createTestStreamer,
  createTestCampaign,
  createTestMembership,
  grantPollAuthorization,
} from '#tests/helpers/test_utils'

test.group('Streamer Model - Token Expiry Getters', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('isTokenExpiringSoon returns true when tokenExpiresAt is null', async ({ assert }) => {
    const streamer = await createTestStreamer()
    streamer.tokenExpiresAt = null
    await streamer.save()

    assert.isTrue(streamer.isTokenExpiringSoon)
  })

  test('isTokenExpiringSoon returns true when token expires in less than 1 hour', async ({
    assert,
  }) => {
    const streamer = await createTestStreamer()
    streamer.tokenExpiresAt = DateTime.now().plus({ minutes: 30 })
    await streamer.save()

    assert.isTrue(streamer.isTokenExpiringSoon)
  })

  test('isTokenExpiringSoon returns false when token expires in more than 1 hour', async ({
    assert,
  }) => {
    const streamer = await createTestStreamer()
    streamer.tokenExpiresAt = DateTime.now().plus({ hours: 2 })
    await streamer.save()

    assert.isFalse(streamer.isTokenExpiringSoon)
  })

  test('isTokenExpired returns true when tokenExpiresAt is null', async ({ assert }) => {
    const streamer = await createTestStreamer()
    streamer.tokenExpiresAt = null
    await streamer.save()

    assert.isTrue(streamer.isTokenExpired)
  })

  test('isTokenExpired returns true when token is expired', async ({ assert }) => {
    const streamer = await createTestStreamer()
    streamer.tokenExpiresAt = DateTime.now().minus({ hours: 1 })
    await streamer.save()

    assert.isTrue(streamer.isTokenExpired)
  })

  test('isTokenExpired returns false when token is still valid', async ({ assert }) => {
    const streamer = await createTestStreamer()
    streamer.tokenExpiresAt = DateTime.now().plus({ hours: 2 })
    await streamer.save()

    assert.isFalse(streamer.isTokenExpired)
  })
})

test.group('Streamer Model - Token Tracking Columns', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should persist tokenExpiresAt to database', async ({ assert }) => {
    const streamer = await createTestStreamer()
    const expiresAt = DateTime.now().plus({ hours: 4 })

    streamer.tokenExpiresAt = expiresAt
    await streamer.save()

    // Fetch fresh from DB
    const fetched = await Streamer.findOrFail(streamer.id)
    assert.exists(fetched.tokenExpiresAt)
    // Check within 1 second tolerance
    assert.closeTo(fetched.tokenExpiresAt!.toMillis(), expiresAt.toMillis(), 1000)
  })

  test('should persist lastTokenRefreshAt to database', async ({ assert }) => {
    const streamer = await createTestStreamer()
    const refreshedAt = DateTime.now()

    streamer.lastTokenRefreshAt = refreshedAt
    await streamer.save()

    const fetched = await Streamer.findOrFail(streamer.id)
    assert.exists(fetched.lastTokenRefreshAt)
    assert.closeTo(fetched.lastTokenRefreshAt!.toMillis(), refreshedAt.toMillis(), 1000)
  })

  test('should persist tokenRefreshFailedAt to database', async ({ assert }) => {
    const streamer = await createTestStreamer()
    const failedAt = DateTime.now()

    streamer.tokenRefreshFailedAt = failedAt
    await streamer.save()

    const fetched = await Streamer.findOrFail(streamer.id)
    assert.exists(fetched.tokenRefreshFailedAt)
    assert.closeTo(fetched.tokenRefreshFailedAt!.toMillis(), failedAt.toMillis(), 1000)
  })

  test('should allow clearing tokenRefreshFailedAt', async ({ assert }) => {
    const streamer = await createTestStreamer()

    // Set failure
    streamer.tokenRefreshFailedAt = DateTime.now()
    await streamer.save()

    // Clear it
    streamer.tokenRefreshFailedAt = null
    await streamer.save()

    const fetched = await Streamer.findOrFail(streamer.id)
    assert.isNull(fetched.tokenRefreshFailedAt)
  })
})

test.group('TokenRefreshService - findStreamersWithActiveAuthorization', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should return streamers with active poll authorization', async ({ assert }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    // Create campaign and streamer with active authorization
    const user = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })
    const streamer = await createTestStreamer()

    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })

    await grantPollAuthorization(membership)

    const streamers = await service.findStreamersWithActiveAuthorization()

    assert.lengthOf(streamers, 1)
    assert.equal(streamers[0].id, streamer.id)
  })

  test('should not return streamers without poll authorization', async ({ assert }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    // Create campaign and streamer without authorization
    const user = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })
    const streamer = await createTestStreamer()

    await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })

    const streamers = await service.findStreamersWithActiveAuthorization()

    assert.lengthOf(streamers, 0)
  })

  test('should not return streamers with expired authorization', async ({ assert }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    // Create campaign and streamer with expired authorization
    const user = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })
    const streamer = await createTestStreamer()

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

    const streamers = await service.findStreamersWithActiveAuthorization()

    assert.lengthOf(streamers, 0)
  })

  test('should not return inactive streamers', async ({ assert }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    // Create inactive streamer with authorization
    const user = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })
    const streamer = await createTestStreamer()

    // Deactivate the streamer after creation
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

  test('should return unique streamers even with multiple campaign memberships', async ({
    assert,
  }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    // Create streamer in multiple campaigns
    const user = await createTestUser({ role: 'MJ' })
    const campaign1 = await createTestCampaign({ ownerId: user.id })
    const campaign2 = await createTestCampaign({ ownerId: user.id })
    const streamer = await createTestStreamer()

    const membership1 = await createTestMembership({
      campaignId: campaign1.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })

    const membership2 = await createTestMembership({
      campaignId: campaign2.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })

    await grantPollAuthorization(membership1)
    await grantPollAuthorization(membership2)

    const streamers = await service.findStreamersWithActiveAuthorization()

    // Should return the streamer only once
    assert.lengthOf(streamers, 1)
    assert.equal(streamers[0].id, streamer.id)
  })
})

test.group('TokenRefreshService - findStreamersNeedingRetry', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should return streamers with failed refresh past retry delay', async ({ assert }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    const streamer = await createTestStreamer()

    // Set failure 20 minutes ago (past 15 min retry delay)
    streamer.tokenRefreshFailedAt = DateTime.now().minus({ minutes: 20 })
    await streamer.save()

    const streamers = await service.findStreamersNeedingRetry()

    assert.lengthOf(streamers, 1)
    assert.equal(streamers[0].id, streamer.id)
  })

  test('should not return streamers with recent failure (within retry delay)', async ({
    assert,
  }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    const streamer = await createTestStreamer()

    // Set failure 5 minutes ago (within 15 min retry delay)
    streamer.tokenRefreshFailedAt = DateTime.now().minus({ minutes: 5 })
    await streamer.save()

    const streamers = await service.findStreamersNeedingRetry()

    assert.lengthOf(streamers, 0)
  })

  test('should not return streamers with too old failure (> 30 min)', async ({ assert }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    const streamer = await createTestStreamer()

    // Set failure 35 minutes ago (too old)
    streamer.tokenRefreshFailedAt = DateTime.now().minus({ minutes: 35 })
    await streamer.save()

    const streamers = await service.findStreamersNeedingRetry()

    assert.lengthOf(streamers, 0)
  })

  test('should not return inactive streamers', async ({ assert }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    const streamer = await createTestStreamer()

    // Deactivate streamer and set failure 20 minutes ago
    streamer.isActive = false
    streamer.tokenRefreshFailedAt = DateTime.now().minus({ minutes: 20 })
    await streamer.save()

    const streamers = await service.findStreamersNeedingRetry()

    assert.lengthOf(streamers, 0)
  })
})

test.group('TokenRefreshService - handleRefreshFailure retry policy', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('first failure should not deactivate streamer', async ({ assert }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    const streamer = await createTestStreamer()

    // No previous failure
    streamer.tokenRefreshFailedAt = null
    await streamer.save()

    await service.handleRefreshFailure(streamer)

    // Reload from DB
    await streamer.refresh()

    // Streamer should still be active
    assert.isTrue(streamer.isActive)
  })

  test('second failure within 30 min should deactivate streamer', async ({ assert }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    const streamer = await createTestStreamer()

    // Set first failure 20 minutes ago
    streamer.tokenRefreshFailedAt = DateTime.now().minus({ minutes: 20 })
    await streamer.save()

    await service.handleRefreshFailure(streamer)

    // Reload from DB
    await streamer.refresh()

    // Streamer should be deactivated
    assert.isFalse(streamer.isActive)
    // tokenRefreshFailedAt should be cleared after handling
    assert.isNull(streamer.tokenRefreshFailedAt)
  })

  test('second failure after 30 min should not deactivate (treated as first)', async ({
    assert,
  }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    const streamer = await createTestStreamer()

    // Set first failure 35 minutes ago (too old)
    streamer.tokenRefreshFailedAt = DateTime.now().minus({ minutes: 35 })
    await streamer.save()

    await service.handleRefreshFailure(streamer)

    // Reload from DB
    await streamer.refresh()

    // Streamer should still be active (treated as first failure)
    assert.isTrue(streamer.isActive)
  })
})

test.group('TokenRefreshService - refreshAllActiveTokens report', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should return report with correct counts for skipped streamers', async ({ assert }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    // Create streamer with authorization but token not expiring soon
    const user = await createTestUser({ role: 'MJ' })
    const campaign = await createTestCampaign({ ownerId: user.id })
    const streamer = await createTestStreamer()

    // Token expires in 3 hours (not expiring soon)
    streamer.tokenExpiresAt = DateTime.now().plus({ hours: 3 })
    await streamer.save()

    const membership = await createTestMembership({
      campaignId: campaign.id,
      streamerId: streamer.id,
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    })

    await grantPollAuthorization(membership)

    const report = await service.refreshAllActiveTokens()

    assert.equal(report.total, 1)
    assert.equal(report.skipped, 1)
    assert.equal(report.success, 0)
    assert.equal(report.failed, 0)
    assert.lengthOf(report.details, 1)
    assert.equal(report.details[0].status, 'skipped')
    assert.equal(report.details[0].reason, 'Token not expiring soon')
  })

  test('should return empty report when no streamers with authorization', async ({ assert }) => {
    const { TokenRefreshService } = await import('#services/auth/token_refresh_service')
    const service = new TokenRefreshService()

    const report = await service.refreshAllActiveTokens()

    assert.equal(report.total, 0)
    assert.equal(report.success, 0)
    assert.equal(report.failed, 0)
    assert.equal(report.skipped, 0)
    assert.lengthOf(report.details, 0)
  })
})
