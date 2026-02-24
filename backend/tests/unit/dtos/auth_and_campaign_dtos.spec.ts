import { test } from '@japa/runner'
import { UserDto } from '#dtos/auth/user_dto'
import { StreamerDto } from '#dtos/auth/streamer_dto'
import { CampaignDto } from '#dtos/campaigns/campaign_dto'
import { CharacterDto } from '#dtos/characters/character_dto'
import type { user as User } from '#models/user'
import type { streamer as Streamer } from '#models/streamer'
import type { campaign as Campaign } from '#models/campaign'
import type Character from '#models/character'
import type { SpellInfo, FeatureInfo } from '#models/character'

/**
 * Unit tests for auth and campaign DTOs.
 *
 * Covers UserDto, StreamerDto, CampaignDto and CharacterDto.
 * All tests use plain mock objects — no database interaction.
 */

// ==========================================
// HELPERS
// ==========================================

/**
 * Creates a lightweight mock of a Luxon DateTime for ISO serialization tests.
 */
function createMockDateTime(isoString: string) {
  return { toISO: () => isoString }
}

// ==========================================
// MOCK FACTORIES
// ==========================================

function createMockUser(overrides: Partial<User> = {}): Partial<User> {
  return {
    id: 'user-uuid-1',
    displayName: 'Lucas',
    email: 'lucas@example.com',
    createdAt: createMockDateTime('2024-01-15T10:00:00.000Z') as any,
    updatedAt: createMockDateTime('2024-06-20T14:30:00.000Z') as any,
    ...overrides,
  }
}

function createMockStreamer(overrides: Partial<Streamer> = {}): Partial<Streamer> {
  return {
    id: 'streamer-uuid-1',
    userId: 'user-uuid-1',
    twitchUserId: 'twitch-123',
    twitchDisplayName: 'LucasStreams',
    twitchLogin: 'lucasstreams',
    profileImageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar.png',
    broadcasterType: 'affiliate',
    isActive: true,
    scopes: ['chat:read', 'channel:manage:polls'],
    createdAt: createMockDateTime('2024-01-15T10:00:00.000Z') as any,
    updatedAt: createMockDateTime('2024-06-20T14:30:00.000Z') as any,
    ...overrides,
  }
}

function createMockMembership(status: 'ACTIVE' | 'PENDING', streamerUserId: string = 'user-1') {
  return {
    id: `membership-${Math.random().toString(36).slice(2)}`,
    status,
    streamer: {
      userId: streamerUserId,
    },
  }
}

interface MockCampaign {
  id: string
  ownerId: string
  name: string
  description: string | null
  memberships: { id: string; status: 'ACTIVE' | 'PENDING'; streamer: { userId: string } }[]
  createdAt: ReturnType<typeof createMockDateTime>
  updatedAt: ReturnType<typeof createMockDateTime>
  [key: string]: any
}

function createMockCampaign(overrides: Partial<MockCampaign> = {}): MockCampaign {
  return {
    id: 'campaign-uuid-1',
    ownerId: 'user-uuid-1',
    name: 'Dragon Campaign',
    description: 'An epic adventure',
    memberships: [],
    createdAt: createMockDateTime('2024-01-15T10:00:00.000Z'),
    updatedAt: createMockDateTime('2024-06-20T14:30:00.000Z'),
    ...overrides,
  }
}

function createMockCharacter(overrides: Partial<Character> = {}): Partial<Character> {
  return {
    id: 'char-uuid-1',
    name: 'Gandalf',
    avatarUrl: 'https://example.com/gandalf.png',
    characterType: 'pc',
    vttCharacterId: 'foundry-actor-abc',
    spells: null,
    features: null,
    ...overrides,
  }
}

// ==========================================
// TESTS: UserDto
// ==========================================

