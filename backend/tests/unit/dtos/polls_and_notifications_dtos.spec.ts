import { test } from '@japa/runner'
import { PollTemplateDto, PollDto, PollInstanceDto, PollResultsDto } from '#dtos/polls/poll_dto'
import { NotificationPreferenceDto } from '#dtos/notifications/notification_preference_dto'
import { PushSubscriptionDto } from '#dtos/notifications/push_subscription_dto'
import {
  GamificationConfigDto,
  GamificationConfigEffectiveDto,
} from '#dtos/gamification/gamification_config_dto'
import type { pollTemplate as PollTemplate } from '#models/poll_template'
import type { poll as Poll } from '#models/poll'
import type { pollInstance as PollInstance } from '#models/poll_instance'
import type NotificationPreference from '#models/notification_preference'
import type PushSubscription from '#models/push_subscription'
import type CampaignGamificationConfig from '#models/campaign_gamification_config'

/**
 * Unit tests for Poll, Notification, and Gamification Config DTOs.
 *
 * Covers: PollTemplateDto, PollDto, PollInstanceDto, PollResultsDto,
 *         NotificationPreferenceDto, PushSubscriptionDto,
 *         GamificationConfigDto, GamificationConfigEffectiveDto
 */

// ==========================================
// HELPER: Mock DateTime factory
// ==========================================

function createMockDateTime(isoString: string) {
  return { toISO: () => isoString }
}

// ==========================================
// MOCK FACTORIES
// ==========================================

function createMockPollTemplate(overrides: Partial<PollTemplate> = {}): Partial<PollTemplate> {
  return {
    id: 'template-001',
    ownerId: 'user-abc',
    campaignId: 'campaign-xyz',
    label: 'Exploration template',
    title: 'Where should the party go?',
    options: ['Forest', 'Mountains', 'Desert'],
    durationSeconds: 60,
    createdAt: createMockDateTime('2025-01-01T10:00:00.000Z') as any,
    updatedAt: createMockDateTime('2025-01-02T10:00:00.000Z') as any,
    ...overrides,
  }
}

function createMockPoll(overrides: Partial<Poll> = {}): Partial<Poll> {
  return {
    id: 'poll-001',
    campaignId: 'campaign-xyz',
    question: 'Do you attack the goblin?',
    options: ['Yes', 'No', 'Flee'],
    type: 'STANDARD',
    durationSeconds: 30,
    orderIndex: 0,
    channelPointsAmount: null,
    lastLaunchedAt: null,
    createdAt: createMockDateTime('2025-01-01T12:00:00.000Z') as any,
    updatedAt: createMockDateTime('2025-01-01T12:30:00.000Z') as any,
    ...overrides,
  }
}

function createMockPollInstance(overrides: Partial<PollInstance> = {}): Partial<PollInstance> {
  return {
    id: 'instance-001',
    pollId: 'poll-001',
    templateId: null,
    campaignId: 'campaign-xyz',
    createdBy: 'user-abc',
    title: 'Attack the goblin?',
    options: ['Yes', 'No'],
    durationSeconds: 30,
    status: 'PENDING',
    startedAt: null,
    endedAt: null,
    createdAt: createMockDateTime('2025-01-01T13:00:00.000Z') as any,
    updatedAt: createMockDateTime('2025-01-01T13:05:00.000Z') as any,
    ...overrides,
  }
}

function createMockNotificationPreference(
  overrides: Partial<NotificationPreference> = {}
): Partial<NotificationPreference> {
  return {
    pushEnabled: true,
    campaignInvitations: true,
    criticalAlerts: true,
    pollStarted: true,
    pollEnded: false,
    campaignMemberJoined: false,
    sessionReminder: false,
    tokenRefreshFailed: true,
    sessionActionRequired: true,
    ...overrides,
  }
}

function createMockPushSubscription(
  overrides: Partial<PushSubscription> = {}
): Partial<PushSubscription> {
  return {
    id: 'sub-001',
    endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
    deviceName: 'My Phone',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
    createdAt: createMockDateTime('2025-01-01T08:00:00.000Z') as any,
    lastUsedAt: createMockDateTime('2025-01-15T14:00:00.000Z') as any,
    ...overrides,
  }
}

