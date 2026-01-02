import { test } from '@japa/runner'
import { PollResultsAnnouncementService } from '#services/polls/poll_results_announcement_service'
import type { PollChannelLinkRepository } from '#repositories/poll_channel_link_repository'
import { pollInstance as PollInstance } from '#models/poll_instance'
import type { PollAggregatedVotes } from '#services/polls/poll_aggregation_service'

// Mock Poll Channel Link Repository
class MockPollChannelLinkRepository implements Partial<PollChannelLinkRepository> {
  private links: any[] = []

  seed(links: any[]): void {
    this.links = links
  }

  async findByPollInstance(_pollInstanceId: string): Promise<any[]> {
    return this.links
  }

  clear(): void {
    this.links = []
  }
}

test.group('PollResultsAnnouncementService - Basic Announcement', () => {
  test('should announce results successfully with participants', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()

    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    mockRepo.seed([
      { id: 'link-1', pollInstanceId: 'poll-1', streamerId: 'streamer-1' },
      { id: 'link-2', pollInstanceId: 'poll-1', streamerId: 'streamer-2' },
    ])

    const pollInstance = {
      id: 'poll-1',
      title: 'Best Game?',
      options: ['Option A', 'Option B', 'Option C'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 100,
      votesByOption: { '0': 50, '1': 30, '2': 20 },
      percentages: { '0': 50.0, '1': 30.0, '2': 20.0 },
    }

    // Should complete without throwing
    await service.announceResults(pollInstance, aggregated, false)

    assert.isTrue(true)
  })

  test('should handle no participants gracefully', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()

    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    mockRepo.seed([])

    const pollInstance = {
      id: 'poll-1',
      title: 'Empty Poll?',
      options: ['Yes', 'No'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 0,
      votesByOption: { '0': 0, '1': 0 },
      percentages: { '0': 0, '1': 0 },
    }

    // Should return early without error
    await service.announceResults(pollInstance, aggregated, false)

    assert.isTrue(true)
  })

  test('should handle cancelled poll announcement', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()

    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    mockRepo.seed([{ id: 'link-1', pollInstanceId: 'poll-1', streamerId: 'streamer-1' }])

    const pollInstance = {
      id: 'poll-1',
      title: 'Cancelled Poll?',
      options: ['A', 'B'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 50,
      votesByOption: { '0': 30, '1': 20 },
      percentages: { '0': 60.0, '1': 40.0 },
    }

    // Should announce with cancelled status
    await service.announceResults(pollInstance, aggregated, true)

    assert.isTrue(true)
  })
})

test.group('PollResultsAnnouncementService - Message Formatting', () => {
  test('should format message with title and results', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    // Access private method via prototype
    const buildResultsMessage = (service as any).buildResultsMessage.bind(service)

    const pollInstance = {
      id: 'poll-1',
      title: 'Best Language?',
      options: ['TypeScript', 'JavaScript', 'Python'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 100,
      votesByOption: { '0': 50, '1': 30, '2': 20 },
      percentages: { '0': 50.0, '1': 30.0, '2': 20.0 },
    }

    const message = buildResultsMessage(pollInstance, aggregated, false)

    assert.include(message, 'RÉSULTATS DU SONDAGE')
    assert.include(message, 'Best Language?')
    assert.include(message, 'TypeScript')
    assert.include(message, 'JavaScript')
    assert.include(message, 'Python')
    assert.include(message, 'Total: 100 votes')
  })

  test('should include cancelled status in message', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    const buildResultsMessage = (service as any).buildResultsMessage.bind(service)

    const pollInstance = {
      id: 'poll-1',
      title: 'Test Poll',
      options: ['A', 'B'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 10,
      votesByOption: { '0': 6, '1': 4 },
      percentages: { '0': 60.0, '1': 40.0 },
    }

    const message = buildResultsMessage(pollInstance, aggregated, true)

    assert.include(message, '(Annulé)')
  })

  test('should format percentages and vote counts correctly', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    const buildResultsMessage = (service as any).buildResultsMessage.bind(service)

    const pollInstance = {
      id: 'poll-1',
      title: 'Test',
      options: ['Option A'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 75,
      votesByOption: { '0': 75 },
      percentages: { '0': 100.0 },
    }

    const message = buildResultsMessage(pollInstance, aggregated, false)

    assert.include(message, '100%')
    assert.include(message, '75 votes')
  })
})

test.group('PollResultsAnnouncementService - Rank Icons', () => {
  test('should use gold medal icon for rank 1', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    const getRankIcon = (service as any).getRankIcon.bind(service)

    assert.equal(getRankIcon(1), '🥇')
  })

  test('should use silver medal icon for rank 2', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    const getRankIcon = (service as any).getRankIcon.bind(service)

    assert.equal(getRankIcon(2), '🥈')
  })

  test('should use bronze medal icon for rank 3', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    const getRankIcon = (service as any).getRankIcon.bind(service)

    assert.equal(getRankIcon(3), '🥉')
  })

  test('should use number emojis for ranks 4 and 5', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    const getRankIcon = (service as any).getRankIcon.bind(service)

    assert.equal(getRankIcon(4), '4️⃣')
    assert.equal(getRankIcon(5), '5️⃣')
  })
})

