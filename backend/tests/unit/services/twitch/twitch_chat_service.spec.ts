import { test } from '@japa/runner'
import { twitchChatService as TwitchChatService } from '#services/twitch/twitch_chat_service'
import type { redisService as RedisService } from '#services/cache/redis_service'

// Mock Redis Service
class MockRedisService implements Partial<RedisService> {
  private votes: Map<string, Record<string, number>> = new Map()
  private userVotes: Map<string, Map<string, number>> = new Map()
  incrementChatVoteCalled = false
  getChatVotesCalled = false
  recordUserVoteCalled = false
  hasUserVotedCalled = false
  changeUserVoteCalled = false

  async incrementChatVote(
    pollInstanceId: string,
    streamerId: string,
    optionIndex: number
  ): Promise<void> {
    this.incrementChatVoteCalled = true
    const key = `${pollInstanceId}:${streamerId}`
    const votes = this.votes.get(key) || {}
    votes[optionIndex.toString()] = (votes[optionIndex.toString()] || 0) + 1
    this.votes.set(key, votes)
  }

  async getChatVotes(pollInstanceId: string, streamerId: string): Promise<Record<string, number>> {
    this.getChatVotesCalled = true
    const key = `${pollInstanceId}:${streamerId}`
    return this.votes.get(key) || {}
  }

  async recordUserVote(
    pollInstanceId: string,
    streamerId: string,
    username: string,
    optionIndex: number
  ): Promise<void> {
    this.recordUserVoteCalled = true
    const key = `${pollInstanceId}:${streamerId}`
    const userVotes = this.userVotes.get(key) || new Map()
    userVotes.set(username, optionIndex)
    this.userVotes.set(key, userVotes)
  }

  async hasUserVoted(
    pollInstanceId: string,
    streamerId: string,
    username: string
  ): Promise<boolean> {
    this.hasUserVotedCalled = true
    const key = `${pollInstanceId}:${streamerId}`
    const userVotes = this.userVotes.get(key)
    return userVotes ? userVotes.has(username) : false
  }

  async getUserVote(
    pollInstanceId: string,
    streamerId: string,
    username: string
  ): Promise<number | null> {
    const key = `${pollInstanceId}:${streamerId}`
    const userVotes = this.userVotes.get(key)
    return userVotes ? userVotes.get(username) || null : null
  }

  async changeUserVote(
    pollInstanceId: string,
    streamerId: string,
    username: string,
    oldOption: number,
    newOption: number
  ): Promise<void> {
    this.changeUserVoteCalled = true
    const key = `${pollInstanceId}:${streamerId}`

    // Decrement old option
    const votes = this.votes.get(key) || {}
    votes[oldOption.toString()] = (votes[oldOption.toString()] || 1) - 1
    votes[newOption.toString()] = (votes[newOption.toString()] || 0) + 1
    this.votes.set(key, votes)

    // Update user vote
    const userVotes = this.userVotes.get(key) || new Map()
    userVotes.set(username, newOption)
    this.userVotes.set(key, userVotes)
  }

  reset(): void {
    this.votes.clear()
    this.userVotes.clear()
    this.incrementChatVoteCalled = false
    this.getChatVotesCalled = false
    this.recordUserVoteCalled = false
    this.hasUserVotedCalled = false
    this.changeUserVoteCalled = false
  }
}

test.group('TwitchChatService - Vote Parsing', () => {
  test('should parse !1 format correctly', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    // Access private method via prototype
    const parseVote = (service as any).parseVote.bind(service)

    const result = parseVote('!1', 3)

    assert.equal(result, 0) // 1-indexed to 0-indexed
  })

  test('should parse !2 format correctly', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const parseVote = (service as any).parseVote.bind(service)

    const result = parseVote('!2', 3)

    assert.equal(result, 1) // 1-indexed to 0-indexed
  })

  test('should parse number without ! prefix', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const parseVote = (service as any).parseVote.bind(service)

    const result = parseVote('3', 5)

    assert.equal(result, 2) // 1-indexed to 0-indexed
  })

  test('should return null for invalid formats', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const parseVote = (service as any).parseVote.bind(service)

    assert.isNull(parseVote('hello', 3))
    assert.isNull(parseVote('!abc', 3))
    assert.isNull(parseVote('vote 1', 3))
    assert.isNull(parseVote('', 3))
  })

  test('should reject votes outside valid range', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const parseVote = (service as any).parseVote.bind(service)

    // For 3 options, valid votes are !1, !2, !3
    assert.isNull(parseVote('!0', 3)) // Below range
    assert.isNull(parseVote('!4', 3)) // Above range
    assert.isNull(parseVote('!10', 3)) // Way above
  })

  test('should handle votes at boundaries', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const parseVote = (service as any).parseVote.bind(service)

    assert.equal(parseVote('!1', 5), 0) // Min valid
    assert.equal(parseVote('!5', 5), 4) // Max valid
  })

  test('should trim whitespace in vote message', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const parseVote = (service as any).parseVote.bind(service)

    assert.equal(parseVote('  !2  ', 3), 1)
    assert.equal(parseVote('\t!1\n', 3), 0)
  })
})

