import { test } from '@japa/runner'
import app from '@adonisjs/core/services/app'
import { PollResultsAnnouncementService } from '#services/polls/poll_results_announcement_service'
import type { PollAggregatedVotes } from '#services/polls/poll_aggregation_service'

/**
 * Tests unitaires pour PollResultsAnnouncementService
 *
 * Le service annonce les résultats d'un poll dans les chats Twitch participants:
 * - announceResults: Orchestre la récupération des participants, la construction
 *   du message et l'envoi en broadcast
 * - buildResultsMessage (via announceResults): Formate les résultats avec
 *   classement, médailles et ex-aequo
 * - groupOptionsByRank (via announceResults): Groupe les options par rang
 *   en détectant les ex-aequo
 * - getRankIcon (via announceResults): Retourne l'émoji correspondant au rang
 * - broadcastResults (via announceResults): Envoie le message à tous les streamers
 *   via le TwitchChatService
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockPollInstance(overrides: Record<string, any> = {}) {
  return {
    id: 'poll-123',
    title: 'Who should fight the dragon?',
    options: ['Warrior', 'Mage', 'Rogue'],
    ...overrides,
  }
}

function createMockAggregated(overrides: Partial<PollAggregatedVotes> = {}): PollAggregatedVotes {
  return {
    pollInstanceId: 'poll-123',
    votesByOption: { '0': 40, '1': 35, '2': 25 },
    totalVotes: 100,
    percentages: { '0': 40, '1': 35, '2': 25 },
    ...overrides,
  }
}

function createMockChannelLinkRepository(channelLinks: any[] = []) {
  return {
    findByPollInstance: async () => channelLinks,
  }
}

/**
 * Patches app.container.make so that it returns the provided chatService mock
 * for the 'twitchChatService' binding.  Returns a cleanup function that
 * restores the original container.make.
 */
function patchContainerMake(chatServiceMock: any): () => void {
  const originalMake = app.container.make.bind(app.container)

  ;(app.container as any).make = async (binding: any, ...rest: any[]) => {
    if (binding === 'twitchChatService') {
      return chatServiceMock
    }
    return originalMake(binding, ...rest)
  }

  return () => {
    ;(app.container as any).make = originalMake
  }
}

// ---------------------------------------------------------------------------
// announceResults — orchestration
// ---------------------------------------------------------------------------

test.group('PollResultsAnnouncementService - announceResults', () => {
  test('should fetch channel links and broadcast results to all participants', async ({
    assert,
  }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }, { streamerId: 'streamer-2' }]

    const sentMessages: Array<{ streamerId: string; message: string }> = []
    const mockChatService = {
      sendMessage: async (streamerId: string, message: string) => {
        sentMessages.push({ streamerId, message })
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      const pollInstance = createMockPollInstance()
      const aggregated = createMockAggregated()

      await service.announceResults(pollInstance as any, aggregated, false)

      assert.equal(sentMessages.length, 2)
      assert.equal(sentMessages[0].streamerId, 'streamer-1')
      assert.equal(sentMessages[1].streamerId, 'streamer-2')
    } finally {
      restore()
    }
  })

  test('should return early without broadcasting when no channel links exist', async ({
    assert,
  }) => {
    let broadcastCalled = false
    const mockChatService = {
      sendMessage: async () => {
        broadcastCalled = true
      },
    }

    const mockRepository = createMockChannelLinkRepository([])
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      const pollInstance = createMockPollInstance()
      const aggregated = createMockAggregated()

      await service.announceResults(pollInstance as any, aggregated, false)

      assert.isFalse(broadcastCalled)
    } finally {
      restore()
    }
  })

  test('should pass isCancelled=true flag when poll is cancelled', async ({ assert }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }]
    let capturedMessage = ''

    const mockChatService = {
      sendMessage: async (_streamerId: string, message: string) => {
        capturedMessage = message
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      const pollInstance = createMockPollInstance()
      const aggregated = createMockAggregated()

      await service.announceResults(pollInstance as any, aggregated, true)

      assert.include(capturedMessage, '(Annulé)')
    } finally {
      restore()
    }
  })

  test('should pass isCancelled=false flag when poll ends normally', async ({ assert }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }]
    let capturedMessage = ''

    const mockChatService = {
      sendMessage: async (_streamerId: string, message: string) => {
        capturedMessage = message
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      const pollInstance = createMockPollInstance()
      const aggregated = createMockAggregated()

      await service.announceResults(pollInstance as any, aggregated, false)

      assert.notInclude(capturedMessage, '(Annulé)')
    } finally {
      restore()
    }
  })

  test('should continue broadcasting even when individual streamers fail', async ({ assert }) => {
    const channelLinks = [
      { streamerId: 'streamer-ok' },
      { streamerId: 'streamer-fail' },
      { streamerId: 'streamer-ok-2' },
    ]

    const successfulStreamers: string[] = []
    const mockChatService = {
      sendMessage: async (streamerId: string) => {
        if (streamerId === 'streamer-fail') {
          throw new Error('Chat service unavailable')
        }
        successfulStreamers.push(streamerId)
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      const pollInstance = createMockPollInstance()
      const aggregated = createMockAggregated()

      // Should not throw — Promise.allSettled handles individual failures
      await service.announceResults(pollInstance as any, aggregated, false)

      assert.equal(successfulStreamers.length, 2)
      assert.include(successfulStreamers, 'streamer-ok')
      assert.include(successfulStreamers, 'streamer-ok-2')
    } finally {
      restore()
    }
  })
})