function createMockGamificationEvent(overrides: Record<string, any> = {}) {
  return {
    id: 'event-001',
    name: 'Dice Critical',
    slug: 'dice_critical',
    description: 'Triggered on a critical dice roll',
    type: 'individual',
    triggerType: 'dice_critical',
    actionType: 'dice_invert',
    defaultCost: 1000,
    defaultObjectiveCoefficient: 0.3,
    defaultMinimumObjective: 3,
    defaultDuration: 60,
    rewardColor: '#FF0000',
    isSystemEvent: true,
    ...overrides,
  }
}

function createMockGamificationConfig(
  overrides: Partial<CampaignGamificationConfig> = {}
): Partial<CampaignGamificationConfig> {
  return {
    id: 'config-001',
    campaignId: 'campaign-xyz',
    eventId: 'event-001',
    isEnabled: true,
    cost: null,
    objectiveCoefficient: null,
    minimumObjective: null,
    duration: null,
    cooldown: null,
    maxClicksPerUserPerSession: 3,
    twitchRewardId: null,
    event: createMockGamificationEvent() as any,
    createdAt: createMockDateTime('2025-01-01T09:00:00.000Z') as any,
    updatedAt: createMockDateTime('2025-01-01T09:30:00.000Z') as any,
    ...overrides,
  }
}

// ==========================================
// TESTS: PollTemplateDto
// ==========================================

test.group('PollTemplateDto - fromModel', () => {
  test('should serialize a template with options as an array', async ({ assert }) => {
    const template = createMockPollTemplate()
    const dto = PollTemplateDto.fromModel(template as PollTemplate)

    assert.equal(dto.id, 'template-001')
    assert.equal(dto.ownerId, 'user-abc')
    assert.equal(dto.campaignId, 'campaign-xyz')
    assert.equal(dto.label, 'Exploration template')
    assert.equal(dto.title, 'Where should the party go?')
    assert.deepEqual(dto.options, ['Forest', 'Mountains', 'Desert'])
    assert.equal(dto.durationSeconds, 60)
    assert.equal(dto.createdAt, '2025-01-01T10:00:00.000Z')
    assert.equal(dto.updatedAt, '2025-01-02T10:00:00.000Z')
  })

  test('should serialize a template with options as a JSON string', async ({ assert }) => {
    const template = createMockPollTemplate({
      options: '["North","South","East","West"]' as any,
    })
    const dto = PollTemplateDto.fromModel(template as PollTemplate)

    assert.deepEqual(dto.options, ['North', 'South', 'East', 'West'])
  })

  test('should handle an empty JSON string for options', async ({ assert }) => {
    const template = createMockPollTemplate({ options: '' as any })
    const dto = PollTemplateDto.fromModel(template as PollTemplate)

    assert.deepEqual(dto.options, [])
  })

  test('should handle null campaignId (personal template)', async ({ assert }) => {
    const template = createMockPollTemplate({ campaignId: null })
    const dto = PollTemplateDto.fromModel(template as PollTemplate)

    assert.isNull(dto.campaignId)
  })

  test('fromModelArray should convert multiple templates', async ({ assert }) => {
    const templates = [
      createMockPollTemplate({ id: 'template-001', label: 'First' }),
      createMockPollTemplate({ id: 'template-002', label: 'Second' }),
    ]
    const dtos = PollTemplateDto.fromModelArray(templates as PollTemplate[])

    assert.lengthOf(dtos, 2)
    assert.equal(dtos[0].id, 'template-001')
    assert.equal(dtos[0].label, 'First')
    assert.equal(dtos[1].id, 'template-002')
    assert.equal(dtos[1].label, 'Second')
  })

  test('fromModelArray should return an empty array for empty input', async ({ assert }) => {
    const dtos = PollTemplateDto.fromModelArray([])
    assert.deepEqual(dtos, [])
  })
})

// ==========================================
// TESTS: PollDto
// ==========================================

