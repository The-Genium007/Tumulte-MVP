import { test } from '@japa/runner'
import { CampaignService } from '#services/campaigns/campaign_service'
import { CampaignRepository } from '#repositories/campaign_repository'
import Campaign from '#models/campaign'

test.group('CampaignService', () => {
  let campaignService: CampaignService
  let campaignRepository: CampaignRepository

  test('createCampaign should create a new campaign', async ({ assert }) => {
    campaignRepository = new CampaignRepository()
    campaignService = new CampaignService(campaignRepository)

    const ownerId = 'user-123'
    const data = {
      name: 'Test Campaign',
      description: 'A test campaign',
    }

    // Mock the repository create method
    const mockCampaign = {
      id: 'campaign-123',
      ownerId,
      name: data.name,
      description: data.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Campaign

    campaignRepository.create = async () => mockCampaign

    const result = await campaignService.createCampaign(ownerId, data)

    assert.equal(result.id, 'campaign-123')
    assert.equal(result.name, 'Test Campaign')
    assert.equal(result.ownerId, ownerId)
  })

  test('getCampaignWithMembers should throw if not owner', async ({ assert }) => {
    campaignRepository = new CampaignRepository()
    campaignService = new CampaignService(campaignRepository)

    const mockCampaign = {
      id: 'campaign-123',
      ownerId: 'user-123',
      name: 'Test Campaign',
    } as Campaign

    campaignRepository.findByIdWithMembers = async () => mockCampaign

    await assert.rejects(
      async () => {
        await campaignService.getCampaignWithMembers('campaign-123', 'other-user')
      },
      (error: Error) => {
        assert.equal(error.message, 'Not authorized to access this campaign')
        return true
      }
    )
  })

  test('getCampaignWithMembers should return campaign if owner', async ({ assert }) => {
    campaignRepository = new CampaignRepository()
    campaignService = new CampaignService(campaignRepository)

    const mockCampaign = {
      id: 'campaign-123',
      ownerId: 'user-123',
      name: 'Test Campaign',
    } as Campaign

    campaignRepository.findByIdWithMembers = async () => mockCampaign

    const result = await campaignService.getCampaignWithMembers('campaign-123', 'user-123')

    assert.equal(result.id, 'campaign-123')
    assert.equal(result.ownerId, 'user-123')
  })

  test('updateCampaign should update campaign if owner', async ({ assert }) => {
    campaignRepository = new CampaignRepository()
    campaignService = new CampaignService(campaignRepository)

    const mockCampaign = {
      id: 'campaign-123',
      ownerId: 'user-123',
      name: 'Old Name',
      description: 'Old Description',
    } as Campaign

    campaignRepository.findById = async () => mockCampaign
    campaignRepository.update = async (campaign) => campaign

    const result = await campaignService.updateCampaign('campaign-123', 'user-123', {
      name: 'New Name',
      description: 'New Description',
    })

    assert.equal(result.name, 'New Name')
    assert.equal(result.description, 'New Description')
  })

  test('updateCampaign should throw if not owner', async ({ assert }) => {
    campaignRepository = new CampaignRepository()
    campaignService = new CampaignService(campaignRepository)

    const mockCampaign = {
      id: 'campaign-123',
      ownerId: 'user-123',
      name: 'Old Name',
    } as Campaign

    campaignRepository.findById = async () => mockCampaign

    await assert.rejects(
      async () => {
        await campaignService.updateCampaign('campaign-123', 'other-user', {
          name: 'New Name',
        })
      },
      (error: Error) => {
        assert.equal(error.message, 'Not authorized to update this campaign')
        return true
      }
    )
  })

  test('deleteCampaign should delete campaign if owner', async ({ assert }) => {
    campaignRepository = new CampaignRepository()
    campaignService = new CampaignService(campaignRepository)

    const mockCampaign = {
      id: 'campaign-123',
      ownerId: 'user-123',
      name: 'Test Campaign',
    } as Campaign

    campaignRepository.findById = async () => mockCampaign
    campaignRepository.delete = async () => {}

    // Should not throw
    await campaignService.deleteCampaign('campaign-123', 'user-123')

    assert.isTrue(true)
  })

  test('listUserCampaigns should return campaigns for user', async ({ assert }) => {
    campaignRepository = new CampaignRepository()
    campaignService = new CampaignService(campaignRepository)

    const mockCampaigns = [
      { id: 'campaign-1', ownerId: 'user-123', name: 'Campaign 1' },
      { id: 'campaign-2', ownerId: 'user-123', name: 'Campaign 2' },
    ] as Campaign[]

    campaignRepository.findByOwnerId = async () => mockCampaigns

    const result = await campaignService.listUserCampaigns('user-123')

    assert.equal(result.length, 2)
    assert.equal(result[0].id, 'campaign-1')
    assert.equal(result[1].id, 'campaign-2')
  })
})