// ---------------------------------------------------------------------------
// buildResultsMessage — message format (tested via announceResults)
// ---------------------------------------------------------------------------

test.group('PollResultsAnnouncementService - buildResultsMessage', () => {
  test('should include the poll title in the header', async ({ assert }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }]
    let capturedMessage = ''

    const mockChatService = {
      sendMessage: async (_streamerId: string, message: string) => {
        capturedMessage = message
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      const pollInstance = createMockPollInstance({ title: 'Who should fight the dragon?' })
      const aggregated = createMockAggregated()

      await service.announceResults(pollInstance as any, aggregated, false)

      assert.include(capturedMessage, 'Who should fight the dragon?')
      assert.include(capturedMessage, 'RÉSULTATS DU SONDAGE')
      assert.include(capturedMessage, '📊')
    } finally {
      restore()
    }
  })

  test('should show (Annulé) suffix in header when poll is cancelled', async ({ assert }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }]
    let capturedMessage = ''

    const mockChatService = {
      sendMessage: async (_streamerId: string, message: string) => {
        capturedMessage = message
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      const pollInstance = createMockPollInstance()
      const aggregated = createMockAggregated()

      await service.announceResults(pollInstance as any, aggregated, true)

      assert.include(capturedMessage, 'RÉSULTATS DU SONDAGE (Annulé)')
    } finally {
      restore()
    }
  })

  test('should show total votes in the footer', async ({ assert }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }]
    let capturedMessage = ''

    const mockChatService = {
      sendMessage: async (_streamerId: string, message: string) => {
        capturedMessage = message
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      const pollInstance = createMockPollInstance()
      const aggregated = createMockAggregated({ totalVotes: 100 })

      await service.announceResults(pollInstance as any, aggregated, false)

      assert.include(capturedMessage, 'Total: 100 votes')
    } finally {
      restore()
    }
  })

  test('should display options with their percentage and vote count', async ({ assert }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }]
    let capturedMessage = ''

    const mockChatService = {
      sendMessage: async (_streamerId: string, message: string) => {
        capturedMessage = message
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      const pollInstance = createMockPollInstance({
        options: ['Warrior', 'Mage', 'Rogue'],
      })
      const aggregated = createMockAggregated({
        votesByOption: { '0': 40, '1': 35, '2': 25 },
        totalVotes: 100,
        percentages: { '0': 40, '1': 35, '2': 25 },
      })

      await service.announceResults(pollInstance as any, aggregated, false)

      assert.include(capturedMessage, 'Warrior')
      assert.include(capturedMessage, '40%')
      assert.include(capturedMessage, '40 votes')
      assert.include(capturedMessage, 'Mage')
      assert.include(capturedMessage, '35%')
      assert.include(capturedMessage, 'Rogue')
      assert.include(capturedMessage, '25%')
    } finally {
      restore()
    }
  })

  test('should show égalité label and shared vote count for tied options', async ({ assert }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }]
    let capturedMessage = ''

    const mockChatService = {
      sendMessage: async (_streamerId: string, message: string) => {
        capturedMessage = message
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      // Options A and B are tied at 50% each
      const pollInstance = createMockPollInstance({
        options: ['Option A', 'Option B'],
      })
      const aggregated = createMockAggregated({
        votesByOption: { '0': 50, '1': 50 },
        totalVotes: 100,
        percentages: { '0': 50, '1': 50 },
      })

      await service.announceResults(pollInstance as any, aggregated, false)

      assert.include(capturedMessage, 'égalité')
      assert.include(capturedMessage, 'Option A')
      assert.include(capturedMessage, 'Option B')
      assert.include(capturedMessage, '50%')
      assert.include(capturedMessage, '50 votes chacun')
    } finally {
      restore()
    }
  })

  test('should handle single option winner without égalité label', async ({ assert }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }]
    let capturedMessage = ''

    const mockChatService = {
      sendMessage: async (_streamerId: string, message: string) => {
        capturedMessage = message
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      const pollInstance = createMockPollInstance({
        options: ['Solo Winner'],
      })
      const aggregated = createMockAggregated({
        votesByOption: { '0': 100 },
        totalVotes: 100,
        percentages: { '0': 100 },
      })

      await service.announceResults(pollInstance as any, aggregated, false)

      assert.include(capturedMessage, 'Solo Winner')
      assert.include(capturedMessage, '100%')
      assert.include(capturedMessage, '100 votes')
      assert.notInclude(capturedMessage, 'égalité')
    } finally {
      restore()
    }
  })
})

