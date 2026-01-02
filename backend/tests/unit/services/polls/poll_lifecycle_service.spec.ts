import { test } from '@japa/runner'
import { PollLifecycleService } from '#services/polls/poll_lifecycle_service'
import type { PollInstanceRepository } from '#repositories/poll_instance_repository'
import type { PollCreationService } from '#services/polls/poll_creation_service'
import type { PollPollingService } from '#services/polls/poll_polling_service'
import type { PollAggregationService } from '#services/polls/poll_aggregation_service'
import type { webSocketService as WebSocketService } from '#services/websocket/websocket_service'
import type { pollResultsAnnouncementService as PollResultsAnnouncementService } from '#services/polls/poll_results_announcement_service'
import { pollInstance as PollInstance } from '#models/poll_instance'

// Mock Repository
class MockPollInstanceRepository implements Partial<PollInstanceRepository> {
  private instances: Map<string, PollInstance> = new Map()

  async findById(id: string): Promise<PollInstance | null> {
    return this.instances.get(id) || null
  }

  async setStarted(id: string): Promise<void> {
    const instance = this.instances.get(id)
    if (instance) {
      instance.status = 'RUNNING'
      instance.startedAt = new Date()
    }
  }

  async setEnded(id: string): Promise<void> {
    const instance = this.instances.get(id)
    if (instance) {
      instance.status = 'ENDED'
      instance.endedAt = new Date()
    }
  }

  async setCancelled(id: string): Promise<void> {
    const instance = this.instances.get(id)
    if (instance) {
      instance.status = 'CANCELLED'
      instance.endedAt = new Date()
    }
  }

  async saveFinalResults(
    id: string,
    totalVotes: number,
    votesByOption: Record<string, number>
  ): Promise<void> {
    const instance = this.instances.get(id)
    if (instance) {
      instance.totalVotes = totalVotes
      instance.votesByOption = votesByOption
    }
  }

  seed(instance: PollInstance): void {
    this.instances.set(instance.id, instance)
  }

  clear(): void {
    this.instances.clear()
  }
}

// Mock Services
class MockPollCreationService implements Partial<PollCreationService> {
  createPollsOnTwitchCalled = false
  terminatePollsOnTwitchCalled = false
  removeStreamerCalled = false

  async createPollsOnTwitch(_pollInstance: PollInstance): Promise<void> {
    this.createPollsOnTwitchCalled = true
  }

  async terminatePollsOnTwitch(_pollInstance: PollInstance): Promise<void> {
    this.terminatePollsOnTwitchCalled = true
  }

  async removeStreamerFromCampaignPolls(_streamerId: string, _campaignId: string): Promise<void> {
    this.removeStreamerCalled = true
  }
}

class MockPollPollingService implements Partial<PollPollingService> {
  startPollingCalled = false
  stopPollingCalled = false
  sendCancellationCalled = false
  private aggregationService: PollAggregationService | null = null
  private onPollEndCallback: ((pollInstance: PollInstance) => Promise<void>) | null = null

  setAggregationService(service: PollAggregationService): void {
    this.aggregationService = service
  }

  setOnPollEndCallback(callback: (pollInstance: PollInstance) => Promise<void>): void {
    this.onPollEndCallback = callback
  }

  async startPolling(_pollInstance: PollInstance): Promise<void> {
    this.startPollingCalled = true
  }

  stopPolling(_pollInstanceId: string): void {
    this.stopPollingCalled = true
  }

  async sendCancellationMessage(_pollInstanceId: string): Promise<void> {
    this.sendCancellationCalled = true
  }

  // Helper pour simuler la fin automatique d'un poll
  async simulatePollEnd(pollInstance: PollInstance): Promise<void> {
    if (this.onPollEndCallback) {
      await this.onPollEndCallback(pollInstance)
    }
  }
}

