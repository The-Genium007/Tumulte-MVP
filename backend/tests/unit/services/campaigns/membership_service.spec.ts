import { test } from '@japa/runner'
import { MembershipService } from '#services/campaigns/membership_service'
import type { campaignMembership as CampaignMembership } from '#models/campaign_membership'
import { DateTime } from 'luxon'

// Mock CampaignMembership model
let mockMemberships: Map<string, CampaignMembership> = new Map()
let mockQueryResults: CampaignMembership[] = []

const mockCampaignMembershipModel = {
  query: () => ({
    where: function (field: string, value: string) {
      if (field === 'streamerId') {
        mockQueryResults = Array.from(mockMemberships.values()).filter(
          (m: any) => m.streamerId === value
        )
      } else if (field === 'campaignId') {
        mockQueryResults = mockQueryResults.filter((m: any) => m.campaignId === value)
      } else if (field === 'id') {
        mockQueryResults = mockQueryResults.filter((m: any) => m.id === value)
      } else if (field === 'status') {
        mockQueryResults = mockQueryResults.filter((m: any) => m.status === value)
      }
      return this
    },
    first: async () => {
      return mockQueryResults[0] || null
    },
    preload: function (_relation: string) {
      return this
    },
    orderBy: function (_field: string, _direction: string) {
      return this
    },
    exec: async () => mockQueryResults,
  }),
  create: async (data: any) => {
    const membership = {
      id: `membership-${Date.now()}`,
      campaignId: data.campaignId,
      streamerId: data.streamerId,
      status: data.status,
      invitedAt: data.invitedAt,
      acceptedAt: null,
      load: async () => {},
    } as unknown as CampaignMembership
    mockMemberships.set(membership.id, membership)
    return membership
  },
  find: async (id: string) => {
    return mockMemberships.get(id) || null
  },
}

test.group('MembershipService - Invite Streamer', (group) => {
  let service: MembershipService

  group.each.setup(() => {
    mockMemberships.clear()
    mockQueryResults = []
    ;(global as any).CampaignMembership = mockCampaignMembershipModel
    service = new MembershipService()
  })

  test('should invite streamer to campaign', async ({ assert }) => {
    const membership = await service.inviteStreamer('campaign-1', 'streamer-1')

    assert.equal(membership.campaignId, 'campaign-1')
    assert.equal(membership.streamerId, 'streamer-1')
    assert.equal(membership.status, 'PENDING')
    assert.instanceOf(membership.invitedAt, DateTime)
  })

  test('should throw if streamer already invited', async ({ assert }) => {
    const existing = {
      id: 'membership-1',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'PENDING',
    } as any

    mockMemberships.set(existing.id, existing)
    mockQueryResults = [existing]

    await assert.rejects(
      async () => await service.inviteStreamer('campaign-1', 'streamer-1'),
      /Streamer already invited to this campaign/
    )
  })

  test('should create PENDING status by default', async ({ assert }) => {
    const membership = await service.inviteStreamer('campaign-1', 'streamer-1')

    assert.equal(membership.status, 'PENDING')
  })
})

test.group('MembershipService - Accept Invitation', (group) => {
  let service: MembershipService

  group.each.setup(() => {
    mockMemberships.clear()
    mockQueryResults = []
    ;(global as any).CampaignMembership = mockCampaignMembershipModel
    service = new MembershipService()
  })

  test('should accept invitation successfully', async ({ assert }) => {
    const membership = {
      id: 'membership-1',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'PENDING',
      acceptedAt: null,
      save: async function () {
        this.status = 'ACTIVE'
        this.acceptedAt = DateTime.now()
      },
    } as any

    mockMemberships.set(membership.id, membership)

    await service.acceptInvitation('membership-1', 'streamer-1')

    assert.equal(membership.status, 'ACTIVE')
    assert.instanceOf(membership.acceptedAt, DateTime)
  })

  test('should throw if invitation not found', async ({ assert }) => {
    await assert.rejects(
      async () => await service.acceptInvitation('nonexistent', 'streamer-1'),
      /Invitation not found/
    )
  })

  test('should throw if not authorized to accept', async ({ assert }) => {
    const membership = {
      id: 'membership-1',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'PENDING',
    } as any

    mockMemberships.set(membership.id, membership)

    await assert.rejects(
      async () => await service.acceptInvitation('membership-1', 'wrong-streamer'),
      /Not authorized to accept this invitation/
    )
  })

  test('should throw if invitation already processed', async ({ assert }) => {
    const membership = {
      id: 'membership-1',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'ACTIVE',
      acceptedAt: DateTime.now(),
    } as any

    mockMemberships.set(membership.id, membership)

    await assert.rejects(
      async () => await service.acceptInvitation('membership-1', 'streamer-1'),
      /Invitation already processed/
    )
  })
})

