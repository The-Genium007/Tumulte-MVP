import { test } from '@japa/runner'
import type CampaignMembership from '#models/campaign_membership'
import type { DateTime } from 'luxon'
import CampaignMembershipRepository from '#repositories/campaign_membership_repository'

test.group('CampaignMembershipRepository - findByCampaignAndStreamer', () => {
  let repository: CampaignMembershipRepository
  let mockCampaignMembershipModel: any
  let mockQueryResults: Partial<CampaignMembership>[]

  test.group.each.setup(() => {
    mockQueryResults = []

    mockCampaignMembershipModel = {
      query: () => ({
        where: function (field: string, value: string) {
          mockQueryResults = mockQueryResults.filter((m: any) => m[field] === value)
          return this
        },
        first: async () => mockQueryResults[0] || null,
      }),
    }

    repository = new CampaignMembershipRepository()
    ;(repository as any).campaignMembershipModel = mockCampaignMembershipModel
  })

  test('should find membership by campaign and streamer', async ({ assert }) => {
    const mockMembership = {
      id: 'membership-123',
      campaignId: 'campaign-123',
      streamerId: 'streamer-123',
      status: 'ACTIVE',
    } as CampaignMembership

    mockQueryResults = [mockMembership]

    const result = await repository.findByCampaignAndStreamer('campaign-123', 'streamer-123')

    assert.equal(result, mockMembership)
    assert.equal(result?.campaignId, 'campaign-123')
    assert.equal(result?.streamerId, 'streamer-123')
  })

  test('should return null if membership not found', async ({ assert }) => {
    mockQueryResults = []

    const result = await repository.findByCampaignAndStreamer('campaign-123', 'streamer-999')

    assert.isNull(result)
  })
})

test.group('CampaignMembershipRepository - findByCampaign', () => {
  let repository: CampaignMembershipRepository
  let mockCampaignMembershipModel: any
  let mockQueryResults: Partial<CampaignMembership>[]
  let preloadCalled: string[] = []

  test.group.each.setup(() => {
    mockQueryResults = []
    preloadCalled = []

    mockCampaignMembershipModel = {
      query: () => ({
        where: function (field: string, value: string) {
          mockQueryResults = mockQueryResults.filter((m: any) => m[field] === value)
          return this
        },
        preload: function (relation: string) {
          preloadCalled.push(relation)
          return this
        },
        exec: async () => mockQueryResults,
      }),
    }

    repository = new CampaignMembershipRepository()
    ;(repository as any).campaignMembershipModel = mockCampaignMembershipModel
  })

  test('should return all memberships for a campaign', async ({ assert }) => {
    const mockMemberships = [
      { id: 'membership-1', campaignId: 'campaign-123', status: 'ACTIVE' },
      { id: 'membership-2', campaignId: 'campaign-123', status: 'PENDING' },
      { id: 'membership-3', campaignId: 'campaign-123', status: 'ACTIVE' },
    ] as CampaignMembership[]

    mockQueryResults = mockMemberships

    const result = await repository.findByCampaign('campaign-123')

    assert.lengthOf(result, 3)
    assert.include(preloadCalled, 'streamer')
  })

  test('should preload streamer relation', async ({ assert }) => {
    const mockMemberships = [
      {
        id: 'membership-1',
        campaignId: 'campaign-123',
        streamer: { id: 'streamer-1', twitchLogin: 'streamer1' },
      },
    ] as unknown as CampaignMembership[]

    mockQueryResults = mockMemberships

    const result = await repository.findByCampaign('campaign-123')

    assert.lengthOf(result, 1)
    assert.include(preloadCalled, 'streamer')
  })

  test('should return empty array if no memberships found', async ({ assert }) => {
    mockQueryResults = []

    const result = await repository.findByCampaign('campaign-999')

    assert.lengthOf(result, 0)
  })
})

test.group('CampaignMembershipRepository - findActiveByCampaign', () => {
  let repository: CampaignMembershipRepository
  let mockCampaignMembershipModel: any
  let mockQueryResults: Partial<CampaignMembership>[]
  let preloadCalled: string[] = []

  test.group.each.setup(() => {
    mockQueryResults = []
    preloadCalled = []

    mockCampaignMembershipModel = {
      query: () => ({
        where: function (field: string, value: string) {
          mockQueryResults = mockQueryResults.filter((m: any) => m[field] === value)
          return this
        },
        preload: function (relation: string) {
          preloadCalled.push(relation)
          return this
        },
        exec: async () => mockQueryResults,
      }),
    }

    repository = new CampaignMembershipRepository()
    ;(repository as any).campaignMembershipModel = mockCampaignMembershipModel
  })

  test('should return only ACTIVE memberships', async ({ assert }) => {
    const mockMemberships = [
      { id: 'membership-1', campaignId: 'campaign-123', status: 'ACTIVE' },
      { id: 'membership-2', campaignId: 'campaign-123', status: 'ACTIVE' },
    ] as CampaignMembership[]

    mockQueryResults = mockMemberships

    const result = await repository.findActiveByCampaign('campaign-123')

    assert.lengthOf(result, 2)
    assert.equal(result[0].status, 'ACTIVE')
    assert.equal(result[1].status, 'ACTIVE')
  })

  test('should exclude PENDING memberships', async ({ assert }) => {
    mockQueryResults = []

    const result = await repository.findActiveByCampaign('campaign-123')

    assert.lengthOf(result, 0)
  })

  test('should preload streamer relation', async ({ assert }) => {
    const mockMemberships = [
      { id: 'membership-1', campaignId: 'campaign-123', status: 'ACTIVE' },
    ] as CampaignMembership[]

    mockQueryResults = mockMemberships

    await repository.findActiveByCampaign('campaign-123')

    assert.include(preloadCalled, 'streamer')
  })
})

