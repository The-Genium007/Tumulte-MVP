import { test } from '@japa/runner'
import redis from '@adonisjs/redis/services/main'

// ========================================
// MOCK REDIS SETUP
// ========================================

/**
 * Creates a fully self-contained in-memory Redis mock that covers all
 * operations used by SessionService:
 *
 * - hset / hget / hgetall / hdel  →  Redis hash operations
 * - del / exists / expire          →  Redis key-level operations
 * - pipeline                       →  Batch operation queue
 *
 * The mock maintains two separate stores:
 *   hashStore   → mimics Redis hashes   (user:sessions:<userId>)
 *   simpleStore → mimics plain Redis keys (adonis:session:<sessionId>)
 */
function createMockRedis() {
  const hashStore = new Map<string, Map<string, string>>()
  const simpleStore = new Map<string, string>()

  return {
    // ---- Hash operations ----
    hset: async (key: string, field: string, value: string) => {
      if (!hashStore.has(key)) hashStore.set(key, new Map())
      hashStore.get(key)!.set(field, value)
      return 1
    },

    hget: async (key: string, field: string) => {
      return hashStore.get(key)?.get(field) ?? null
    },

    hgetall: async (key: string) => {
      const map = hashStore.get(key)
      if (!map || map.size === 0) return null
      return Object.fromEntries(map)
    },

    hdel: async (key: string, ...fields: string[]) => {
      const map = hashStore.get(key)
      if (!map) return 0
      let count = 0
      for (const field of fields) {
        if (map.delete(field)) count++
      }
      return count
    },

    // ---- Key-level operations ----
    del: async (key: string) => {
      const deletedHash = hashStore.delete(key)
      const deletedSimple = simpleStore.delete(key)
      return deletedHash || deletedSimple ? 1 : 0
    },

    exists: async (key: string) => {
      return simpleStore.has(key) || hashStore.has(key) ? 1 : 0
    },

    expire: async (_key: string, _ttl: number) => {
      return true
    },

    // ---- Pipeline (batch) operations ----
    pipeline: () => {
      const ops: Array<['del' | 'hdel', string, ...string[]]> = []

      return {
        del: (key: string) => {
          ops.push(['del', key])
        },
        hdel: (key: string, ...fields: string[]) => {
          ops.push(['hdel', key, ...fields])
        },
        exec: async () => {
          const results: Array<[null, number]> = []
          for (const op of ops) {
            const [command, key, ...rest] = op
            if (command === 'del') {
              const deletedHash = hashStore.delete(key)
              const deletedSimple = simpleStore.delete(key)
              results.push([null, deletedHash || deletedSimple ? 1 : 0])
            } else {
              // hdel
              const map = hashStore.get(key)
              let count = 0
              if (map) {
                for (const field of rest) {
                  if (map.delete(field)) count++
                }
              }
              results.push([null, count])
            }
          }
          return results
        },
      }
    },

    // ---- Test helpers (not part of the Redis API, used to seed state) ----
    _setSimpleKey: (key: string, value: string) => {
      simpleStore.set(key, value)
    },
    _hashStore: hashStore,
    _simpleStore: simpleStore,
  }
}

// ========================================
// HELPERS
// ========================================

const SESSION_PREFIX = 'adonis:session:'
const USER_SESSIONS_PREFIX = 'user:sessions:'

/**
 * Seeds a real AdonisJS-style session key in the mock's simple store so that
 * `getActiveSessions` / `cleanupStaleSessions` consider the session as live.
 */
function seedLiveSession(mockRedis: ReturnType<typeof createMockRedis>, sessionId: string) {
  mockRedis._setSimpleKey(`${SESSION_PREFIX}${sessionId}`, '1')
}

/** Returns the key used by SessionService to store the user session hash. */
function userKey(userId: number) {
  return `${USER_SESSIONS_PREFIX}${userId}`
}

// ========================================
// TEST GROUPS
// ========================================