// ---------------------------------------------------------------------------
// groupOptionsByRank — ranking logic (tested via announceResults message content)
// ---------------------------------------------------------------------------

test.group('PollResultsAnnouncementService - groupOptionsByRank', () => {
  test('should sort options by percentage descending', async ({ assert }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }]
    let capturedMessage = ''

    const mockChatService = {
      sendMessage: async (_streamerId: string, message: string) => {
        capturedMessage = message
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      // Options in declaration order: Rogue (25%), Warrior (40%), Mage (35%)
      // Expected rank order: Warrior > Mage > Rogue
      const pollInstance = createMockPollInstance({
        options: ['Rogue', 'Warrior', 'Mage'],
      })
      const aggregated = createMockAggregated({
        votesByOption: { '0': 25, '1': 40, '2': 35 },
        totalVotes: 100,
        percentages: { '0': 25, '1': 40, '2': 35 },
      })

      await service.announceResults(pollInstance as any, aggregated, false)

      const warriorPos = capturedMessage.indexOf('Warrior')
      const magePos = capturedMessage.indexOf('Mage')
      const roguePos = capturedMessage.indexOf('Rogue')

      assert.isTrue(warriorPos < magePos, 'Warrior (40%) should appear before Mage (35%)')
      assert.isTrue(magePos < roguePos, 'Mage (35%) should appear before Rogue (25%)')
    } finally {
      restore()
    }
  })

  test('should assign rank 2 to the second-place option after a single winner', async ({
    assert,
  }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }]
    let capturedMessage = ''

    const mockChatService = {
      sendMessage: async (_streamerId: string, message: string) => {
        capturedMessage = message
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      const pollInstance = createMockPollInstance({
        options: ['Alpha', 'Beta', 'Gamma'],
      })
      // Alpha wins alone → rank 1. Beta and Gamma tie → rank 2
      const aggregated = createMockAggregated({
        votesByOption: { '0': 60, '1': 20, '2': 20 },
        totalVotes: 100,
        percentages: { '0': 60, '1': 20, '2': 20 },
      })

      await service.announceResults(pollInstance as any, aggregated, false)

      // Rank 1 icon for Alpha
      assert.include(capturedMessage, '🥇')
      // Beta and Gamma tie at rank 2
      assert.include(capturedMessage, '🥈')
      assert.include(capturedMessage, 'Beta')
      assert.include(capturedMessage, 'Gamma')
      assert.include(capturedMessage, 'égalité')
    } finally {
      restore()
    }
  })

  test('should skip rank 2 and assign rank 3 after a two-way tie at rank 1', async ({ assert }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }]
    let capturedMessage = ''

    const mockChatService = {
      sendMessage: async (_streamerId: string, message: string) => {
        capturedMessage = message
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      // A and B tie at rank 1 (2 options occupy rank 1 and 2, so C gets rank 3)
      const pollInstance = createMockPollInstance({
        options: ['Alpha', 'Beta', 'Gamma'],
      })
      const aggregated = createMockAggregated({
        votesByOption: { '0': 40, '1': 40, '2': 20 },
        totalVotes: 100,
        percentages: { '0': 40, '1': 40, '2': 20 },
      })

      await service.announceResults(pollInstance as any, aggregated, false)

      // Alpha and Beta tie at rank 1
      assert.include(capturedMessage, '🥇')
      assert.include(capturedMessage, 'Alpha')
      assert.include(capturedMessage, 'Beta')
      assert.include(capturedMessage, 'égalité')
      // Gamma gets rank 3 (skipping rank 2)
      assert.include(capturedMessage, '🥉')
      assert.include(capturedMessage, 'Gamma')
      // Silver medal should NOT appear
      assert.notInclude(capturedMessage, '🥈')
    } finally {
      restore()
    }
  })

  test('should handle all options with zero votes', async ({ assert }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }]
    let capturedMessage = ''

    const mockChatService = {
      sendMessage: async (_streamerId: string, message: string) => {
        capturedMessage = message
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      const pollInstance = createMockPollInstance({
        options: ['Option A', 'Option B', 'Option C'],
      })
      const aggregated = createMockAggregated({
        votesByOption: { '0': 0, '1': 0, '2': 0 },
        totalVotes: 0,
        percentages: { '0': 0, '1': 0, '2': 0 },
      })

      await service.announceResults(pollInstance as any, aggregated, false)

      // All options tied at 0% — all share rank 1
      assert.include(capturedMessage, 'Total: 0 votes')
      assert.include(capturedMessage, '0%')
      assert.include(capturedMessage, 'égalité')
      // All three options appear together
      assert.include(capturedMessage, 'Option A')
      assert.include(capturedMessage, 'Option B')
      assert.include(capturedMessage, 'Option C')
    } finally {
      restore()
    }
  })
})