test.group('UserDto - fromModel', () => {
  test('should map all basic fields from a user model', async ({ assert }) => {
    const user = createMockUser()
    const dto = UserDto.fromModel(user as User)

    assert.equal(dto.id, 'user-uuid-1')
    assert.equal(dto.displayName, 'Lucas')
    assert.equal(dto.email, 'lucas@example.com')
    assert.equal(dto.createdAt, '2024-01-15T10:00:00.000Z')
    assert.equal(dto.updatedAt, '2024-06-20T14:30:00.000Z')
  })

  test('should convert DateTime to ISO string for createdAt and updatedAt', async ({ assert }) => {
    const specificCreatedAt = '2025-03-01T08:00:00.000Z'
    const specificUpdatedAt = '2025-03-15T16:45:00.000Z'

    const user = createMockUser({
      createdAt: createMockDateTime(specificCreatedAt) as any,
      updatedAt: createMockDateTime(specificUpdatedAt) as any,
    })
    const dto = UserDto.fromModel(user as User)

    assert.equal(dto.createdAt, specificCreatedAt)
    assert.equal(dto.updatedAt, specificUpdatedAt)
  })

  test('should preserve null email', async ({ assert }) => {
    const user = createMockUser({ email: null as any })
    const dto = UserDto.fromModel(user as User)

    assert.isNull(dto.email)
  })

  test('should fall back to empty string when toISO() returns null', async ({ assert }) => {
    const user = createMockUser({
      createdAt: { toISO: () => null } as any,
      updatedAt: { toISO: () => null } as any,
    })
    const dto = UserDto.fromModel(user as User)

    assert.equal(dto.createdAt, '')
    assert.equal(dto.updatedAt, '')
  })
})

test.group('UserDto - fromModelArray', () => {
  test('should map an array of users to an array of DTOs', async ({ assert }) => {
    const users = [
      createMockUser({ id: 'user-1', displayName: 'Alice' }),
      createMockUser({ id: 'user-2', displayName: 'Bob' }),
    ]
    const dtos = UserDto.fromModelArray(users as User[])

    assert.lengthOf(dtos, 2)
    assert.equal(dtos[0].id, 'user-1')
    assert.equal(dtos[0].displayName, 'Alice')
    assert.equal(dtos[1].id, 'user-2')
    assert.equal(dtos[1].displayName, 'Bob')
  })

  test('should return an empty array when given an empty array', async ({ assert }) => {
    const dtos = UserDto.fromModelArray([])

    assert.deepEqual(dtos, [])
    assert.lengthOf(dtos, 0)
  })
})

// ==========================================
// TESTS: StreamerDto
// ==========================================

test.group('StreamerDto - fromModel', () => {
  test('should map all basic fields from a streamer model', async ({ assert }) => {
    const streamer = createMockStreamer()
    const dto = StreamerDto.fromModel(streamer as Streamer)

    assert.equal(dto.id, 'streamer-uuid-1')
    assert.equal(dto.userId, 'user-uuid-1')
    assert.equal(dto.twitchUserId, 'twitch-123')
    assert.equal(dto.twitchDisplayName, 'LucasStreams')
    assert.equal(dto.twitchLogin, 'lucasstreams')
    assert.equal(dto.profileImageUrl, 'https://static-cdn.jtvnw.net/jtv_user_pictures/avatar.png')
    assert.equal(dto.broadcasterType, 'affiliate')
    assert.isTrue(dto.isActive)
    assert.equal(dto.createdAt, '2024-01-15T10:00:00.000Z')
    assert.equal(dto.updatedAt, '2024-06-20T14:30:00.000Z')
  })

  test('should pass through scopes when they are already an array', async ({ assert }) => {
    const scopesArray = ['chat:read', 'channel:manage:polls', 'bits:read']
    const streamer = createMockStreamer({ scopes: scopesArray as any })
    const dto = StreamerDto.fromModel(streamer as Streamer)

    assert.deepEqual(dto.scopes, scopesArray)
    assert.isArray(dto.scopes)
    assert.lengthOf(dto.scopes, 3)
  })

  test('should parse scopes when they are stored as a JSON string', async ({ assert }) => {
    const scopesJson = '["chat:read","channel:manage:polls"]'
    const streamer = createMockStreamer({ scopes: scopesJson as any })
    const dto = StreamerDto.fromModel(streamer as Streamer)

    assert.deepEqual(dto.scopes, ['chat:read', 'channel:manage:polls'])
    assert.isArray(dto.scopes)
  })

  test('should produce empty scopes array when scopes JSON string is null', async ({ assert }) => {
    const streamer = createMockStreamer({ scopes: null as any })
    const dto = StreamerDto.fromModel(streamer as Streamer)

    assert.deepEqual(dto.scopes, [])
    assert.isArray(dto.scopes)
  })

  test('should fall back to empty string when userId is null', async ({ assert }) => {
    const streamer = createMockStreamer({ userId: null as any })
    const dto = StreamerDto.fromModel(streamer as Streamer)

    assert.equal(dto.userId, '')
  })

  test('should preserve null profileImageUrl', async ({ assert }) => {
    const streamer = createMockStreamer({ profileImageUrl: null })
    const dto = StreamerDto.fromModel(streamer as Streamer)

    assert.isNull(dto.profileImageUrl)
  })
})

