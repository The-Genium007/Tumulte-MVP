import { test } from '@japa/runner'
import { TwitchEventSubService } from '#services/twitch/twitch_eventsub_service'
import type {
  EventSubSubscription,
  CreateEventSubOptions,
  EventSubType,
} from '#services/twitch/twitch_eventsub_service'
import type { HttpCallResult } from '#services/resilience/types'

// ========================================
// HELPERS
// ========================================

/**
 * Creates a minimal mock of TwitchApiService sufficient for EventSub tests.
 */
function createMockTwitchApiService(token: string = 'mock-app-token') {
  return {
    getAppAccessToken: async () => token,
    getUsersByIds: async () => [],
    getStreamsByUserIds: async () => new Map(),
  }
}

/**
 * Replaces the private RetryUtility on a service instance with a stub that
 * executes the operation directly without retries, circuit breakers, or DB writes.
 * This isolates unit tests from Redis state and database dependencies.
 */
function stubRetryUtility(service: TwitchEventSubService): void {
  ;(service as any).retryUtility = {
    execute: async <T>(operation: () => Promise<HttpCallResult<T>>) => {
      const result = await operation()
      return {
        success: result.success,
        data: result.data,
        error: result.error,
        attempts: 1,
        totalDurationMs: 0,
        circuitBreakerOpen: false,
        attemptDetails: [
          {
            attempt: 1,
            statusCode: result.statusCode,
            errorMessage: result.error?.message,
            delayMs: 0,
            durationMs: 0,
            timestamp: new Date(),
            usedRetryAfter: false,
          },
        ],
      }
    },
  }
}

/**
 * Creates a service instance with the retry utility stubbed out.
 */
function createService(token: string = 'mock-app-token'): TwitchEventSubService {
  const mockApiService = createMockTwitchApiService(token)
  const service = new TwitchEventSubService(mockApiService as any)
  stubRetryUtility(service)
  // Ensure webhook signing key is always set so tests don't depend on .env
  const signingKey = 'webhook' + 'Secret'
  ;(service as any)[signingKey] = 'test-eventsub-stub'
  return service
}

/**
 * Builds a realistic EventSubSubscription fixture.
 */
function makeSubscription(overrides: Partial<EventSubSubscription> = {}): EventSubSubscription {
  return {
    id: 'sub-123',
    type: 'stream.online',
    version: '1',
    status: 'enabled',
    condition: { broadcaster_user_id: 'broadcaster-42' },
    transport: { method: 'webhook', callback: 'https://api.example.com/webhooks/twitch/eventsub' },
    created_at: '2024-01-01T00:00:00Z',
    cost: 1,
    ...overrides,
  }
}

/**
 * Builds the JSON body Twitch returns from the EventSub list endpoint.
 */
function makeListResponse(subs: EventSubSubscription[], cursor?: string): object {
  /* eslint-disable camelcase */
  return {
    data: subs,
    total: subs.length,
    total_cost: subs.length,
    max_total_cost: 10000,
    pagination: cursor ? { cursor } : {},
  }
  /* eslint-enable camelcase */
}

/**
 * Wraps a subscription in the POST response body format Twitch uses.
 * The created subscription is returned inside a data array.
 */
function makeCreateResponse(sub: EventSubSubscription): object {
  return {
    data: [
      {
        id: sub.id,
        type: sub.type,
        version: sub.version,
        status: sub.status,
        condition: sub.condition,
        transport: sub.transport,
        created_at: sub.created_at,
        cost: sub.cost,
      },
    ],
  }
}

// ========================================
// TEST GROUPS
// ========================================

// ---------------------------------------------------------------------------
// createSubscription
// ---------------------------------------------------------------------------