test.group('PollDto - fromModel', () => {
  test('should serialize a poll without channel points', async ({ assert }) => {
    const poll = createMockPoll({ channelPointsAmount: null })
    const dto = PollDto.fromModel(poll as Poll)

    assert.equal(dto.id, 'poll-001')
    assert.equal(dto.campaignId, 'campaign-xyz')
    assert.equal(dto.question, 'Do you attack the goblin?')
    assert.deepEqual(dto.options, ['Yes', 'No', 'Flee'])
    assert.equal(dto.type, 'STANDARD')
    assert.equal(dto.durationSeconds, 30)
    assert.equal(dto.orderIndex, 0)
    assert.isNull(dto.channelPointsPerVote)
    assert.isFalse(dto.channelPointsEnabled)
    assert.isNull(dto.lastLaunchedAt)
    assert.equal(dto.createdAt, '2025-01-01T12:00:00.000Z')
    assert.equal(dto.updatedAt, '2025-01-01T12:30:00.000Z')
  })

  test('should compute channelPointsEnabled=true when channelPointsAmount > 0', async ({
    assert,
  }) => {
    const poll = createMockPoll({ channelPointsAmount: 500 })
    const dto = PollDto.fromModel(poll as Poll)

    assert.equal(dto.channelPointsPerVote, 500)
    assert.isTrue(dto.channelPointsEnabled)
  })

  test('should compute channelPointsEnabled=false when channelPointsAmount is 0', async ({
    assert,
  }) => {
    const poll = createMockPoll({ channelPointsAmount: 0 })
    const dto = PollDto.fromModel(poll as Poll)

    assert.equal(dto.channelPointsPerVote, 0)
    assert.isFalse(dto.channelPointsEnabled)
  })

  test('should serialize lastLaunchedAt when provided', async ({ assert }) => {
    const poll = createMockPoll({
      lastLaunchedAt: createMockDateTime('2025-01-10T15:00:00.000Z') as any,
    })
    const dto = PollDto.fromModel(poll as Poll)

    assert.equal(dto.lastLaunchedAt, '2025-01-10T15:00:00.000Z')
  })

  test('should parse options from a JSON string', async ({ assert }) => {
    const poll = createMockPoll({ options: '["Attack","Defend","Run"]' as any })
    const dto = PollDto.fromModel(poll as Poll)

    assert.deepEqual(dto.options, ['Attack', 'Defend', 'Run'])
  })
})

// ==========================================
// TESTS: PollInstanceDto
// ==========================================

test.group('PollInstanceDto - fromModel', () => {
  test('should serialize a pending instance with null startedAt and endedAt', async ({
    assert,
  }) => {
    const instance = createMockPollInstance({ status: 'PENDING', startedAt: null, endedAt: null })
    const dto = PollInstanceDto.fromModel(instance as PollInstance)

    assert.equal(dto.id, 'instance-001')
    assert.equal(dto.pollId, 'poll-001')
    assert.isNull(dto.templateId)
    assert.equal(dto.campaignId, 'campaign-xyz')
    assert.equal(dto.createdBy, 'user-abc')
    assert.equal(dto.title, 'Attack the goblin?')
    assert.deepEqual(dto.options, ['Yes', 'No'])
    assert.equal(dto.durationSeconds, 30)
    assert.equal(dto.status, 'PENDING')
    assert.isNull(dto.startedAt)
    assert.isNull(dto.endedAt)
    assert.equal(dto.createdAt, '2025-01-01T13:00:00.000Z')
  })

  test('should serialize a running instance with startedAt set', async ({ assert }) => {
    const instance = createMockPollInstance({
      status: 'RUNNING',
      startedAt: createMockDateTime('2025-01-01T13:10:00.000Z') as any,
    })
    const dto = PollInstanceDto.fromModel(instance as PollInstance)

    assert.equal(dto.status, 'RUNNING')
    assert.equal(dto.startedAt, '2025-01-01T13:10:00.000Z')
    assert.isNull(dto.endedAt)
  })

  test('should serialize an ended instance with both startedAt and endedAt', async ({ assert }) => {
    const instance = createMockPollInstance({
      status: 'ENDED',
      startedAt: createMockDateTime('2025-01-01T13:10:00.000Z') as any,
      endedAt: createMockDateTime('2025-01-01T13:11:00.000Z') as any,
    })
    const dto = PollInstanceDto.fromModel(instance as PollInstance)

    assert.equal(dto.status, 'ENDED')
    assert.equal(dto.startedAt, '2025-01-01T13:10:00.000Z')
    assert.equal(dto.endedAt, '2025-01-01T13:11:00.000Z')
  })

  test('should parse options from a JSON string', async ({ assert }) => {
    const instance = createMockPollInstance({
      options: '["Choice A","Choice B","Choice C"]' as any,
    })
    const dto = PollInstanceDto.fromModel(instance as PollInstance)

    assert.deepEqual(dto.options, ['Choice A', 'Choice B', 'Choice C'])
  })

  test('fromModelArray should convert multiple instances preserving order', async ({ assert }) => {
    const instances = [
      createMockPollInstance({ id: 'inst-1', status: 'ENDED' }),
      createMockPollInstance({ id: 'inst-2', status: 'PENDING' }),
    ]
    const dtos = PollInstanceDto.fromModelArray(instances as PollInstance[])

    assert.lengthOf(dtos, 2)
    assert.equal(dtos[0].id, 'inst-1')
    assert.equal(dtos[0].status, 'ENDED')
    assert.equal(dtos[1].id, 'inst-2')
    assert.equal(dtos[1].status, 'PENDING')
  })
})

