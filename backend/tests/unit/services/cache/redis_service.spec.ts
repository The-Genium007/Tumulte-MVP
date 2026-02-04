import { test } from '@japa/runner'
import redis from '@adonisjs/redis/services/main'

test.group('RedisService - Poll Results Cache', (group) => {
  const testPollInstanceId = 'test-poll-instance-123'

  group.each.teardown(async () => {
    // Clean up test keys
    const keys = await redis.keys('poll:*test-poll*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  })

  test('cachePollResults should store results with TTL', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    const results = { question: 'Test?', options: [{ text: 'A', votes: 10 }] }

    await service.cachePollResults(testPollInstanceId, results, 60)

    const cached = await service.getCachedPollResults(testPollInstanceId)
    assert.deepEqual(cached, results)
  })

  test('getCachedPollResults should return null for non-existent key', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    const cached = await service.getCachedPollResults('non-existent-poll')
    assert.isNull(cached)
  })

  test('invalidatePollResults should remove cached results', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    const results = { question: 'Test?' }
    await service.cachePollResults(testPollInstanceId, results, 60)

    // Verify it's cached
    let cached = await service.getCachedPollResults(testPollInstanceId)
    assert.isNotNull(cached)

    // Invalidate
    await service.invalidatePollResults(testPollInstanceId)

    // Should be gone
    cached = await service.getCachedPollResults(testPollInstanceId)
    assert.isNull(cached)
  })
})

test.group('RedisService - Aggregated Votes Cache', (group) => {
  const testPollInstanceId = 'test-aggregated-poll-456'

  group.each.teardown(async () => {
    const keys = await redis.keys('poll:aggregated:*test-aggregated*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  })

  test('cacheAggregatedVotes should store votes with short TTL', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    const votes = { '0': 15, '1': 25, '2': 10 }

    await service.cacheAggregatedVotes(testPollInstanceId, votes)

    const cached = await service.getCachedAggregatedVotes(testPollInstanceId)
    assert.deepEqual(cached, votes)
  })

  test('getCachedAggregatedVotes should return null for non-existent key', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    const cached = await service.getCachedAggregatedVotes('non-existent-votes')
    assert.isNull(cached)
  })

  test('deleteCachedAggregatedVotes should remove cached votes', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    await service.cacheAggregatedVotes(testPollInstanceId, { '0': 5 })

    let cached = await service.getCachedAggregatedVotes(testPollInstanceId)
    assert.isNotNull(cached)

    await service.deleteCachedAggregatedVotes(testPollInstanceId)

    cached = await service.getCachedAggregatedVotes(testPollInstanceId)
    assert.isNull(cached)
  })
})

test.group('RedisService - Streamer Tokens Cache', (group) => {
  const testStreamerId = 'test-streamer-789'

  group.each.teardown(async () => {
    const keys = await redis.keys('streamer:tokens:*test-streamer*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  })

  test('cacheStreamerTokens should store tokens with expiry', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    await service.cacheStreamerTokens(testStreamerId, 'acc_tok_123', 'ref_tok_456', 3600)

    const cached = await service.getCachedStreamerTokens(testStreamerId)
    assert.isNotNull(cached)
    assert.equal(cached?.accessToken, 'acc_tok_123')
    assert.equal(cached?.refreshToken, 'ref_tok_456')
  })

  test('getCachedStreamerTokens should return null for non-existent key', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    const cached = await service.getCachedStreamerTokens('non-existent-streamer')
    assert.isNull(cached)
  })

  test('invalidateStreamerTokens should remove cached tokens', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    await service.cacheStreamerTokens(testStreamerId, 'tok1', 'tok2', 3600)

    let cached = await service.getCachedStreamerTokens(testStreamerId)
    assert.isNotNull(cached)

    await service.invalidateStreamerTokens(testStreamerId)

    cached = await service.getCachedStreamerTokens(testStreamerId)
    assert.isNull(cached)
  })
})

test.group('RedisService - App Access Token Cache', (group) => {
  group.each.teardown(async () => {
    const keys = await redis.keys('twitch:app-token*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  })

  test('cacheAppAccessToken should store token with adjusted TTL', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    // 1 hour expiry - 10 minutes buffer = 50 minutes TTL
    await service.cacheAppAccessToken('app_tok_abc', 3600)

    const cached = await service.getCachedAppAccessToken()
    assert.equal(cached, 'app_tok_abc')
  })

  test('cacheAppAccessToken should ensure minimum TTL of 60 seconds', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    // Very short expiry (less than buffer) should result in 60s TTL
    await service.cacheAppAccessToken('short_ttl_tok', 100)

    const cached = await service.getCachedAppAccessToken()
    assert.equal(cached, 'short_ttl_tok')
  })

  test('getCachedAppAccessToken should return null when not cached', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    // Ensure key doesn't exist
    await redis.del('twitch:app-token')

    const cached = await service.getCachedAppAccessToken()
    assert.isNull(cached)
  })
})

