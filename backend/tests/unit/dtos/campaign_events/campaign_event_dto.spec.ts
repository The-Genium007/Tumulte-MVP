import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import {
  CampaignEventDto,
  type GamificationEventMetadata,
  type PollEventMetadata,
} from '#dtos/campaign_events/campaign_event_dto'
import type { pollInstance as PollInstance } from '#models/poll_instance'
import type GamificationInstance from '#models/gamification_instance'
import type GamificationEvent from '#models/gamification_event'

/**
 * Unit tests for CampaignEventDto
 *
 * Tests the transformation of PollInstance and GamificationInstance models
 * into a unified campaign event DTO for the "Recent Events" display.
 */

// ==========================================
// MOCK FACTORIES
// ==========================================

function createMockPollInstance(overrides: Partial<PollInstance> = {}): Partial<PollInstance> {
  const now = DateTime.now()
  return {
    id: 'poll-123',
    title: 'What should the party do?',
    options: ['Attack', 'Flee', 'Negotiate'],
    status: 'ENDED',
    durationSeconds: 60,
    type: 'STANDARD',
    channelPointsEnabled: false,
    channelPointsAmount: null,
    finalTotalVotes: null,
    finalVotesByOption: null,
    startedAt: now.minus({ minutes: 10 }),
    endedAt: now.minus({ minutes: 5 }),
    createdAt: now.minus({ minutes: 15 }),
    updatedAt: now.minus({ minutes: 5 }),
    ...overrides,
  }
}

function createMockGamificationEvent(
  overrides: Partial<GamificationEvent> = {}
): Partial<GamificationEvent> {
  return {
    id: 'event-456',
    slug: 'dice_reverse',
    name: 'Inversion 2D',
    type: 'individual',
    triggerType: 'dice_critical',
    actionType: 'dice_invert',
    rewardColor: '#FF6B00',
    ...overrides,
  }
}

function createMockGamificationInstance(
  overrides: Partial<GamificationInstance> = {}
): Partial<GamificationInstance> {
  const now = DateTime.now()
  return {
    id: 'gamif-789',
    campaignId: 'campaign-123',
    eventId: 'event-456',
    type: 'individual',
    status: 'completed',
    triggerData: null,
    objectiveTarget: 100,
    currentProgress: 100,
    duration: 300,
    startsAt: now.minus({ minutes: 10 }),
    expiresAt: now.minus({ minutes: 5 }),
    completedAt: now.minus({ minutes: 5 }),
    resultData: {
      success: true,
      message: 'Successfully inverted the dice roll!',
    },
    cooldownEndsAt: null,
    streamerId: 'streamer-123',
    viewerCountAtStart: 50,
    streamerSnapshots: null,
    armedAt: null,
    createdAt: now.minus({ minutes: 15 }),
    updatedAt: now.minus({ minutes: 5 }),
    event: createMockGamificationEvent() as any,
    get isActive() {
      return this.status === 'active'
    },
    get isArmed() {
      return this.status === 'armed'
    },
    get isObjectiveReached() {
      return (this.currentProgress ?? 0) >= (this.objectiveTarget ?? 0)
    },
    get progressPercentage() {
      if (!this.objectiveTarget) return 100
      return Math.min(100, Math.round(((this.currentProgress ?? 0) / this.objectiveTarget) * 100))
    },
    get remainingSeconds() {
      if (this.status !== 'active') return 0
      return Math.max(
        0,
        Math.round((this.expiresAt as DateTime).diff(DateTime.now(), 'seconds').seconds)
      )
    },
    ...overrides,
  }
}

// ==========================================
// TESTS: typeConfig
// ==========================================

test.group('CampaignEventDto - typeConfig', () => {
  test('should have configuration for poll type', async ({ assert }) => {
    const config = CampaignEventDto.typeConfig.poll

    assert.exists(config)
    assert.equal(config.icon, 'i-lucide-bar-chart-2')
    assert.equal(config.iconColor, 'text-success-600')
    assert.equal(config.label, 'Sondage')
  })

  test('should have configuration for gamification_dice_reverse type', async ({ assert }) => {
    const config = CampaignEventDto.typeConfig.gamification_dice_reverse

    assert.exists(config)
    assert.equal(config.icon, 'i-lucide-dice-5')
    assert.equal(config.iconColor, 'text-orange-500')
    assert.equal(config.label, 'Inversion 2D')
  })

  test('should have exactly two event types configured', async ({ assert }) => {
    const types = Object.keys(CampaignEventDto.typeConfig)
    assert.lengthOf(types, 2)
    assert.includeMembers(types, ['poll', 'gamification_dice_reverse'])
  })
})