test.group('TwitchChatService - Vote Increment', () => {
  test('should increment vote in Redis', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const incrementVote = (service as any).incrementVote.bind(service)

    await incrementVote('poll-123', 'streamer-1', 0)
    await incrementVote('poll-123', 'streamer-1', 0)
    await incrementVote('poll-123', 'streamer-1', 1)

    assert.isTrue(mockRedis.incrementChatVoteCalled)

    const votes = await mockRedis.getChatVotes('poll-123', 'streamer-1')
    assert.equal(votes['0'], 2)
    assert.equal(votes['1'], 1)
  })

  test('should fallback to memory if Redis fails', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    // Make Redis throw error
    mockRedis.incrementChatVote = async () => {
      throw new Error('Redis connection failed')
    }

    const incrementVote = (service as any).incrementVote.bind(service)

    // Should not throw, should fallback to memory
    await incrementVote('poll-123', 'streamer-1', 0)
    await incrementVote('poll-123', 'streamer-1', 0)

    // Verify in-memory storage
    const inMemoryVotes = (service as any).inMemoryVotes as Map<string, Record<string, number>>
    const votes = inMemoryVotes.get('poll-123:streamer-1')

    assert.exists(votes)
    assert.equal(votes!['0'], 2)
  })

  test('should handle multiple polls simultaneously', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const incrementVote = (service as any).incrementVote.bind(service)

    await incrementVote('poll-1', 'streamer-1', 0)
    await incrementVote('poll-2', 'streamer-1', 0)
    await incrementVote('poll-1', 'streamer-2', 1)

    const votes1 = await mockRedis.getChatVotes('poll-1', 'streamer-1')
    const votes2 = await mockRedis.getChatVotes('poll-2', 'streamer-1')
    const votes3 = await mockRedis.getChatVotes('poll-1', 'streamer-2')

    assert.equal(votes1['0'], 1)
    assert.equal(votes2['0'], 1)
    assert.equal(votes3['1'], 1)
  })
})

test.group('TwitchChatService - Get Votes', () => {
  test('should retrieve votes from Redis', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    await mockRedis.incrementChatVote('poll-123', 'streamer-1', 0)
    await mockRedis.incrementChatVote('poll-123', 'streamer-1', 0)
    await mockRedis.incrementChatVote('poll-123', 'streamer-1', 1)

    const votes = await service.getVotes('poll-123', 'streamer-1')

    assert.isTrue(mockRedis.getChatVotesCalled)
    assert.equal(votes['0'], 2)
    assert.equal(votes['1'], 1)
  })

  test('should return empty object if no votes', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const votes = await service.getVotes('poll-nonexistent', 'streamer-1')

    assert.deepEqual(votes, {})
  })

  test('should fallback to memory if Redis fails', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    // Populate memory fallback
    const incrementVote = (service as any).incrementVote.bind(service)
    mockRedis.incrementChatVote = async () => {
      throw new Error('Redis down')
    }

    await incrementVote('poll-123', 'streamer-1', 0)
    await incrementVote('poll-123', 'streamer-1', 1)

    // Make getChatVotes also fail
    mockRedis.getChatVotes = async () => {
      throw new Error('Redis down')
    }

    const votes = await service.getVotes('poll-123', 'streamer-1')

    assert.equal(votes['0'], 1)
    assert.equal(votes['1'], 1)
  })
})

