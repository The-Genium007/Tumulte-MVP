import { test } from '@japa/runner'
import type PollInstance from '#models/poll_instance'
import type PollTemplate from '#models/poll_template'
import type Campaign from '#models/campaign'
import type { DateTime } from 'luxon'
import PollInstanceRepository from '#repositories/poll_instance_repository'

test.group('PollInstanceRepository - findById', () => {
  let repository: PollInstanceRepository
  let mockPollInstanceModel: any
  let mockQueryResults: Partial<PollInstance>[]

  test.group.each.setup(() => {
    mockQueryResults = []

    mockPollInstanceModel = {
      query: () => ({
        where: function (field: string, value: string) {
          mockQueryResults = mockQueryResults.filter((poll: any) => poll[field] === value)
          return this
        },
        first: async () => mockQueryResults[0] || null,
      }),
    }

    repository = new PollInstanceRepository()
    ;(repository as any).pollInstanceModel = mockPollInstanceModel
  })

  test('should find poll instance by id', async ({ assert }) => {
    const mockPollInstance = {
      id: 'poll-123',
      status: 'PENDING',
      question: 'Test question?',
    } as PollInstance

    mockQueryResults = [mockPollInstance]

    const result = await repository.findById('poll-123')

    assert.equal(result, mockPollInstance)
    assert.equal(result?.id, 'poll-123')
  })

  test('should return null if poll instance not found', async ({ assert }) => {
    mockQueryResults = []

    const result = await repository.findById('non-existent')

    assert.isNull(result)
  })
})

test.group('PollInstanceRepository - findByIdWithLinks', () => {
  let repository: PollInstanceRepository
  let mockPollInstanceModel: any
  let mockQueryResults: Partial<PollInstance>[]
  let preloadCalled: string[] = []

  test.group.each.setup(() => {
    mockQueryResults = []
    preloadCalled = []

    mockPollInstanceModel = {
      query: () => ({
        where: function (field: string, value: string) {
          mockQueryResults = mockQueryResults.filter((poll: any) => poll[field] === value)
          return this
        },
        preload: function (relation: string) {
          preloadCalled.push(relation)
          return this
        },
        first: async () => mockQueryResults[0] || null,
      }),
    }

    repository = new PollInstanceRepository()
    ;(repository as any).pollInstanceModel = mockPollInstanceModel
  })

  test('should find poll instance with channelLinks preloaded', async ({ assert }) => {
    const mockPollInstance = {
      id: 'poll-123',
      channelLinks: [
        { id: 'link-1', twitchPollId: 'twitch-1' },
        { id: 'link-2', twitchPollId: 'twitch-2' },
      ],
    } as unknown as PollInstance

    mockQueryResults = [mockPollInstance]

    const result = await repository.findByIdWithLinks('poll-123')

    assert.equal(result, mockPollInstance)
    assert.lengthOf(result?.channelLinks || [], 2)
    assert.include(preloadCalled, 'channelLinks')
  })

  test('should preload nested streamer relation', async ({ assert }) => {
    const mockPollInstance = {
      id: 'poll-123',
      channelLinks: [
        {
          id: 'link-1',
          streamer: { id: 'streamer-1', twitchLogin: 'streamer1' },
        },
      ],
    } as unknown as PollInstance

    mockQueryResults = [mockPollInstance]

    const result = await repository.findByIdWithLinks('poll-123')

    assert.equal(result, mockPollInstance)
    assert.include(preloadCalled, 'channelLinks')
  })
})

