import { test } from '@japa/runner'
import { CampaignService } from '#services/campaigns/campaign_service'
import type { CampaignRepository } from '#repositories/campaign_repository'
import type { CampaignMembershipRepository } from '#repositories/campaign_membership_repository'
import type { campaign as Campaign } from '#models/campaign'
import type { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import { DateTime } from 'luxon'

// Mock Repositories
class MockCampaignRepository implements Partial<CampaignRepository> {
  private campaigns: Map<string, Campaign> = new Map()
  createCalled = false
  updateCalled = false
  deleteCalled = false

  async create(data: any): Promise<Campaign> {
    this.createCalled = true
    const campaign = {
      id: `campaign-${Date.now()}`,
      ownerId: data.ownerId,
      name: data.name,
      description: data.description,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    } as Campaign
    this.campaigns.set(campaign.id, campaign)
    return campaign
  }

  async findById(id: string): Promise<Campaign | null> {
    return this.campaigns.get(id) || null
  }

  async findByIdWithMembers(id: string): Promise<Campaign | null> {
    const campaign = this.campaigns.get(id)
    return campaign ? { ...campaign, memberships: [] } : null
  }

  async findByOwnerIdWithMembers(ownerId: string): Promise<Campaign[]> {
    return Array.from(this.campaigns.values()).filter((c) => c.ownerId === ownerId)
  }

  async update(campaign: Campaign): Promise<Campaign> {
    this.updateCalled = true
    this.campaigns.set(campaign.id, campaign)
    return campaign
  }

  async delete(_campaign: Campaign): Promise<void> {
    this.deleteCalled = true
  }

  seed(campaign: Campaign): void {
    this.campaigns.set(campaign.id, campaign)
  }

  reset(): void {
    this.campaigns.clear()
    this.createCalled = false
    this.updateCalled = false
    this.deleteCalled = false
  }
}

class MockMembershipRepository implements Partial<CampaignMembershipRepository> {
  private memberships: CampaignMembership[] = []
  createCalled = false
  updateCalled = false

  async create(data: any): Promise<CampaignMembership> {
    this.createCalled = true
    const membership = {
      id: `membership-${Date.now()}`,
      campaignId: data.campaignId,
      streamerId: data.streamerId,
      status: data.status,
      invitedAt: data.invitedAt,
      acceptedAt: null,
      pollAuthorizationGrantedAt: null,
      pollAuthorizationExpiresAt: null,
      load: async () => {},
    } as unknown as CampaignMembership
    this.memberships.push(membership)
    return membership
  }

  async update(membership: CampaignMembership): Promise<CampaignMembership> {
    this.updateCalled = true
    return membership
  }

  reset(): void {
    this.memberships = []
    this.createCalled = false
    this.updateCalled = false
  }
}

// Mock User model
let mockUserStreamer: any = null
const mockUser = {
  query: () => ({
    where: () => ({
      preload: () => ({
        firstOrFail: async () => ({
          id: 'user-123',
          streamer: mockUserStreamer,
        }),
      }),
    }),
  }),
}

test.group('CampaignService - Create Campaign', (group) => {
  let mockCampaignRepo: MockCampaignRepository
  let mockMembershipRepo: MockMembershipRepository
  let service: CampaignService

  group.each.setup(() => {
    mockCampaignRepo = new MockCampaignRepository()
    mockMembershipRepo = new MockMembershipRepository()
    mockUserStreamer = null
  })

  test('should create campaign with owner as default member if owner has streamer profile', async ({
    assert,
  }) => {
    // Mock user with streamer profile
    mockUserStreamer = { id: 'streamer-123' }

    // Mock User model in global scope
    ;(global as any).User = mockUser

    service = new CampaignService(
      mockCampaignRepo as unknown as CampaignRepository,
      mockMembershipRepo as unknown as CampaignMembershipRepository
    )

    const campaign = await service.createCampaign('user-123', {
      name: 'Test Campaign',
      description: 'Description',
    })

    assert.isTrue(mockCampaignRepo.createCalled)
    assert.isTrue(mockMembershipRepo.createCalled)
    assert.isTrue(mockMembershipRepo.updateCalled)
    assert.equal(campaign.name, 'Test Campaign')
  })

  test('should create campaign without membership if owner has no streamer profile', async ({
    assert,
  }) => {
    // Mock user WITHOUT streamer profile
    mockUserStreamer = null
    ;(global as any).User = mockUser

    service = new CampaignService(
      mockCampaignRepo as unknown as CampaignRepository,
      mockMembershipRepo as unknown as CampaignMembershipRepository
    )

    const campaign = await service.createCampaign('user-123', {
      name: 'Test Campaign',
      description: null,
    })

    assert.isTrue(mockCampaignRepo.createCalled)
    assert.isFalse(mockMembershipRepo.createCalled)
    assert.equal(campaign.name, 'Test Campaign')
  })

  test('should create campaign with null description', async ({ assert }) => {
    mockUserStreamer = null
    ;(global as any).User = mockUser

    service = new CampaignService(
      mockCampaignRepo as unknown as CampaignRepository,
      mockMembershipRepo as unknown as CampaignMembershipRepository
    )

    const campaign = await service.createCampaign('user-123', {
      name: 'Campaign',
      description: null,
    })

    assert.equal(campaign.description, null)
  })

  test('should propagate errors from repository', async ({ assert }) => {
    mockUserStreamer = null
    ;(global as any).User = mockUser

    mockCampaignRepo.create = async () => {
      throw new Error('Database error')
    }

    service = new CampaignService(
      mockCampaignRepo as unknown as CampaignRepository,
      mockMembershipRepo as unknown as CampaignMembershipRepository
    )

    await assert.rejects(
      async () => await service.createCampaign('user-123', { name: 'Test' }),
      /Database error/
    )
  })
})

test.group('CampaignService - Update Campaign', (group) => {
  let mockCampaignRepo: MockCampaignRepository
  let mockMembershipRepo: MockMembershipRepository
  let service: CampaignService

  group.each.setup(() => {
    mockCampaignRepo = new MockCampaignRepository()
    mockMembershipRepo = new MockMembershipRepository()
    service = new CampaignService(
      mockCampaignRepo as unknown as CampaignRepository,
      mockMembershipRepo as unknown as CampaignMembershipRepository
    )
  })

  test('should update campaign if owner', async ({ assert }) => {
    const campaign = {
      id: 'campaign-123',
      ownerId: 'user-123',
      name: 'Old Name',
      description: 'Old Desc',
    } as Campaign

    mockCampaignRepo.seed(campaign)

    const updated = await service.updateCampaign('campaign-123', 'user-123', {
      name: 'New Name',
      description: 'New Desc',
    })

    assert.isTrue(mockCampaignRepo.updateCalled)
    assert.equal(updated.name, 'New Name')
    assert.equal(updated.description, 'New Desc')
  })

  test('should update only name if description not provided', async ({ assert }) => {
    const campaign = {
      id: 'campaign-123',
      ownerId: 'user-123',
      name: 'Old Name',
      description: 'Keep Me',
    } as Campaign

    mockCampaignRepo.seed(campaign)

    const updated = await service.updateCampaign('campaign-123', 'user-123', {
      name: 'New Name',
    })

    assert.equal(updated.name, 'New Name')
    assert.equal(updated.description, 'Keep Me')
  })

  test('should set description to null if explicitly provided', async ({ assert }) => {
    const campaign = {
      id: 'campaign-123',
      ownerId: 'user-123',
      name: 'Name',
      description: 'Remove Me',
    } as Campaign

    mockCampaignRepo.seed(campaign)

    const updated = await service.updateCampaign('campaign-123', 'user-123', {
      description: null,
    })

    assert.equal(updated.description, null)
  })

  test('should throw if campaign not found', async ({ assert }) => {
    await assert.rejects(
      async () => await service.updateCampaign('nonexistent', 'user-123', { name: 'New Name' }),
      /Campaign not found/
    )
  })

  test('should throw if not owner', async ({ assert }) => {
    const campaign = {
      id: 'campaign-123',
      ownerId: 'user-123',
      name: 'Name',
    } as Campaign

    mockCampaignRepo.seed(campaign)

    await assert.rejects(
      async () => await service.updateCampaign('campaign-123', 'other-user', { name: 'Hack' }),
      /Not authorized to update this campaign/
    )

    assert.isFalse(mockCampaignRepo.updateCalled)
  })
})

test.group('CampaignService - Delete Campaign', (group) => {
  let mockCampaignRepo: MockCampaignRepository
  let mockMembershipRepo: MockMembershipRepository
  let service: CampaignService

  group.each.setup(() => {
    mockCampaignRepo = new MockCampaignRepository()
    mockMembershipRepo = new MockMembershipRepository()
    service = new CampaignService(
      mockCampaignRepo as unknown as CampaignRepository,
      mockMembershipRepo as unknown as CampaignMembershipRepository
    )
  })

  test('should delete campaign if owner', async ({ assert }) => {
    const campaign = {
      id: 'campaign-123',
      ownerId: 'user-123',
      name: 'To Delete',
    } as Campaign

    mockCampaignRepo.seed(campaign)

    await service.deleteCampaign('campaign-123', 'user-123')

    assert.isTrue(mockCampaignRepo.deleteCalled)
  })

  test('should throw if campaign not found', async ({ assert }) => {
    await assert.rejects(
      async () => await service.deleteCampaign('nonexistent', 'user-123'),
      /Campaign not found/
    )

    assert.isFalse(mockCampaignRepo.deleteCalled)
  })

  test('should throw if not owner', async ({ assert }) => {
    const campaign = {
      id: 'campaign-123',
      ownerId: 'user-123',
      name: 'Protected',
    } as Campaign

    mockCampaignRepo.seed(campaign)

    await assert.rejects(
      async () => await service.deleteCampaign('campaign-123', 'other-user'),
      /Not authorized to delete this campaign/
    )

    assert.isFalse(mockCampaignRepo.deleteCalled)
  })
})

test.group('CampaignService - Get Campaign', (group) => {
  let mockCampaignRepo: MockCampaignRepository
  let mockMembershipRepo: MockMembershipRepository
  let service: CampaignService

  group.each.setup(() => {
    mockCampaignRepo = new MockCampaignRepository()
    mockMembershipRepo = new MockMembershipRepository()
    service = new CampaignService(
      mockCampaignRepo as unknown as CampaignRepository,
      mockMembershipRepo as unknown as CampaignMembershipRepository
    )
  })

  test('should return campaign if owner', async ({ assert }) => {
    const campaign = {
      id: 'campaign-123',
      ownerId: 'user-123',
      name: 'My Campaign',
      memberships: [],
    } as Campaign

    mockCampaignRepo.seed(campaign)

    const result = await service.getCampaignWithMembers('campaign-123', 'user-123')

    assert.equal(result.id, 'campaign-123')
    assert.equal(result.name, 'My Campaign')
  })

  test('should return campaign if member', async ({ assert }) => {
    const campaign = {
      id: 'campaign-123',
      ownerId: 'owner-456',
      name: 'Campaign',
      memberships: [
        {
          id: 'membership-1',
          streamer: {
            userId: 'user-789',
          },
        },
      ],
    } as any

    mockCampaignRepo.seed(campaign)

    const result = await service.getCampaignWithMembers('campaign-123', 'user-789')

    assert.equal(result.id, 'campaign-123')
  })

  test('should throw if not owner and not member', async ({ assert }) => {
    const campaign = {
      id: 'campaign-123',
      ownerId: 'owner-456',
      name: 'Private',
      memberships: [],
    } as Campaign

    mockCampaignRepo.seed(campaign)

    await assert.rejects(
      async () => await service.getCampaignWithMembers('campaign-123', 'stranger-999'),
      /Not authorized to view this campaign/
    )
  })

  test('should throw if campaign not found', async ({ assert }) => {
    await assert.rejects(
      async () => await service.getCampaignWithMembers('nonexistent', 'user-123'),
      /Campaign not found/
    )
  })
})

test.group('CampaignService - List Campaigns', (group) => {
  let mockCampaignRepo: MockCampaignRepository
  let mockMembershipRepo: MockMembershipRepository
  let service: CampaignService

  group.each.setup(() => {
    mockCampaignRepo = new MockCampaignRepository()
    mockMembershipRepo = new MockMembershipRepository()
    service = new CampaignService(
      mockCampaignRepo as unknown as CampaignRepository,
      mockMembershipRepo as unknown as CampaignMembershipRepository
    )
  })

  test('should return all campaigns for owner', async ({ assert }) => {
    const campaign1 = {
      id: 'campaign-1',
      ownerId: 'user-123',
      name: 'Campaign 1',
    } as Campaign

    const campaign2 = {
      id: 'campaign-2',
      ownerId: 'user-123',
      name: 'Campaign 2',
    } as Campaign

    mockCampaignRepo.seed(campaign1)
    mockCampaignRepo.seed(campaign2)

    const result = await service.listUserCampaigns('user-123')

    assert.lengthOf(result, 2)
    assert.equal(result[0].id, 'campaign-1')
    assert.equal(result[1].id, 'campaign-2')
  })

  test('should return empty array if no campaigns', async ({ assert }) => {
    const result = await service.listUserCampaigns('user-123')

    assert.lengthOf(result, 0)
  })

  test('should only return campaigns owned by user', async ({ assert }) => {
    const campaign1 = {
      id: 'campaign-1',
      ownerId: 'user-123',
      name: 'My Campaign',
    } as Campaign

    const campaign2 = {
      id: 'campaign-2',
      ownerId: 'other-user',
      name: 'Other Campaign',
    } as Campaign

    mockCampaignRepo.seed(campaign1)
    mockCampaignRepo.seed(campaign2)

    const result = await service.listUserCampaigns('user-123')

    assert.lengthOf(result, 1)
    assert.equal(result[0].id, 'campaign-1')
  })
})