// ==========================================
// TESTS: PollResultsDto
// ==========================================

test.group('PollResultsDto - create', () => {
  test('should create with provided data', async ({ assert }) => {
    const dto = PollResultsDto.create({
      pollInstanceId: 'instance-001',
      campaignId: 'campaign-xyz',
      title: 'Attack the goblin?',
      options: ['Yes', 'No'],
      status: 'ENDED',
      startedAt: '2025-01-01T13:10:00.000Z',
      endedAt: '2025-01-01T13:11:00.000Z',
      totalVotes: 42,
      votesByOption: { Yes: 30, No: 12 },
      percentages: { Yes: 71.4, No: 28.6 },
      channels: [],
    })

    assert.equal(dto.pollInstanceId, 'instance-001')
    assert.equal(dto.campaignId, 'campaign-xyz')
    assert.equal(dto.title, 'Attack the goblin?')
    assert.deepEqual(dto.options, ['Yes', 'No'])
    assert.equal(dto.status, 'ENDED')
    assert.equal(dto.startedAt, '2025-01-01T13:10:00.000Z')
    assert.equal(dto.endedAt, '2025-01-01T13:11:00.000Z')
    assert.equal(dto.totalVotes, 42)
    assert.deepEqual(dto.votesByOption, { Yes: 30, No: 12 })
    assert.deepEqual(dto.percentages, { Yes: 71.4, No: 28.6 })
    assert.deepEqual(dto.channels, [])
  })

  test('should default endedAt to null when not provided', async ({ assert }) => {
    const dto = PollResultsDto.create({
      pollInstanceId: 'instance-002',
      status: 'RUNNING',
    })

    assert.isNull(dto.endedAt)
  })

  test('should fill missing fields with defaults when creating from empty object', async ({
    assert,
  }) => {
    const dto = PollResultsDto.create({})

    assert.equal(dto.pollInstanceId, '')
    assert.equal(dto.campaignId, '')
    assert.equal(dto.title, '')
    assert.deepEqual(dto.options, [])
    assert.equal(dto.status, '')
    assert.equal(dto.startedAt, '')
    assert.isNull(dto.endedAt)
    assert.equal(dto.totalVotes, 0)
    assert.deepEqual(dto.votesByOption, {})
    assert.deepEqual(dto.percentages, {})
    assert.deepEqual(dto.channels, [])
    // createdAt should be a valid ISO string generated at call time
    assert.isString(dto.createdAt)
    assert.isTrue(dto.createdAt.length > 0)
  })
})

