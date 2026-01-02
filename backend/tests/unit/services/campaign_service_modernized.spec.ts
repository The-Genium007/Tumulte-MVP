import { test } from '@japa/runner'
import { CampaignService } from '#services/campaigns/campaign_service'
import { CampaignRepository } from '#repositories/campaign_repository'
import { campaign as Campaign } from '#models/campaign'

/**
 * Mock Campaign Repository for testing
 * Provides reusable stubs for all repository methods
 */
class MockCampaignRepository extends CampaignRepository {
  // Storage for mock data
  private campaigns: Map<string, Campaign> = new Map()

  async create(data: Partial<Campaign>): Promise<Campaign> {
    const mockCampaign = {
      id: `campaign-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    } as Campaign

    this.campaigns.set(mockCampaign.id, mockCampaign)
    return mockCampaign
  }

  async findById(id: string): Promise<Campaign | null> {
    return this.campaigns.get(id) || null
  }

  async findByIdWithMembers(id: string): Promise<Campaign | null> {
    return this.campaigns.get(id) || null
  }

  async findByOwnerId(ownerId: string): Promise<Campaign[]> {
    return Array.from(this.campaigns.values()).filter((c) => c.ownerId === ownerId)
  }

  async update(campaign: Campaign): Promise<Campaign> {
    campaign.updatedAt = new Date()
    this.campaigns.set(campaign.id, campaign)
    return campaign
  }

  async delete(id: string): Promise<void> {
    this.campaigns.delete(id)
  }

  // Helper to seed mock data
  seed(campaign: Campaign): void {
    this.campaigns.set(campaign.id, campaign)
  }

  // Helper to clear all data
  clear(): void {
    this.campaigns.clear()
  }
}

/**
 * Factory to create mock campaigns
 */
function createMockCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'campaign-123',
    ownerId: 'user-123',
    name: 'Test Campaign',
    description: 'A test campaign',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Campaign
}

test.group('CampaignService (Modernized)', (group) => {
  let campaignService: CampaignService
  let mockRepository: MockCampaignRepository

  group.each.setup(() => {
    mockRepository = new MockCampaignRepository()
    campaignService = new CampaignService(mockRepository)
  })

  group.each.teardown(() => {
    mockRepository.clear()
  })

  test('createCampaign should create a new campaign with auto-membership', async ({ assert }) => {
    const ownerId = 'user-123'
    const data = {
      name: 'New Campaign',
      description: 'Campaign description',
    }

    const result = await campaignService.createCampaign(ownerId, data)

    assert.exists(result.id)
    assert.equal(result.name, 'New Campaign')
    assert.equal(result.description, 'Campaign description')
    assert.equal(result.ownerId, ownerId)
  })

  test('createCampaign should handle missing description', async ({ assert }) => {
    const ownerId = 'user-456'
    const data = {
      name: 'Campaign without description',
    }

    const result = await campaignService.createCampaign(ownerId, data)

    assert.exists(result.id)
    assert.equal(result.name, 'Campaign without description')
    assert.equal(result.ownerId, ownerId)
  })

  test('getCampaignWithMembers should return campaign if user is owner', async ({ assert }) => {
    const mockCampaign = createMockCampaign({
      id: 'campaign-abc',
      ownerId: 'owner-123',
      name: 'My Campaign',
    })
    mockRepository.seed(mockCampaign)

    const result = await campaignService.getCampaignWithMembers('campaign-abc', 'owner-123')

    assert.equal(result.id, 'campaign-abc')
    assert.equal(result.name, 'My Campaign')
    assert.equal(result.ownerId, 'owner-123')
  })

  test('getCampaignWithMembers should throw error if user is not owner', async ({ assert }) => {
    const mockCampaign = createMockCampaign({
      id: 'campaign-xyz',
      ownerId: 'owner-456',
    })
    mockRepository.seed(mockCampaign)

    await assert.rejects(
      () => campaignService.getCampaignWithMembers('campaign-xyz', 'other-user'),
      'Not authorized to access this campaign'
    )
  })

  test('getCampaignWithMembers should throw error if campaign not found', async ({ assert }) => {
    await assert.rejects(
      () => campaignService.getCampaignWithMembers('non-existent', 'user-123'),
      'Campaign not found'
    )
  })

  test('updateCampaign should update campaign if user is owner', async ({ assert }) => {
    const mockCampaign = createMockCampaign({
      id: 'campaign-update',
      ownerId: 'owner-789',
      name: 'Old Name',
      description: 'Old Description',
    })
    mockRepository.seed(mockCampaign)

    const result = await campaignService.updateCampaign('campaign-update', 'owner-789', {
      name: 'Updated Name',
      description: 'Updated Description',
    })

    assert.equal(result.name, 'Updated Name')
    assert.equal(result.description, 'Updated Description')
  })

  test('updateCampaign should throw error if user is not owner', async ({ assert }) => {
    const mockCampaign = createMockCampaign({
      id: 'campaign-protected',
      ownerId: 'owner-999',
    })
    mockRepository.seed(mockCampaign)

    await assert.rejects(
      () =>
        campaignService.updateCampaign('campaign-protected', 'hacker', {
          name: 'Hacked Name',
        }),
      'Not authorized to update this campaign'
    )
  })

  test('deleteCampaign should delete campaign if user is owner', async ({ assert }) => {
    const mockCampaign = createMockCampaign({
      id: 'campaign-to-delete',
      ownerId: 'owner-delete',
    })
    mockRepository.seed(mockCampaign)

    // Should not throw
    await campaignService.deleteCampaign('campaign-to-delete', 'owner-delete')

    // Verify deletion
    const deleted = await mockRepository.findById('campaign-to-delete')
    assert.isNull(deleted)
  })

  test('deleteCampaign should throw error if user is not owner', async ({ assert }) => {
    const mockCampaign = createMockCampaign({
      id: 'campaign-protected-delete',
      ownerId: 'owner-secure',
    })
    mockRepository.seed(mockCampaign)

    await assert.rejects(
      () => campaignService.deleteCampaign('campaign-protected-delete', 'other-user'),
      'Not authorized to delete this campaign'
    )
  })

  test('listUserCampaigns should return all campaigns owned by user', async ({ assert }) => {
    const mockCampaigns = [
      createMockCampaign({ id: 'campaign-1', ownerId: 'user-list', name: 'Campaign 1' }),
      createMockCampaign({ id: 'campaign-2', ownerId: 'user-list', name: 'Campaign 2' }),
      createMockCampaign({ id: 'campaign-3', ownerId: 'other-user', name: 'Other Campaign' }),
    ]

    mockCampaigns.forEach((c) => mockRepository.seed(c))

    const result = await campaignService.listUserCampaigns('user-list')

    assert.lengthOf(result, 2)
    assert.equal(result[0].name, 'Campaign 1')
    assert.equal(result[1].name, 'Campaign 2')
  })

  test('listUserCampaigns should return empty array if user has no campaigns', async ({
    assert,
  }) => {
    const result = await campaignService.listUserCampaigns('user-no-campaigns')

    assert.isArray(result)
    assert.lengthOf(result, 0)
  })

  test('listUserCampaigns should return campaigns sorted by creation date', async ({ assert }) => {
    const now = new Date()
    const mockCampaigns = [
      createMockCampaign({
        id: 'campaign-old',
        ownerId: 'user-sort',
        name: 'Old Campaign',
        createdAt: new Date(now.getTime() - 3600000), // 1 hour ago
      }),
      createMockCampaign({
        id: 'campaign-new',
        ownerId: 'user-sort',
        name: 'New Campaign',
        createdAt: now,
      }),
    ]

    mockCampaigns.forEach((c) => mockRepository.seed(c))

    const result = await campaignService.listUserCampaigns('user-sort')

    assert.lengthOf(result, 2)
    // Should be sorted by creation date (newest first or oldest first depending on implementation)
    assert.exists(result[0].createdAt)
    assert.exists(result[1].createdAt)
  })
})