test.group('CampaignMembershipRepository - findAuthorizedByCampaign', () => {
  let repository: CampaignMembershipRepository
  let mockCampaignMembershipModel: any
  let mockQueryResults: Partial<CampaignMembership>[]
  let preloadCalled: string[] = []
  let whereNullCalled = false
  let orWhereRawCalled = false

  test.group.each.setup(() => {
    mockQueryResults = []
    preloadCalled = []
    whereNullCalled = false
    orWhereRawCalled = false

    mockCampaignMembershipModel = {
      query: () => ({
        where: function (field: string, value: string) {
          mockQueryResults = mockQueryResults.filter((m: any) => m[field] === value)
          return this
        },
        whereNull: function (field: string) {
          whereNullCalled = true
          return this
        },
        orWhereRaw: function (raw: string) {
          orWhereRawCalled = true
          return this
        },
        preload: function (relation: string) {
          preloadCalled.push(relation)
          return this
        },
        exec: async () => mockQueryResults,
      }),
    }

    repository = new CampaignMembershipRepository()
    ;(repository as any).campaignMembershipModel = mockCampaignMembershipModel
  })

  test('should return memberships with null pollAuthorizationExpiresAt (permanent)', async ({
    assert,
  }) => {
    const mockMemberships = [
      {
        id: 'membership-1',
        campaignId: 'campaign-123',
        status: 'ACTIVE',
        pollAuthorizationExpiresAt: null,
      },
    ] as CampaignMembership[]

    mockQueryResults = mockMemberships

    const result = await repository.findAuthorizedByCampaign('campaign-123')

    assert.lengthOf(result, 1)
    assert.isTrue(whereNullCalled)
  })

  test('should return memberships with future expiry date', async ({ assert }) => {
    const futureDate = new Date(Date.now() + 3600000) // +1 hour
    const mockMemberships = [
      {
        id: 'membership-2',
        campaignId: 'campaign-123',
        status: 'ACTIVE',
        pollAuthorizationExpiresAt: futureDate as unknown as DateTime,
      },
    ] as CampaignMembership[]

    mockQueryResults = mockMemberships

    const result = await repository.findAuthorizedByCampaign('campaign-123')

    assert.lengthOf(result, 1)
    assert.isTrue(orWhereRawCalled)
  })

  test('should preload streamer relation', async ({ assert }) => {
    mockQueryResults = []

    await repository.findAuthorizedByCampaign('campaign-123')

    assert.include(preloadCalled, 'streamer')
  })

  test('should return empty array if no authorized memberships', async ({ assert }) => {
    mockQueryResults = []

    const result = await repository.findAuthorizedByCampaign('campaign-123')

    assert.lengthOf(result, 0)
  })
})

test.group('CampaignMembershipRepository - countByCampaign', () => {
  let repository: CampaignMembershipRepository
  let mockCampaignMembershipModel: any
  let mockQueryResults: Partial<CampaignMembership>[]

  test.group.each.setup(() => {
    mockQueryResults = []

    mockCampaignMembershipModel = {
      query: () => ({
        where: function (field: string, value: string) {
          mockQueryResults = mockQueryResults.filter((m: any) => m[field] === value)
          return this
        },
        count: async () => mockQueryResults.length,
      }),
    }

    repository = new CampaignMembershipRepository()
    ;(repository as any).campaignMembershipModel = mockCampaignMembershipModel
  })

  test('should count all memberships for a campaign', async ({ assert }) => {
    mockQueryResults = [
      { id: 'membership-1' },
      { id: 'membership-2' },
      { id: 'membership-3' },
    ] as CampaignMembership[]

    const result = await repository.countByCampaign('campaign-123')

    assert.equal(result, 3)
  })

  test('should return zero if no memberships', async ({ assert }) => {
    mockQueryResults = []

    const result = await repository.countByCampaign('campaign-999')

    assert.equal(result, 0)
  })
})

