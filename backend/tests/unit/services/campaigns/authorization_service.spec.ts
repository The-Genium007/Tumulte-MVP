import { test } from '@japa/runner'
import { AuthorizationService } from '#services/campaigns/authorization_service'
import type { CampaignMembershipRepository } from '#repositories/campaign_membership_repository'
import type { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import { DateTime } from 'luxon'

// Mock Repository
class MockMembershipRepository implements Partial<CampaignMembershipRepository> {
  private memberships: Map<string, CampaignMembership> = new Map()
  grantAuthorizationCalled = false
  revokeAuthorizationCalled = false

  async findByCampaignAndStreamer(
    campaignId: string,
    streamerId: string
  ): Promise<CampaignMembership | null> {
    const key = `${campaignId}:${streamerId}`
    return this.memberships.get(key) || null
  }

  async grantPollAuthorization(membership: CampaignMembership): Promise<void> {
    this.grantAuthorizationCalled = true
    const now = DateTime.now()
    ;(membership as any).pollAuthorizationGrantedAt = now
    ;(membership as any).pollAuthorizationExpiresAt = now.plus({ hours: 12 })
  }

  async revokePollAuthorization(membership: CampaignMembership): Promise<void> {
    this.revokeAuthorizationCalled = true
    ;(membership as any).pollAuthorizationGrantedAt = null
    ;(membership as any).pollAuthorizationExpiresAt = null
  }

  seed(campaignId: string, streamerId: string, membership: CampaignMembership): void {
    const key = `${campaignId}:${streamerId}`
    this.memberships.set(key, membership)
  }

  reset(): void {
    this.memberships.clear()
    this.grantAuthorizationCalled = false
    this.revokeAuthorizationCalled = false
  }
}

test.group('AuthorizationService - Grant Authorization', (group) => {
  let mockRepo: MockMembershipRepository
  let service: AuthorizationService

  group.each.setup(() => {
    mockRepo = new MockMembershipRepository()
    service = new AuthorizationService(mockRepo as unknown as CampaignMembershipRepository)
  })

  test('should grant 12-hour authorization for ACTIVE membership', async ({ assert }) => {
    const membership = {
      id: 'membership-123',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'ACTIVE',
      pollAuthorizationGrantedAt: null,
      pollAuthorizationExpiresAt: null,
    } as CampaignMembership

    mockRepo.seed('campaign-1', 'streamer-1', membership)

    const expiresAt = await service.grantAuthorization('campaign-1', 'streamer-1')

    assert.isTrue(mockRepo.grantAuthorizationCalled)
    assert.instanceOf(expiresAt, DateTime)
  })

  test('should throw if membership not found', async ({ assert }) => {
    await assert.rejects(
      async () => await service.grantAuthorization('nonexistent', 'streamer-1'),
      /Campaign membership not found/
    )

    assert.isFalse(mockRepo.grantAuthorizationCalled)
  })

  test('should throw if membership is PENDING', async ({ assert }) => {
    const membership = {
      id: 'membership-123',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'PENDING',
    } as CampaignMembership

    mockRepo.seed('campaign-1', 'streamer-1', membership)

    await assert.rejects(
      async () => await service.grantAuthorization('campaign-1', 'streamer-1'),
      /Membership must be ACTIVE to grant authorization/
    )

    assert.isFalse(mockRepo.grantAuthorizationCalled)
  })

  test('should return expiration DateTime', async ({ assert }) => {
    const membership = {
      id: 'membership-123',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'ACTIVE',
      pollAuthorizationExpiresAt: null,
    } as CampaignMembership

    mockRepo.seed('campaign-1', 'streamer-1', membership)

    const expiresAt = await service.grantAuthorization('campaign-1', 'streamer-1')

    assert.isNotNull(expiresAt)
    assert.instanceOf(expiresAt, DateTime)
  })
})

test.group('AuthorizationService - Revoke Authorization', (group) => {
  let mockRepo: MockMembershipRepository
  let service: AuthorizationService

  group.each.setup(() => {
    mockRepo = new MockMembershipRepository()
    service = new AuthorizationService(mockRepo as unknown as CampaignMembershipRepository)
  })

  test('should revoke authorization successfully', async ({ assert }) => {
    const now = DateTime.now()
    const membership = {
      id: 'membership-123',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'ACTIVE',
      pollAuthorizationGrantedAt: now,
      pollAuthorizationExpiresAt: now.plus({ hours: 12 }),
    } as CampaignMembership

    mockRepo.seed('campaign-1', 'streamer-1', membership)

    await service.revokeAuthorization('campaign-1', 'streamer-1')

    assert.isTrue(mockRepo.revokeAuthorizationCalled)
  })

  test('should throw if membership not found', async ({ assert }) => {
    await assert.rejects(
      async () => await service.revokeAuthorization('nonexistent', 'streamer-1'),
      /Campaign membership not found/
    )

    assert.isFalse(mockRepo.revokeAuthorizationCalled)
  })

  test('should revoke even if authorization not currently active', async ({ assert }) => {
    const membership = {
      id: 'membership-123',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'ACTIVE',
      pollAuthorizationGrantedAt: null,
      pollAuthorizationExpiresAt: null,
    } as CampaignMembership

    mockRepo.seed('campaign-1', 'streamer-1', membership)

    // Should not throw
    await service.revokeAuthorization('campaign-1', 'streamer-1')

    assert.isTrue(mockRepo.revokeAuthorizationCalled)
  })
})

test.group('AuthorizationService - Get Status', (group) => {
  let mockRepo: MockMembershipRepository
  let service: AuthorizationService

  group.each.setup(() => {
    mockRepo = new MockMembershipRepository()
    service = new AuthorizationService(mockRepo as unknown as CampaignMembershipRepository)
  })

  test('should return authorized status with expiry', async ({ assert }) => {
    const now = DateTime.now()
    const expiresAt = now.plus({ hours: 12 })

    const membership = {
      id: 'membership-123',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'ACTIVE',
      pollAuthorizationGrantedAt: now,
      pollAuthorizationExpiresAt: expiresAt,
      isPollAuthorizationActive: true,
      authorizationRemainingSeconds: 12 * 3600,
    } as any

    mockRepo.seed('campaign-1', 'streamer-1', membership)

    const status = await service.getAuthorizationStatus('campaign-1', 'streamer-1')

    assert.isTrue(status.isAuthorized)
    assert.instanceOf(status.expiresAt, DateTime)
    assert.equal(status.remainingSeconds, 12 * 3600)
  })

  test('should return not authorized status if expired', async ({ assert }) => {
    const now = DateTime.now()
    const expiredAt = now.minus({ hours: 1 })

    const membership = {
      id: 'membership-123',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'ACTIVE',
      pollAuthorizationGrantedAt: now.minus({ hours: 13 }),
      pollAuthorizationExpiresAt: expiredAt,
      isPollAuthorizationActive: false,
      authorizationRemainingSeconds: 0,
    } as any

    mockRepo.seed('campaign-1', 'streamer-1', membership)

    const status = await service.getAuthorizationStatus('campaign-1', 'streamer-1')

    assert.isFalse(status.isAuthorized)
    assert.equal(status.remainingSeconds, 0)
  })

  test('should return not authorized if never granted', async ({ assert }) => {
    const membership = {
      id: 'membership-123',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'ACTIVE',
      pollAuthorizationGrantedAt: null,
      pollAuthorizationExpiresAt: null,
      isPollAuthorizationActive: false,
      authorizationRemainingSeconds: null,
    } as any

    mockRepo.seed('campaign-1', 'streamer-1', membership)

    const status = await service.getAuthorizationStatus('campaign-1', 'streamer-1')

    assert.isFalse(status.isAuthorized)
    assert.isNull(status.expiresAt)
    assert.isNull(status.remainingSeconds)
  })

  test('should throw if membership not found', async ({ assert }) => {
    await assert.rejects(
      async () => await service.getAuthorizationStatus('nonexistent', 'streamer-1'),
      /Campaign membership not found/
    )
  })

  test('should return permanent authorization for owner (100 years)', async ({ assert }) => {
    const now = DateTime.now()
    const permanentExpiry = now.plus({ years: 100 })

    const membership = {
      id: 'membership-123',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'ACTIVE',
      pollAuthorizationGrantedAt: now,
      pollAuthorizationExpiresAt: permanentExpiry,
      isPollAuthorizationActive: true,
      authorizationRemainingSeconds: 100 * 365 * 24 * 3600,
    } as any

    mockRepo.seed('campaign-1', 'streamer-1', membership)

    const status = await service.getAuthorizationStatus('campaign-1', 'streamer-1')

    assert.isTrue(status.isAuthorized)
    assert.instanceOf(status.expiresAt, DateTime)
    // Should have many years remaining
    assert.isAbove(status.remainingSeconds!, 99 * 365 * 24 * 3600)
  })
})

test.group('AuthorizationService - Authorization Window', (group) => {
  let mockRepo: MockMembershipRepository
  let service: AuthorizationService

  group.each.setup(() => {
    mockRepo = new MockMembershipRepository()
    service = new AuthorizationService(mockRepo as unknown as CampaignMembershipRepository)
  })

  test('should extend authorization if granted again before expiry', async ({ assert }) => {
    const now = DateTime.now()
    const firstExpiry = now.plus({ hours: 6 }) // 6h remaining

    const membership = {
      id: 'membership-123',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'ACTIVE',
      pollAuthorizationGrantedAt: now.minus({ hours: 6 }),
      pollAuthorizationExpiresAt: firstExpiry,
    } as CampaignMembership

    mockRepo.seed('campaign-1', 'streamer-1', membership)

    // Grant again - should extend to 12h from now
    await service.grantAuthorization('campaign-1', 'streamer-1')

    assert.isTrue(mockRepo.grantAuthorizationCalled)
  })

  test('should re-grant authorization after expiry', async ({ assert }) => {
    const now = DateTime.now()
    const expiredAt = now.minus({ hours: 1 })

    const membership = {
      id: 'membership-123',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'ACTIVE',
      pollAuthorizationGrantedAt: now.minus({ hours: 13 }),
      pollAuthorizationExpiresAt: expiredAt,
    } as CampaignMembership

    mockRepo.seed('campaign-1', 'streamer-1', membership)

    // Should be able to grant again
    await service.grantAuthorization('campaign-1', 'streamer-1')

    assert.isTrue(mockRepo.grantAuthorizationCalled)
  })
})