// ---------------------------------------------------------------------------
// getRankIcon — emoji for ranks (tested via announceResults message content)
// ---------------------------------------------------------------------------

test.group('PollResultsAnnouncementService - getRankIcon', () => {
  test('should use gold medal for rank 1', async ({ assert }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }]
    let capturedMessage = ''

    const mockChatService = {
      sendMessage: async (_streamerId: string, message: string) => {
        capturedMessage = message
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      const pollInstance = createMockPollInstance({ options: ['Only Option'] })
      const aggregated = createMockAggregated({
        votesByOption: { '0': 100 },
        totalVotes: 100,
        percentages: { '0': 100 },
      })

      await service.announceResults(pollInstance as any, aggregated, false)

      assert.include(capturedMessage, '🥇')
    } finally {
      restore()
    }
  })

  test('should use silver medal for rank 2', async ({ assert }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }]
    let capturedMessage = ''

    const mockChatService = {
      sendMessage: async (_streamerId: string, message: string) => {
        capturedMessage = message
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      const pollInstance = createMockPollInstance({ options: ['Winner', 'Runner-up'] })
      const aggregated = createMockAggregated({
        votesByOption: { '0': 70, '1': 30 },
        totalVotes: 100,
        percentages: { '0': 70, '1': 30 },
      })

      await service.announceResults(pollInstance as any, aggregated, false)

      assert.include(capturedMessage, '🥈')
    } finally {
      restore()
    }
  })

  test('should use bronze medal for rank 3', async ({ assert }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }]
    let capturedMessage = ''

    const mockChatService = {
      sendMessage: async (_streamerId: string, message: string) => {
        capturedMessage = message
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      const pollInstance = createMockPollInstance({
        options: ['First', 'Second', 'Third'],
      })
      const aggregated = createMockAggregated({
        votesByOption: { '0': 50, '1': 30, '2': 20 },
        totalVotes: 100,
        percentages: { '0': 50, '1': 30, '2': 20 },
      })

      await service.announceResults(pollInstance as any, aggregated, false)

      assert.include(capturedMessage, '🥉')
    } finally {
      restore()
    }
  })

  test('should use keycap emoji for rank 4', async ({ assert }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }]
    let capturedMessage = ''

    const mockChatService = {
      sendMessage: async (_streamerId: string, message: string) => {
        capturedMessage = message
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      const pollInstance = createMockPollInstance({
        options: ['First', 'Second', 'Third', 'Fourth'],
      })
      const aggregated = createMockAggregated({
        votesByOption: { '0': 40, '1': 30, '2': 20, '3': 10 },
        totalVotes: 100,
        percentages: { '0': 40, '1': 30, '2': 20, '3': 10 },
      })

      await service.announceResults(pollInstance as any, aggregated, false)

      assert.include(capturedMessage, '4️⃣')
    } finally {
      restore()
    }
  })

  test('should use keycap emoji for rank 5', async ({ assert }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }]
    let capturedMessage = ''

    const mockChatService = {
      sendMessage: async (_streamerId: string, message: string) => {
        capturedMessage = message
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      const pollInstance = createMockPollInstance({
        options: ['First', 'Second', 'Third', 'Fourth', 'Fifth'],
      })
      const aggregated = createMockAggregated({
        votesByOption: { '0': 35, '1': 25, '2': 20, '3': 12, '4': 8 },
        totalVotes: 100,
        percentages: { '0': 35, '1': 25, '2': 20, '3': 12, '4': 8 },
      })

      await service.announceResults(pollInstance as any, aggregated, false)

      assert.include(capturedMessage, '5️⃣')
    } finally {
      restore()
    }
  })
})