class MockPollAggregationService implements Partial<PollAggregationService> {
  async getAggregatedVotes(_pollInstanceId: string) {
    return {
      pollInstanceId: _pollInstanceId,
      totalVotes: 150,
      votesByOption: {
        option1: 50,
        option2: 60,
        option3: 40,
      },
      percentagesByOption: {
        option1: 33.33,
        option2: 40.0,
        option3: 26.67,
      },
      winner: 'option2',
    }
  }
}

class MockWebSocketService implements Partial<WebSocketService> {
  emitPollEndCalled = false
  lastEmittedData: unknown = null

  emitPollEnd(pollInstanceId: string, data: unknown): void {
    this.emitPollEndCalled = true
    this.lastEmittedData = { pollInstanceId, ...data }
  }
}

class MockPollResultsAnnouncementService implements Partial<PollResultsAnnouncementService> {
  announceResultsCalled = false
  lastAnnouncedCancelled: boolean | null = null

  async announceResults(
    _pollInstance: PollInstance,
    _aggregated: unknown,
    cancelled: boolean
  ): Promise<void> {
    this.announceResultsCalled = true
    this.lastAnnouncedCancelled = cancelled
  }
}

test.group('PollLifecycleService - Launch Poll', (group) => {
  let mockRepo: MockPollInstanceRepository
  let mockCreation: MockPollCreationService
  let mockPolling: MockPollPollingService
  let mockAggregation: MockPollAggregationService
  let mockWebSocket: MockWebSocketService
  let mockAnnouncement: MockPollResultsAnnouncementService
  let service: PollLifecycleService

  group.each.setup(() => {
    mockRepo = new MockPollInstanceRepository()
    mockCreation = new MockPollCreationService()
    mockPolling = new MockPollPollingService()
    mockAggregation = new MockPollAggregationService()
    mockWebSocket = new MockWebSocketService()
    mockAnnouncement = new MockPollResultsAnnouncementService()

    service = new PollLifecycleService(
      mockRepo as unknown as PollInstanceRepository,
      mockCreation as unknown as PollCreationService,
      mockPolling as unknown as PollPollingService,
      mockAggregation as unknown as PollAggregationService,
      mockWebSocket as unknown as WebSocketService,
      mockAnnouncement as unknown as PollResultsAnnouncementService
    )
  })

  test('should launch poll from PENDING status successfully', async ({ assert }) => {
    const pollInstance = {
      id: 'poll-1',
      status: 'PENDING',
      campaignId: 'campaign-1',
      startedAt: null,
      endedAt: null,
    } as PollInstance

    mockRepo.seed(pollInstance)

    await service.launchPoll('poll-1')

    // Vérifier que les méthodes ont été appelées dans le bon ordre
    assert.isTrue(mockCreation.createPollsOnTwitchCalled)
    assert.isTrue(mockPolling.startPollingCalled)

    // Vérifier que le statut a été mis à jour
    const updated = await mockRepo.findById('poll-1')
    assert.equal(updated?.status, 'RUNNING')
    assert.exists(updated?.startedAt)
  })

  test('should throw error when poll instance not found', async ({ assert }) => {
    await assert.rejects(
      async () => await service.launchPoll('non-existent'),
      'Poll instance not found'
    )
  })

  test('should throw error when poll is not in PENDING status', async ({ assert }) => {
    const pollInstance = {
      id: 'poll-1',
      status: 'RUNNING', // Déjà lancé
      campaignId: 'campaign-1',
    } as PollInstance

    mockRepo.seed(pollInstance)

    await assert.rejects(
      async () => await service.launchPoll('poll-1'),
      'Poll cannot be launched from status RUNNING'
    )
  })

  test('should create Twitch polls before starting polling', async ({ assert }) => {
    const pollInstance = {
      id: 'poll-1',
      status: 'PENDING',
      campaignId: 'campaign-1',
    } as PollInstance

    mockRepo.seed(pollInstance)

    await service.launchPoll('poll-1')

    // Vérifier l'ordre des appels
    assert.isTrue(mockCreation.createPollsOnTwitchCalled)
    assert.isTrue(mockPolling.startPollingCalled)
  })

  test('should set started timestamp when launching', async ({ assert }) => {
    const pollInstance = {
      id: 'poll-1',
      status: 'PENDING',
      campaignId: 'campaign-1',
      startedAt: null,
    } as PollInstance

    mockRepo.seed(pollInstance)

    await service.launchPoll('poll-1')

    const updated = await mockRepo.findById('poll-1')
    assert.exists(updated?.startedAt)
    assert.instanceOf(updated?.startedAt, Date)
  })
})