test.group('PollInstanceRepository - findByCampaign', () => {
  let repository: PollInstanceRepository
  let mockPollInstanceModel: any
  let mockQueryResults: Partial<PollInstance>[]

  test.group.each.setup(() => {
    mockQueryResults = []

    mockPollInstanceModel = {
      query: () => ({
        where: function (field: string, value: string) {
          mockQueryResults = mockQueryResults.filter((poll: any) => poll[field] === value)
          return this
        },
        exec: async () => mockQueryResults,
      }),
    }

    repository = new PollInstanceRepository()
    ;(repository as any).pollInstanceModel = mockPollInstanceModel
  })

  test('should return all poll instances for a campaign', async ({ assert }) => {
    const mockPolls = [
      { id: 'poll-1', campaignId: 'campaign-123' },
      { id: 'poll-2', campaignId: 'campaign-123' },
    ] as PollInstance[]

    mockQueryResults = mockPolls

    const result = await repository.findByCampaign('campaign-123')

    assert.lengthOf(result, 2)
    assert.equal(result[0].id, 'poll-1')
    assert.equal(result[1].id, 'poll-2')
  })

  test('should return empty array if no polls found', async ({ assert }) => {
    mockQueryResults = []

    const result = await repository.findByCampaign('campaign-456')

    assert.lengthOf(result, 0)
  })
})

test.group('PollInstanceRepository - findRunningByCampaign', () => {
  let repository: PollInstanceRepository
  let mockPollInstanceModel: any
  let mockQueryResults: Partial<PollInstance>[]

  test.group.each.setup(() => {
    mockQueryResults = []

    mockPollInstanceModel = {
      query: () => ({
        where: function (field: string, value: string) {
          mockQueryResults = mockQueryResults.filter((poll: any) => poll[field] === value)
          return this
        },
        exec: async () => mockQueryResults,
      }),
    }

    repository = new PollInstanceRepository()
    ;(repository as any).pollInstanceModel = mockPollInstanceModel
  })

  test('should return only RUNNING polls for a campaign', async ({ assert }) => {
    const mockPolls = [
      { id: 'poll-1', campaignId: 'campaign-123', status: 'RUNNING' },
      { id: 'poll-2', campaignId: 'campaign-123', status: 'RUNNING' },
    ] as PollInstance[]

    mockQueryResults = mockPolls

    const result = await repository.findRunningByCampaign('campaign-123')

    assert.lengthOf(result, 2)
    assert.equal(result[0].status, 'RUNNING')
    assert.equal(result[1].status, 'RUNNING')
  })

  test('should exclude PENDING and ENDED polls', async ({ assert }) => {
    mockQueryResults = []

    const result = await repository.findRunningByCampaign('campaign-123')

    assert.lengthOf(result, 0)
  })
})

test.group('PollInstanceRepository - findByStatus', () => {
  let repository: PollInstanceRepository
  let mockPollInstanceModel: any
  let mockQueryResults: Partial<PollInstance>[]

  test.group.each.setup(() => {
    mockQueryResults = []

    mockPollInstanceModel = {
      query: () => ({
        where: function (field: string, value: string) {
          mockQueryResults = mockQueryResults.filter((poll: any) => poll[field] === value)
          return this
        },
        exec: async () => mockQueryResults,
      }),
    }

    repository = new PollInstanceRepository()
    ;(repository as any).pollInstanceModel = mockPollInstanceModel
  })

  test('should return polls with RUNNING status', async ({ assert }) => {
    const mockPolls = [
      { id: 'poll-1', status: 'RUNNING' },
      { id: 'poll-2', status: 'RUNNING' },
    ] as PollInstance[]

    mockQueryResults = mockPolls

    const result = await repository.findByStatus('RUNNING')

    assert.lengthOf(result, 2)
    assert.equal(result[0].status, 'RUNNING')
  })

  test('should return polls with ENDED status', async ({ assert }) => {
    const mockPolls = [{ id: 'poll-3', status: 'ENDED' }] as PollInstance[]

    mockQueryResults = mockPolls

    const result = await repository.findByStatus('ENDED')

    assert.lengthOf(result, 1)
    assert.equal(result[0].status, 'ENDED')
  })

  test('should return empty array if no polls with status', async ({ assert }) => {
    mockQueryResults = []

    const result = await repository.findByStatus('CANCELLED')

    assert.lengthOf(result, 0)
  })
})