// ==========================================
// TESTS: fromPollInstance
// ==========================================

test.group('CampaignEventDto - fromPollInstance', () => {
  test('should convert a basic poll instance without votes', async ({ assert }) => {
    const poll = createMockPollInstance()
    const dto = CampaignEventDto.fromPollInstance(poll as PollInstance)

    assert.equal(dto.id, 'poll_poll-123')
    assert.equal(dto.type, 'poll')
    assert.equal(dto.name, 'What should the party do?')
    assert.equal(dto.icon, 'i-lucide-bar-chart-2')
    assert.equal(dto.iconColor, 'text-success-600')

    // Primary result for no votes
    assert.equal(dto.primaryResult.emoji, '📊')
    assert.equal(dto.primaryResult.text, 'Aucun vote')
    assert.isFalse(dto.primaryResult.success)
    assert.isFalse(dto.primaryResult.isExAequo)

    // Metadata
    const meta = dto.metadata as PollEventMetadata
    assert.equal(meta.pollInstanceId, 'poll-123')
    assert.deepEqual(meta.options, ['Attack', 'Flee', 'Negotiate'])
    assert.equal(meta.totalVotes, 0)
    assert.deepEqual(meta.votesByOption, {})
    assert.deepEqual(meta.winningOptions, [])
    assert.isFalse(meta.isCancelled)
  })

  test('should convert poll instance with votes showing winner', async ({ assert }) => {
    const poll = createMockPollInstance()
    const aggregatedResults = {
      votesByOption: { '0': 15, '1': 5, '2': 10 }, // Attack wins
      totalVotes: 30,
    }

    const dto = CampaignEventDto.fromPollInstance(poll as PollInstance, aggregatedResults)

    // Primary result shows winner
    assert.equal(dto.primaryResult.emoji, '📊')
    assert.equal(dto.primaryResult.text, 'Attack')
    assert.isTrue(dto.primaryResult.success)
    assert.isFalse(dto.primaryResult.isExAequo)

    // Metadata with mapped vote counts
    const meta = dto.metadata as PollEventMetadata
    assert.equal(meta.totalVotes, 30)
    assert.deepEqual(meta.votesByOption, {
      Attack: 15,
      Flee: 5,
      Negotiate: 10,
    })
    assert.deepEqual(meta.winningOptions, ['Attack'])
  })

  test('should convert poll instance with ex-aequo (tie)', async ({ assert }) => {
    const poll = createMockPollInstance()
    const aggregatedResults = {
      votesByOption: { '0': 10, '1': 10, '2': 5 }, // Attack and Flee tied
      totalVotes: 25,
    }

    const dto = CampaignEventDto.fromPollInstance(poll as PollInstance, aggregatedResults)

    // Primary result shows tie
    assert.equal(dto.primaryResult.emoji, '📊')
    assert.equal(dto.primaryResult.text, 'Égalité')
    assert.isTrue(dto.primaryResult.success)
    assert.isTrue(dto.primaryResult.isExAequo)

    // Metadata shows both winning options
    const meta = dto.metadata as PollEventMetadata
    assert.equal(meta.totalVotes, 25)
    assert.lengthOf(meta.winningOptions, 2)
    assert.includeMembers(meta.winningOptions, ['Attack', 'Flee'])
  })

  test('should convert cancelled poll instance', async ({ assert }) => {
    const poll = createMockPollInstance({ status: 'CANCELLED' })
    const aggregatedResults = {
      votesByOption: { '0': 5, '1': 3, '2': 2 },
      totalVotes: 10,
    }

    const dto = CampaignEventDto.fromPollInstance(poll as PollInstance, aggregatedResults)

    // Primary result shows cancelled
    assert.equal(dto.primaryResult.emoji, '❌')
    assert.equal(dto.primaryResult.text, 'Annulé')
    assert.isFalse(dto.primaryResult.success)
    assert.isFalse(dto.primaryResult.isExAequo)

    // Metadata still contains vote data
    const meta = dto.metadata as PollEventMetadata
    assert.isTrue(meta.isCancelled)
    assert.equal(meta.totalVotes, 10)
  })

  test('should handle poll with options as stringified JSON', async ({ assert }) => {
    const poll = createMockPollInstance({
      options: '["Option A","Option B","Option C"]' as any,
    })
    const aggregatedResults = {
      votesByOption: { '0': 20, '1': 10, '2': 5 },
      totalVotes: 35,
    }

    const dto = CampaignEventDto.fromPollInstance(poll as PollInstance, aggregatedResults)

    // Should correctly parse and map options
    const meta = dto.metadata as PollEventMetadata
    assert.deepEqual(meta.options, ['Option A', 'Option B', 'Option C'])
    assert.deepEqual(meta.votesByOption, {
      'Option A': 20,
      'Option B': 10,
      'Option C': 5,
    })
    assert.equal(dto.primaryResult.text, 'Option A')
  })

  test('should use endedAt for completedAt if available, otherwise updatedAt', async ({
    assert,
  }) => {
    const endedTime = DateTime.now().minus({ hours: 1 })
    const updatedTime = DateTime.now()

    const pollWithEndedAt = createMockPollInstance({
      endedAt: endedTime,
      updatedAt: updatedTime,
    })
    const dto1 = CampaignEventDto.fromPollInstance(pollWithEndedAt as PollInstance)
    assert.equal(dto1.completedAt, endedTime.toISO())

    const pollWithoutEndedAt = createMockPollInstance({
      endedAt: null,
      updatedAt: updatedTime,
    })
    const dto2 = CampaignEventDto.fromPollInstance(pollWithoutEndedAt as PollInstance)
    assert.equal(dto2.completedAt, updatedTime.toISO())
  })

  test('should handle empty options array gracefully', async ({ assert }) => {
    const poll = createMockPollInstance({ options: [] })
    const dto = CampaignEventDto.fromPollInstance(poll as PollInstance)

    const meta = dto.metadata as PollEventMetadata
    assert.deepEqual(meta.options, [])
    assert.deepEqual(meta.votesByOption, {})
    assert.deepEqual(meta.winningOptions, [])
  })

  test('should handle votes with missing option indices', async ({ assert }) => {
    const poll = createMockPollInstance({ options: ['A', 'B'] })
    const aggregatedResults = {
      votesByOption: { '5': 10 }, // Index 5 doesn't exist in options
      totalVotes: 10,
    }

    const dto = CampaignEventDto.fromPollInstance(poll as PollInstance, aggregatedResults)

    // Should create fallback option name
    const meta = dto.metadata as PollEventMetadata
    assert.deepEqual(meta.votesByOption, {
      'Option 6': 10,
    })
  })
})