test.group('CampaignMembershipRepository - countActiveByCampaign', () => {
  let repository: CampaignMembershipRepository
  let mockCampaignMembershipModel: any
  let mockQueryResults: Partial<CampaignMembership>[]

  test.group.each.setup(() => {
    mockQueryResults = []

    mockCampaignMembershipModel = {
      query: () => ({
        where: function (field: string, value: string) {
          mockQueryResults = mockQueryResults.filter((m: any) => m[field] === value)
          return this
        },
        count: async () => mockQueryResults.length,
      }),
    }

    repository = new CampaignMembershipRepository()
    ;(repository as any).campaignMembershipModel = mockCampaignMembershipModel
  })

  test('should count only ACTIVE memberships', async ({ assert }) => {
    mockQueryResults = [{ id: 'membership-1' }, { id: 'membership-2' }] as CampaignMembership[]

    const result = await repository.countActiveByCampaign('campaign-123')

    assert.equal(result, 2)
  })

  test('should return zero if no active memberships', async ({ assert }) => {
    mockQueryResults = []

    const result = await repository.countActiveByCampaign('campaign-123')

    assert.equal(result, 0)
  })
})

test.group('CampaignMembershipRepository - create', () => {
  let repository: CampaignMembershipRepository
  let mockCampaignMembershipModel: any
  let createCalled = false

  test.group.each.setup(() => {
    createCalled = false

    mockCampaignMembershipModel = {
      create: async (data: any) => {
        createCalled = true
        return {
          id: `membership-${Date.now()}`,
          ...data,
          load: async () => {},
        } as unknown as CampaignMembership
      },
    }

    repository = new CampaignMembershipRepository()
    ;(repository as any).campaignMembershipModel = mockCampaignMembershipModel
  })

  test('should create membership with PENDING status by default', async ({ assert }) => {
    const result = await repository.create('campaign-123', 'streamer-123')

    assert.isTrue(createCalled)
    assert.isDefined(result.id)
  })

  test('should create membership with custom status', async ({ assert }) => {
    mockCampaignMembershipModel.create = async (data: any) => {
      assert.equal(data.status, 'ACTIVE')
      return {
        id: 'membership-new',
        status: data.status,
        load: async () => {},
      } as unknown as CampaignMembership
    }

    await repository.create('campaign-123', 'streamer-123', 'ACTIVE')
  })

  test('should set campaignId and streamerId correctly', async ({ assert }) => {
    mockCampaignMembershipModel.create = async (data: any) => {
      assert.equal(data.campaignId, 'campaign-456')
      assert.equal(data.streamerId, 'streamer-789')
      return {
        id: 'membership-new',
        campaignId: data.campaignId,
        streamerId: data.streamerId,
        load: async () => {},
      } as unknown as CampaignMembership
    }

    await repository.create('campaign-456', 'streamer-789')
  })
})

test.group('CampaignMembershipRepository - update', () => {
  let repository: CampaignMembershipRepository
  let mergeCalled = false
  let saveCalled = false

  test.group.each.setup(() => {
    mergeCalled = false
    saveCalled = false

    repository = new CampaignMembershipRepository()
  })

  test('should update membership fields', async ({ assert }) => {
    const mockMembership = {
      id: 'membership-123',
      status: 'PENDING',
      merge: (data: any) => {
        mergeCalled = true
        Object.assign(mockMembership, data)
      },
      save: async () => {
        saveCalled = true
      },
    } as unknown as CampaignMembership

    await repository.update(mockMembership, { status: 'ACTIVE' })

    assert.isTrue(mergeCalled)
    assert.isTrue(saveCalled)
  })

  test('should update status from PENDING to ACTIVE', async ({ assert }) => {
    const mockMembership = {
      id: 'membership-123',
      status: 'PENDING',
      merge: (data: any) => {
        Object.assign(mockMembership, data)
      },
      save: async () => {},
    } as unknown as CampaignMembership

    await repository.update(mockMembership, { status: 'ACTIVE' })

    assert.equal(mockMembership.status, 'ACTIVE')
  })
})

test.group('CampaignMembershipRepository - delete', () => {
  let repository: CampaignMembershipRepository
  let deleteCalled = false

  test.group.each.setup(() => {
    deleteCalled = false

    repository = new CampaignMembershipRepository()
  })

  test('should delete membership', async ({ assert }) => {
    const mockMembership = {
      id: 'membership-123',
      delete: async () => {
        deleteCalled = true
      },
    } as unknown as CampaignMembership

    await repository.delete(mockMembership)

    assert.isTrue(deleteCalled)
  })
})