test.group('PollResultsDto - fromAggregated', () => {
  test('should map index-based votes to option-name-based', async ({ assert }) => {
    const pollInstance = {
      id: 'instance-001',
      campaignId: 'campaign-xyz',
      title: 'Attack or flee?',
      options: ['Attack', 'Flee', 'Negotiate'],
      status: 'ENDED',
      startedAt: createMockDateTime('2025-01-01T13:10:00.000Z'),
      endedAt: createMockDateTime('2025-01-01T13:11:00.000Z'),
      createdAt: createMockDateTime('2025-01-01T13:00:00.000Z'),
    }
    const aggregated = {
      votesByOption: { '0': 50, '1': 30, '2': 20 },
      percentages: { '0': 50, '1': 30, '2': 20 },
      totalVotes: 100,
      channels: [],
    }

    const dto = PollResultsDto.fromAggregated(pollInstance, aggregated)

    assert.equal(dto.pollInstanceId, 'instance-001')
    assert.equal(dto.campaignId, 'campaign-xyz')
    assert.equal(dto.title, 'Attack or flee?')
    assert.deepEqual(dto.options, ['Attack', 'Flee', 'Negotiate'])
    assert.equal(dto.totalVotes, 100)
    assert.deepEqual(dto.votesByOption, { Attack: 50, Flee: 30, Negotiate: 20 })
    assert.deepEqual(dto.percentages, { Attack: 50, Flee: 30, Negotiate: 20 })
    assert.equal(dto.startedAt, '2025-01-01T13:10:00.000Z')
    assert.equal(dto.endedAt, '2025-01-01T13:11:00.000Z')
  })

  test('should return empty votesByOption and percentages when aggregated is empty', async ({
    assert,
  }) => {
    const pollInstance = {
      id: 'instance-002',
      campaignId: 'campaign-xyz',
      title: 'Empty poll',
      options: ['Yes', 'No'],
      status: 'ENDED',
      startedAt: createMockDateTime('2025-01-01T13:10:00.000Z'),
      endedAt: null,
      createdAt: createMockDateTime('2025-01-01T13:00:00.000Z'),
    }
    const aggregated = {
      votesByOption: {},
      percentages: {},
      totalVotes: 0,
      channels: [],
    }

    const dto = PollResultsDto.fromAggregated(pollInstance, aggregated)

    assert.equal(dto.totalVotes, 0)
    assert.deepEqual(dto.votesByOption, {})
    assert.deepEqual(dto.percentages, {})
    assert.isNull(dto.endedAt)
  })

  test('should use fallback option name when index is out of bounds', async ({ assert }) => {
    const pollInstance = {
      id: 'instance-003',
      campaignId: 'campaign-xyz',
      title: 'Out of bounds test',
      options: ['Only Option'],
      status: 'ENDED',
      startedAt: createMockDateTime('2025-01-01T13:10:00.000Z'),
      endedAt: null,
      createdAt: createMockDateTime('2025-01-01T13:00:00.000Z'),
    }
    const aggregated = {
      votesByOption: { '0': 10, '5': 7 }, // index 5 does not exist
      percentages: { '0': 59, '5': 41 },
      totalVotes: 17,
      channels: [],
    }

    const dto = PollResultsDto.fromAggregated(pollInstance, aggregated)

    assert.deepEqual(dto.votesByOption, { 'Only Option': 10, 'Option 6': 7 })
    assert.deepEqual(dto.percentages, { 'Only Option': 59, 'Option 6': 41 })
  })

  test('should parse options from a JSON string in the poll instance', async ({ assert }) => {
    const pollInstance = {
      id: 'instance-004',
      campaignId: 'campaign-xyz',
      title: 'JSON options test',
      options: '["Alpha","Beta","Gamma"]',
      status: 'ENDED',
      startedAt: createMockDateTime('2025-01-01T13:10:00.000Z'),
      endedAt: createMockDateTime('2025-01-01T13:12:00.000Z'),
      createdAt: createMockDateTime('2025-01-01T13:00:00.000Z'),
    }
    const aggregated = {
      votesByOption: { '0': 5, '2': 15 },
      percentages: { '0': 25, '2': 75 },
      totalVotes: 20,
      channels: [],
    }

    const dto = PollResultsDto.fromAggregated(pollInstance, aggregated)

    assert.deepEqual(dto.options, ['Alpha', 'Beta', 'Gamma'])
    assert.deepEqual(dto.votesByOption, { Alpha: 5, Gamma: 15 })
    assert.deepEqual(dto.percentages, { Alpha: 25, Gamma: 75 })
  })
})

// ==========================================
// TESTS: NotificationPreferenceDto
// ==========================================