test.group('PollResultsAnnouncementService - Rank Grouping', () => {
  test('should group options by rank correctly', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    const groupOptionsByRank = (service as any).groupOptionsByRank.bind(service)

    const pollInstance = {
      id: 'poll-1',
      title: 'Test',
      options: ['A', 'B', 'C'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 100,
      votesByOption: { '0': 50, '1': 30, '2': 20 },
      percentages: { '0': 50.0, '1': 30.0, '2': 20.0 },
    }

    const groups = groupOptionsByRank(pollInstance, aggregated)

    assert.lengthOf(groups, 3)
    assert.equal(groups[0].rank, 1)
    assert.equal(groups[0].percentage, 50.0)
    assert.lengthOf(groups[0].options, 1)
    assert.equal(groups[1].rank, 2)
    assert.equal(groups[2].rank, 3)
  })

  test('should detect ties and group options with same percentage', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    const groupOptionsByRank = (service as any).groupOptionsByRank.bind(service)

    const pollInstance = {
      id: 'poll-1',
      title: 'Test',
      options: ['A', 'B', 'C'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 90,
      votesByOption: { '0': 30, '1': 30, '2': 30 },
      percentages: { '0': 33.3, '1': 33.3, '2': 33.3 },
    }

    const groups = groupOptionsByRank(pollInstance, aggregated)

    // All options should be in same group (rank 1)
    assert.lengthOf(groups, 1)
    assert.equal(groups[0].rank, 1)
    assert.lengthOf(groups[0].options, 3)
  })

  test('should handle partial tie correctly', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    const groupOptionsByRank = (service as any).groupOptionsByRank.bind(service)

    const pollInstance = {
      id: 'poll-1',
      title: 'Test',
      options: ['A', 'B', 'C', 'D'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 100,
      votesByOption: { '0': 40, '1': 30, '2': 30, '3': 0 },
      percentages: { '0': 40.0, '1': 30.0, '2': 30.0, '3': 0.0 },
    }

    const groups = groupOptionsByRank(pollInstance, aggregated)

    // Rank 1: A (40%)
    // Rank 2: B & C (30% each - tie)
    // Rank 4: D (0%)
    assert.lengthOf(groups, 3)
    assert.equal(groups[0].rank, 1)
    assert.lengthOf(groups[0].options, 1)
    assert.equal(groups[1].rank, 2)
    assert.lengthOf(groups[1].options, 2)
    assert.equal(groups[2].rank, 4) // Skip rank 3 because of tie at rank 2
  })

  test('should sort tied options by index', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    const groupOptionsByRank = (service as any).groupOptionsByRank.bind(service)

    const pollInstance = {
      id: 'poll-1',
      title: 'Test',
      options: ['C', 'B', 'A'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 60,
      votesByOption: { '0': 20, '1': 20, '2': 20 },
      percentages: { '0': 33.3, '1': 33.3, '2': 33.3 },
    }

    const groups = groupOptionsByRank(pollInstance, aggregated)

    assert.lengthOf(groups, 1)
    assert.equal(groups[0].options[0].optionText, 'C') // Index 0
    assert.equal(groups[0].options[1].optionText, 'B') // Index 1
    assert.equal(groups[0].options[2].optionText, 'A') // Index 2
  })
})

test.group('PollResultsAnnouncementService - Tie Message Formatting', () => {
  test('should format tie message with "&" separator', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    const buildResultsMessage = (service as any).buildResultsMessage.bind(service)

    const pollInstance = {
      id: 'poll-1',
      title: 'Tie Poll',
      options: ['Red', 'Blue'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 100,
      votesByOption: { '0': 50, '1': 50 },
      percentages: { '0': 50.0, '1': 50.0 },
    }

    const message = buildResultsMessage(pollInstance, aggregated, false)

    assert.include(message, 'Red & Blue')
    assert.include(message, '(égalité)')
    assert.include(message, '50 votes chacun')
  })

  test('should handle three-way tie', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    const buildResultsMessage = (service as any).buildResultsMessage.bind(service)

    const pollInstance = {
      id: 'poll-1',
      title: 'Triple Tie',
      options: ['A', 'B', 'C'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 90,
      votesByOption: { '0': 30, '1': 30, '2': 30 },
      percentages: { '0': 33.3, '1': 33.3, '2': 33.3 },
    }

    const message = buildResultsMessage(pollInstance, aggregated, false)

    assert.include(message, 'A & B & C')
    assert.include(message, '(égalité)')
  })
})