test.group('RedisService - Chat Votes (Fallback Mode)', (group) => {
  const testPollId = 'test-chat-poll-111'
  const testStreamerId = 'test-chat-streamer-222'

  group.each.teardown(async () => {
    const keys = await redis.keys('poll:chat:*test-chat*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  })

  test('incrementChatVote should increment vote count', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    const count1 = await service.incrementChatVote(testPollId, testStreamerId, 0)
    assert.equal(count1, 1)

    const count2 = await service.incrementChatVote(testPollId, testStreamerId, 0)
    assert.equal(count2, 2)

    const count3 = await service.incrementChatVote(testPollId, testStreamerId, 1)
    assert.equal(count3, 1)
  })

  test('getChatVotes should return all votes as numbers', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    await service.incrementChatVote(testPollId, testStreamerId, 0)
    await service.incrementChatVote(testPollId, testStreamerId, 0)
    await service.incrementChatVote(testPollId, testStreamerId, 1)

    const votes = await service.getChatVotes(testPollId, testStreamerId)

    assert.equal(votes['0'], 2)
    assert.equal(votes['1'], 1)
  })

  test('getChatVotes should return empty object for no votes', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    const votes = await service.getChatVotes('no-votes-poll', 'no-votes-streamer')

    assert.deepEqual(votes, {})
  })

  test('setChatVotesTTL should set expiry on votes', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    await service.incrementChatVote(testPollId, testStreamerId, 0)
    await service.setChatVotesTTL(testPollId, testStreamerId, 60)

    // Votes should still exist
    const votes = await service.getChatVotes(testPollId, testStreamerId)
    assert.equal(votes['0'], 1)
  })

  test('deleteChatVotes should remove all votes', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    await service.incrementChatVote(testPollId, testStreamerId, 0)
    await service.incrementChatVote(testPollId, testStreamerId, 1)

    await service.deleteChatVotes(testPollId, testStreamerId)

    const votes = await service.getChatVotes(testPollId, testStreamerId)
    assert.deepEqual(votes, {})
  })
})

test.group('RedisService - User Vote Tracking (Unique Mode)', (group) => {
  const testPollId = 'test-unique-poll-333'
  const testStreamerId = 'test-unique-streamer-444'
  const testUsername = 'testuser123'

  group.each.teardown(async () => {
    const keys = await redis.keys('poll:chat:*test-unique*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  })

  test('hasUserVoted should return false for new user', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    const hasVoted = await service.hasUserVoted(testPollId, testStreamerId, testUsername)
    assert.isFalse(hasVoted)
  })

  test('recordUserVote should track user vote', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    await service.recordUserVote(testPollId, testStreamerId, testUsername, 2)

    const hasVoted = await service.hasUserVoted(testPollId, testStreamerId, testUsername)
    assert.isTrue(hasVoted)
  })

  test('getUserVote should return voted option index', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    await service.recordUserVote(testPollId, testStreamerId, testUsername, 1)

    const vote = await service.getUserVote(testPollId, testStreamerId, testUsername)
    assert.equal(vote, 1)
  })

  test('getUserVote should return null for non-voter', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    const vote = await service.getUserVote(testPollId, testStreamerId, 'nonvoter')
    assert.isNull(vote)
  })

  test('changeUserVote should update vote correctly', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    // Initial vote for option 0
    await service.recordUserVote(testPollId, testStreamerId, testUsername, 0)
    await service.incrementChatVote(testPollId, testStreamerId, 0)

    // Change to option 2
    await service.changeUserVote(testPollId, testStreamerId, testUsername, 0, 2)

    // Verify user's vote changed
    const vote = await service.getUserVote(testPollId, testStreamerId, testUsername)
    assert.equal(vote, 2)

    // Verify vote counts updated
    const votes = await service.getChatVotes(testPollId, testStreamerId)
    assert.equal(votes['0'], 0)
    assert.equal(votes['2'], 1)
  })

  test('deleteChatVoters should remove all voter records', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    await service.recordUserVote(testPollId, testStreamerId, 'user1', 0)
    await service.recordUserVote(testPollId, testStreamerId, 'user2', 1)

    await service.deleteChatVoters(testPollId, testStreamerId)

    const hasVoted1 = await service.hasUserVoted(testPollId, testStreamerId, 'user1')
    const hasVoted2 = await service.hasUserVoted(testPollId, testStreamerId, 'user2')

    assert.isFalse(hasVoted1)
    assert.isFalse(hasVoted2)
  })

  test('username should be case-insensitive', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    await service.recordUserVote(testPollId, testStreamerId, 'TestUser', 0)

    // Check with different case
    const hasVoted = await service.hasUserVoted(testPollId, testStreamerId, 'testuser')
    assert.isTrue(hasVoted)

    const vote = await service.getUserVote(testPollId, testStreamerId, 'TESTUSER')
    assert.equal(vote, 0)
  })
})

test.group('RedisService - Utilities', (group) => {
  group.each.teardown(async () => {
    const keys = await redis.keys('test-util:*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  })

  test('ping should succeed when Redis is connected', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    await assert.doesNotReject(async () => {
      await service.ping()
    })
  })

  test('clearPattern should delete matching keys', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    // Create some test keys
    await redis.set('test-util:key1', 'value1')
    await redis.set('test-util:key2', 'value2')
    await redis.set('test-util:key3', 'value3')

    const deleted = await service.clearPattern('test-util:*')

    assert.equal(deleted, 3)

    // Verify keys are gone
    const remaining = await redis.keys('test-util:*')
    assert.lengthOf(remaining, 0)
  })

  test('clearPattern should return 0 for no matches', async ({ assert }) => {
    const { RedisService } = await import('#services/cache/redis_service')
    const service = new RedisService()

    const deleted = await service.clearPattern('nonexistent-pattern-*')

    assert.equal(deleted, 0)
  })
})