// ==========================================
// TESTS: fromGamificationInstance
// ==========================================

test.group('CampaignEventDto - fromGamificationInstance', () => {
  test('should convert basic gamification instance with success', async ({ assert }) => {
    const instance = createMockGamificationInstance({
      status: 'completed',
      resultData: { success: true, message: 'Dice inverted!' },
    })

    const dto = CampaignEventDto.fromGamificationInstance(instance as GamificationInstance)

    assert.equal(dto.id, 'gamification_gamif-789')
    assert.equal(dto.type, 'gamification_dice_reverse')
    assert.equal(dto.name, 'Inversion 2D')
    assert.equal(dto.icon, 'i-lucide-dice-5')
    assert.equal(dto.iconColor, 'text-orange-500')

    // Primary result
    assert.equal(dto.primaryResult.emoji, '🎲') // No criticalType = default emoji
    assert.equal(dto.primaryResult.text, 'Personnage') // No character name = default
    assert.isTrue(dto.primaryResult.success)

    // Metadata
    const metadata = dto.metadata as GamificationEventMetadata
    assert.equal(metadata.instanceId, 'gamif-789')
    assert.equal(metadata.eventSlug, 'dice_reverse')
    assert.equal(metadata.eventName, 'Inversion 2D')
    assert.equal(metadata.objectiveTarget, 100)
    assert.equal(metadata.currentProgress, 100)
    assert.equal(metadata.progressPercentage, 100)
    assert.equal(metadata.duration, 300)
    assert.isNotNull(metadata.resultData)
    assert.isTrue(metadata.resultData!.success)
    assert.equal(metadata.resultData!.message, 'Dice inverted!')
  })

  test('should convert gamification instance with trigger data (dice roll)', async ({ assert }) => {
    const instance = createMockGamificationInstance({
      triggerData: {
        diceRoll: {
          rollId: 'roll-123',
          characterId: 'char-456',
          characterName: 'Gandalf',
          formula: '1d20+5',
          result: 18,
          diceResults: [13],
          criticalType: 'success',
          messageId: 'msg-789',
        },
      },
    })

    const dto = CampaignEventDto.fromGamificationInstance(instance as GamificationInstance)

    // Primary result uses character name and success emoji
    assert.equal(dto.primaryResult.emoji, '⚔️')
    assert.equal(dto.primaryResult.text, 'Gandalf')

    // Metadata includes trigger data
    const metadata = dto.metadata as GamificationEventMetadata
    assert.isNotNull(metadata.triggerData)
    assert.equal(metadata.triggerData!.characterName, 'Gandalf')
    assert.equal(metadata.triggerData!.characterId, 'char-456')
    assert.equal(metadata.triggerData!.formula, '1d20+5')
    assert.equal(metadata.triggerData!.result, 18)
    assert.equal(metadata.triggerData!.criticalType, 'success')
  })

  test('should convert gamification instance without trigger data', async ({ assert }) => {
    const instance = createMockGamificationInstance({
      triggerData: null,
    })

    const dto = CampaignEventDto.fromGamificationInstance(instance as GamificationInstance)

    // Should handle gracefully
    assert.equal(dto.primaryResult.emoji, '🎲')
    assert.equal(dto.primaryResult.text, 'Personnage')

    const metadata = dto.metadata as GamificationEventMetadata
    assert.isNull(metadata.triggerData)
  })

  test('should use success emoji (⚔️) for criticalType success', async ({ assert }) => {
    const instance = createMockGamificationInstance({
      triggerData: {
        diceRoll: {
          rollId: 'roll-123',
          characterId: 'char-456',
          characterName: 'Hero',
          formula: '1d20',
          result: 20,
          diceResults: [20],
          criticalType: 'success',
        },
      },
    })

    const dto = CampaignEventDto.fromGamificationInstance(instance as GamificationInstance)

    assert.equal(dto.primaryResult.emoji, '⚔️')
    assert.equal(dto.primaryResult.text, 'Hero')
  })

  test('should use failure emoji (💀) for criticalType failure', async ({ assert }) => {
    const instance = createMockGamificationInstance({
      triggerData: {
        diceRoll: {
          rollId: 'roll-123',
          characterId: 'char-456',
          characterName: 'Unlucky Bob',
          formula: '1d20',
          result: 1,
          diceResults: [1],
          criticalType: 'failure',
        },
      },
    })

    const dto = CampaignEventDto.fromGamificationInstance(instance as GamificationInstance)

    assert.equal(dto.primaryResult.emoji, '💀')
    assert.equal(dto.primaryResult.text, 'Unlucky Bob')
  })

  test('should use default emoji (🎲) when no criticalType', async ({ assert }) => {
    const instance = createMockGamificationInstance({
      triggerData: {
        diceRoll: {
          rollId: 'roll-123',
          characterId: 'char-456',
          characterName: 'Regular Joe',
          formula: '1d20',
          result: 12,
          diceResults: [12],
          criticalType: undefined as any,
        },
      },
    })

    const dto = CampaignEventDto.fromGamificationInstance(instance as GamificationInstance)

    assert.equal(dto.primaryResult.emoji, '🎲')
  })

  test('should set success to false when status is not completed', async ({ assert }) => {
    const instance = createMockGamificationInstance({
      status: 'expired',
      resultData: { success: false, message: 'Time ran out' },
    })

    const dto = CampaignEventDto.fromGamificationInstance(instance as GamificationInstance)

    assert.isFalse(dto.primaryResult.success)
  })

  test('should set success to false when resultData indicates failure', async ({ assert }) => {
    const instance = createMockGamificationInstance({
      status: 'completed',
      resultData: { success: false, message: 'Failed to invert dice' },
    })

    const dto = CampaignEventDto.fromGamificationInstance(instance as GamificationInstance)

    assert.isFalse(dto.primaryResult.success)
  })

  test('should use completedAt if available, otherwise updatedAt', async ({ assert }) => {
    const completedTime = DateTime.now().minus({ hours: 2 })
    const updatedTime = DateTime.now()

    const instanceWithCompletedAt = createMockGamificationInstance({
      completedAt: completedTime,
      updatedAt: updatedTime,
    })
    const dto1 = CampaignEventDto.fromGamificationInstance(
      instanceWithCompletedAt as GamificationInstance
    )
    assert.equal(dto1.completedAt, completedTime.toISO())

    const instanceWithoutCompletedAt = createMockGamificationInstance({
      completedAt: null,
      updatedAt: updatedTime,
    })
    const dto2 = CampaignEventDto.fromGamificationInstance(
      instanceWithoutCompletedAt as GamificationInstance
    )
    assert.equal(dto2.completedAt, updatedTime.toISO())
  })

  test('should handle missing event relation gracefully', async ({ assert }) => {
    const instance = createMockGamificationInstance({
      event: undefined as any,
    })

    const dto = CampaignEventDto.fromGamificationInstance(instance as GamificationInstance)

    // Should use fallback values
    assert.equal(dto.name, 'Inversion 2D')
    const metadata = dto.metadata as GamificationEventMetadata
    assert.equal(metadata.eventSlug, 'dice_reverse')
    assert.equal(metadata.eventName, 'Inversion 2D')
  })

  test('should handle null resultData', async ({ assert }) => {
    const instance = createMockGamificationInstance({
      status: 'expired',
      resultData: null,
    })

    const dto = CampaignEventDto.fromGamificationInstance(instance as GamificationInstance)

    const metadata = dto.metadata as GamificationEventMetadata
    assert.isNull(metadata.resultData)
    assert.isFalse(dto.primaryResult.success)
  })
})

