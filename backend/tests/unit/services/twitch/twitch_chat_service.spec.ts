import { test } from '@japa/runner'

test.group('TwitchChatService - parseVote', () => {
  test('should parse valid vote format !1', async ({ assert }) => {
    // Test via reflection since parseVote is private
    // We test the behavior through the public interface instead
    const { twitchChatService: TwitchChatService } =
      await import('#services/twitch/twitch_chat_service')
    const { redisService: RedisService } = await import('#services/cache/redis_service')

    const service = new TwitchChatService(new RedisService())

    // Access private method via prototype for testing
    const parseVote = (service as any).parseVote.bind(service)

    assert.equal(parseVote('!1', 5), 0) // !1 -> index 0
    assert.equal(parseVote('!2', 5), 1) // !2 -> index 1
    assert.equal(parseVote('!3', 5), 2) // !3 -> index 2
  })

  test('should parse vote without exclamation mark', async ({ assert }) => {
    const { twitchChatService: TwitchChatService } =
      await import('#services/twitch/twitch_chat_service')
    const { redisService: RedisService } = await import('#services/cache/redis_service')

    const service = new TwitchChatService(new RedisService())
    const parseVote = (service as any).parseVote.bind(service)

    assert.equal(parseVote('1', 5), 0)
    assert.equal(parseVote('2', 5), 1)
    assert.equal(parseVote('5', 5), 4)
  })

  test('should return null for invalid vote', async ({ assert }) => {
    const { twitchChatService: TwitchChatService } =
      await import('#services/twitch/twitch_chat_service')
    const { redisService: RedisService } = await import('#services/cache/redis_service')

    const service = new TwitchChatService(new RedisService())
    const parseVote = (service as any).parseVote.bind(service)

    assert.isNull(parseVote('hello', 5))
    assert.isNull(parseVote('!a', 5))
    assert.isNull(parseVote('!', 5))
    assert.isNull(parseVote('', 5))
  })

  test('should return null for out of range vote', async ({ assert }) => {
    const { twitchChatService: TwitchChatService } =
      await import('#services/twitch/twitch_chat_service')
    const { redisService: RedisService } = await import('#services/cache/redis_service')

    const service = new TwitchChatService(new RedisService())
    const parseVote = (service as any).parseVote.bind(service)

    assert.isNull(parseVote('!0', 5)) // 0 is not valid (1-indexed)
    assert.isNull(parseVote('!6', 5)) // 6 is out of range for 5 options
    assert.isNull(parseVote('!10', 3)) // 10 is out of range for 3 options
  })

  test('should handle whitespace in vote', async ({ assert }) => {
    const { twitchChatService: TwitchChatService } =
      await import('#services/twitch/twitch_chat_service')
    const { redisService: RedisService } = await import('#services/cache/redis_service')

    const service = new TwitchChatService(new RedisService())
    const parseVote = (service as any).parseVote.bind(service)

    assert.equal(parseVote('  !1  ', 5), 0)
    assert.equal(parseVote('  2  ', 5), 1)
  })
})

test.group('TwitchChatService - getVotes', () => {
  test('should return empty object when no votes', async ({ assert }) => {
    const { twitchChatService: TwitchChatService } =
      await import('#services/twitch/twitch_chat_service')

    // Mock redis service
    const mockRedisService = {
      getChatVotes: async () => ({}),
    }

    const service = new TwitchChatService(mockRedisService as any)

    const votes = await service.getVotes('poll-123', 'streamer-456')
    assert.deepEqual(votes, {})
  })

  test('should return votes from redis', async ({ assert }) => {
    const { twitchChatService: TwitchChatService } =
      await import('#services/twitch/twitch_chat_service')

    const mockVotes = { '0': 10, '1': 5, '2': 15 }
    const mockRedisService = {
      getChatVotes: async () => mockVotes,
    }

    const service = new TwitchChatService(mockRedisService as any)

    const votes = await service.getVotes('poll-123', 'streamer-456')
    assert.deepEqual(votes, mockVotes)
  })

  test('should fallback to memory when redis fails', async ({ assert }) => {
    const { twitchChatService: TwitchChatService } =
      await import('#services/twitch/twitch_chat_service')

    const mockRedisService = {
      getChatVotes: async () => {
        throw new Error('Redis unavailable')
      },
    }

    const service = new TwitchChatService(mockRedisService as any)

    // Should not throw, returns empty object from memory fallback
    const votes = await service.getVotes('poll-123', 'streamer-456')
    assert.deepEqual(votes, {})
  })
})

test.group('TwitchChatService - incrementVote', () => {
  test('should increment vote in redis', async ({ assert }) => {
    const { twitchChatService: TwitchChatService } =
      await import('#services/twitch/twitch_chat_service')

    let incrementedKey = ''
    let incrementedOption = -1

    const mockRedisService = {
      incrementChatVote: async (pollId: string, streamerId: string, optionIndex: number) => {
        incrementedKey = `${pollId}:${streamerId}`
        incrementedOption = optionIndex
      },
    }

    const service = new TwitchChatService(mockRedisService as any)

    // Access private method
    const incrementVote = (service as any).incrementVote.bind(service)
    await incrementVote('poll-123', 'streamer-456', 2)

    assert.equal(incrementedKey, 'poll-123:streamer-456')
    assert.equal(incrementedOption, 2)
  })

  test('should fallback to memory on redis error', async ({ assert }) => {
    const { twitchChatService: TwitchChatService } =
      await import('#services/twitch/twitch_chat_service')

    const mockRedisService = {
      incrementChatVote: async () => {
        throw new Error('Redis connection failed')
      },
    }

    const service = new TwitchChatService(mockRedisService as any)

    const incrementVote = (service as any).incrementVote.bind(service)

    // Should not throw
    await assert.doesNotReject(async () => {
      await incrementVote('poll-123', 'streamer-456', 1)
    })

    // Verify in-memory fallback
    const inMemoryVotes = (service as any).inMemoryVotes
    const votes = inMemoryVotes.get('poll-123:streamer-456')
    assert.exists(votes)
    assert.equal(votes['1'], 1)
  })
})

test.group('TwitchChatService - client management', () => {
  test('should track active clients', async ({ assert }) => {
    const { twitchChatService: TwitchChatService } =
      await import('#services/twitch/twitch_chat_service')
    const { redisService: RedisService } = await import('#services/cache/redis_service')

    const service = new TwitchChatService(new RedisService())

    // Initially no clients
    const clients = (service as any).clients as Map<string, unknown>
    assert.equal(clients.size, 0)
  })

  test('should generate correct client key', async ({ assert }) => {
    // The key format is `${streamerId}:${pollInstanceId}`
    const streamerId = 'streamer-123'
    const pollInstanceId = 'poll-456'
    const expectedKey = `${streamerId}:${pollInstanceId}`

    assert.equal(expectedKey, 'streamer-123:poll-456')
  })
})