test.group('SessionService - registerSession', (group) => {
  let mockRedis: ReturnType<typeof createMockRedis>
  let origHset: typeof redis.hset
  let origExpire: typeof redis.expire

  group.each.setup(async () => {
    mockRedis = createMockRedis()
    origHset = redis.hset.bind(redis)
    origExpire = redis.expire.bind(redis)
    ;(redis as any).hset = mockRedis.hset
    ;(redis as any).expire = mockRedis.expire
  })

  group.each.teardown(() => {
    ;(redis as any).hset = origHset
    ;(redis as any).expire = origExpire
  })

  test('stores session data in the Redis hash under the correct key', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    await service.registerSession(42, 'sess-abc', {
      userAgent: 'Mozilla/5.0',
      ipAddress: '127.0.0.1',
    })

    const stored = await mockRedis.hget(userKey(42), 'sess-abc')
    assert.isNotNull(stored)
    const parsed = JSON.parse(stored!)
    assert.equal(parsed.sessionId, 'sess-abc')
    assert.equal(parsed.userId, 42)
    assert.equal(parsed.userAgent, 'Mozilla/5.0')
    assert.equal(parsed.ipAddress, '127.0.0.1')
    assert.isString(parsed.createdAt)
    assert.isString(parsed.lastActivityAt)
  })

  test('registers a session without optional metadata', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    await service.registerSession(99, 'sess-no-meta')

    const stored = await mockRedis.hget(userKey(99), 'sess-no-meta')
    assert.isNotNull(stored)
    const parsed = JSON.parse(stored!)
    assert.isUndefined(parsed.userAgent)
    assert.isUndefined(parsed.ipAddress)
  })

  test('calls expire with a 7-day TTL (604800 seconds)', async ({ assert }) => {
    const expireCalls: Array<{ key: string; ttl: number }> = []
    ;(redis as any).expire = async (key: string, ttl: number) => {
      expireCalls.push({ key, ttl })
      return true
    }

    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    await service.registerSession(7, 'sess-ttl')

    assert.equal(expireCalls.length, 1)
    assert.equal(expireCalls[0].key, userKey(7))
    assert.equal(expireCalls[0].ttl, 7 * 24 * 60 * 60) // 604800
  })
})

test.group('SessionService - updateActivity', (group) => {
  let mockRedis: ReturnType<typeof createMockRedis>
  let origHset: typeof redis.hset
  let origHget: typeof redis.hget

  group.each.setup(async () => {
    mockRedis = createMockRedis()
    origHset = redis.hset.bind(redis)
    origHget = redis.hget.bind(redis)
    ;(redis as any).hset = mockRedis.hset
    ;(redis as any).hget = mockRedis.hget
  })

  group.each.teardown(() => {
    ;(redis as any).hset = origHset
    ;(redis as any).hget = origHget
  })

  test('updates lastActivityAt for an existing session', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    // Seed an old session in the hash
    const oldTimestamp = new Date(Date.now() - 60_000).toISOString()
    const sessionData = {
      sessionId: 'sess-update',
      userId: 5,
      createdAt: oldTimestamp,
      lastActivityAt: oldTimestamp,
    }
    await mockRedis.hset(userKey(5), 'sess-update', JSON.stringify(sessionData))

    const before = Date.now()
    await service.updateActivity(5, 'sess-update')

    const stored = await mockRedis.hget(userKey(5), 'sess-update')
    const parsed = JSON.parse(stored!)
    const updatedTime = new Date(parsed.lastActivityAt).getTime()

    assert.isAbove(updatedTime, new Date(oldTimestamp).getTime())
    assert.isAtLeast(updatedTime, before)
  })

  test('does nothing when the session does not exist in the hash', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    // Should not throw even if session is absent
    await assert.doesNotReject(async () => {
      await service.updateActivity(99, 'sess-nonexistent')
    })

    // Hash should remain empty for this user
    const stored = await mockRedis.hget(userKey(99), 'sess-nonexistent')
    assert.isNull(stored)
  })
})