// ---------------------------------------------------------------------------
// broadcastResults — parallel sending
// ---------------------------------------------------------------------------

test.group('PollResultsAnnouncementService - broadcastResults', () => {
  test('should send the same message to every streamer in the channel links', async ({
    assert,
  }) => {
    const channelLinks = [
      { streamerId: 'streamer-a' },
      { streamerId: 'streamer-b' },
      { streamerId: 'streamer-c' },
    ]

    const receivedBy: string[] = []
    const mockChatService = {
      sendMessage: async (streamerId: string) => {
        receivedBy.push(streamerId)
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)
      await service.announceResults(createMockPollInstance() as any, createMockAggregated(), false)

      assert.equal(receivedBy.length, 3)
      assert.includeMembers(receivedBy, ['streamer-a', 'streamer-b', 'streamer-c'])
    } finally {
      restore()
    }
  })

  test('should not throw when all streamers fail to receive the message', async ({ assert }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }, { streamerId: 'streamer-2' }]

    const mockChatService = {
      sendMessage: async () => {
        throw new Error('Network error')
      },
    }

    const mockRepository = createMockChannelLinkRepository(channelLinks)
    const restore = patchContainerMake(mockChatService)

    try {
      const service = new PollResultsAnnouncementService(mockRepository as any)

      // Promise.allSettled means the outer call should never reject
      await assert.doesNotReject(() =>
        service.announceResults(createMockPollInstance() as any, createMockAggregated(), false)
      )
    } finally {
      restore()
    }
  })

  test('should resolve twitchChatService from the IoC container exactly once per call', async ({
    assert,
  }) => {
    const channelLinks = [{ streamerId: 'streamer-1' }, { streamerId: 'streamer-2' }]

    let containerMakeCalls = 0
    const originalMake = app.container.make.bind(app.container)
    ;(app.container as any).make = async (binding: any, ...rest: any[]) => {
      if (binding === 'twitchChatService') {
        containerMakeCalls++
        return { sendMessage: async () => {} }
      }
      return originalMake(binding, ...rest)
    }

    try {
      const mockRepository = createMockChannelLinkRepository(channelLinks)
      const service = new PollResultsAnnouncementService(mockRepository as any)

      await service.announceResults(createMockPollInstance() as any, createMockAggregated(), false)

      assert.equal(containerMakeCalls, 1)
    } finally {
      ;(app.container as any).make = originalMake
    }
  })
})