test.group('StreamerDto - fromModelArray', () => {
  test('should map an array of streamers to an array of DTOs', async ({ assert }) => {
    const streamers = [
      createMockStreamer({ id: 'str-1', twitchLogin: 'alice' }),
      createMockStreamer({ id: 'str-2', twitchLogin: 'bob' }),
    ]
    const dtos = StreamerDto.fromModelArray(streamers as Streamer[])

    assert.lengthOf(dtos, 2)
    assert.equal(dtos[0].id, 'str-1')
    assert.equal(dtos[0].twitchLogin, 'alice')
    assert.equal(dtos[1].id, 'str-2')
    assert.equal(dtos[1].twitchLogin, 'bob')
  })
})

// ==========================================
// TESTS: CampaignDto
// ==========================================

test.group('CampaignDto - fromModel', () => {
  test('should map all basic fields from a campaign model', async ({ assert }) => {
    const campaign = createMockCampaign()
    const dto = CampaignDto.fromModel(campaign as Campaign)

    assert.equal(dto.id, 'campaign-uuid-1')
    assert.equal(dto.ownerId, 'user-uuid-1')
    assert.equal(dto.name, 'Dragon Campaign')
    assert.equal(dto.description, 'An epic adventure')
    assert.equal(dto.createdAt, '2024-01-15T10:00:00.000Z')
    assert.equal(dto.updatedAt, '2024-06-20T14:30:00.000Z')
  })

  test('should compute memberCount and activeMemberCount as 0 when memberships is empty', async ({
    assert,
  }) => {
    const campaign = createMockCampaign({ memberships: [] })
    const dto = CampaignDto.fromModel(campaign as Campaign)

    assert.equal(dto.memberCount, 0)
    assert.equal(dto.activeMemberCount, 0)
  })

  test('should compute memberCount and activeMemberCount as 0 when memberships is undefined', async ({
    assert,
  }) => {
    const campaign = createMockCampaign({ memberships: undefined as any })
    const dto = CampaignDto.fromModel(campaign as Campaign)

    assert.equal(dto.memberCount, 0)
    assert.equal(dto.activeMemberCount, 0)
  })

  test('should count all memberships in memberCount regardless of status', async ({ assert }) => {
    const campaign = createMockCampaign({
      memberships: [
        createMockMembership('ACTIVE') as any,
        createMockMembership('ACTIVE') as any,
        createMockMembership('PENDING') as any,
      ],
    })
    const dto = CampaignDto.fromModel(campaign as Campaign)

    assert.equal(dto.memberCount, 3)
  })

  test('should count only ACTIVE memberships in activeMemberCount', async ({ assert }) => {
    const campaign = createMockCampaign({
      memberships: [
        createMockMembership('ACTIVE') as any,
        createMockMembership('ACTIVE') as any,
        createMockMembership('PENDING') as any,
        createMockMembership('PENDING') as any,
      ],
    })
    const dto = CampaignDto.fromModel(campaign as Campaign)

    assert.equal(dto.memberCount, 4)
    assert.equal(dto.activeMemberCount, 2)
  })

  test('should return null vttConnection when no VTT connection is preloaded', async ({
    assert,
  }) => {
    const campaign = createMockCampaign()
    // No vttConnection property on the object → treated as null
    const dto = CampaignDto.fromModel(campaign as Campaign)

    assert.isNull(dto.vttConnection)
  })

  test('should map vttConnection fields when a VTT connection is preloaded', async ({ assert }) => {
    const campaign = createMockCampaign() as any
    campaign.vttConnection = {
      id: 'vtt-uuid-1',
      status: 'active',
      tunnelStatus: 'connected',
      lastHeartbeatAt: createMockDateTime('2025-01-10T12:00:00.000Z'),
      worldName: 'Middle Earth',
      moduleVersion: '2.2.1',
    }

    const dto = CampaignDto.fromModel(campaign as Campaign)

    assert.isNotNull(dto.vttConnection)
    assert.equal(dto.vttConnection!.id, 'vtt-uuid-1')
    assert.equal(dto.vttConnection!.status, 'active')
    assert.equal(dto.vttConnection!.tunnelStatus, 'connected')
    assert.equal(dto.vttConnection!.lastHeartbeatAt, '2025-01-10T12:00:00.000Z')
    assert.equal(dto.vttConnection!.worldName, 'Middle Earth')
    assert.equal(dto.vttConnection!.moduleVersion, '2.2.1')
  })

  test('should use "disconnected" as default tunnelStatus when missing', async ({ assert }) => {
    const campaign = createMockCampaign() as any
    campaign.vttConnection = {
      id: 'vtt-uuid-2',
      status: 'pending',
      tunnelStatus: undefined,
      lastHeartbeatAt: null,
      worldName: null,
      moduleVersion: null,
    }

    const dto = CampaignDto.fromModel(campaign as Campaign)

    assert.isNotNull(dto.vttConnection)
    assert.equal(dto.vttConnection!.tunnelStatus, 'disconnected')
    assert.isNull(dto.vttConnection!.lastHeartbeatAt)
    assert.isNull(dto.vttConnection!.worldName)
    assert.isNull(dto.vttConnection!.moduleVersion)
  })
})