test.group('SessionService - getActiveSessions', (group) => {
  let mockRedis: ReturnType<typeof createMockRedis>
  let origHgetall: typeof redis.hgetall
  let origExists: typeof redis.exists
  let origHdel: typeof redis.hdel

  group.each.setup(async () => {
    mockRedis = createMockRedis()
    origHgetall = redis.hgetall.bind(redis)
    origExists = redis.exists.bind(redis)
    origHdel = redis.hdel.bind(redis)
    ;(redis as any).hgetall = mockRedis.hgetall
    ;(redis as any).exists = mockRedis.exists
    ;(redis as any).hdel = mockRedis.hdel
  })

  group.each.teardown(() => {
    ;(redis as any).hgetall = origHgetall
    ;(redis as any).exists = origExists
    ;(redis as any).hdel = origHdel
  })

  test('returns an empty array when the user has no session hash', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    const sessions = await service.getActiveSessions(1)

    assert.isArray(sessions)
    assert.lengthOf(sessions, 0)
  })

  test('returns only sessions whose adonis session key exists in Redis', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    const makeInfo = (id: string, lastActivity: string) =>
      JSON.stringify({
        sessionId: id,
        userId: 10,
        createdAt: lastActivity,
        lastActivityAt: lastActivity,
      })

    await mockRedis.hset(userKey(10), 'live-sess', makeInfo('live-sess', new Date().toISOString()))
    await mockRedis.hset(userKey(10), 'dead-sess', makeInfo('dead-sess', new Date().toISOString()))

    // Only 'live-sess' has a backing adonis session
    seedLiveSession(mockRedis, 'live-sess')

    const sessions = await service.getActiveSessions(10)

    assert.lengthOf(sessions, 1)
    assert.equal(sessions[0].sessionId, 'live-sess')
  })

  test('removes stale session mappings from the hash during the call', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    const makeInfo = (id: string) =>
      JSON.stringify({
        sessionId: id,
        userId: 20,
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      })

    await mockRedis.hset(userKey(20), 'stale-1', makeInfo('stale-1'))
    await mockRedis.hset(userKey(20), 'stale-2', makeInfo('stale-2'))
    // No live adonis session keys seeded — both are stale

    await service.getActiveSessions(20)

    // Both stale entries should have been deleted from the hash
    const remaining = await mockRedis.hget(userKey(20), 'stale-1')
    const remaining2 = await mockRedis.hget(userKey(20), 'stale-2')
    assert.isNull(remaining)
    assert.isNull(remaining2)
  })

  test('returns sessions sorted by lastActivityAt descending', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    const early = new Date(Date.now() - 10_000).toISOString()
    const late = new Date(Date.now() - 1_000).toISOString()

    const makeInfo = (id: string, lastActivity: string) =>
      JSON.stringify({ sessionId: id, userId: 30, createdAt: early, lastActivityAt: lastActivity })

    await mockRedis.hset(userKey(30), 'sess-early', makeInfo('sess-early', early))
    await mockRedis.hset(userKey(30), 'sess-late', makeInfo('sess-late', late))

    seedLiveSession(mockRedis, 'sess-early')
    seedLiveSession(mockRedis, 'sess-late')

    const sessions = await service.getActiveSessions(30)

    assert.lengthOf(sessions, 2)
    // Most-recent activity should come first
    assert.equal(sessions[0].sessionId, 'sess-late')
    assert.equal(sessions[1].sessionId, 'sess-early')
  })
})

test.group('SessionService - revokeSession', (group) => {
  let mockRedis: ReturnType<typeof createMockRedis>
  let origDel: typeof redis.del
  let origHdel: typeof redis.hdel

  group.each.setup(async () => {
    mockRedis = createMockRedis()
    origDel = redis.del.bind(redis)
    origHdel = redis.hdel.bind(redis)
    ;(redis as any).del = mockRedis.del
    ;(redis as any).hdel = mockRedis.hdel
  })

  group.each.teardown(() => {
    ;(redis as any).del = origDel
    ;(redis as any).hdel = origHdel
  })

  test('returns true when the adonis session key was deleted', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    // Seed the adonis session key
    seedLiveSession(mockRedis, 'sess-revoke')

    const result = await service.revokeSession(50, 'sess-revoke')

    assert.isTrue(result)
  })

  test('returns false when the adonis session key did not exist', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    // No adonis session seeded
    const result = await service.revokeSession(50, 'sess-missing')

    assert.isFalse(result)
  })

  test('removes the session from the user hash mapping', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    const sessionData = JSON.stringify({ sessionId: 'sess-del', userId: 60 })
    await mockRedis.hset(userKey(60), 'sess-del', sessionData)
    seedLiveSession(mockRedis, 'sess-del')

    await service.revokeSession(60, 'sess-del')

    const remaining = await mockRedis.hget(userKey(60), 'sess-del')
    assert.isNull(remaining)
  })
})