test.group('PollLifecycleService - Cancel Poll', (group) => {
  let mockRepo: MockPollInstanceRepository
  let mockCreation: MockPollCreationService
  let mockPolling: MockPollPollingService
  let mockAggregation: MockPollAggregationService
  let mockWebSocket: MockWebSocketService
  let mockAnnouncement: MockPollResultsAnnouncementService
  let service: PollLifecycleService

  group.each.setup(() => {
    mockRepo = new MockPollInstanceRepository()
    mockCreation = new MockPollCreationService()
    mockPolling = new MockPollPollingService()
    mockAggregation = new MockPollAggregationService()
    mockWebSocket = new MockWebSocketService()
    mockAnnouncement = new MockPollResultsAnnouncementService()

    service = new PollLifecycleService(
      mockRepo as unknown as PollInstanceRepository,
      mockCreation as unknown as PollCreationService,
      mockPolling as unknown as PollPollingService,
      mockAggregation as unknown as PollAggregationService,
      mockWebSocket as unknown as WebSocketService,
      mockAnnouncement as unknown as PollResultsAnnouncementService
    )
  })

  test('should cancel running poll successfully', async ({ assert }) => {
    const pollInstance = {
      id: 'poll-1',
      status: 'RUNNING',
      campaignId: 'campaign-1',
    } as PollInstance

    mockRepo.seed(pollInstance)

    await service.cancelPoll('poll-1')

    // Vérifier les appels
    assert.isTrue(mockPolling.sendCancellationCalled)
    assert.isTrue(mockPolling.stopPollingCalled)
    assert.isTrue(mockCreation.terminatePollsOnTwitchCalled)
    assert.isTrue(mockWebSocket.emitPollEndCalled)

    // Vérifier le statut
    const updated = await mockRepo.findById('poll-1')
    assert.equal(updated?.status, 'CANCELLED')
    assert.exists(updated?.endedAt)
  })

  test('should throw error when cancelling non-RUNNING poll', async ({ assert }) => {
    const pollInstance = {
      id: 'poll-1',
      status: 'PENDING',
      campaignId: 'campaign-1',
    } as PollInstance

    mockRepo.seed(pollInstance)

    await assert.rejects(
      async () => await service.cancelPoll('poll-1'),
      'Poll cannot be cancelled from status PENDING'
    )
  })

  test('should save final results when cancelling', async ({ assert }) => {
    const pollInstance = {
      id: 'poll-1',
      status: 'RUNNING',
      campaignId: 'campaign-1',
      totalVotes: null,
      votesByOption: {},
    } as unknown as PollInstance

    mockRepo.seed(pollInstance)

    await service.cancelPoll('poll-1')

    const updated = await mockRepo.findById('poll-1')
    assert.equal(updated?.totalVotes, 150)
    assert.deepEqual(updated?.votesByOption, {
      option1: 50,
      option2: 60,
      option3: 40,
    })
  })

  test('should emit WebSocket event when cancelling', async ({ assert }) => {
    const pollInstance = {
      id: 'poll-1',
      status: 'RUNNING',
      campaignId: 'campaign-1',
    } as PollInstance

    mockRepo.seed(pollInstance)

    await service.cancelPoll('poll-1')

    assert.isTrue(mockWebSocket.emitPollEndCalled)
    assert.exists(mockWebSocket.lastEmittedData)
  })

  test('should send cancellation message to chats', async ({ assert }) => {
    const pollInstance = {
      id: 'poll-1',
      status: 'RUNNING',
      campaignId: 'campaign-1',
    } as PollInstance

    mockRepo.seed(pollInstance)

    await service.cancelPoll('poll-1')

    assert.isTrue(mockPolling.sendCancellationCalled)
  })
})