test.group('PollInstanceRepository - create', () => {
  let repository: PollInstanceRepository
  let mockPollInstanceModel: any
  let createCalled = false

  test.group.each.setup(() => {
    createCalled = false

    mockPollInstanceModel = {
      create: async (data: any) => {
        createCalled = true
        return {
          id: `poll-${Date.now()}`,
          ...data,
          load: async () => {},
        } as unknown as PollInstance
      },
    }

    repository = new PollInstanceRepository()
    ;(repository as any).pollInstanceModel = mockPollInstanceModel
  })

  test('should create poll instance with template', async ({ assert }) => {
    const mockTemplate = { id: 'template-123' } as PollTemplate
    const mockCampaign = { id: 'campaign-123' } as Campaign
    const options = ['Option A', 'Option B', 'Option C']

    const result = await repository.create(mockTemplate, mockCampaign, options)

    assert.isTrue(createCalled)
    assert.isDefined(result.id)
  })

  test('should store options as JSON', async ({ assert }) => {
    const mockTemplate = { id: 'template-123' } as PollTemplate
    const mockCampaign = { id: 'campaign-123' } as Campaign
    const options = ['Red', 'Blue', 'Green']

    const result = await repository.create(mockTemplate, mockCampaign, options)

    assert.isTrue(createCalled)
    assert.isDefined(result)
  })

  test('should set initial status to PENDING', async ({ assert }) => {
    const mockTemplate = { id: 'template-123' } as PollTemplate
    const mockCampaign = { id: 'campaign-123' } as Campaign
    const options = ['Yes', 'No']

    mockPollInstanceModel.create = async (data: any) => {
      assert.equal(data.status, 'PENDING')
      return {
        id: 'poll-new',
        status: data.status,
        load: async () => {},
      } as unknown as PollInstance
    }

    await repository.create(mockTemplate, mockCampaign, options)
  })
})

test.group('PollInstanceRepository - update', () => {
  let repository: PollInstanceRepository
  let mergeCalled = false
  let saveCalled = false

  test.group.each.setup(() => {
    mergeCalled = false
    saveCalled = false

    repository = new PollInstanceRepository()
  })

  test('should update poll instance fields', async ({ assert }) => {
    const mockPollInstance = {
      id: 'poll-123',
      status: 'PENDING',
      merge: (data: any) => {
        mergeCalled = true
        Object.assign(mockPollInstance, data)
      },
      save: async () => {
        saveCalled = true
      },
    } as unknown as PollInstance

    await repository.update(mockPollInstance, { status: 'RUNNING' })

    assert.isTrue(mergeCalled)
    assert.isTrue(saveCalled)
  })

  test('should update multiple fields at once', async ({ assert }) => {
    const mockPollInstance = {
      id: 'poll-123',
      question: 'Old question',
      durationSeconds: 60,
      merge: (data: any) => {
        mergeCalled = true
        Object.assign(mockPollInstance, data)
      },
      save: async () => {
        saveCalled = true
      },
    } as unknown as PollInstance

    await repository.update(mockPollInstance, {
      question: 'New question',
      durationSeconds: 120,
    })

    assert.isTrue(mergeCalled)
    assert.isTrue(saveCalled)
  })
})