test.group('SessionService - revokeAllSessions', (group) => {
  let mockRedis: ReturnType<typeof createMockRedis>
  let origHgetall: typeof redis.hgetall
  let origPipeline: typeof redis.pipeline

  group.each.setup(async () => {
    mockRedis = createMockRedis()
    origHgetall = redis.hgetall.bind(redis)
    origPipeline = redis.pipeline.bind(redis)
    ;(redis as any).hgetall = mockRedis.hgetall
    ;(redis as any).pipeline = mockRedis.pipeline
  })

  group.each.teardown(() => {
    ;(redis as any).hgetall = origHgetall
    ;(redis as any).pipeline = origPipeline
  })

  test('returns 0 when the user has no sessions', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    const count = await service.revokeAllSessions(100)

    assert.equal(count, 0)
  })

  test('revokes all sessions and returns the count', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    const makeInfo = (id: string) => JSON.stringify({ sessionId: id, userId: 70 })

    await mockRedis.hset(userKey(70), 'sess-a', makeInfo('sess-a'))
    await mockRedis.hset(userKey(70), 'sess-b', makeInfo('sess-b'))
    await mockRedis.hset(userKey(70), 'sess-c', makeInfo('sess-c'))

    seedLiveSession(mockRedis, 'sess-a')
    seedLiveSession(mockRedis, 'sess-b')
    seedLiveSession(mockRedis, 'sess-c')

    const count = await service.revokeAllSessions(70)

    assert.equal(count, 3)

    // All adonis session keys should be deleted
    assert.equal(await mockRedis.exists(`${SESSION_PREFIX}sess-a`), 0)
    assert.equal(await mockRedis.exists(`${SESSION_PREFIX}sess-b`), 0)
    assert.equal(await mockRedis.exists(`${SESSION_PREFIX}sess-c`), 0)

    // Hash entries should also be removed
    assert.isNull(await mockRedis.hget(userKey(70), 'sess-a'))
    assert.isNull(await mockRedis.hget(userKey(70), 'sess-b'))
    assert.isNull(await mockRedis.hget(userKey(70), 'sess-c'))
  })

  test('skips the current session when exceptSessionId is provided', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    const makeInfo = (id: string) => JSON.stringify({ sessionId: id, userId: 80 })

    await mockRedis.hset(userKey(80), 'current-sess', makeInfo('current-sess'))
    await mockRedis.hset(userKey(80), 'other-sess', makeInfo('other-sess'))

    seedLiveSession(mockRedis, 'current-sess')
    seedLiveSession(mockRedis, 'other-sess')

    const count = await service.revokeAllSessions(80, 'current-sess')

    // Only the other session should be revoked
    assert.equal(count, 1)

    // The current session's adonis key should still exist
    assert.equal(await mockRedis.exists(`${SESSION_PREFIX}current-sess`), 1)

    // The other session should be gone
    assert.equal(await mockRedis.exists(`${SESSION_PREFIX}other-sess`), 0)
  })

  test('revokes all sessions when exceptSessionId is not in the user hash', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    const makeInfo = (id: string) => JSON.stringify({ sessionId: id, userId: 85 })

    await mockRedis.hset(userKey(85), 'sess-x', makeInfo('sess-x'))
    await mockRedis.hset(userKey(85), 'sess-y', makeInfo('sess-y'))

    seedLiveSession(mockRedis, 'sess-x')
    seedLiveSession(mockRedis, 'sess-y')

    // The "current" session doesn't appear in the hash — all others revoked
    const count = await service.revokeAllSessions(85, 'sess-z-not-in-hash')

    assert.equal(count, 2)
  })
})