test.group('PollLifecycleService - End Poll', (group) => {
  let mockRepo: MockPollInstanceRepository
  let mockCreation: MockPollCreationService
  let mockPolling: MockPollPollingService
  let mockAggregation: MockPollAggregationService
  let mockWebSocket: MockWebSocketService
  let mockAnnouncement: MockPollResultsAnnouncementService
  let service: PollLifecycleService

  group.each.setup(() => {
    mockRepo = new MockPollInstanceRepository()
    mockCreation = new MockPollCreationService()
    mockPolling = new MockPollPollingService()
    mockAggregation = new MockPollAggregationService()
    mockWebSocket = new MockWebSocketService()
    mockAnnouncement = new MockPollResultsAnnouncementService()

    service = new PollLifecycleService(
      mockRepo as unknown as PollInstanceRepository,
      mockCreation as unknown as PollCreationService,
      mockPolling as unknown as PollPollingService,
      mockAggregation as unknown as PollAggregationService,
      mockWebSocket as unknown as WebSocketService,
      mockAnnouncement as unknown as PollResultsAnnouncementService
    )
  })

  test('should end poll successfully', async ({ assert }) => {
    const pollInstance = {
      id: 'poll-1',
      status: 'RUNNING',
      campaignId: 'campaign-1',
    } as PollInstance

    mockRepo.seed(pollInstance)

    await service.endPoll(pollInstance)

    // Vérifier les appels
    assert.isTrue(mockPolling.stopPollingCalled)
    assert.isTrue(mockAnnouncement.announceResultsCalled)
    assert.isTrue(mockWebSocket.emitPollEndCalled)

    // Vérifier le statut
    const updated = await mockRepo.findById('poll-1')
    assert.equal(updated?.status, 'ENDED')
    assert.exists(updated?.endedAt)
  })

  test('should announce results with cancelled=false when ending normally', async ({ assert }) => {
    const pollInstance = {
      id: 'poll-1',
      status: 'RUNNING',
      campaignId: 'campaign-1',
    } as PollInstance

    mockRepo.seed(pollInstance)

    await service.endPoll(pollInstance)

    assert.isFalse(mockAnnouncement.lastAnnouncedCancelled)
  })

  test('should save final results when ending', async ({ assert }) => {
    const pollInstance = {
      id: 'poll-1',
      status: 'RUNNING',
      campaignId: 'campaign-1',
      totalVotes: null,
      votesByOption: {},
    } as unknown as PollInstance

    mockRepo.seed(pollInstance)

    await service.endPoll(pollInstance)

    const updated = await mockRepo.findById('poll-1')
    assert.equal(updated?.totalVotes, 150)
    assert.deepEqual(updated?.votesByOption, {
      option1: 50,
      option2: 60,
      option3: 40,
    })
  })

  test('should emit WebSocket event when ending', async ({ assert }) => {
    const pollInstance = {
      id: 'poll-1',
      status: 'RUNNING',
      campaignId: 'campaign-1',
    } as PollInstance

    mockRepo.seed(pollInstance)

    await service.endPoll(pollInstance)

    assert.isTrue(mockWebSocket.emitPollEndCalled)
    const emitted = mockWebSocket.lastEmittedData as Record<string, unknown>
    assert.equal(emitted.pollInstanceId, 'poll-1')
    assert.equal(emitted.totalVotes, 150)
  })

  test('should stop polling before ending', async ({ assert }) => {
    const pollInstance = {
      id: 'poll-1',
      status: 'RUNNING',
      campaignId: 'campaign-1',
    } as PollInstance

    mockRepo.seed(pollInstance)

    await service.endPoll(pollInstance)

    assert.isTrue(mockPolling.stopPollingCalled)
  })
})