test.group('NotificationPreferenceDto - fromModel', () => {
  test('should map all boolean fields from the model', async ({ assert }) => {
    const preference = createMockNotificationPreference()
    const dto = NotificationPreferenceDto.fromModel(preference as NotificationPreference)

    assert.isTrue(dto.pushEnabled)
    assert.isTrue(dto.campaignInvitations)
    assert.isTrue(dto.criticalAlerts)
    assert.isTrue(dto.pollStarted)
    assert.isFalse(dto.pollEnded)
    assert.isFalse(dto.campaignMemberJoined)
    assert.isFalse(dto.sessionReminder)
    assert.isTrue(dto.tokenRefreshFailed)
    assert.isTrue(dto.sessionActionRequired)
  })

  test('should correctly map all fields when all are true', async ({ assert }) => {
    const preference = createMockNotificationPreference({
      pushEnabled: true,
      campaignInvitations: true,
      criticalAlerts: true,
      pollStarted: true,
      pollEnded: true,
      campaignMemberJoined: true,
      sessionReminder: true,
      tokenRefreshFailed: true,
      sessionActionRequired: true,
    })
    const dto = NotificationPreferenceDto.fromModel(preference as NotificationPreference)

    assert.isTrue(dto.pushEnabled)
    assert.isTrue(dto.campaignInvitations)
    assert.isTrue(dto.criticalAlerts)
    assert.isTrue(dto.pollStarted)
    assert.isTrue(dto.pollEnded)
    assert.isTrue(dto.campaignMemberJoined)
    assert.isTrue(dto.sessionReminder)
    assert.isTrue(dto.tokenRefreshFailed)
    assert.isTrue(dto.sessionActionRequired)
  })

  test('should correctly map all fields when all are false', async ({ assert }) => {
    const preference = createMockNotificationPreference({
      pushEnabled: false,
      campaignInvitations: false,
      criticalAlerts: false,
      pollStarted: false,
      pollEnded: false,
      campaignMemberJoined: false,
      sessionReminder: false,
      tokenRefreshFailed: false,
      sessionActionRequired: false,
    })
    const dto = NotificationPreferenceDto.fromModel(preference as NotificationPreference)

    assert.isFalse(dto.pushEnabled)
    assert.isFalse(dto.campaignInvitations)
    assert.isFalse(dto.criticalAlerts)
    assert.isFalse(dto.pollStarted)
    assert.isFalse(dto.pollEnded)
    assert.isFalse(dto.campaignMemberJoined)
    assert.isFalse(dto.sessionReminder)
    assert.isFalse(dto.tokenRefreshFailed)
    assert.isFalse(dto.sessionActionRequired)
  })
})

test.group('NotificationPreferenceDto - defaults', () => {
  test('should return hardcoded defaults with expected true/false values', async ({ assert }) => {
    const dto = NotificationPreferenceDto.defaults()

    // Enabled by default
    assert.isTrue(dto.pushEnabled)
    assert.isTrue(dto.campaignInvitations)
    assert.isTrue(dto.criticalAlerts)
    assert.isTrue(dto.pollStarted)
    assert.isTrue(dto.pollEnded)
    assert.isTrue(dto.tokenRefreshFailed)
    assert.isTrue(dto.sessionActionRequired)

    // Disabled by default
    assert.isFalse(dto.campaignMemberJoined)
    assert.isFalse(dto.sessionReminder)
  })

  test('should include all nine preference fields', async ({ assert }) => {
    const dto = NotificationPreferenceDto.defaults()

    assert.property(dto, 'pushEnabled')
    assert.property(dto, 'campaignInvitations')
    assert.property(dto, 'criticalAlerts')
    assert.property(dto, 'pollStarted')
    assert.property(dto, 'pollEnded')
    assert.property(dto, 'campaignMemberJoined')
    assert.property(dto, 'sessionReminder')
    assert.property(dto, 'tokenRefreshFailed')
    assert.property(dto, 'sessionActionRequired')
  })
})

// ==========================================
// TESTS: PushSubscriptionDto
// ==========================================

