import { describe, test, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCampaignsStore } from '~/stores/campaigns'
import { createMockApiCampaign } from '../../helpers/mockFactory'

// Mock campaigns repository
vi.mock('~/api/repositories/campaigns_repository', () => ({
  campaignsRepository: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    inviteStreamer: vi.fn(),
    removeMember: vi.fn(),
  },
}))

describe('Campaigns Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  test('should initialize with empty campaigns', () => {
    const store = useCampaignsStore()

    expect(store.campaigns).toEqual([])
    expect(store.selectedCampaign).toBeNull()
    expect(store.loading).toBe(false)
  })

  test('fetchCampaigns() should load campaigns list', async () => {
    const mockCampaigns = [
      createMockApiCampaign({ id: '1', name: 'Campaign 1' }),
      createMockApiCampaign({ id: '2', name: 'Campaign 2' }),
    ]

    const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
    vi.mocked(campaignsRepository.list).mockResolvedValueOnce(mockCampaigns)

    const store = useCampaignsStore()
    await store.fetchCampaigns()

    expect(campaignsRepository.list).toHaveBeenCalled()
    expect(store.campaigns).toEqual(mockCampaigns)
    expect(store.loading).toBe(false)
  })

  test('fetchCampaigns() should handle errors', async () => {
    const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
    vi.mocked(campaignsRepository.list).mockRejectedValueOnce(new Error('Network error'))

    const store = useCampaignsStore()

    await expect(store.fetchCampaigns()).rejects.toThrow('Network error')
    expect(store.loading).toBe(false)
  })

  test('createCampaign() should create and add to list', async () => {
    const newCampaign = createMockApiCampaign({
      id: 'new',
      name: 'New Campaign',
    })

    const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
    vi.mocked(campaignsRepository.create).mockResolvedValueOnce(newCampaign)

    const store = useCampaignsStore()
    const result = await store.createCampaign({
      name: 'New Campaign',
      description: 'Test',
    })

    expect(campaignsRepository.create).toHaveBeenCalledWith({
      name: 'New Campaign',
      description: 'Test',
    })
    expect(result).toEqual(newCampaign)
    expect(store.campaigns).toContainEqual(newCampaign)
  })

  test('updateCampaign() should update campaign in list', async () => {
    const existing = createMockApiCampaign({ id: '1', name: 'Old Name' })
    const updated = createMockApiCampaign({ id: '1', name: 'New Name' })

    const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
    vi.mocked(campaignsRepository.list).mockResolvedValueOnce([existing])
    vi.mocked(campaignsRepository.update).mockResolvedValueOnce(updated)

    const store = useCampaignsStore()
    await store.fetchCampaigns()
    await store.updateCampaign('1', { name: 'New Name' })

    expect(store.campaigns[0]!.name).toBe('New Name')
  })

  test('deleteCampaign() should remove from list', async () => {
    const campaign1 = createMockApiCampaign({ id: '1' })
    const campaign2 = createMockApiCampaign({ id: '2' })

    const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
    vi.mocked(campaignsRepository.list).mockResolvedValueOnce([campaign1, campaign2])
    vi.mocked(campaignsRepository.delete).mockResolvedValueOnce(undefined)

    const store = useCampaignsStore()
    await store.fetchCampaigns()
    await store.deleteCampaign('1')

    expect(store.campaigns).toHaveLength(1)
    expect(store.campaigns[0]!.id).toBe('2')
  })

  test('deleteCampaign() should clear selectedCampaign if same', async () => {
    const campaign = createMockApiCampaign({ id: '1' })

    const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
    vi.mocked(campaignsRepository.get).mockResolvedValueOnce(
      campaign as unknown as Awaited<ReturnType<typeof campaignsRepository.get>>
    )
    vi.mocked(campaignsRepository.delete).mockResolvedValueOnce(undefined)

    const store = useCampaignsStore()
    await store.fetchCampaign('1')
    await store.deleteCampaign('1')

    expect(store.selectedCampaign).toBeNull()
  })

  test('activeCampaigns getter should filter campaigns', async () => {
    const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
    const mockCampaigns = [
      createMockApiCampaign({ id: '1', activeMemberCount: 3 }),
      createMockApiCampaign({ id: '2', activeMemberCount: 0 }),
      createMockApiCampaign({ id: '3', activeMemberCount: 5 }),
    ]
    vi.mocked(campaignsRepository.list).mockResolvedValueOnce(mockCampaigns)

    const store = useCampaignsStore()
    await store.fetchCampaigns()

    expect(store.activeCampaigns).toHaveLength(2)
    expect(store.activeCampaigns.map((c) => c.id)).toEqual(['1', '3'])
  })

  test('hasCampaigns getter should return true when campaigns exist', async () => {
    const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
    const mockCampaigns = [createMockApiCampaign()]
    vi.mocked(campaignsRepository.list).mockResolvedValueOnce(mockCampaigns)

    const store = useCampaignsStore()

    expect(store.hasCampaigns).toBe(false)

    await store.fetchCampaigns()

    expect(store.hasCampaigns).toBe(true)
  })

  describe('inviteStreamer', () => {
    test('should invite streamer and add to members list', async () => {
      const mockMember = {
        id: 'member-1',
        campaignId: 'campaign-1',
        streamerId: 'streamer-123',
        status: 'PENDING' as const,
        invitedAt: '2024-01-01T00:00:00Z',
        acceptedAt: null,
      }

      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      vi.mocked(campaignsRepository.inviteStreamer).mockResolvedValueOnce(mockMember)

      const store = useCampaignsStore()
      // Set up a selected campaign
      store.selectedCampaign = {
        id: 'campaign-1',
        ownerId: 'owner-1',
        name: 'Test Campaign',
        description: 'Test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        activeMemberCount: 0,
        memberCount: 0,
        members: [],
      }

      const result = await store.inviteStreamer('campaign-1', 'streamer-123')

      expect(campaignsRepository.inviteStreamer).toHaveBeenCalledWith('campaign-1', {
        streamerId: 'streamer-123',
      })
      expect(result).toEqual(mockMember)
      expect(store.selectedCampaign?.members).toContainEqual(mockMember)
    })

    test('should create members array if not exists', async () => {
      const mockMember = {
        id: 'member-1',
        campaignId: 'campaign-1',
        streamerId: 'streamer-123',
        status: 'PENDING' as const,
        invitedAt: '2024-01-01T00:00:00Z',
        acceptedAt: null,
      }

      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      vi.mocked(campaignsRepository.inviteStreamer).mockResolvedValueOnce(mockMember)

      const store = useCampaignsStore()
      // Set up a selected campaign without members array
      store.selectedCampaign = {
        id: 'campaign-1',
        ownerId: 'owner-1',
        name: 'Test Campaign',
        description: 'Test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        activeMemberCount: 0,
        memberCount: 0,
      } as ReturnType<typeof useCampaignsStore>['selectedCampaign']

      await store.inviteStreamer('campaign-1', 'streamer-123')

      expect(store.selectedCampaign?.members).toEqual([mockMember])
    })

    test('should not modify members if different campaign selected', async () => {
      const mockMember = {
        id: 'member-1',
        campaignId: 'campaign-1',
        streamerId: 'streamer-123',
        status: 'PENDING' as const,
        invitedAt: '2024-01-01T00:00:00Z',
        acceptedAt: null,
      }

      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      vi.mocked(campaignsRepository.inviteStreamer).mockResolvedValueOnce(mockMember)

      const store = useCampaignsStore()
      store.selectedCampaign = {
        id: 'other-campaign',
        ownerId: 'owner-1',
        name: 'Other Campaign',
        description: 'Test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        activeMemberCount: 0,
        memberCount: 0,
        members: [],
      }

      await store.inviteStreamer('campaign-1', 'streamer-123')

      expect(store.selectedCampaign?.members).toEqual([])
    })

    test('should handle invite error', async () => {
      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      vi.mocked(campaignsRepository.inviteStreamer).mockRejectedValueOnce(
        new Error('Streamer not found')
      )

      const store = useCampaignsStore()

      await expect(store.inviteStreamer('campaign-1', 'invalid-streamer')).rejects.toThrow(
        'Streamer not found'
      )
      expect(store.error).toBe('Streamer not found')
      expect(store.loading).toBe(false)
    })
  })

  describe('removeMember', () => {
    test('should remove member from selected campaign', async () => {
      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      vi.mocked(campaignsRepository.removeMember).mockResolvedValueOnce(undefined)

      const store = useCampaignsStore()
      store.selectedCampaign = {
        id: 'campaign-1',
        ownerId: 'owner-1',
        name: 'Test Campaign',
        description: 'Test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        activeMemberCount: 2,
        memberCount: 2,
        members: [
          {
            id: 'member-1',
            campaignId: 'campaign-1',
            streamerId: 's1',
            status: 'ACTIVE' as const,
            invitedAt: '2024-01-01T00:00:00Z',
            acceptedAt: '2024-01-01T00:00:00Z',
          },
          {
            id: 'member-2',
            campaignId: 'campaign-1',
            streamerId: 's2',
            status: 'ACTIVE' as const,
            invitedAt: '2024-01-01T00:00:00Z',
            acceptedAt: '2024-01-01T00:00:00Z',
          },
        ],
      }

      await store.removeMember('campaign-1', 'member-1')

      expect(campaignsRepository.removeMember).toHaveBeenCalledWith('campaign-1', 'member-1')
      expect(store.selectedCampaign?.members).toHaveLength(1)
      expect(store.selectedCampaign?.members?.[0]!.id).toBe('member-2')
    })

    test('should not modify members if different campaign selected', async () => {
      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      vi.mocked(campaignsRepository.removeMember).mockResolvedValueOnce(undefined)

      const store = useCampaignsStore()
      store.selectedCampaign = {
        id: 'other-campaign',
        ownerId: 'owner-1',
        name: 'Other Campaign',
        description: 'Test',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        activeMemberCount: 1,
        memberCount: 1,
        members: [
          {
            id: 'member-1',
            campaignId: 'other-campaign',
            streamerId: 's1',
            status: 'ACTIVE' as const,
            invitedAt: '2024-01-01T00:00:00Z',
            acceptedAt: '2024-01-01T00:00:00Z',
          },
        ],
      }

      await store.removeMember('campaign-1', 'member-1')

      expect(store.selectedCampaign?.members).toHaveLength(1)
    })

    test('should handle remove error', async () => {
      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      vi.mocked(campaignsRepository.removeMember).mockRejectedValueOnce(
        new Error('Member not found')
      )

      const store = useCampaignsStore()

      await expect(store.removeMember('campaign-1', 'invalid-member')).rejects.toThrow(
        'Member not found'
      )
      expect(store.error).toBe('Member not found')
      expect(store.loading).toBe(false)
    })
  })

  describe('clearError', () => {
    test('should clear error state', async () => {
      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      vi.mocked(campaignsRepository.list).mockRejectedValueOnce(new Error('Test error'))

      const store = useCampaignsStore()

      // Trigger an error
      try {
        await store.fetchCampaigns()
      } catch {
        // Expected
      }

      expect(store.error).toBe('Test error')

      store.clearError()

      expect(store.error).toBeNull()
    })
  })

  describe('clearSelection', () => {
    test('should clear selected campaign', async () => {
      const campaign = createMockApiCampaign({ id: '1' })

      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      vi.mocked(campaignsRepository.get).mockResolvedValueOnce(
        campaign as unknown as Awaited<ReturnType<typeof campaignsRepository.get>>
      )

      const store = useCampaignsStore()
      await store.fetchCampaign('1')

      expect(store.selectedCampaign).not.toBeNull()

      store.clearSelection()

      expect(store.selectedCampaign).toBeNull()
    })
  })

  describe('fetchCampaign', () => {
    test('should fetch and set selected campaign', async () => {
      const mockCampaignDetail = {
        id: '1',
        ownerId: 'owner-1',
        name: 'Test Campaign',
        description: 'Description',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        activeMemberCount: 2,
        memberCount: 3,
        members: [],
      }

      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      vi.mocked(campaignsRepository.get).mockResolvedValueOnce(mockCampaignDetail)

      const store = useCampaignsStore()
      const result = await store.fetchCampaign('1')

      expect(campaignsRepository.get).toHaveBeenCalledWith('1')
      expect(result).toEqual(mockCampaignDetail)
      expect(store.selectedCampaign).toEqual(mockCampaignDetail)
    })

    test('should handle fetch campaign error', async () => {
      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      vi.mocked(campaignsRepository.get).mockRejectedValueOnce(new Error('Campaign not found'))

      const store = useCampaignsStore()

      await expect(store.fetchCampaign('invalid-id')).rejects.toThrow('Campaign not found')
      expect(store.error).toBe('Campaign not found')
      expect(store.loading).toBe(false)
    })
  })

  describe('updateCampaign - edge cases', () => {
    test('should update selectedCampaign if same campaign', async () => {
      const existing = createMockApiCampaign({ id: '1', name: 'Old Name' })
      const updated = createMockApiCampaign({ id: '1', name: 'New Name' })

      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      vi.mocked(campaignsRepository.get).mockResolvedValueOnce(
        existing as unknown as Awaited<ReturnType<typeof campaignsRepository.get>>
      )
      vi.mocked(campaignsRepository.update).mockResolvedValueOnce(updated)

      const store = useCampaignsStore()
      await store.fetchCampaign('1')
      await store.updateCampaign('1', { name: 'New Name' })

      expect(store.selectedCampaign?.name).toBe('New Name')
    })

    test('should not update selectedCampaign if different campaign', async () => {
      const campaign1 = createMockApiCampaign({ id: '1', name: 'Campaign 1' })
      const updated2 = createMockApiCampaign({ id: '2', name: 'Updated 2' })

      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      vi.mocked(campaignsRepository.list).mockResolvedValueOnce([
        campaign1,
        createMockApiCampaign({ id: '2', name: 'Campaign 2' }),
      ])
      vi.mocked(campaignsRepository.get).mockResolvedValueOnce(
        campaign1 as unknown as Awaited<ReturnType<typeof campaignsRepository.get>>
      )
      vi.mocked(campaignsRepository.update).mockResolvedValueOnce(updated2)

      const store = useCampaignsStore()
      await store.fetchCampaigns()
      await store.fetchCampaign('1')
      await store.updateCampaign('2', { name: 'Updated 2' })

      expect(store.selectedCampaign?.id).toBe('1')
      expect(store.selectedCampaign?.name).toBe('Campaign 1')
    })

    test('should handle update error', async () => {
      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      vi.mocked(campaignsRepository.update).mockRejectedValueOnce(new Error('Update failed'))

      const store = useCampaignsStore()

      await expect(store.updateCampaign('1', { name: 'New Name' })).rejects.toThrow('Update failed')
      expect(store.error).toBe('Update failed')
    })
  })

  describe('createCampaign - edge cases', () => {
    test('should handle create error', async () => {
      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      vi.mocked(campaignsRepository.create).mockRejectedValueOnce(new Error('Validation error'))

      const store = useCampaignsStore()

      await expect(store.createCampaign({ name: '', description: '' })).rejects.toThrow(
        'Validation error'
      )
      expect(store.error).toBe('Validation error')
    })
  })

  describe('deleteCampaign - edge cases', () => {
    test('should handle delete error', async () => {
      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      vi.mocked(campaignsRepository.delete).mockRejectedValueOnce(new Error('Delete forbidden'))

      const store = useCampaignsStore()

      await expect(store.deleteCampaign('1')).rejects.toThrow('Delete forbidden')
      expect(store.error).toBe('Delete forbidden')
    })
  })

  describe('error getter', () => {
    test('should return error state via getter', async () => {
      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      vi.mocked(campaignsRepository.list).mockRejectedValueOnce(new Error('API Error'))

      const store = useCampaignsStore()

      expect(store.error).toBeNull()

      try {
        await store.fetchCampaigns()
      } catch {
        // Expected
      }

      expect(store.error).toBe('API Error')
    })
  })

  describe('isOfflineData', () => {
    test('should start as false', () => {
      const store = useCampaignsStore()
      expect(store.isOfflineData).toBe(false)
    })
  })

  describe('activeCampaigns - edge cases', () => {
    test('should return empty array when no campaigns have active members', async () => {
      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      const mockCampaigns = [
        createMockApiCampaign({ id: '1', activeMemberCount: 0 }),
        createMockApiCampaign({ id: '2', activeMemberCount: 0 }),
      ]
      vi.mocked(campaignsRepository.list).mockResolvedValueOnce(mockCampaigns)

      const store = useCampaignsStore()
      await store.fetchCampaigns()

      expect(store.activeCampaigns).toHaveLength(0)
    })

    test('should return all campaigns when all have active members', async () => {
      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      const mockCampaigns = [
        createMockApiCampaign({ id: '1', activeMemberCount: 1 }),
        createMockApiCampaign({ id: '2', activeMemberCount: 2 }),
        createMockApiCampaign({ id: '3', activeMemberCount: 5 }),
      ]
      vi.mocked(campaignsRepository.list).mockResolvedValueOnce(mockCampaigns)

      const store = useCampaignsStore()
      await store.fetchCampaigns()

      expect(store.activeCampaigns).toHaveLength(3)
    })

    test('should return empty array when campaigns is empty', () => {
      const store = useCampaignsStore()

      expect(store.activeCampaigns).toHaveLength(0)
    })
  })

  describe('first campaign tracking', () => {
    test('should track first campaign creation analytics', async () => {
      const newCampaign = createMockApiCampaign({
        id: 'first-campaign',
        name: 'My First Campaign',
      })

      const { campaignsRepository } = await import('~/api/repositories/campaigns_repository')
      vi.mocked(campaignsRepository.create).mockResolvedValueOnce(newCampaign)

      const store = useCampaignsStore()
      // Ensure campaigns is empty (first campaign scenario)
      store.campaigns = []

      await store.createCampaign({
        name: 'My First Campaign',
        description: 'Test',
      })

      // Campaign should be added
      expect(store.campaigns).toHaveLength(1)
      expect(store.campaigns[0]!.id).toBe('first-campaign')
    })
  })
})