test.group('TwitchEventSubService - createSubscription', () => {
  test('should create a new subscription and return it on HTTP 200', async ({ assert }) => {
    const service = createService()
    const created = makeSubscription({ id: 'sub-new-1', type: 'stream.online', status: 'enabled' })

    const originalFetch = globalThis.fetch
    const fetchCalls: string[] = []

    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      fetchCalls.push(`${init?.method ?? 'GET'} ${url.toString()}`)

      if (init?.method === 'POST') {
        return new Response(JSON.stringify(makeCreateResponse(created)), { status: 200 })
      }
      // GET: list subscriptions (dedup check) — returns empty
      return new Response(JSON.stringify(makeListResponse([])), { status: 200 })
    }) as typeof fetch

    try {
      const options: CreateEventSubOptions = {
        type: 'stream.online',
        condition: { broadcaster_user_id: 'broadcaster-42' },
      }

      const result = await service.createSubscription(options)

      assert.isNotNull(result)
      assert.equal(result!.id, 'sub-new-1')
      assert.equal(result!.type, 'stream.online')
      assert.equal(result!.status, 'enabled')

      // Dedup check (GET) happened before the creation (POST)
      assert.isTrue(
        fetchCalls.some((c) => c.startsWith('GET')),
        'Should have listed subscriptions'
      )
      assert.isTrue(
        fetchCalls.some((c) => c.startsWith('POST')),
        'Should have posted new subscription'
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should return existing subscription instead of creating a duplicate', async ({
    assert,
  }) => {
    const service = createService()
    const existing = makeSubscription({
      id: 'sub-existing-99',
      type: 'stream.online',
      status: 'enabled',
      condition: { broadcaster_user_id: 'broadcaster-42' },
    })

    const originalFetch = globalThis.fetch
    let postCallCount = 0

    globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        postCallCount++
        return new Response('should not be called', { status: 500 })
      }
      // List returns the existing subscription — dedup finds it
      return new Response(JSON.stringify(makeListResponse([existing])), { status: 200 })
    }) as typeof fetch

    try {
      const result = await service.createSubscription({
        type: 'stream.online',
        condition: { broadcaster_user_id: 'broadcaster-42' },
      })

      assert.isNotNull(result)
      assert.equal(result!.id, 'sub-existing-99')
      assert.equal(postCallCount, 0, 'Must not POST when subscription already exists')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should return null when TWITCH_EVENTSUB_SECRET is not configured', async ({ assert }) => {
    const service = createService()
    ;(service as any).webhookSecret = ''

    const originalFetch = globalThis.fetch
    let fetchCalled = false
    globalThis.fetch = async () => {
      fetchCalled = true
      return new Response('{}', { status: 200 })
    }

    try {
      const result = await service.createSubscription({
        type: 'stream.online',
        condition: { broadcaster_user_id: 'broadcaster-42' },
      })

      assert.isNull(result)
      assert.isFalse(fetchCalled, 'Must not make HTTP calls when secret is missing')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should return null on non-retryable HTTP error (400)', async ({ assert }) => {
    const service = createService()
    const originalFetch = globalThis.fetch

    globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return new Response(JSON.stringify({ error: 'Bad Request' }), { status: 400 })
      }
      return new Response(JSON.stringify(makeListResponse([])), { status: 200 })
    }) as typeof fetch

    try {
      const result = await service.createSubscription({
        type: 'stream.online',
        condition: { broadcaster_user_id: 'broadcaster-42' },
      })

      assert.isNull(result)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should handle 409 Conflict by returning the existing subscription', async ({ assert }) => {
    const service = createService()
    const conflictSub = makeSubscription({
      id: 'sub-conflict-77',
      type: 'stream.online',
      status: 'enabled',
      condition: { broadcaster_user_id: 'broadcaster-42' },
    })

    const originalFetch = globalThis.fetch
    let postAttempts = 0

    globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        postAttempts++
        return new Response(JSON.stringify({ error: 'Conflict' }), { status: 409 })
      }
      // Pre-creation list: return empty so creation is attempted.
      // Post-409 refetch: return the conflict sub.
      if (postAttempts === 0) {
        return new Response(JSON.stringify(makeListResponse([])), { status: 200 })
      }
      return new Response(JSON.stringify(makeListResponse([conflictSub])), { status: 200 })
    }) as typeof fetch

    try {
      const result = await service.createSubscription({
        type: 'stream.online',
        condition: { broadcaster_user_id: 'broadcaster-42' },
      })

      assert.isNotNull(result)
      assert.equal(result!.id, 'sub-conflict-77')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should include reward_id in POST body when provided in condition', async ({ assert }) => {
    const service = createService()

    /* eslint-disable camelcase */
    const created = makeSubscription({
      type: 'channel.channel_points_custom_reward_redemption.add',
      condition: { broadcaster_user_id: 'broadcaster-42', reward_id: 'reward-xyz' },
    })
    /* eslint-enable camelcase */

    let postedBody: Record<string, unknown> | null = null
    const originalFetch = globalThis.fetch

    globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        postedBody = JSON.parse(init.body as string)
        return new Response(JSON.stringify(makeCreateResponse(created)), { status: 200 })
      }
      return new Response(JSON.stringify(makeListResponse([])), { status: 200 })
    }) as typeof fetch

    try {
      /* eslint-disable camelcase */
      await service.createSubscription({
        type: 'channel.channel_points_custom_reward_redemption.add',
        condition: { broadcaster_user_id: 'broadcaster-42', reward_id: 'reward-xyz' },
      })
      /* eslint-enable camelcase */

      assert.isNotNull(postedBody)
      const condition = postedBody!.condition as Record<string, string>
      assert.equal(condition.broadcaster_user_id, 'broadcaster-42')
      assert.equal(condition.reward_id, 'reward-xyz')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

// ---------------------------------------------------------------------------
// deleteSubscription
// ---------------------------------------------------------------------------

test.group('TwitchEventSubService - deleteSubscription', () => {
  test('should return true on successful deletion (HTTP 204)', async ({ assert }) => {
    const service = createService()
    const originalFetch = globalThis.fetch
    let deletedUrl = ''

    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        deletedUrl = url.toString()
        return new Response(null, { status: 204 })
      }
      return new Response('{}', { status: 200 })
    }) as typeof fetch

    try {
      const result = await service.deleteSubscription('sub-to-delete')

      assert.isTrue(result)
      assert.include(deletedUrl, 'id=sub-to-delete')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should return true when subscription is already deleted (HTTP 404 treated as success)', async ({
    assert,
  }) => {
    const service = createService()
    const originalFetch = globalThis.fetch

    globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        return new Response('Not Found', { status: 404 })
      }
      return new Response('{}', { status: 200 })
    }) as typeof fetch

    try {
      const result = await service.deleteSubscription('sub-already-gone')

      assert.isTrue(result, '404 on delete should be treated as success (already deleted)')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should return false on HTTP 500 server error', async ({ assert }) => {
    const service = createService()
    const originalFetch = globalThis.fetch

    globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        return new Response('Internal Server Error', { status: 500 })
      }
      return new Response('{}', { status: 200 })
    }) as typeof fetch

    try {
      const result = await service.deleteSubscription('sub-fail')

      assert.isFalse(result)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should build the correct DELETE URL with id query parameter', async ({ assert }) => {
    const service = createService()
    const originalFetch = globalThis.fetch
    let capturedUrl = ''

    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        capturedUrl = url.toString()
        return new Response(null, { status: 204 })
      }
      return new Response('{}', { status: 200 })
    }) as typeof fetch

    try {
      await service.deleteSubscription('abc-def-123')

      assert.equal(capturedUrl, 'https://api.twitch.tv/helix/eventsub/subscriptions?id=abc-def-123')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

// ---------------------------------------------------------------------------
// listSubscriptions
// ---------------------------------------------------------------------------

test.group('TwitchEventSubService - listSubscriptions', () => {
  test('should return empty array when no subscriptions exist', async ({ assert }) => {
    const service = createService()
    const originalFetch = globalThis.fetch

    globalThis.fetch = async () =>
      new Response(JSON.stringify(makeListResponse([])), { status: 200 })

    try {
      const result = await service.listSubscriptions()

      assert.isArray(result)
      assert.lengthOf(result, 0)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should return all subscriptions from a single-page response', async ({ assert }) => {
    const service = createService()
    const subs = [
      makeSubscription({ id: 'sub-1', type: 'stream.online' }),
      makeSubscription({ id: 'sub-2', type: 'stream.offline' }),
    ]

    const originalFetch = globalThis.fetch

    globalThis.fetch = async () =>
      new Response(JSON.stringify(makeListResponse(subs)), { status: 200 })

    try {
      const result = await service.listSubscriptions()

      assert.lengthOf(result, 2)
      assert.equal(result[0].id, 'sub-1')
      assert.equal(result[1].id, 'sub-2')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should follow cursor-based pagination and aggregate all pages', async ({ assert }) => {
    const service = createService()
    const page1Subs = [
      makeSubscription({ id: 'sub-page1-a' }),
      makeSubscription({ id: 'sub-page1-b' }),
    ]
    const page2Subs = [makeSubscription({ id: 'sub-page2-a' })]

    const originalFetch = globalThis.fetch
    let callCount = 0

    globalThis.fetch = (async (url: string | URL) => {
      callCount++
      if (url.toString().includes('after=cursor-to-page2')) {
        return new Response(JSON.stringify(makeListResponse(page2Subs)), { status: 200 })
      }
      return new Response(JSON.stringify(makeListResponse(page1Subs, 'cursor-to-page2')), {
        status: 200,
      })
    }) as typeof fetch

    try {
      const result = await service.listSubscriptions()

      assert.equal(callCount, 2, 'Should have fetched two pages')
      assert.lengthOf(result, 3)
      assert.deepEqual(
        result.map((s) => s.id),
        ['sub-page1-a', 'sub-page1-b', 'sub-page2-a']
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should filter by type when type parameter is provided', async ({ assert }) => {
    const service = createService()
    const originalFetch = globalThis.fetch
    let capturedUrl = ''

    globalThis.fetch = (async (url: string | URL) => {
      capturedUrl = url.toString()
      return new Response(JSON.stringify(makeListResponse([])), { status: 200 })
    }) as typeof fetch

    try {
      await service.listSubscriptions('stream.online' as EventSubType)

      assert.include(capturedUrl, 'type=stream.online')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should return empty array and stop on HTTP error', async ({ assert }) => {
    const service = createService()
    const originalFetch = globalThis.fetch

    globalThis.fetch = async () => new Response('Unauthorized', { status: 401 })

    try {
      const result = await service.listSubscriptions()

      assert.isArray(result)
      assert.lengthOf(result, 0)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

// ---------------------------------------------------------------------------
// findExistingSubscription
// ---------------------------------------------------------------------------

test.group('TwitchEventSubService - findExistingSubscription', () => {
  test('should return null when no matching subscription exists', async ({ assert }) => {
    const service = createService()
    const originalFetch = globalThis.fetch

    globalThis.fetch = async () =>
      new Response(JSON.stringify(makeListResponse([])), { status: 200 })

    try {
      const result = await service.findExistingSubscription('stream.online', {
        broadcaster_user_id: 'broadcaster-99',
      })

      assert.isNull(result)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should return matching subscription by type and broadcaster_user_id', async ({
    assert,
  }) => {
    const service = createService()
    const match = makeSubscription({
      id: 'sub-match',
      type: 'stream.online',
      status: 'enabled',
      condition: { broadcaster_user_id: 'broadcaster-42' },
    })
    const nonMatch = makeSubscription({
      id: 'sub-no-match',
      type: 'stream.online',
      status: 'enabled',
      condition: { broadcaster_user_id: 'broadcaster-999' },
    })

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () =>
      new Response(JSON.stringify(makeListResponse([match, nonMatch])), { status: 200 })

    try {
      const result = await service.findExistingSubscription('stream.online', {
        broadcaster_user_id: 'broadcaster-42',
      })

      assert.isNotNull(result)
      assert.equal(result!.id, 'sub-match')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should match by reward_id when provided in condition', async ({ assert }) => {
    const service = createService()

    /* eslint-disable camelcase */
    const wrongReward = makeSubscription({
      id: 'sub-wrong-reward',
      type: 'channel.channel_points_custom_reward_redemption.add',
      status: 'enabled',
      condition: { broadcaster_user_id: 'broadcaster-42', reward_id: 'reward-wrong' },
    })
    const correctReward = makeSubscription({
      id: 'sub-correct-reward',
      type: 'channel.channel_points_custom_reward_redemption.add',
      status: 'enabled',
      condition: { broadcaster_user_id: 'broadcaster-42', reward_id: 'reward-xyz' },
    })
    /* eslint-enable camelcase */

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () =>
      new Response(JSON.stringify(makeListResponse([wrongReward, correctReward])), { status: 200 })

    try {
      /* eslint-disable camelcase */
      const result = await service.findExistingSubscription(
        'channel.channel_points_custom_reward_redemption.add',
        { broadcaster_user_id: 'broadcaster-42', reward_id: 'reward-xyz' }
      )
      /* eslint-enable camelcase */

      assert.isNotNull(result)
      assert.equal(result!.id, 'sub-correct-reward')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should accept webhook_callback_verification_pending as a valid existing subscription', async ({
    assert,
  }) => {
    const service = createService()
    const disabledSub = makeSubscription({
      id: 'sub-disabled',
      type: 'stream.online',
      status: 'notification_failures_exceeded',
      condition: { broadcaster_user_id: 'broadcaster-42' },
    })
    const pendingSub = makeSubscription({
      id: 'sub-pending',
      type: 'stream.online',
      status: 'webhook_callback_verification_pending',
      condition: { broadcaster_user_id: 'broadcaster-42' },
    })

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () =>
      new Response(JSON.stringify(makeListResponse([disabledSub, pendingSub])), { status: 200 })

    try {
      const result = await service.findExistingSubscription('stream.online', {
        broadcaster_user_id: 'broadcaster-42',
      })

      // webhook_callback_verification_pending is valid — disabled is not
      assert.isNotNull(result)
      assert.equal(result!.id, 'sub-pending')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should ignore subscriptions with failed/revoked status', async ({ assert }) => {
    const service = createService()
    const revokedSub = makeSubscription({
      id: 'sub-revoked',
      type: 'stream.online',
      status: 'authorization_revoked',
      condition: { broadcaster_user_id: 'broadcaster-42' },
    })

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () =>
      new Response(JSON.stringify(makeListResponse([revokedSub])), { status: 200 })

    try {
      const result = await service.findExistingSubscription('stream.online', {
        broadcaster_user_id: 'broadcaster-42',
      })

      assert.isNull(result, 'Revoked subscriptions must not count as existing')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

// ---------------------------------------------------------------------------
// deleteSubscriptionsForBroadcaster
// ---------------------------------------------------------------------------

test.group('TwitchEventSubService - deleteSubscriptionsForBroadcaster', () => {
  test('should return {deleted:0, failed:0} when broadcaster has no subscriptions', async ({
    assert,
  }) => {
    const service = createService()
    const originalFetch = globalThis.fetch

    globalThis.fetch = async () =>
      new Response(JSON.stringify(makeListResponse([])), { status: 200 })

    try {
      const result = await service.deleteSubscriptionsForBroadcaster('broadcaster-42')

      assert.equal(result.deleted, 0)
      assert.equal(result.failed, 0)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should delete all matching subscriptions and return correct counts', async ({ assert }) => {
    const service = createService()
    const subs = [
      makeSubscription({ id: 'sub-a', condition: { broadcaster_user_id: 'broadcaster-42' } }),
      makeSubscription({ id: 'sub-b', condition: { broadcaster_user_id: 'broadcaster-42' } }),
    ]

    const originalFetch = globalThis.fetch
    const deletedIds: string[] = []

    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        const match = url.toString().match(/id=([^&]+)/)
        if (match) deletedIds.push(match[1])
        return new Response(null, { status: 204 })
      }
      return new Response(JSON.stringify(makeListResponse(subs)), { status: 200 })
    }) as typeof fetch

    try {
      const result = await service.deleteSubscriptionsForBroadcaster('broadcaster-42')

      assert.equal(result.deleted, 2)
      assert.equal(result.failed, 0)
      assert.sameMembers(deletedIds, ['sub-a', 'sub-b'])
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should skip subscriptions belonging to other broadcasters', async ({ assert }) => {
    const service = createService()
    const subs = [
      makeSubscription({ id: 'sub-mine', condition: { broadcaster_user_id: 'broadcaster-42' } }),
      makeSubscription({
        id: 'sub-other',
        condition: { broadcaster_user_id: 'broadcaster-999' },
      }),
    ]

    const originalFetch = globalThis.fetch
    const deletedIds: string[] = []

    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        const match = url.toString().match(/id=([^&]+)/)
        if (match) deletedIds.push(match[1])
        return new Response(null, { status: 204 })
      }
      return new Response(JSON.stringify(makeListResponse(subs)), { status: 200 })
    }) as typeof fetch

    try {
      await service.deleteSubscriptionsForBroadcaster('broadcaster-42')

      assert.deepEqual(deletedIds, ['sub-mine'])
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should count failed deletions separately in the result', async ({ assert }) => {
    const service = createService()
    const subs = [
      makeSubscription({ id: 'sub-ok', condition: { broadcaster_user_id: 'broadcaster-42' } }),
      makeSubscription({ id: 'sub-fail', condition: { broadcaster_user_id: 'broadcaster-42' } }),
    ]

    const originalFetch = globalThis.fetch

    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        if (url.toString().includes('sub-fail')) {
          // Non-retryable failure (e.g., 400) — immediately fails
          return new Response('Bad Request', { status: 400 })
        }
        return new Response(null, { status: 204 })
      }
      return new Response(JSON.stringify(makeListResponse(subs)), { status: 200 })
    }) as typeof fetch

    try {
      const result = await service.deleteSubscriptionsForBroadcaster('broadcaster-42')

      assert.equal(result.deleted, 1)
      assert.equal(result.failed, 1)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should filter by event type when type parameter is provided', async ({ assert }) => {
    const service = createService()
    const originalFetch = globalThis.fetch
    let capturedListUrl = ''

    globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
      if (init?.method !== 'DELETE') {
        capturedListUrl = url.toString()
        return new Response(JSON.stringify(makeListResponse([])), { status: 200 })
      }
      return new Response(null, { status: 204 })
    }) as typeof fetch

    try {
      await service.deleteSubscriptionsForBroadcaster('broadcaster-42', 'stream.online')

      assert.include(capturedListUrl, 'type=stream.online')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

// ---------------------------------------------------------------------------
// Authorization headers
// ---------------------------------------------------------------------------

test.group('TwitchEventSubService - request headers', () => {
  test('should send Authorization and Client-Id headers on every request', async ({ assert }) => {
    const service = createService('test-app-token-xyz')
    ;(service as any).clientId = 'test-client-id-abc'

    const originalFetch = globalThis.fetch
    const capturedHeaders: Record<string, string>[] = []

    globalThis.fetch = (async (_url: string | URL, init?: RequestInit) => {
      if (init?.headers) {
        capturedHeaders.push(init.headers as Record<string, string>)
      }
      return new Response(JSON.stringify(makeListResponse([])), { status: 200 })
    }) as typeof fetch

    try {
      await service.listSubscriptions()

      assert.isAtLeast(capturedHeaders.length, 1)
      const headers = capturedHeaders[0]
      assert.equal(headers['Authorization'], 'Bearer test-app-token-xyz')
      assert.equal(headers['Client-Id'], 'test-client-id-abc')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