test.group('PollInstanceRepository - updateStatus', () => {
  let repository: PollInstanceRepository
  let mergeCalled = false
  let saveCalled = false

  test.group.each.setup(() => {
    mergeCalled = false
    saveCalled = false

    repository = new PollInstanceRepository()
  })

  test('should update status from PENDING to RUNNING', async ({ assert }) => {
    const mockPollInstance = {
      id: 'poll-123',
      status: 'PENDING',
      merge: (data: any) => {
        mergeCalled = true
        Object.assign(mockPollInstance, data)
      },
      save: async () => {
        saveCalled = true
      },
    } as unknown as PollInstance

    await repository.updateStatus(mockPollInstance, 'RUNNING')

    assert.isTrue(mergeCalled)
    assert.isTrue(saveCalled)
    assert.equal(mockPollInstance.status, 'RUNNING')
  })

  test('should update status from RUNNING to ENDED', async ({ assert }) => {
    const mockPollInstance = {
      id: 'poll-123',
      status: 'RUNNING',
      merge: (data: any) => {
        mergeCalled = true
        Object.assign(mockPollInstance, data)
      },
      save: async () => {
        saveCalled = true
      },
    } as unknown as PollInstance

    await repository.updateStatus(mockPollInstance, 'ENDED')

    assert.isTrue(mergeCalled)
    assert.isTrue(saveCalled)
    assert.equal(mockPollInstance.status, 'ENDED')
  })

  test('should update status to CANCELLED', async ({ assert }) => {
    const mockPollInstance = {
      id: 'poll-123',
      status: 'RUNNING',
      merge: (data: any) => {
        mergeCalled = true
        Object.assign(mockPollInstance, data)
      },
      save: async () => {
        saveCalled = true
      },
    } as unknown as PollInstance

    await repository.updateStatus(mockPollInstance, 'CANCELLED')

    assert.isTrue(mergeCalled)
    assert.isTrue(saveCalled)
    assert.equal(mockPollInstance.status, 'CANCELLED')
  })
})

test.group('PollInstanceRepository - setStarted', () => {
  let repository: PollInstanceRepository
  let mergeCalled = false
  let saveCalled = false

  test.group.each.setup(() => {
    mergeCalled = false
    saveCalled = false

    repository = new PollInstanceRepository()
  })

  test('should set status to RUNNING and startedAt timestamp', async ({ assert }) => {
    const mockPollInstance = {
      id: 'poll-123',
      status: 'PENDING',
      startedAt: null,
      merge: (data: any) => {
        mergeCalled = true
        Object.assign(mockPollInstance, data)
      },
      save: async () => {
        saveCalled = true
      },
    } as unknown as PollInstance

    await repository.setStarted(mockPollInstance)

    assert.isTrue(mergeCalled)
    assert.isTrue(saveCalled)
    assert.equal(mockPollInstance.status, 'RUNNING')
    assert.isDefined(mockPollInstance.startedAt)
  })

  test('should set startedAt to current DateTime', async ({ assert }) => {
    const mockPollInstance = {
      id: 'poll-123',
      status: 'PENDING',
      startedAt: null,
      merge: (data: any) => {
        Object.assign(mockPollInstance, data)
      },
      save: async () => {},
    } as unknown as PollInstance

    await repository.setStarted(mockPollInstance)

    assert.isDefined(mockPollInstance.startedAt)
  })
})

test.group('PollInstanceRepository - setEnded', () => {
  let repository: PollInstanceRepository
  let mergeCalled = false
  let saveCalled = false

  test.group.each.setup(() => {
    mergeCalled = false
    saveCalled = false

    repository = new PollInstanceRepository()
  })

  test('should set status to ENDED and endedAt timestamp', async ({ assert }) => {
    const mockPollInstance = {
      id: 'poll-123',
      status: 'RUNNING',
      endedAt: null,
      merge: (data: any) => {
        mergeCalled = true
        Object.assign(mockPollInstance, data)
      },
      save: async () => {
        saveCalled = true
      },
    } as unknown as PollInstance

    await repository.setEnded(mockPollInstance)

    assert.isTrue(mergeCalled)
    assert.isTrue(saveCalled)
    assert.equal(mockPollInstance.status, 'ENDED')
    assert.isDefined(mockPollInstance.endedAt)
  })

  test('should set endedAt to current DateTime', async ({ assert }) => {
    const mockPollInstance = {
      id: 'poll-123',
      status: 'RUNNING',
      endedAt: null,
      merge: (data: any) => {
        Object.assign(mockPollInstance, data)
      },
      save: async () => {},
    } as unknown as PollInstance

    await repository.setEnded(mockPollInstance)

    assert.isDefined(mockPollInstance.endedAt)
  })
})