test.group('MembershipService - Decline Invitation', (group) => {
  let service: MembershipService

  group.each.setup(() => {
    mockMemberships.clear()
    mockQueryResults = []
    ;(global as any).CampaignMembership = mockCampaignMembershipModel
    service = new MembershipService()
  })

  test('should decline invitation successfully', async ({ assert }) => {
    let deleted = false

    const membership = {
      id: 'membership-1',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'PENDING',
      delete: async () => {
        deleted = true
      },
    } as any

    mockMemberships.set(membership.id, membership)

    await service.declineInvitation('membership-1', 'streamer-1')

    assert.isTrue(deleted)
  })

  test('should throw if invitation not found', async ({ assert }) => {
    await assert.rejects(
      async () => await service.declineInvitation('nonexistent', 'streamer-1'),
      /Invitation not found/
    )
  })

  test('should throw if not authorized to decline', async ({ assert }) => {
    const membership = {
      id: 'membership-1',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'PENDING',
    } as any

    mockMemberships.set(membership.id, membership)

    await assert.rejects(
      async () => await service.declineInvitation('membership-1', 'wrong-streamer'),
      /Not authorized to decline this invitation/
    )
  })
})

test.group('MembershipService - Remove Member', (group) => {
  let service: MembershipService

  group.each.setup(() => {
    mockMemberships.clear()
    mockQueryResults = []
    ;(global as any).CampaignMembership = mockCampaignMembershipModel
    service = new MembershipService()
  })

  test('should remove member if owner', async ({ assert }) => {
    let deleted = false

    const membership = {
      id: 'membership-1',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      campaign: {
        ownerId: 'owner-123',
      },
      delete: async () => {
        deleted = true
      },
    } as any

    mockMemberships.set(membership.id, membership)
    mockQueryResults = [membership]

    await service.removeMember('campaign-1', 'membership-1', 'owner-123')

    assert.isTrue(deleted)
  })

  test('should throw if member not found', async ({ assert }) => {
    await assert.rejects(
      async () => await service.removeMember('campaign-1', 'nonexistent', 'owner-123'),
      /Member not found/
    )
  })

  test('should throw if not owner', async ({ assert }) => {
    const membership = {
      id: 'membership-1',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      campaign: {
        ownerId: 'owner-123',
      },
    } as any

    mockMemberships.set(membership.id, membership)
    mockQueryResults = [membership]

    await assert.rejects(
      async () => await service.removeMember('campaign-1', 'membership-1', 'not-owner'),
      /Not authorized to remove this member/
    )
  })
})

test.group('MembershipService - Leave Campaign', (group) => {
  let service: MembershipService

  group.each.setup(() => {
    mockMemberships.clear()
    mockQueryResults = []
    ;(global as any).CampaignMembership = mockCampaignMembershipModel
    service = new MembershipService()
  })

  test('should leave campaign successfully', async ({ assert }) => {
    let deleted = false

    const membership = {
      id: 'membership-1',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      delete: async () => {
        deleted = true
      },
    } as any

    mockMemberships.set(membership.id, membership)
    mockQueryResults = [membership]

    await service.leaveCampaign('campaign-1', 'streamer-1')

    assert.isTrue(deleted)
  })

  test('should throw if not a member', async ({ assert }) => {
    await assert.rejects(
      async () => await service.leaveCampaign('campaign-1', 'streamer-1'),
      /Not a member of this campaign/
    )
  })
})