test.group('TwitchChatService - Message Handling (STANDARD mode)', () => {
  test('should process vote in STANDARD mode (unlimited votes)', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const handleMessage = (service as any).handleMessage.bind(service)

    const mockClient = {
      streamerId: 'streamer-1',
      pollInstanceId: 'poll-123',
      optionsCount: 3,
      pollType: 'STANDARD',
      active: true,
    }

    const tags = { username: 'viewer1' }

    await handleMessage('#testchannel', tags, '!1', mockClient)
    await handleMessage('#testchannel', tags, '!1', mockClient)
    await handleMessage('#testchannel', tags, '!2', mockClient)

    assert.isTrue(mockRedis.incrementChatVoteCalled)

    // In STANDARD mode, user can vote multiple times
    const votes = await mockRedis.getChatVotes('poll-123', 'streamer-1')
    assert.equal(votes['0'], 2) // Two votes for option 1
    assert.equal(votes['1'], 1) // One vote for option 2
  })

  test('should ignore inactive poll messages', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const handleMessage = (service as any).handleMessage.bind(service)

    const mockClient = {
      streamerId: 'streamer-1',
      pollInstanceId: 'poll-123',
      optionsCount: 3,
      pollType: 'STANDARD',
      active: false, // Inactive
    }

    const tags = { username: 'viewer1' }

    await handleMessage('#testchannel', tags, '!1', mockClient)

    assert.isFalse(mockRedis.incrementChatVoteCalled)
  })

  test('should ignore invalid vote formats in message handling', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const handleMessage = (service as any).handleMessage.bind(service)

    const mockClient = {
      streamerId: 'streamer-1',
      pollInstanceId: 'poll-123',
      optionsCount: 3,
      pollType: 'STANDARD',
      active: true,
    }

    const tags = { username: 'viewer1' }

    await handleMessage('#testchannel', tags, 'hello world', mockClient)
    await handleMessage('#testchannel', tags, '!invalid', mockClient)

    assert.isFalse(mockRedis.incrementChatVoteCalled)
  })
})

test.group('TwitchChatService - Message Handling (UNIQUE mode)', () => {
  test('should record first vote in UNIQUE mode', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const handleMessage = (service as any).handleMessage.bind(service)

    const mockClient = {
      streamerId: 'streamer-1',
      pollInstanceId: 'poll-123',
      optionsCount: 3,
      pollType: 'UNIQUE',
      active: true,
    }

    const tags = { username: 'viewer1' }

    await handleMessage('#testchannel', tags, '!1', mockClient)

    assert.isTrue(mockRedis.recordUserVoteCalled)
    assert.isTrue(mockRedis.incrementChatVoteCalled)

    const hasVoted = await mockRedis.hasUserVoted('poll-123', 'streamer-1', 'viewer1')
    assert.isTrue(hasVoted)
  })

  test('should allow vote change in UNIQUE mode', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const handleMessage = (service as any).handleMessage.bind(service)

    const mockClient = {
      streamerId: 'streamer-1',
      pollInstanceId: 'poll-123',
      optionsCount: 3,
      pollType: 'UNIQUE',
      active: true,
    }

    const tags = { username: 'viewer1' }

    // First vote for option 1
    await handleMessage('#testchannel', tags, '!1', mockClient)

    mockRedis.reset()

    // Change vote to option 2
    await handleMessage('#testchannel', tags, '!2', mockClient)

    assert.isTrue(mockRedis.changeUserVoteCalled)

    const userVote = await mockRedis.getUserVote('poll-123', 'streamer-1', 'viewer1')
    assert.equal(userVote, 1) // Changed to option 2 (0-indexed)
  })

  test('should ignore duplicate votes in UNIQUE mode', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const handleMessage = (service as any).handleMessage.bind(service)

    const mockClient = {
      streamerId: 'streamer-1',
      pollInstanceId: 'poll-123',
      optionsCount: 3,
      pollType: 'UNIQUE',
      active: true,
    }

    const tags = { username: 'viewer1' }

    // First vote
    await handleMessage('#testchannel', tags, '!1', mockClient)

    mockRedis.reset()

    // Same vote again
    await handleMessage('#testchannel', tags, '!1', mockClient)

    // Should NOT call changeUserVote or recordUserVote
    assert.isFalse(mockRedis.changeUserVoteCalled)
    assert.isFalse(mockRedis.recordUserVoteCalled)
  })

  test('should handle multiple users voting in UNIQUE mode', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const handleMessage = (service as any).handleMessage.bind(service)

    const mockClient = {
      streamerId: 'streamer-1',
      pollInstanceId: 'poll-123',
      optionsCount: 3,
      pollType: 'UNIQUE',
      active: true,
    }

    await handleMessage('#testchannel', { username: 'viewer1' }, '!1', mockClient)
    await handleMessage('#testchannel', { username: 'viewer2' }, '!2', mockClient)
    await handleMessage('#testchannel', { username: 'viewer3' }, '!1', mockClient)

    const hasVoted1 = await mockRedis.hasUserVoted('poll-123', 'streamer-1', 'viewer1')
    const hasVoted2 = await mockRedis.hasUserVoted('poll-123', 'streamer-1', 'viewer2')
    const hasVoted3 = await mockRedis.hasUserVoted('poll-123', 'streamer-1', 'viewer3')

    assert.isTrue(hasVoted1)
    assert.isTrue(hasVoted2)
    assert.isTrue(hasVoted3)

    const votes = await mockRedis.getChatVotes('poll-123', 'streamer-1')
    assert.equal(votes['0'], 2) // viewer1 + viewer3
    assert.equal(votes['1'], 1) // viewer2
  })

  test('should handle anonymous username gracefully', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const handleMessage = (service as any).handleMessage.bind(service)

    const mockClient = {
      streamerId: 'streamer-1',
      pollInstanceId: 'poll-123',
      optionsCount: 3,
      pollType: 'UNIQUE',
      active: true,
    }

    const tags = {} // No username field

    await handleMessage('#testchannel', tags, '!1', mockClient)

    const hasVoted = await mockRedis.hasUserVoted('poll-123', 'streamer-1', 'anonymous')
    assert.isTrue(hasVoted)
  })
})