test.group('CampaignDto - fromModelArray', () => {
  test('should map an array of campaigns to an array of DTOs', async ({ assert }) => {
    const campaigns = [
      createMockCampaign({ id: 'camp-1', name: 'Campaign Alpha' }),
      createMockCampaign({ id: 'camp-2', name: 'Campaign Beta' }),
    ]
    const dtos = CampaignDto.fromModelArray(campaigns as Campaign[])

    assert.lengthOf(dtos, 2)
    assert.equal(dtos[0].id, 'camp-1')
    assert.equal(dtos[0].name, 'Campaign Alpha')
    assert.equal(dtos[1].id, 'camp-2')
    assert.equal(dtos[1].name, 'Campaign Beta')
  })
})

// ==========================================
// TESTS: CharacterDto
// ==========================================

test.group('CharacterDto - fromModel', () => {
  test('should map all basic fields from a character model', async ({ assert }) => {
    const character = createMockCharacter()
    const dto = CharacterDto.fromModel(character as Character)

    assert.equal(dto.id, 'char-uuid-1')
    assert.equal(dto.name, 'Gandalf')
    assert.equal(dto.avatarUrl, 'https://example.com/gandalf.png')
    assert.equal(dto.characterType, 'pc')
    assert.equal(dto.vttCharacterId, 'foundry-actor-abc')
  })

  test('should serialize spells array when spells are present', async ({ assert }) => {
    const spells: SpellInfo[] = [
      {
        id: 'spell-1',
        name: 'Fireball',
        img: null,
        type: 'spell',
        level: 3,
        school: 'evocation',
        prepared: true,
        uses: { value: 2, max: 3 },
      },
      {
        id: 'spell-2',
        name: 'Magic Missile',
        img: 'https://example.com/magic-missile.png',
        type: 'spell',
        level: 1,
        school: 'evocation',
        prepared: true,
        uses: null,
      },
    ]

    const character = createMockCharacter({ spells })
    const dto = CharacterDto.fromModel(character as Character)

    assert.isNotNull(dto.spells)
    assert.lengthOf(dto.spells!, 2)
    assert.equal(dto.spells![0].name, 'Fireball')
    assert.equal(dto.spells![0].level, 3)
    assert.equal(dto.spells![1].name, 'Magic Missile')
    assert.isNull(dto.spells![0].img)
    assert.equal(dto.spells![1].img, 'https://example.com/magic-missile.png')
  })

  test('should return null for spells when the character has no spells', async ({ assert }) => {
    const character = createMockCharacter({ spells: null })
    const dto = CharacterDto.fromModel(character as Character)

    assert.isNull(dto.spells)
  })

  test('should return null for spells when spells field is undefined', async ({ assert }) => {
    const character = createMockCharacter({ spells: undefined as any })
    const dto = CharacterDto.fromModel(character as Character)

    assert.isNull(dto.spells)
  })

  test('should serialize features array when features are present', async ({ assert }) => {
    const features: FeatureInfo[] = [
      {
        id: 'feat-1',
        name: 'Action Surge',
        img: null,
        type: 'feat',
        subtype: 'class',
        uses: { value: 1, max: 1, per: 'sr' },
      },
    ]

    const character = createMockCharacter({ features })
    const dto = CharacterDto.fromModel(character as Character)

    assert.isNotNull(dto.features)
    assert.lengthOf(dto.features!, 1)
    assert.equal(dto.features![0].name, 'Action Surge')
    assert.equal(dto.features![0].uses?.per, 'sr')
  })

  test('should return null for features when the character has no features', async ({ assert }) => {
    const character = createMockCharacter({ features: null })
    const dto = CharacterDto.fromModel(character as Character)

    assert.isNull(dto.features)
  })

  test('should preserve null avatarUrl', async ({ assert }) => {
    const character = createMockCharacter({ avatarUrl: null })
    const dto = CharacterDto.fromModel(character as Character)

    assert.isNull(dto.avatarUrl)
  })

  test('should correctly map each character type', async ({ assert }) => {
    const pc = CharacterDto.fromModel(createMockCharacter({ characterType: 'pc' }) as Character)
    const npc = CharacterDto.fromModel(createMockCharacter({ characterType: 'npc' }) as Character)
    const monster = CharacterDto.fromModel(
      createMockCharacter({ characterType: 'monster' }) as Character
    )

    assert.equal(pc.characterType, 'pc')
    assert.equal(npc.characterType, 'npc')
    assert.equal(monster.characterType, 'monster')
  })
})

test.group('CharacterDto - fromModelArray', () => {
  test('should map an array of characters to an array of DTOs', async ({ assert }) => {
    const characters = [
      createMockCharacter({ id: 'char-1', name: 'Gandalf', characterType: 'pc' }),
      createMockCharacter({ id: 'char-2', name: 'Sauron', characterType: 'monster' }),
      createMockCharacter({ id: 'char-3', name: 'Innkeeper', characterType: 'npc' }),
    ]
    const dtos = CharacterDto.fromModelArray(characters as Character[])

    assert.lengthOf(dtos, 3)
    assert.equal(dtos[0].id, 'char-1')
    assert.equal(dtos[0].name, 'Gandalf')
    assert.equal(dtos[1].characterType, 'monster')
    assert.equal(dtos[2].characterType, 'npc')
  })

  test('should return an empty array when given an empty array', async ({ assert }) => {
    const dtos = CharacterDto.fromModelArray([])

    assert.deepEqual(dtos, [])
    assert.lengthOf(dtos, 0)
  })
})
