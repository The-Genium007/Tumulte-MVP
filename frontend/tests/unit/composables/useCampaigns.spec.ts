import { describe, test, expect, beforeEach, vi } from 'vitest'
import { useCampaigns } from '~/composables/useCampaigns'
import { createMockCampaign } from '../../helpers/mockFactory'

// Mock fetch globally
global.fetch = vi.fn()

describe('useCampaigns Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useRuntimeConfig
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: 'http://localhost:3333/api/v2',
      },
    } as ReturnType<typeof useRuntimeConfig>)
  })

  test('should initialize with empty state', () => {
    const { campaigns, selectedCampaign, loading } = useCampaigns()

    expect(campaigns.value).toEqual([])
    expect(selectedCampaign.value).toBeNull()
    expect(loading.value).toBe(false)
  })

  test('fetchCampaigns() should load campaigns list', async () => {
    const mockCampaigns = [
      createMockCampaign({ id: '1', name: 'Campaign 1' }),
      createMockCampaign({ id: '2', name: 'Campaign 2' }),
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockCampaigns }),
    } as Response)

    const { fetchCampaigns, campaigns } = useCampaigns()
    await fetchCampaigns()

    expect(fetch).toHaveBeenCalledWith('http://localhost:3333/api/v2/mj/campaigns', {
      credentials: 'include',
    })
    expect(campaigns.value).toEqual(mockCampaigns)
  })

  test('fetchCampaigns() should handle errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { fetchCampaigns } = useCampaigns()

    await expect(fetchCampaigns()).rejects.toThrow('Failed to fetch campaigns')

    consoleErrorSpy.mockRestore()
  })

  test('fetchCampaigns() should set loading state correctly', async () => {
    const mockCampaigns = [createMockCampaign()]
    let resolveFetch: ((value: Response) => void) | undefined
    const fetchPromise = new Promise<Response>((resolve) => {
      resolveFetch = resolve
    })

    vi.mocked(fetch).mockReturnValueOnce(fetchPromise as Promise<Response>)

    const { fetchCampaigns, loading } = useCampaigns()
    const fetchPromiseResult = fetchCampaigns()

    // Loading should be true while fetching
    expect(loading.value).toBe(true)

    // Resolve the fetch
    if (resolveFetch) {
      resolveFetch({
        ok: true,
        json: async () => ({ data: mockCampaigns }),
      } as Response)
    }

    await fetchPromiseResult

    // Loading should be false after fetch completes
    expect(loading.value).toBe(false)
  })

  test('createCampaign() should create new campaign and add to list', async () => {
    const newCampaign = createMockCampaign({
      name: 'New Campaign',
      description: 'Test description',
    })

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: newCampaign }),
    } as Response)

    const { createCampaign, campaigns } = useCampaigns()
    const result = await createCampaign({
      name: 'New Campaign',
      description: 'Test description',
    })

    expect(fetch).toHaveBeenCalledWith('http://localhost:3333/api/v2/mj/campaigns', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'New Campaign',
        description: 'Test description',
      }),
    })
    expect(result).toEqual(newCampaign)
    expect(campaigns.value).toContainEqual(newCampaign)
  })

  test('createCampaign() should handle errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
    } as Response)

    const { createCampaign } = useCampaigns()

    await expect(createCampaign({ name: 'Test' })).rejects.toThrow('Failed to create campaign')
  })

  test('updateCampaign() should update existing campaign', async () => {
    const existingCampaign = createMockCampaign({
      id: '1',
      name: 'Old Name',
    })
    const updatedCampaign = createMockCampaign({
      id: '1',
      name: 'New Name',
    })

    // First load campaigns
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [existingCampaign] }),
    } as Response)

    const { fetchCampaigns, updateCampaign, campaigns } = useCampaigns()
    await fetchCampaigns()

    // Then update
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedCampaign }),
    } as Response)

    const result = await updateCampaign('1', { name: 'New Name' })

    expect(fetch).toHaveBeenCalledWith('http://localhost:3333/api/v2/mj/campaigns/1', {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    })
    expect(result).toEqual(updatedCampaign)
    expect(campaigns.value[0]!.name).toBe('New Name')
  })

  test('updateCampaign() should handle errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response)

    const { updateCampaign } = useCampaigns()

    await expect(updateCampaign('1', { name: 'Test' })).rejects.toThrow('Failed to update campaign')
  })

  test('deleteCampaign() should remove campaign from list', async () => {
    const campaign1 = createMockCampaign({ id: '1', name: 'Campaign 1' })
    const campaign2 = createMockCampaign({ id: '2', name: 'Campaign 2' })

    // First load campaigns
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [campaign1, campaign2] }),
    } as Response)

    const { fetchCampaigns, deleteCampaign, campaigns } = useCampaigns()
    await fetchCampaigns()

    // Then delete
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
    } as Response)

    await deleteCampaign('1')

    expect(fetch).toHaveBeenCalledWith('http://localhost:3333/api/v2/mj/campaigns/1', {
      method: 'DELETE',
      credentials: 'include',
    })
    expect(campaigns.value).toHaveLength(1)
    expect(campaigns.value[0]!.id).toBe('2')
  })

  test('deleteCampaign() should clear selectedCampaign if deleted', async () => {
    const campaign = createMockCampaign({ id: '1' })

    // First load campaigns
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [campaign] }),
    } as Response)

    const { fetchCampaigns, deleteCampaign, selectedCampaign } = useCampaigns()
    await fetchCampaigns()

    // Select the campaign
    selectedCampaign.value = campaign

    // Then delete
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
    } as Response)

    await deleteCampaign('1')

    expect(selectedCampaign.value).toBeNull()
  })

  test('deleteCampaign() should handle errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 403,
    } as Response)

    const { deleteCampaign } = useCampaigns()

    await expect(deleteCampaign('1')).rejects.toThrow('Failed to delete campaign')
  })

  test('searchTwitchStreamers() should search and return streamers', async () => {
    const mockStreamers = [
      {
        twitchUserId: '123',
        twitchUsername: 'streamer1',
        twitchDisplayName: 'Streamer 1',
        profileImageUrl: 'https://example.com/1.png',
      },
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockStreamers }),
    } as Response)

    const { searchTwitchStreamers } = useCampaigns()
    const result = await searchTwitchStreamers('streamer1')

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3333/api/v2/mj/dashboards/search?q=streamer1',
      { credentials: 'include' }
    )
    expect(result).toEqual([
      {
        id: '123',
        login: 'streamer1',
        displayName: 'Streamer 1',
        profileImageUrl: 'https://example.com/1.png',
      },
    ])
  })

  describe('getCampaignMembers', () => {
    test('should fetch and return campaign members', async () => {
      const mockMembers = [
        {
          id: 'member-1',
          status: 'ACTIVE',
          isOwner: false,
          streamer: {
            id: 's1',
            twitchUserId: '123',
            twitchDisplayName: 'Streamer1',
            twitchLogin: 'streamer1',
          },
          invitedAt: '2024-01-01T00:00:00Z',
          acceptedAt: '2024-01-02T00:00:00Z',
          pollAuthorizationGrantedAt: null,
          pollAuthorizationExpiresAt: null,
          isPollAuthorized: false,
          authorizationRemainingSeconds: null,
        },
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { members: mockMembers } }),
      } as Response)

      const { getCampaignMembers } = useCampaigns()
      const result = await getCampaignMembers('campaign-1')

      expect(fetch).toHaveBeenCalledWith('http://localhost:3333/api/v2/mj/campaigns/campaign-1', {
        credentials: 'include',
      })
      expect(result).toEqual(mockMembers)
    })

    test('should handle errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      const { getCampaignMembers } = useCampaigns()

      await expect(getCampaignMembers('invalid-id')).rejects.toThrow(
        'Failed to fetch campaign members'
      )
    })
  })

  describe('getCampaignDetails', () => {
    test('should fetch and return campaign details with members', async () => {
      const mockResponse = {
        id: 'campaign-1',
        name: 'Test Campaign',
        description: 'Description',
        memberCount: 3,
        activeMemberCount: 2,
        createdAt: '2024-01-01T00:00:00Z',
        members: [
          { id: 'm1', status: 'ACTIVE' },
          { id: 'm2', status: 'PENDING' },
        ],
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse }),
      } as Response)

      const { getCampaignDetails } = useCampaigns()
      const result = await getCampaignDetails('campaign-1')

      expect(result.campaign).toEqual({
        id: 'campaign-1',
        name: 'Test Campaign',
        description: 'Description',
        memberCount: 3,
        activeMemberCount: 2,
        createdAt: '2024-01-01T00:00:00Z',
        vttConnection: null,
      })
      expect(result.members).toEqual(mockResponse.members)
    })

    test('should handle errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      const { getCampaignDetails } = useCampaigns()

      await expect(getCampaignDetails('campaign-1')).rejects.toThrow(
        'Failed to fetch campaign details'
      )
    })
  })

  describe('inviteStreamer', () => {
    test('should invite streamer by streamer_id', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      } as Response)

      const { inviteStreamer } = useCampaigns()
      await inviteStreamer('campaign-1', { streamer_id: 'streamer-123' })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/mj/campaigns/campaign-1/invite',
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ streamer_id: 'streamer-123' }),
        }
      )
    })

    test('should invite streamer by twitch info', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      } as Response)

      const { inviteStreamer } = useCampaigns()
      await inviteStreamer('campaign-1', {
        twitch_user_id: '123456',
        twitch_login: 'newstreamer',
        twitch_display_name: 'NewStreamer',
        profile_image_url: 'https://example.com/img.png',
      })

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/mj/campaigns/campaign-1/invite',
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            twitch_user_id: '123456',
            twitch_login: 'newstreamer',
            twitch_display_name: 'NewStreamer',
            profile_image_url: 'https://example.com/img.png',
          }),
        }
      )
    })

    test('should handle errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
      } as Response)

      const { inviteStreamer } = useCampaigns()

      await expect(inviteStreamer('campaign-1', { streamer_id: 'invalid' })).rejects.toThrow(
        'Failed to invite streamer'
      )
    })
  })

  describe('removeMember', () => {
    test('should remove member from campaign', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
      } as Response)

      const { removeMember } = useCampaigns()
      await removeMember('campaign-1', 'member-1')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/mj/campaigns/campaign-1/members/member-1',
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )
    })

    test('should handle errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
      } as Response)

      const { removeMember } = useCampaigns()

      await expect(removeMember('campaign-1', 'member-1')).rejects.toThrow(
        'Failed to remove member'
      )
    })
  })

  describe('fetchInvitations', () => {
    test('should fetch pending invitations for streamer', async () => {
      const mockInvitations = [
        {
          id: 'inv-1',
          campaignId: 'c1',
          campaignName: 'Campaign 1',
          invitedAt: '2024-01-01T00:00:00Z',
          gmName: 'GameMaster',
        },
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockInvitations }),
      } as Response)

      const { fetchInvitations } = useCampaigns()
      const result = await fetchInvitations()

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/dashboard/campaigns/invitations',
        { credentials: 'include' }
      )
      expect(result).toEqual(mockInvitations)
    })

    test('should handle errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response)

      const { fetchInvitations } = useCampaigns()

      await expect(fetchInvitations()).rejects.toThrow('Failed to fetch invitations')
    })
  })

  describe('acceptInvitation', () => {
    test('should accept invitation', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
      } as Response)

      const { acceptInvitation } = useCampaigns()
      await acceptInvitation('inv-1')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/dashboard/campaigns/invitations/inv-1/accept',
        {
          method: 'POST',
          credentials: 'include',
        }
      )
    })

    test('should handle errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      const { acceptInvitation } = useCampaigns()

      await expect(acceptInvitation('invalid-inv')).rejects.toThrow('Failed to accept invitation')
    })
  })

  describe('declineInvitation', () => {
    test('should decline invitation', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
      } as Response)

      const { declineInvitation } = useCampaigns()
      await declineInvitation('inv-1')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/dashboard/campaigns/invitations/inv-1/decline',
        {
          method: 'POST',
          credentials: 'include',
        }
      )
    })

    test('should handle errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      const { declineInvitation } = useCampaigns()

      await expect(declineInvitation('invalid-inv')).rejects.toThrow('Failed to decline invitation')
    })
  })

  describe('fetchActiveCampaigns', () => {
    test('should fetch active campaigns for streamer', async () => {
      const mockCampaigns = [
        createMockCampaign({ id: 'c1', name: 'Active Campaign 1' }),
        createMockCampaign({ id: 'c2', name: 'Active Campaign 2' }),
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockCampaigns }),
      } as Response)

      const { fetchActiveCampaigns } = useCampaigns()
      const result = await fetchActiveCampaigns()

      expect(fetch).toHaveBeenCalledWith('http://localhost:3333/api/v2/dashboard/campaigns', {
        credentials: 'include',
      })
      expect(result).toEqual(mockCampaigns)
    })

    test('should handle errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response)

      const { fetchActiveCampaigns } = useCampaigns()

      await expect(fetchActiveCampaigns()).rejects.toThrow('Failed to fetch active campaigns')
    })
  })

  describe('leaveCampaign', () => {
    test('should leave campaign', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
      } as Response)

      const { leaveCampaign } = useCampaigns()
      await leaveCampaign('campaign-1')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/dashboard/campaigns/campaign-1/leave',
        {
          method: 'POST',
          credentials: 'include',
        }
      )
    })

    test('should handle errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 403,
      } as Response)

      const { leaveCampaign } = useCampaigns()

      await expect(leaveCampaign('campaign-1')).rejects.toThrow('Failed to leave campaign')
    })
  })

  describe('grantAuthorization', () => {
    test('should grant authorization and return expiry info', async () => {
      const mockResponse = {
        expires_at: '2024-01-01T12:00:00Z',
        remaining_seconds: 43200,
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse }),
      } as Response)

      const { grantAuthorization } = useCampaigns()
      const result = await grantAuthorization('campaign-1')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/dashboard/campaigns/campaign-1/authorize',
        {
          method: 'POST',
          credentials: 'include',
        }
      )
      expect(result).toEqual(mockResponse)
    })

    test('should handle errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
      } as Response)

      const { grantAuthorization } = useCampaigns()

      await expect(grantAuthorization('campaign-1')).rejects.toThrow(
        'Failed to grant authorization'
      )
    })
  })

  describe('revokeAuthorization', () => {
    test('should revoke authorization', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
      } as Response)

      const { revokeAuthorization } = useCampaigns()
      await revokeAuthorization('campaign-1')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/dashboard/campaigns/campaign-1/authorize',
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )
    })

    test('should handle errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      const { revokeAuthorization } = useCampaigns()

      await expect(revokeAuthorization('campaign-1')).rejects.toThrow(
        'Failed to revoke authorization'
      )
    })
  })

  describe('getAuthorizationStatus', () => {
    test('should fetch authorization status for all campaigns', async () => {
      const mockStatus = [
        {
          campaign_id: 'c1',
          campaignName: 'Campaign 1',
          isOwner: false,
          is_authorized: true,
          expires_at: '2024-01-01T12:00:00Z',
          remaining_seconds: 3600,
        },
        {
          campaign_id: 'c2',
          campaignName: 'Campaign 2',
          isOwner: true,
          is_authorized: false,
          expires_at: null,
          remaining_seconds: null,
        },
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockStatus }),
      } as Response)

      const { getAuthorizationStatus } = useCampaigns()
      const result = await getAuthorizationStatus()

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/dashboard/campaigns/authorization-status',
        { credentials: 'include' }
      )
      expect(result).toEqual(mockStatus)
    })

    test('should handle errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
      } as Response)

      const { getAuthorizationStatus } = useCampaigns()

      await expect(getAuthorizationStatus()).rejects.toThrow('Failed to fetch authorization status')
    })
  })

  describe('getLiveStatus', () => {
    test('should fetch live status for campaign members', async () => {
      const mockLiveStatus = {
        'streamer-1': {
          isLive: true,
          viewerCount: 1500,
          gameName: 'Just Chatting',
          title: 'Live Stream',
        },
        'streamer-2': {
          isLive: false,
          viewerCount: 0,
          gameName: null,
          title: null,
        },
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockLiveStatus }),
      } as Response)

      const { getLiveStatus } = useCampaigns()
      const result = await getLiveStatus('campaign-1')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/mj/campaigns/campaign-1/live-status',
        { credentials: 'include' }
      )
      expect(result).toEqual(mockLiveStatus)
    })

    test('should handle errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      const { getLiveStatus } = useCampaigns()

      await expect(getLiveStatus('campaign-1')).rejects.toThrow('Failed to fetch live status')
    })
  })

  describe('searchTwitchStreamers - edge cases', () => {
    test('should handle errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)

      const { searchTwitchStreamers } = useCampaigns()

      await expect(searchTwitchStreamers('test')).rejects.toThrow('Failed to search streamers')
    })

    test('should encode special characters in query', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response)

      const { searchTwitchStreamers } = useCampaigns()
      await searchTwitchStreamers('test user&special')

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3333/api/v2/mj/dashboards/search?q=test%20user%26special',
        { credentials: 'include' }
      )
    })
  })
})
