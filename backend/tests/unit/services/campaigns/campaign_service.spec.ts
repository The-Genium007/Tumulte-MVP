import { test } from '@japa/runner'
import { CampaignService } from '#services/campaigns/campaign_service'
import type { CampaignRepository } from '#repositories/campaign_repository'
import type { CampaignMembershipRepository } from '#repositories/campaign_membership_repository'
import type VttWebSocketService from '#services/vtt/vtt_websocket_service'
import type { campaign as Campaign } from '#models/campaign'

// ========================================
// HELPERS
// ========================================

function createMockCampaign(overrides: Record<string, unknown> = {}): Campaign {
  return {
    id: 'camp-1',
    ownerId: 'owner-1',
    name: 'Test Campaign',
    description: null,
    vttConnectionId: null,
    memberships: [],
    ...overrides,
  } as unknown as Campaign
}

function createMockCampaignRepository(campaigns: Campaign[] = []): CampaignRepository {
  let stored = [...campaigns]

  return {
    findById: async (id: string) => stored.find((c) => c.id === id) ?? null,
    findByIdWithMembers: async (id: string) => stored.find((c) => c.id === id) ?? null,
    findByOwnerIdWithMembers: async (ownerId: string) =>
      stored.filter((c) => c.ownerId === ownerId),
    create: async (data: Partial<Campaign>) => {
      const campaign = createMockCampaign({ id: `camp-${stored.length + 1}`, ...data })
      stored.push(campaign)
      return campaign
    },
    update: async (campaign: Campaign) => campaign,
    delete: async (campaign: Campaign) => {
      stored = stored.filter((c) => c.id !== campaign.id)
    },
  } as unknown as CampaignRepository
}

function createMockMembershipRepository(): CampaignMembershipRepository {
  return {
    findByCampaignAndStreamer: async () => null,
    create: async (data: Record<string, unknown>) => data,
    update: async (membership: Record<string, unknown>) => membership,
  } as unknown as CampaignMembershipRepository
}

function createMockVttWebSocketService(): VttWebSocketService {
  return {
    notifyCampaignDeleted: async () => {},
    revokeConnection: async () => {},
  } as unknown as VttWebSocketService
}

// ========================================
// TESTS — CampaignService
// ========================================

test.group('CampaignService — updateCampaign', () => {
  test('should update campaign name', async ({ assert }) => {
    const campaign = createMockCampaign({ id: 'c1', ownerId: 'owner-1', name: 'Old Name' })
    const repo = createMockCampaignRepository([campaign])
    const memberRepo = createMockMembershipRepository()
    const vttService = createMockVttWebSocketService()
    const service = new CampaignService(repo, memberRepo, vttService)

    const result = await service.updateCampaign('c1', 'owner-1', { name: 'New Name' })

    assert.equal(result.name, 'New Name')
  })

  test('should update campaign description', async ({ assert }) => {
    const campaign = createMockCampaign({ id: 'c1', ownerId: 'owner-1' })
    const repo = createMockCampaignRepository([campaign])
    const service = new CampaignService(
      repo,
      createMockMembershipRepository(),
      createMockVttWebSocketService()
    )

    const result = await service.updateCampaign('c1', 'owner-1', { description: 'New desc' })

    assert.equal(result.description, 'New desc')
  })

  test('should throw when campaign not found', async ({ assert }) => {
    const repo = createMockCampaignRepository([])
    const service = new CampaignService(
      repo,
      createMockMembershipRepository(),
      createMockVttWebSocketService()
    )

    await assert.rejects(
      () => service.updateCampaign('nonexistent', 'owner-1', { name: 'X' }),
      'Campaign not found'
    )
  })

  test('should throw when user is not the owner', async ({ assert }) => {
    const campaign = createMockCampaign({ id: 'c1', ownerId: 'owner-1' })
    const repo = createMockCampaignRepository([campaign])
    const service = new CampaignService(
      repo,
      createMockMembershipRepository(),
      createMockVttWebSocketService()
    )

    await assert.rejects(
      () => service.updateCampaign('c1', 'other-user', { name: 'X' }),
      'Not authorized to update this campaign'
    )
  })
})