test.group('PollInstanceRepository - setCancelled', () => {
  let repository: PollInstanceRepository
  let mergeCalled = false
  let saveCalled = false

  test.group.each.setup(() => {
    mergeCalled = false
    saveCalled = false

    repository = new PollInstanceRepository()
  })

  test('should set status to CANCELLED and endedAt timestamp', async ({ assert }) => {
    const mockPollInstance = {
      id: 'poll-123',
      status: 'RUNNING',
      endedAt: null,
      merge: (data: any) => {
        mergeCalled = true
        Object.assign(mockPollInstance, data)
      },
      save: async () => {
        saveCalled = true
      },
    } as unknown as PollInstance

    await repository.setCancelled(mockPollInstance)

    assert.isTrue(mergeCalled)
    assert.isTrue(saveCalled)
    assert.equal(mockPollInstance.status, 'CANCELLED')
    assert.isDefined(mockPollInstance.endedAt)
  })

  test('should set endedAt when cancelling from PENDING', async ({ assert }) => {
    const mockPollInstance = {
      id: 'poll-123',
      status: 'PENDING',
      endedAt: null,
      merge: (data: any) => {
        Object.assign(mockPollInstance, data)
      },
      save: async () => {},
    } as unknown as PollInstance

    await repository.setCancelled(mockPollInstance)

    assert.equal(mockPollInstance.status, 'CANCELLED')
    assert.isDefined(mockPollInstance.endedAt)
  })
})

test.group('PollInstanceRepository - saveFinalResults', () => {
  let repository: PollInstanceRepository
  let mergeCalled = false
  let saveCalled = false

  test.group.each.setup(() => {
    mergeCalled = false
    saveCalled = false

    repository = new PollInstanceRepository()
  })

  test('should save aggregated vote results', async ({ assert }) => {
    const mockPollInstance = {
      id: 'poll-123',
      finalResults: null,
      merge: (data: any) => {
        mergeCalled = true
        Object.assign(mockPollInstance, data)
      },
      save: async () => {
        saveCalled = true
      },
    } as unknown as PollInstance

    const aggregatedResults = {
      totalVotes: 150,
      options: [
        { text: 'Option A', votes: 75, percentage: 50 },
        { text: 'Option B', votes: 75, percentage: 50 },
      ],
      winner: null,
    }

    await repository.saveFinalResults(mockPollInstance, aggregatedResults)

    assert.isTrue(mergeCalled)
    assert.isTrue(saveCalled)
    assert.deepEqual(mockPollInstance.finalResults, aggregatedResults)
  })

  test('should save results with winner', async ({ assert }) => {
    const mockPollInstance = {
      id: 'poll-123',
      finalResults: null,
      merge: (data: any) => {
        Object.assign(mockPollInstance, data)
      },
      save: async () => {},
    } as unknown as PollInstance

    const aggregatedResults = {
      totalVotes: 200,
      options: [
        { text: 'Red', votes: 120, percentage: 60 },
        { text: 'Blue', votes: 80, percentage: 40 },
      ],
      winner: 'Red',
    }

    await repository.saveFinalResults(mockPollInstance, aggregatedResults)

    assert.deepEqual(mockPollInstance.finalResults, aggregatedResults)
    assert.equal((mockPollInstance.finalResults as any).winner, 'Red')
  })

  test('should save results with zero votes', async ({ assert }) => {
    const mockPollInstance = {
      id: 'poll-123',
      finalResults: null,
      merge: (data: any) => {
        Object.assign(mockPollInstance, data)
      },
      save: async () => {},
    } as unknown as PollInstance

    const aggregatedResults = {
      totalVotes: 0,
      options: [
        { text: 'Yes', votes: 0, percentage: 0 },
        { text: 'No', votes: 0, percentage: 0 },
      ],
      winner: null,
    }

    await repository.saveFinalResults(mockPollInstance, aggregatedResults)

    assert.deepEqual(mockPollInstance.finalResults, aggregatedResults)
    assert.equal((mockPollInstance.finalResults as any).totalVotes, 0)
  })
})