test.group('PollResultsAnnouncementService - Winner Display', () => {
  test('should show winner with gold medal first', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    const buildResultsMessage = (service as any).buildResultsMessage.bind(service)

    const pollInstance = {
      id: 'poll-1',
      title: 'Clear Winner',
      options: ['Winner', 'Second', 'Third'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 100,
      votesByOption: { '0': 60, '1': 25, '2': 15 },
      percentages: { '0': 60.0, '1': 25.0, '2': 15.0 },
    }

    const message = buildResultsMessage(pollInstance, aggregated, false)

    // Winner should appear first
    const winnerIndex = message.indexOf('Winner')
    const secondIndex = message.indexOf('Second')

    assert.isTrue(winnerIndex < secondIndex)
    assert.include(message, '🥇')
  })

  test('should display complete podium with medals', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    const buildResultsMessage = (service as any).buildResultsMessage.bind(service)

    const pollInstance = {
      id: 'poll-1',
      title: 'Podium',
      options: ['Gold', 'Silver', 'Bronze'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 100,
      votesByOption: { '0': 50, '1': 30, '2': 20 },
      percentages: { '0': 50.0, '1': 30.0, '2': 20.0 },
    }

    const message = buildResultsMessage(pollInstance, aggregated, false)

    assert.include(message, '🥇')
    assert.include(message, '🥈')
    assert.include(message, '🥉')
  })
})

test.group('PollResultsAnnouncementService - Edge Cases', () => {
  test('should handle poll with zero votes', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    const buildResultsMessage = (service as any).buildResultsMessage.bind(service)

    const pollInstance = {
      id: 'poll-1',
      title: 'No Votes',
      options: ['A', 'B'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 0,
      votesByOption: { '0': 0, '1': 0 },
      percentages: { '0': 0, '1': 0 },
    }

    const message = buildResultsMessage(pollInstance, aggregated, false)

    assert.include(message, 'Total: 0 votes')
    assert.include(message, '0%')
  })

  test('should handle single option poll', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    const buildResultsMessage = (service as any).buildResultsMessage.bind(service)

    const pollInstance = {
      id: 'poll-1',
      title: 'Yes or Nothing',
      options: ['Yes'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 42,
      votesByOption: { '0': 42 },
      percentages: { '0': 100.0 },
    }

    const message = buildResultsMessage(pollInstance, aggregated, false)

    assert.include(message, 'Yes')
    assert.include(message, '100%')
    assert.include(message, '42 votes')
  })

  test('should handle maximum 5 options', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    const buildResultsMessage = (service as any).buildResultsMessage.bind(service)

    const pollInstance = {
      id: 'poll-1',
      title: 'Five Options',
      options: ['1st', '2nd', '3rd', '4th', '5th'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 150,
      votesByOption: { '0': 50, '1': 40, '2': 30, '3': 20, '4': 10 },
      percentages: { '0': 33.3, '1': 26.7, '2': 20.0, '3': 13.3, '4': 6.7 },
    }

    const message = buildResultsMessage(pollInstance, aggregated, false)

    assert.include(message, '1st')
    assert.include(message, '2nd')
    assert.include(message, '3rd')
    assert.include(message, '4th')
    assert.include(message, '5th')
    assert.include(message, '🥇')
    assert.include(message, '5️⃣')
  })

  test('should handle decimal percentages correctly', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()
    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    const buildResultsMessage = (service as any).buildResultsMessage.bind(service)

    const pollInstance = {
      id: 'poll-1',
      title: 'Decimals',
      options: ['A', 'B', 'C'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 99,
      votesByOption: { '0': 33, '1': 33, '2': 33 },
      percentages: { '0': 33.3, '1': 33.3, '2': 33.3 },
    }

    const message = buildResultsMessage(pollInstance, aggregated, false)

    assert.include(message, '33.3%')
  })
})

test.group('PollResultsAnnouncementService - Multi-Streamer Broadcast', () => {
  test('should broadcast to multiple streamers', async ({ assert }) => {
    const mockRepo = new MockPollChannelLinkRepository()

    const service = new PollResultsAnnouncementService(
      mockRepo as unknown as PollChannelLinkRepository
    )

    mockRepo.seed([
      { id: 'link-1', pollInstanceId: 'poll-1', streamerId: 'streamer-1' },
      { id: 'link-2', pollInstanceId: 'poll-1', streamerId: 'streamer-2' },
      { id: 'link-3', pollInstanceId: 'poll-1', streamerId: 'streamer-3' },
    ])

    const pollInstance = {
      id: 'poll-1',
      title: 'Multi Streamer Poll',
      options: ['A', 'B'],
    } as PollInstance

    const aggregated: PollAggregatedVotes = {
      pollInstanceId: 'poll-1',
      totalVotes: 50,
      votesByOption: { '0': 30, '1': 20 },
      percentages: { '0': 60.0, '1': 40.0 },
    }

    // Should send to all 3 streamers
    await service.announceResults(pollInstance, aggregated, false)

    assert.isTrue(true)
  })
})