test.group('TwitchChatService - Client Management', () => {
  test('should find active client by streamer ID', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const getClientByStreamerId = (service as any).getClientByStreamerId.bind(service)

    // Mock clients map
    const clients = (service as any).clients as Map<string, any>
    clients.set('streamer-1:poll-123', {
      streamerId: 'streamer-1',
      pollInstanceId: 'poll-123',
      active: true,
    })

    const client = getClientByStreamerId('streamer-1')

    assert.exists(client)
    assert.equal(client.streamerId, 'streamer-1')
    assert.equal(client.pollInstanceId, 'poll-123')
  })

  test('should return null if no active client found', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const getClientByStreamerId = (service as any).getClientByStreamerId.bind(service)

    const client = getClientByStreamerId('nonexistent-streamer')

    assert.isNull(client)
  })

  test('should skip inactive clients when searching', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const getClientByStreamerId = (service as any).getClientByStreamerId.bind(service)

    const clients = (service as any).clients as Map<string, any>
    clients.set('streamer-1:poll-123', {
      streamerId: 'streamer-1',
      pollInstanceId: 'poll-123',
      active: false, // Inactive
    })

    const client = getClientByStreamerId('streamer-1')

    assert.isNull(client)
  })

  test('should return first active client if multiple exist', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    const getClientByStreamerId = (service as any).getClientByStreamerId.bind(service)

    const clients = (service as any).clients as Map<string, any>
    clients.set('streamer-1:poll-123', {
      streamerId: 'streamer-1',
      pollInstanceId: 'poll-123',
      active: true,
    })
    clients.set('streamer-1:poll-456', {
      streamerId: 'streamer-1',
      pollInstanceId: 'poll-456',
      active: true,
    })

    const client = getClientByStreamerId('streamer-1')

    assert.exists(client)
    assert.equal(client.streamerId, 'streamer-1')
    // Should return one of them (first found)
    assert.oneOf(client.pollInstanceId, ['poll-123', 'poll-456'])
  })
})

test.group('TwitchChatService - Error Handling', () => {
  test('should handle Redis errors gracefully during vote increment', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    mockRedis.incrementChatVote = async () => {
      throw new Error('Redis timeout')
    }

    const handleMessage = (service as any).handleMessage.bind(service)

    const mockClient = {
      streamerId: 'streamer-1',
      pollInstanceId: 'poll-123',
      optionsCount: 3,
      pollType: 'STANDARD',
      active: true,
    }

    const tags = { username: 'viewer1' }

    // Should not throw
    await handleMessage('#testchannel', tags, '!1', mockClient)

    // Verify fallback to memory
    const inMemoryVotes = (service as any).inMemoryVotes as Map<string, Record<string, number>>
    const votes = inMemoryVotes.get('poll-123:streamer-1')

    assert.exists(votes)
    assert.equal(votes!['0'], 1)
  })

  test('should handle errors during user vote recording', async ({ assert }) => {
    const mockRedis = new MockRedisService()
    const service = new TwitchChatService(mockRedis as unknown as RedisService)

    mockRedis.recordUserVote = async () => {
      throw new Error('Database error')
    }

    const handleMessage = (service as any).handleMessage.bind(service)

    const mockClient = {
      streamerId: 'streamer-1',
      pollInstanceId: 'poll-123',
      optionsCount: 3,
      pollType: 'UNIQUE',
      active: true,
    }

    const tags = { username: 'viewer1' }

    // Should not throw - errors are logged but not propagated
    await handleMessage('#testchannel', tags, '!1', mockClient)

    // Note: The error is caught and logged, but vote is not recorded
    // This is expected behavior
  })
})