// ==========================================
// TESTS: addTopContributors
// ==========================================

test.group('CampaignEventDto - addTopContributors', () => {
  test('should add top contributors to gamification event', async ({ assert }) => {
    const instance = createMockGamificationInstance()
    const dto = CampaignEventDto.fromGamificationInstance(instance as GamificationInstance)

    const contributors = [
      { twitchUsername: 'viewer1', amount: 50 },
      { twitchUsername: 'viewer2', amount: 30 },
      { twitchUsername: 'viewer3', amount: 20 },
    ]

    const updatedDto = CampaignEventDto.addTopContributors(dto, contributors)

    const metadata = updatedDto.metadata as GamificationEventMetadata
    assert.isNotNull(metadata.topContributors)
    assert.lengthOf(metadata.topContributors!, 3)
    assert.deepEqual(metadata.topContributors, contributors)
  })

  test('should not modify poll event when adding contributors', async ({ assert }) => {
    const poll = createMockPollInstance()
    const dto = CampaignEventDto.fromPollInstance(poll as PollInstance)

    const contributors = [{ twitchUsername: 'viewer1', amount: 50 }]

    const updatedDto = CampaignEventDto.addTopContributors(dto, contributors)

    // Poll metadata should not have topContributors
    assert.isUndefined((updatedDto.metadata as any).topContributors)
  })

  test('should handle empty contributors array', async ({ assert }) => {
    const instance = createMockGamificationInstance()
    const dto = CampaignEventDto.fromGamificationInstance(instance as GamificationInstance)

    const updatedDto = CampaignEventDto.addTopContributors(dto, [])

    const metadata = updatedDto.metadata as GamificationEventMetadata
    assert.deepEqual(metadata.topContributors, [])
  })

  test('should return the same DTO reference (mutates in place)', async ({ assert }) => {
    const instance = createMockGamificationInstance()
    const dto = CampaignEventDto.fromGamificationInstance(instance as GamificationInstance)

    const contributors = [{ twitchUsername: 'viewer1', amount: 10 }]
    const updatedDto = CampaignEventDto.addTopContributors(dto, contributors)

    // Should be the same object reference
    assert.strictEqual(updatedDto, dto)
  })
})