test.group('MembershipService - List Invitations', (group) => {
  let service: MembershipService

  group.each.setup(() => {
    mockMemberships.clear()
    mockQueryResults = []
    ;(global as any).CampaignMembership = mockCampaignMembershipModel
    service = new MembershipService()
  })

  test('should return pending invitations for streamer', async ({ assert }) => {
    const membership1 = {
      id: 'membership-1',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'PENDING',
    } as any

    const membership2 = {
      id: 'membership-2',
      campaignId: 'campaign-2',
      streamerId: 'streamer-1',
      status: 'PENDING',
    } as any

    mockMemberships.set(membership1.id, membership1)
    mockMemberships.set(membership2.id, membership2)

    // Mock query chain to return pending invitations
    mockQueryResults = [membership1, membership2]

    const mockModel = {
      query: () => ({
        where: function (_field: string, _value: string) {
          return this
        },
        preload: function (_relation: string) {
          return this
        },
        orderBy: function (_field: string, _direction: string) {
          return mockQueryResults
        },
      }),
    }
    ;(global as any).CampaignMembership = mockModel

    const result = await service.listInvitations('streamer-1')

    assert.lengthOf(result, 2)
  })

  test('should return empty array if no invitations', async ({ assert }) => {
    const mockModel = {
      query: () => ({
        where: function (_field: string, _value: string) {
          return this
        },
        preload: function (_relation: string) {
          return this
        },
        orderBy: function (_field: string, _direction: string) {
          return []
        },
      }),
    }
    ;(global as any).CampaignMembership = mockModel

    const result = await service.listInvitations('streamer-1')

    assert.lengthOf(result, 0)
  })
})

test.group('MembershipService - List Active Campaigns', (group) => {
  let service: MembershipService

  group.each.setup(() => {
    mockMemberships.clear()
    mockQueryResults = []
    service = new MembershipService()
  })

  test('should return active campaigns for streamer', async ({ assert }) => {
    const membership1 = {
      id: 'membership-1',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'ACTIVE',
    } as any

    const membership2 = {
      id: 'membership-2',
      campaignId: 'campaign-2',
      streamerId: 'streamer-1',
      status: 'ACTIVE',
    } as any

    mockQueryResults = [membership1, membership2]

    const mockModel = {
      query: () => ({
        where: function (_field: string, _value: string) {
          return this
        },
        preload: function (_relation: string) {
          return this
        },
        orderBy: function (_field: string, _direction: string) {
          return mockQueryResults
        },
      }),
    }
    ;(global as any).CampaignMembership = mockModel

    const result = await service.listActiveCampaigns('streamer-1')

    assert.lengthOf(result, 2)
  })
})

test.group('MembershipService - Get Active Members', (group) => {
  let service: MembershipService

  group.each.setup(() => {
    mockMemberships.clear()
    mockQueryResults = []
    service = new MembershipService()
  })

  test('should return active members of campaign', async ({ assert }) => {
    const membership1 = {
      id: 'membership-1',
      campaignId: 'campaign-1',
      streamerId: 'streamer-1',
      status: 'ACTIVE',
    } as any

    const membership2 = {
      id: 'membership-2',
      campaignId: 'campaign-1',
      streamerId: 'streamer-2',
      status: 'ACTIVE',
    } as any

    mockQueryResults = [membership1, membership2]

    const mockModel = {
      query: () => ({
        where: function (_field: string, _value: string) {
          return this
        },
        preload: function (_relation: string) {
          return mockQueryResults
        },
      }),
    }
    ;(global as any).CampaignMembership = mockModel

    const result = await service.getActiveMembers('campaign-1')

    assert.lengthOf(result, 2)
  })

  test('should return empty array if no active members', async ({ assert }) => {
    const mockModel = {
      query: () => ({
        where: function (_field: string, _value: string) {
          return this
        },
        preload: function (_relation: string) {
          return []
        },
      }),
    }
    ;(global as any).CampaignMembership = mockModel

    const result = await service.getActiveMembers('campaign-1')

    assert.lengthOf(result, 0)
  })
})