test.group('CampaignMembershipRepository - grantPollAuthorization', () => {
  let repository: CampaignMembershipRepository
  let mergeCalled = false
  let saveCalled = false

  test.group.each.setup(() => {
    mergeCalled = false
    saveCalled = false

    repository = new CampaignMembershipRepository()
  })

  test('should grant 12-hour authorization window', async ({ assert }) => {
    const mockMembership = {
      id: 'membership-123',
      pollAuthorizationExpiresAt: null,
      merge: (data: any) => {
        mergeCalled = true
        Object.assign(mockMembership, data)
      },
      save: async () => {
        saveCalled = true
      },
    } as unknown as CampaignMembership

    const expiresAt = await repository.grantPollAuthorization(mockMembership)

    assert.isTrue(mergeCalled)
    assert.isTrue(saveCalled)
    assert.isDefined(expiresAt)
  })

  test('should set expiry to current time + 12 hours', async ({ assert }) => {
    const mockMembership = {
      id: 'membership-123',
      pollAuthorizationExpiresAt: null,
      merge: (data: any) => {
        Object.assign(mockMembership, data)
      },
      save: async () => {},
    } as unknown as CampaignMembership

    const expiresAt = await repository.grantPollAuthorization(mockMembership)

    assert.isDefined(expiresAt)
    assert.isDefined(mockMembership.pollAuthorizationExpiresAt)
  })

  test('should extend existing authorization', async ({ assert }) => {
    const oldExpiry = new Date(Date.now() + 3600000) // +1 hour
    const mockMembership = {
      id: 'membership-123',
      pollAuthorizationExpiresAt: oldExpiry as unknown as DateTime,
      merge: (data: any) => {
        Object.assign(mockMembership, data)
      },
      save: async () => {},
    } as unknown as CampaignMembership

    const expiresAt = await repository.grantPollAuthorization(mockMembership)

    assert.isDefined(expiresAt)
    assert.notEqual(mockMembership.pollAuthorizationExpiresAt, oldExpiry)
  })
})

test.group('CampaignMembershipRepository - grantPermanentPollAuthorization', () => {
  let repository: CampaignMembershipRepository
  let mergeCalled = false
  let saveCalled = false

  test.group.each.setup(() => {
    mergeCalled = false
    saveCalled = false

    repository = new CampaignMembershipRepository()
  })

  test('should grant permanent authorization (100 years)', async ({ assert }) => {
    const mockMembership = {
      id: 'membership-123',
      pollAuthorizationExpiresAt: null,
      merge: (data: any) => {
        mergeCalled = true
        Object.assign(mockMembership, data)
      },
      save: async () => {
        saveCalled = true
      },
    } as unknown as CampaignMembership

    const expiresAt = await repository.grantPermanentPollAuthorization(mockMembership)

    assert.isTrue(mergeCalled)
    assert.isTrue(saveCalled)
    assert.isDefined(expiresAt)
  })

  test('should set expiry to current time + 100 years', async ({ assert }) => {
    const mockMembership = {
      id: 'membership-123',
      pollAuthorizationExpiresAt: null,
      merge: (data: any) => {
        Object.assign(mockMembership, data)
      },
      save: async () => {},
    } as unknown as CampaignMembership

    const expiresAt = await repository.grantPermanentPollAuthorization(mockMembership)

    assert.isDefined(expiresAt)
    assert.isDefined(mockMembership.pollAuthorizationExpiresAt)
  })
})

test.group('CampaignMembershipRepository - revokePollAuthorization', () => {
  let repository: CampaignMembershipRepository
  let mergeCalled = false
  let saveCalled = false

  test.group.each.setup(() => {
    mergeCalled = false
    saveCalled = false

    repository = new CampaignMembershipRepository()
  })

  test('should revoke authorization by setting expiry to null', async ({ assert }) => {
    const futureDate = new Date(Date.now() + 43200000) // +12 hours
    const mockMembership = {
      id: 'membership-123',
      pollAuthorizationExpiresAt: futureDate as unknown as DateTime,
      merge: (data: any) => {
        mergeCalled = true
        Object.assign(mockMembership, data)
      },
      save: async () => {
        saveCalled = true
      },
    } as unknown as CampaignMembership

    await repository.revokePollAuthorization(mockMembership)

    assert.isTrue(mergeCalled)
    assert.isTrue(saveCalled)
    assert.isNull(mockMembership.pollAuthorizationExpiresAt)
  })

  test('should revoke even if already null', async ({ assert }) => {
    const mockMembership = {
      id: 'membership-123',
      pollAuthorizationExpiresAt: null,
      merge: (data: any) => {
        mergeCalled = true
        Object.assign(mockMembership, data)
      },
      save: async () => {
        saveCalled = true
      },
    } as unknown as CampaignMembership

    await repository.revokePollAuthorization(mockMembership)

    assert.isTrue(mergeCalled)
    assert.isTrue(saveCalled)
    assert.isNull(mockMembership.pollAuthorizationExpiresAt)
  })
})