test.group('PushSubscriptionDto - fromModel', () => {
  test('should serialize a subscription with all fields present', async ({ assert }) => {
    const subscription = createMockPushSubscription()
    const dto = PushSubscriptionDto.fromModel(subscription as PushSubscription)

    assert.equal(dto.id, 'sub-001')
    assert.equal(dto.endpoint, 'https://fcm.googleapis.com/fcm/send/abc123')
    assert.equal(dto.deviceName, 'My Phone')
    assert.equal(dto.userAgent, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')
    assert.equal(dto.createdAt, '2025-01-01T08:00:00.000Z')
    assert.equal(dto.lastUsedAt, '2025-01-15T14:00:00.000Z')
  })

  test('should serialize lastUsedAt as null when not set', async ({ assert }) => {
    const subscription = createMockPushSubscription({ lastUsedAt: null })
    const dto = PushSubscriptionDto.fromModel(subscription as PushSubscription)

    assert.isNull(dto.lastUsedAt)
  })

  test('should serialize deviceName as null when not set', async ({ assert }) => {
    const subscription = createMockPushSubscription({ deviceName: null })
    const dto = PushSubscriptionDto.fromModel(subscription as PushSubscription)

    assert.isNull(dto.deviceName)
  })

  test('should serialize userAgent as null when not set', async ({ assert }) => {
    const subscription = createMockPushSubscription({ userAgent: null })
    const dto = PushSubscriptionDto.fromModel(subscription as PushSubscription)

    assert.isNull(dto.userAgent)
  })

  test('fromModelArray should convert multiple subscriptions in order', async ({ assert }) => {
    const subscriptions = [
      createMockPushSubscription({ id: 'sub-001', deviceName: 'Phone' }),
      createMockPushSubscription({ id: 'sub-002', deviceName: 'Tablet' }),
      createMockPushSubscription({ id: 'sub-003', deviceName: null }),
    ]
    const dtos = PushSubscriptionDto.fromModelArray(subscriptions as PushSubscription[])

    assert.lengthOf(dtos, 3)
    assert.equal(dtos[0].id, 'sub-001')
    assert.equal(dtos[0].deviceName, 'Phone')
    assert.equal(dtos[1].id, 'sub-002')
    assert.equal(dtos[1].deviceName, 'Tablet')
    assert.equal(dtos[2].id, 'sub-003')
    assert.isNull(dtos[2].deviceName)
  })

  test('fromModelArray should return an empty array for empty input', async ({ assert }) => {
    const dtos = PushSubscriptionDto.fromModelArray([])
    assert.deepEqual(dtos, [])
  })
})

// ==========================================
// TESTS: GamificationConfigDto
// ==========================================

test.group('GamificationConfigDto - fromModel', () => {
  test('should serialize a config with all null overrides and nested event', async ({ assert }) => {
    const config = createMockGamificationConfig()
    const dto = GamificationConfigDto.fromModel(config as CampaignGamificationConfig)

    assert.equal(dto.id, 'config-001')
    assert.equal(dto.campaignId, 'campaign-xyz')
    assert.equal(dto.eventId, 'event-001')
    assert.isTrue(dto.isEnabled)
    assert.isNull(dto.cost)
    assert.isNull(dto.objectiveCoefficient)
    assert.isNull(dto.minimumObjective)
    assert.isNull(dto.duration)
    assert.isNull(dto.cooldown)
    assert.equal(dto.maxClicksPerUserPerSession, 3)
    assert.isNull(dto.twitchRewardId)
    assert.equal(dto.createdAt, '2025-01-01T09:00:00.000Z')
    assert.equal(dto.updatedAt, '2025-01-01T09:30:00.000Z')

    // Nested event DTO
    assert.isNotNull(dto.event)
    assert.equal(dto.event!.id, 'event-001')
    assert.equal(dto.event!.name, 'Dice Critical')
    assert.equal(dto.event!.slug, 'dice_critical')
  })

  test('should serialize event as null when config has no event loaded', async ({ assert }) => {
    const config = createMockGamificationConfig({ event: null as any })
    const dto = GamificationConfigDto.fromModel(config as CampaignGamificationConfig)

    assert.isNull(dto.event)
  })

  test('should serialize a config with explicit override values', async ({ assert }) => {
    const config = createMockGamificationConfig({
      cost: 500,
      objectiveCoefficient: 0.5,
      minimumObjective: 5,
      duration: 120,
      cooldown: 3600,
      twitchRewardId: 'reward-abc',
    })
    const dto = GamificationConfigDto.fromModel(config as CampaignGamificationConfig)

    assert.equal(dto.cost, 500)
    assert.equal(dto.objectiveCoefficient, 0.5)
    assert.equal(dto.minimumObjective, 5)
    assert.equal(dto.duration, 120)
    assert.equal(dto.cooldown, 3600)
    assert.equal(dto.twitchRewardId, 'reward-abc')
  })

  test('should serialize isEnabled=false when config is disabled', async ({ assert }) => {
    const config = createMockGamificationConfig({ isEnabled: false })
    const dto = GamificationConfigDto.fromModel(config as CampaignGamificationConfig)

    assert.isFalse(dto.isEnabled)
  })
})

// ==========================================
// TESTS: GamificationConfigEffectiveDto
// ==========================================

test.group('GamificationConfigEffectiveDto - fromModel', () => {
  test('should use event defaults when config has all null overrides', async ({ assert }) => {
    const config = createMockGamificationConfig({
      cost: null,
      objectiveCoefficient: null,
      minimumObjective: null,
      duration: null,
    })
    const dto = GamificationConfigEffectiveDto.fromModel(config as CampaignGamificationConfig)

    // effectiveCost falls back to event.defaultCost (1000)
    assert.equal(dto.effectiveCost, 1000)
    // effectiveObjectiveCoefficient falls back to event.defaultObjectiveCoefficient (0.3)
    assert.equal(dto.effectiveObjectiveCoefficient, 0.3)
    // effectiveMinimumObjective falls back to event.defaultMinimumObjective (3)
    assert.equal(dto.effectiveMinimumObjective, 3)
    // effectiveDuration falls back to event.defaultDuration (60)
    assert.equal(dto.effectiveDuration, 60)
  })

  test('should use config overrides when all are explicitly set', async ({ assert }) => {
    const config = createMockGamificationConfig({
      cost: 250,
      objectiveCoefficient: 0.8,
      minimumObjective: 10,
      duration: 45,
    })
    const dto = GamificationConfigEffectiveDto.fromModel(config as CampaignGamificationConfig)

    assert.equal(dto.effectiveCost, 250)
    assert.equal(dto.effectiveObjectiveCoefficient, 0.8)
    assert.equal(dto.effectiveMinimumObjective, 10)
    assert.equal(dto.effectiveDuration, 45)
  })

  test('should fall back to hardcoded defaults (1000, 0.3, 3, 60) when no event and no override', async ({
    assert,
  }) => {
    const config = createMockGamificationConfig({
      cost: null,
      objectiveCoefficient: null,
      minimumObjective: null,
      duration: null,
      event: null as any,
    })
    const dto = GamificationConfigEffectiveDto.fromModel(config as CampaignGamificationConfig)

    assert.equal(dto.effectiveCost, 1000)
    assert.equal(dto.effectiveObjectiveCoefficient, 0.3)
    assert.equal(dto.effectiveMinimumObjective, 3)
    assert.equal(dto.effectiveDuration, 60)
  })

  test('should include all base GamificationConfigDto fields alongside effective fields', async ({
    assert,
  }) => {
    const config = createMockGamificationConfig()
    const dto = GamificationConfigEffectiveDto.fromModel(config as CampaignGamificationConfig)

    // Base fields
    assert.equal(dto.id, 'config-001')
    assert.equal(dto.campaignId, 'campaign-xyz')
    assert.equal(dto.eventId, 'event-001')
    assert.isTrue(dto.isEnabled)
    assert.isNull(dto.cost)
    assert.isNull(dto.objectiveCoefficient)

    // Effective fields
    assert.property(dto, 'effectiveCost')
    assert.property(dto, 'effectiveObjectiveCoefficient')
    assert.property(dto, 'effectiveMinimumObjective')
    assert.property(dto, 'effectiveDuration')
  })

  test('fromModelArray should convert multiple configs with effective values', async ({
    assert,
  }) => {
    const configs = [
      createMockGamificationConfig({ id: 'config-001', cost: 100 }),
      createMockGamificationConfig({ id: 'config-002', cost: null }),
    ]
    const dtos = GamificationConfigEffectiveDto.fromModelArray(
      configs as CampaignGamificationConfig[]
    )

    assert.lengthOf(dtos, 2)
    assert.equal(dtos[0].effectiveCost, 100)
    assert.equal(dtos[1].effectiveCost, 1000) // falls back to event default
  })
})