test.group('CampaignService — deleteCampaign', () => {
  test('should delete campaign when user is owner', async ({ assert }) => {
    const campaign = createMockCampaign({ id: 'c1', ownerId: 'owner-1' })
    const repo = createMockCampaignRepository([campaign])
    const service = new CampaignService(
      repo,
      createMockMembershipRepository(),
      createMockVttWebSocketService()
    )

    await service.deleteCampaign('c1', 'owner-1')

    const remaining = await service.listUserCampaigns('owner-1')
    assert.lengthOf(remaining, 0)
  })

  test('should throw when campaign not found', async ({ assert }) => {
    const repo = createMockCampaignRepository([])
    const service = new CampaignService(
      repo,
      createMockMembershipRepository(),
      createMockVttWebSocketService()
    )

    await assert.rejects(
      () => service.deleteCampaign('nonexistent', 'owner-1'),
      'Campaign not found'
    )
  })

  test('should throw when user is not the owner', async ({ assert }) => {
    const campaign = createMockCampaign({ id: 'c1', ownerId: 'owner-1' })
    const repo = createMockCampaignRepository([campaign])
    const service = new CampaignService(
      repo,
      createMockMembershipRepository(),
      createMockVttWebSocketService()
    )

    await assert.rejects(
      () => service.deleteCampaign('c1', 'other-user'),
      'Not authorized to delete this campaign'
    )
  })

  test('should notify VTT and revoke connection when campaign has VTT connection', async ({
    assert,
  }) => {
    let notifyCalled = false
    let revokeCalled = false

    const campaign = createMockCampaign({
      id: 'c1',
      ownerId: 'owner-1',
      vttConnectionId: 'vtt-conn-1',
    })
    const repo = createMockCampaignRepository([campaign])

    const vttService = {
      notifyCampaignDeleted: async () => {
        notifyCalled = true
      },
      revokeConnection: async () => {
        revokeCalled = true
      },
    } as unknown as VttWebSocketService

    const service = new CampaignService(repo, createMockMembershipRepository(), vttService)

    await service.deleteCampaign('c1', 'owner-1')

    assert.isTrue(notifyCalled)
    assert.isTrue(revokeCalled)
  })

  test('should NOT notify VTT when campaign has no VTT connection', async ({ assert }) => {
    let notifyCalled = false

    const campaign = createMockCampaign({
      id: 'c1',
      ownerId: 'owner-1',
      vttConnectionId: null,
    })
    const repo = createMockCampaignRepository([campaign])

    const vttService = {
      notifyCampaignDeleted: async () => {
        notifyCalled = true
      },
      revokeConnection: async () => {},
    } as unknown as VttWebSocketService

    const service = new CampaignService(repo, createMockMembershipRepository(), vttService)

    await service.deleteCampaign('c1', 'owner-1')

    assert.isFalse(notifyCalled)
  })

  test('should still delete campaign when VTT notification fails', async ({ assert }) => {
    const campaign = createMockCampaign({
      id: 'c1',
      ownerId: 'owner-1',
      vttConnectionId: 'vtt-conn-1',
    })
    const repo = createMockCampaignRepository([campaign])

    const vttService = {
      notifyCampaignDeleted: async () => {
        throw new Error('VTT notification failed')
      },
      revokeConnection: async () => {},
    } as unknown as VttWebSocketService

    const service = new CampaignService(repo, createMockMembershipRepository(), vttService)

    // Should NOT throw — VTT failure is non-blocking
    await service.deleteCampaign('c1', 'owner-1')

    const remaining = await service.listUserCampaigns('owner-1')
    assert.lengthOf(remaining, 0)
  })
})

test.group('CampaignService — getCampaignWithMembers', () => {
  test('should return campaign when user is owner', async ({ assert }) => {
    const campaign = createMockCampaign({ id: 'c1', ownerId: 'owner-1' })
    const repo = createMockCampaignRepository([campaign])
    const service = new CampaignService(
      repo,
      createMockMembershipRepository(),
      createMockVttWebSocketService()
    )

    const result = await service.getCampaignWithMembers('c1', 'owner-1')

    assert.equal(result.id, 'c1')
  })

  test('should return campaign when user is a member', async ({ assert }) => {
    const campaign = createMockCampaign({
      id: 'c1',
      ownerId: 'other-owner',
      memberships: [{ streamer: { userId: 'member-user' } }],
    })
    const repo = createMockCampaignRepository([campaign])
    const service = new CampaignService(
      repo,
      createMockMembershipRepository(),
      createMockVttWebSocketService()
    )

    const result = await service.getCampaignWithMembers('c1', 'member-user')

    assert.equal(result.id, 'c1')
  })

  test('should throw when user is neither owner nor member', async ({ assert }) => {
    const campaign = createMockCampaign({ id: 'c1', ownerId: 'owner-1', memberships: [] })
    const repo = createMockCampaignRepository([campaign])
    const service = new CampaignService(
      repo,
      createMockMembershipRepository(),
      createMockVttWebSocketService()
    )

    await assert.rejects(
      () => service.getCampaignWithMembers('c1', 'stranger'),
      'Not authorized to view this campaign'
    )
  })

  test('should throw when campaign not found', async ({ assert }) => {
    const repo = createMockCampaignRepository([])
    const service = new CampaignService(
      repo,
      createMockMembershipRepository(),
      createMockVttWebSocketService()
    )

    await assert.rejects(
      () => service.getCampaignWithMembers('nonexistent', 'owner-1'),
      'Campaign not found'
    )
  })
})

test.group('CampaignService — listUserCampaigns', () => {
  test('should return only campaigns owned by user', async ({ assert }) => {
    const campaigns = [
      createMockCampaign({ id: 'c1', ownerId: 'owner-1' }),
      createMockCampaign({ id: 'c2', ownerId: 'owner-1' }),
      createMockCampaign({ id: 'c3', ownerId: 'other-owner' }),
    ]
    const repo = createMockCampaignRepository(campaigns)
    const service = new CampaignService(
      repo,
      createMockMembershipRepository(),
      createMockVttWebSocketService()
    )

    const result = await service.listUserCampaigns('owner-1')

    assert.lengthOf(result, 2)
    result.forEach((c) => assert.equal(c.ownerId, 'owner-1'))
  })

  test('should return empty array when user has no campaigns', async ({ assert }) => {
    const repo = createMockCampaignRepository([])
    const service = new CampaignService(
      repo,
      createMockMembershipRepository(),
      createMockVttWebSocketService()
    )

    const result = await service.listUserCampaigns('owner-1')

    assert.lengthOf(result, 0)
  })
})