test.group('SessionService - getSessionCount', (group) => {
  let mockRedis: ReturnType<typeof createMockRedis>
  let origHgetall: typeof redis.hgetall
  let origExists: typeof redis.exists
  let origHdel: typeof redis.hdel

  group.each.setup(async () => {
    mockRedis = createMockRedis()
    origHgetall = redis.hgetall.bind(redis)
    origExists = redis.exists.bind(redis)
    origHdel = redis.hdel.bind(redis)
    ;(redis as any).hgetall = mockRedis.hgetall
    ;(redis as any).exists = mockRedis.exists
    ;(redis as any).hdel = mockRedis.hdel
  })

  group.each.teardown(() => {
    ;(redis as any).hgetall = origHgetall
    ;(redis as any).exists = origExists
    ;(redis as any).hdel = origHdel
  })

  test('returns 0 when the user has no sessions', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    const count = await service.getSessionCount(200)

    assert.equal(count, 0)
  })

  test('returns the number of live sessions only', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    const makeInfo = (id: string) =>
      JSON.stringify({
        sessionId: id,
        userId: 201,
        createdAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      })

    await mockRedis.hset(userKey(201), 'live-1', makeInfo('live-1'))
    await mockRedis.hset(userKey(201), 'live-2', makeInfo('live-2'))
    await mockRedis.hset(userKey(201), 'stale-1', makeInfo('stale-1'))

    seedLiveSession(mockRedis, 'live-1')
    seedLiveSession(mockRedis, 'live-2')
    // stale-1 has no backing adonis session

    const count = await service.getSessionCount(201)

    assert.equal(count, 2)
  })
})

test.group('SessionService - cleanupStaleSessions', (group) => {
  let mockRedis: ReturnType<typeof createMockRedis>
  let origHgetall: typeof redis.hgetall
  let origExists: typeof redis.exists
  let origHdel: typeof redis.hdel

  group.each.setup(async () => {
    mockRedis = createMockRedis()
    origHgetall = redis.hgetall.bind(redis)
    origExists = redis.exists.bind(redis)
    origHdel = redis.hdel.bind(redis)
    ;(redis as any).hgetall = mockRedis.hgetall
    ;(redis as any).exists = mockRedis.exists
    ;(redis as any).hdel = mockRedis.hdel
  })

  group.each.teardown(() => {
    ;(redis as any).hgetall = origHgetall
    ;(redis as any).exists = origExists
    ;(redis as any).hdel = origHdel
  })

  test('returns 0 when the user has no session hash', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    const cleaned = await service.cleanupStaleSessions(300)

    assert.equal(cleaned, 0)
  })

  test('removes stale session mappings and returns the count', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    const makeInfo = (id: string) => JSON.stringify({ sessionId: id, userId: 301 })

    await mockRedis.hset(userKey(301), 'live-sess', makeInfo('live-sess'))
    await mockRedis.hset(userKey(301), 'stale-sess-1', makeInfo('stale-sess-1'))
    await mockRedis.hset(userKey(301), 'stale-sess-2', makeInfo('stale-sess-2'))

    // Only live-sess has a backing adonis session
    seedLiveSession(mockRedis, 'live-sess')

    const cleaned = await service.cleanupStaleSessions(301)

    assert.equal(cleaned, 2)

    // Stale entries removed
    assert.isNull(await mockRedis.hget(userKey(301), 'stale-sess-1'))
    assert.isNull(await mockRedis.hget(userKey(301), 'stale-sess-2'))

    // Live entry preserved
    assert.isNotNull(await mockRedis.hget(userKey(301), 'live-sess'))
  })

  test('returns 0 when all sessions are still live', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    const makeInfo = (id: string) => JSON.stringify({ sessionId: id, userId: 302 })

    await mockRedis.hset(userKey(302), 'alive-1', makeInfo('alive-1'))
    await mockRedis.hset(userKey(302), 'alive-2', makeInfo('alive-2'))

    seedLiveSession(mockRedis, 'alive-1')
    seedLiveSession(mockRedis, 'alive-2')

    const cleaned = await service.cleanupStaleSessions(302)

    assert.equal(cleaned, 0)

    // Both entries still present
    assert.isNotNull(await mockRedis.hget(userKey(302), 'alive-1'))
    assert.isNotNull(await mockRedis.hget(userKey(302), 'alive-2'))
  })

  test('handles an empty hash gracefully when all sessions are stale', async ({ assert }) => {
    const { default: SessionService } = await import('#services/auth/session_service')
    const service = new SessionService()

    const makeInfo = (id: string) => JSON.stringify({ sessionId: id, userId: 303 })

    await mockRedis.hset(userKey(303), 'stale-a', makeInfo('stale-a'))
    await mockRedis.hset(userKey(303), 'stale-b', makeInfo('stale-b'))
    // No live adonis sessions

    const cleaned = await service.cleanupStaleSessions(303)

    assert.equal(cleaned, 2)
  })
})