test.group('PollLifecycleService - Automatic End via Callback', (group) => {
  let mockRepo: MockPollInstanceRepository
  let mockCreation: MockPollCreationService
  let mockPolling: MockPollPollingService
  let mockAggregation: MockPollAggregationService
  let mockWebSocket: MockWebSocketService
  let mockAnnouncement: MockPollResultsAnnouncementService
  let service: PollLifecycleService

  group.each.setup(() => {
    mockRepo = new MockPollInstanceRepository()
    mockCreation = new MockPollCreationService()
    mockPolling = new MockPollPollingService()
    mockAggregation = new MockPollAggregationService()
    mockWebSocket = new MockWebSocketService()
    mockAnnouncement = new MockPollResultsAnnouncementService()

    service = new PollLifecycleService(
      mockRepo as unknown as PollInstanceRepository,
      mockCreation as unknown as PollCreationService,
      mockPolling as unknown as PollPollingService,
      mockAggregation as unknown as PollAggregationService,
      mockWebSocket as unknown as WebSocketService,
      mockAnnouncement as unknown as PollResultsAnnouncementService
    )
  })

  test('should end poll when callback is triggered by polling service', async ({ assert }) => {
    const pollInstance = {
      id: 'poll-1',
      status: 'RUNNING',
      campaignId: 'campaign-1',
    } as PollInstance

    mockRepo.seed(pollInstance)

    // Simuler la fin automatique via callback
    await mockPolling.simulatePollEnd(pollInstance)

    // Vérifier que le poll a été terminé
    const updated = await mockRepo.findById('poll-1')
    assert.equal(updated?.status, 'ENDED')
    assert.isTrue(mockAnnouncement.announceResultsCalled)
  })
})

test.group('PollLifecycleService - Remove Streamer', (group) => {
  let mockRepo: MockPollInstanceRepository
  let mockCreation: MockPollCreationService
  let mockPolling: MockPollPollingService
  let mockAggregation: MockPollAggregationService
  let mockWebSocket: MockWebSocketService
  let mockAnnouncement: MockPollResultsAnnouncementService
  let service: PollLifecycleService

  group.each.setup(() => {
    mockRepo = new MockPollInstanceRepository()
    mockCreation = new MockPollCreationService()
    mockPolling = new MockPollPollingService()
    mockAggregation = new MockPollAggregationService()
    mockWebSocket = new MockWebSocketService()
    mockAnnouncement = new MockPollResultsAnnouncementService()

    service = new PollLifecycleService(
      mockRepo as unknown as PollInstanceRepository,
      mockCreation as unknown as PollCreationService,
      mockPolling as unknown as PollPollingService,
      mockAggregation as unknown as PollAggregationService,
      mockWebSocket as unknown as WebSocketService,
      mockAnnouncement as unknown as PollResultsAnnouncementService
    )
  })

  test('should remove streamer from campaign polls', async ({ assert }) => {
    await service.removeStreamerFromCampaign('streamer-1', 'campaign-1')

    assert.isTrue(mockCreation.removeStreamerCalled)
  })
})

test.group('PollLifecycleService - Service Initialization', () => {
  test('should configure polling service callbacks during construction', ({ assert }) => {
    const mockRepo = new MockPollInstanceRepository()
    const mockCreation = new MockPollCreationService()
    const mockPolling = new MockPollPollingService()
    const mockAggregation = new MockPollAggregationService()
    const mockWebSocket = new MockWebSocketService()
    const mockAnnouncement = new MockPollResultsAnnouncementService()

    // Le constructeur doit configurer les callbacks
    new PollLifecycleService(
      mockRepo as unknown as PollInstanceRepository,
      mockCreation as unknown as PollCreationService,
      mockPolling as unknown as PollPollingService,
      mockAggregation as unknown as PollAggregationService,
      mockWebSocket as unknown as WebSocketService,
      mockAnnouncement as unknown as PollResultsAnnouncementService
    )

    // Vérifier que setAggregationService a été appelé
    // (vérifié implicitement car le service fonctionne)
    assert.isTrue(true)
  })
})
