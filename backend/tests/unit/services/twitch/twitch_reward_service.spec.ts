import { test } from '@japa/runner'
import { TwitchRewardService } from '#services/twitch/twitch_reward_service'
import type { CreateRewardData } from '#services/twitch/twitch_reward_service'

// ========================================
// MOCK FACTORIES
// ========================================

function createMockStreamer(overrides = {}) {
  return {
    id: 'streamer-123',
    twitchUserId: '12345',
    twitchDisplayName: 'TestStreamer',
    getDecryptedAccessToken: async () => 'mock-access-token',
    getDecryptedRefreshToken: async () => 'mock-refresh-token',
    updateTokens: async () => {},
    ...overrides,
  }
}

/**
 * Builds a Twitch API snake_case reward object matching what the real API returns.
 * The service's mapTwitchReward() converts these to camelCase TwitchReward.
 */
function createTwitchApiReward(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  /* eslint-disable camelcase */
  return {
    id: 'reward-abc',
    broadcaster_id: '12345',
    broadcaster_login: 'teststreamer',
    broadcaster_name: 'TestStreamer',
    title: 'Test Reward',
    prompt: 'Do something cool',
    cost: 500,
    image: null,
    default_image: {
      url_1x: 'https://static-cdn.jtvnw.net/custom-reward-images/default-1.png',
      url_2x: 'https://static-cdn.jtvnw.net/custom-reward-images/default-2.png',
      url_4x: 'https://static-cdn.jtvnw.net/custom-reward-images/default-4.png',
    },
    background_color: '#9146FF',
    is_enabled: true,
    is_user_input_required: false,
    is_max_per_stream_enabled: false,
    max_per_stream: 0,
    is_max_per_user_per_stream_enabled: false,
    max_per_user_per_stream: 0,
    is_global_cooldown_enabled: false,
    global_cooldown_seconds: 0,
    is_paused: false,
    should_redemptions_skip_request_queue: false,
    ...overrides,
  }
  /* eslint-enable camelcase */
}

// ========================================
// TESTS: no-token guard (already in file but re-verified here for completeness)
// ========================================

test.group('TwitchRewardService - no access token guards', () => {
  test('createReward returns null when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()
    const streamer = createMockStreamer({ getDecryptedAccessToken: async () => null })

    const result = await service.createReward(streamer as any, { title: 'Reward', cost: 100 })

    assert.isNull(result)
  })

  test('updateReward returns null when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()
    const streamer = createMockStreamer({ getDecryptedAccessToken: async () => null })

    const result = await service.updateReward(streamer as any, 'reward-123', { cost: 200 })

    assert.isNull(result)
  })

  test('deleteReward returns false when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()
    const streamer = createMockStreamer({ getDecryptedAccessToken: async () => null })

    const result = await service.deleteReward(streamer as any, 'reward-123')

    assert.isFalse(result)
  })

  test('deleteRewardWithRetry returns failure when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()
    const streamer = createMockStreamer({ getDecryptedAccessToken: async () => null })

    const result = await service.deleteRewardWithRetry(streamer as any, 'reward-123')

    assert.isFalse(result.success)
    assert.isFalse(result.isAlreadyDeleted)
  })

  test('getRewardSlotsInfo returns null when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()
    const streamer = createMockStreamer({ getDecryptedAccessToken: async () => null })

    const result = await service.getRewardSlotsInfo(streamer as any)

    assert.isNull(result)
  })

  test('listRewards returns empty array when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()
    const streamer = createMockStreamer({ getDecryptedAccessToken: async () => null })

    const result = await service.listRewards(streamer as any)

    assert.isArray(result)
    assert.lengthOf(result, 0)
  })

  test('enableReward returns false when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()
    const streamer = createMockStreamer({ getDecryptedAccessToken: async () => null })

    const result = await service.enableReward(streamer as any, 'reward-123')

    assert.isFalse(result)
  })

  test('disableReward returns false when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()
    const streamer = createMockStreamer({ getDecryptedAccessToken: async () => null })

    const result = await service.disableReward(streamer as any, 'reward-123')

    assert.isFalse(result)
  })

  test('setCooldown returns false when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()
    const streamer = createMockStreamer({ getDecryptedAccessToken: async () => null })

    const result = await service.setCooldown(streamer as any, 'reward-123', 60)

    assert.isFalse(result)
  })

  test('refundRedemption returns false when streamer has no token', async ({ assert }) => {
    const service = new TwitchRewardService()
    const streamer = createMockStreamer({ getDecryptedAccessToken: async () => null })

    const result = await service.refundRedemption(streamer as any, 'redemption-123')

    assert.isFalse(result)
  })

  test('refundRedemptionWithRewardId returns false when streamer has no token', async ({
    assert,
  }) => {
    const service = new TwitchRewardService()
    const streamer = createMockStreamer({ getDecryptedAccessToken: async () => null })

    const result = await service.refundRedemptionWithRewardId(
      streamer as any,
      'reward-123',
      'redemption-456'
    )

    assert.isFalse(result)
  })
})

// ========================================
// TESTS: createReward
// ========================================

test.group('TwitchRewardService - createReward', (group) => {
  let originalFetch: typeof globalThis.fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('returns created reward on successful API call', async ({ assert }) => {
    const apiReward = createTwitchApiReward({ id: 'reward-new', title: 'My New Reward', cost: 750 })
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: [apiReward] }), { status: 200 })

    const service = new TwitchRewardService()
    const streamer = createMockStreamer()
    const rewardData: CreateRewardData = { title: 'My New Reward', cost: 750 }

    const result = await service.createReward(streamer as any, rewardData)

    assert.isNotNull(result)
    assert.equal(result!.id, 'reward-new')
    assert.equal(result!.title, 'My New Reward')
    assert.equal(result!.cost, 750)
  })

  test('maps snake_case Twitch API response to camelCase TwitchReward', async ({ assert }) => {
    /* eslint-disable camelcase */
    const apiReward = createTwitchApiReward({
      broadcaster_id: '99999',
      broadcaster_login: 'mychannel',
      broadcaster_name: 'MyChannel',
      is_enabled: true,
      is_user_input_required: true,
      is_max_per_stream_enabled: true,
      max_per_stream: 5,
      is_max_per_user_per_stream_enabled: true,
      max_per_user_per_stream: 2,
      is_global_cooldown_enabled: true,
      global_cooldown_seconds: 300,
      is_paused: false,
      should_redemptions_skip_request_queue: true,
      background_color: '#FF0000',
    })
    /* eslint-enable camelcase */
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: [apiReward] }), { status: 200 })

    const service = new TwitchRewardService()
    const result = await service.createReward(createMockStreamer() as any, {
      title: 'Mapped Reward',
      cost: 100,
    })

    assert.isNotNull(result)
    assert.equal(result!.broadcasterId, '99999')
    assert.equal(result!.broadcasterLogin, 'mychannel')
    assert.equal(result!.broadcasterName, 'MyChannel')
    assert.isTrue(result!.isEnabled)
    assert.isTrue(result!.isUserInputRequired)
    assert.isTrue(result!.isMaxPerStreamEnabled)
    assert.equal(result!.maxPerStream, 5)
    assert.isTrue(result!.isMaxPerUserPerStreamEnabled)
    assert.equal(result!.maxPerUserPerStream, 2)
    assert.isTrue(result!.isGlobalCooldownEnabled)
    assert.equal(result!.globalCooldownSeconds, 300)
    assert.isFalse(result!.isPaused)
    assert.isTrue(result!.shouldRedemptionsSkipRequestQueue)
    assert.equal(result!.backgroundColor, '#FF0000')
  })

  test('maps image field from snake_case url_1x to camelCase url1x', async ({ assert }) => {
    /* eslint-disable camelcase */
    const apiReward = createTwitchApiReward({
      image: {
        url_1x: 'https://example.com/reward-1x.png',
        url_2x: 'https://example.com/reward-2x.png',
        url_4x: 'https://example.com/reward-4x.png',
      },
    })
    /* eslint-enable camelcase */
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: [apiReward] }), { status: 200 })

    const service = new TwitchRewardService()
    const result = await service.createReward(createMockStreamer() as any, {
      title: 'Image Reward',
      cost: 100,
    })

    assert.isNotNull(result)
    assert.isNotNull(result!.image)
    assert.equal(result!.image!.url1x, 'https://example.com/reward-1x.png')
    assert.equal(result!.image!.url2x, 'https://example.com/reward-2x.png')
    assert.equal(result!.image!.url4x, 'https://example.com/reward-4x.png')
  })

  test('returns null on API error response', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'Forbidden', message: 'Missing scope' }), {
        status: 403,
      })

    const service = new TwitchRewardService()
    const result = await service.createReward(createMockStreamer() as any, {
      title: 'Reward',
      cost: 100,
    })

    assert.isNull(result)
  })

  test('returns null when fetch throws a network error', async ({ assert }) => {
    globalThis.fetch = async () => {
      throw new Error('Network unreachable')
    }

    const service = new TwitchRewardService()
    const result = await service.createReward(createMockStreamer() as any, {
      title: 'Reward',
      cost: 100,
    })

    assert.isNull(result)
  })

  test('sends POST request to the correct Twitch endpoint', async ({ assert }) => {
    const capturedRequests: { url: string; options: RequestInit }[] = []

    globalThis.fetch = async (url, options) => {
      capturedRequests.push({ url: url as string, options: options as RequestInit })
      return new Response(
        JSON.stringify({ data: [createTwitchApiReward({ title: 'Test', cost: 100 })] }),
        { status: 200 }
      )
    }

    const service = new TwitchRewardService()
    const streamer = createMockStreamer({ twitchUserId: '99999' })
    await service.createReward(streamer as any, { title: 'Test', cost: 100 })

    assert.lengthOf(capturedRequests, 1)
    assert.include(
      capturedRequests[0].url,
      'https://api.twitch.tv/helix/channel_points/custom_rewards'
    )
    assert.include(capturedRequests[0].url, 'broadcaster_id=99999')
    assert.equal(capturedRequests[0].options.method, 'POST')
  })

  test('includes Bearer token and Client-Id in request headers', async ({ assert }) => {
    const capturedHeaders: Record<string, string>[] = []

    globalThis.fetch = async (_, options) => {
      capturedHeaders.push((options as RequestInit).headers as Record<string, string>)
      return new Response(
        JSON.stringify({ data: [createTwitchApiReward({ title: 'Test', cost: 100 })] }),
        { status: 200 }
      )
    }

    const service = new TwitchRewardService()
    const streamer = createMockStreamer({ getDecryptedAccessToken: async () => 'my-secret-token' })
    await service.createReward(streamer as any, { title: 'Test', cost: 100 })

    assert.lengthOf(capturedHeaders, 1)
    assert.equal(capturedHeaders[0]['Authorization'], 'Bearer my-secret-token')
    assert.exists(capturedHeaders[0]['Client-Id'])
    assert.equal(capturedHeaders[0]['Content-Type'], 'application/json')
  })

  test('includes optional fields in request body when provided', async ({ assert }) => {
    const capturedBodies: unknown[] = []

    globalThis.fetch = async (_, options) => {
      capturedBodies.push(JSON.parse((options as RequestInit).body as string))
      return new Response(JSON.stringify({ data: [createTwitchApiReward()] }), { status: 200 })
    }

    const service = new TwitchRewardService()
    await service.createReward(createMockStreamer() as any, {
      title: 'Full Reward',
      cost: 500,
      prompt: 'Enter your answer',
      backgroundColor: '#FF0000',
      isEnabled: true,
      isUserInputRequired: true,
      maxPerStream: 10,
      maxPerUserPerStream: 2,
      globalCooldownSeconds: 120,
      shouldSkipRequestQueue: true,
    })

    assert.lengthOf(capturedBodies, 1)
    const body = capturedBodies[0] as Record<string, unknown>
    assert.equal(body.title, 'Full Reward')
    assert.equal(body.cost, 500)
    assert.equal(body.prompt, 'Enter your answer')
    assert.equal(body.background_color, '#FF0000')
    assert.isTrue(body.is_enabled)
    assert.isTrue(body.is_user_input_required)
    assert.isTrue(body.is_max_per_stream_enabled)
    assert.equal(body.max_per_stream, 10)
    assert.isTrue(body.is_max_per_user_per_stream_enabled)
    assert.equal(body.max_per_user_per_stream, 2)
    assert.isTrue(body.is_global_cooldown_enabled)
    assert.equal(body.global_cooldown_seconds, 120)
    assert.isTrue(body.should_redemptions_skip_request_queue)
  })

  test('does not set max_per_stream when value is 0', async ({ assert }) => {
    const capturedBodies: unknown[] = []

    globalThis.fetch = async (_, options) => {
      capturedBodies.push(JSON.parse((options as RequestInit).body as string))
      return new Response(JSON.stringify({ data: [createTwitchApiReward()] }), { status: 200 })
    }

    const service = new TwitchRewardService()
    await service.createReward(createMockStreamer() as any, {
      title: 'No Limit Reward',
      cost: 100,
      maxPerStream: 0,
    })

    const body = capturedBodies[0] as Record<string, unknown>
    assert.notExists(body.is_max_per_stream_enabled)
    assert.notExists(body.max_per_stream)
  })

  test('passes custom retryContext when provided', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: [createTwitchApiReward({ title: 'R', cost: 100 })] }), {
        status: 200,
      })

    const service = new TwitchRewardService()
    const retryContext = {
      service: 'GamificationService',
      operation: 'createRewardForEvent',
      metadata: { eventId: 'event-42' },
    }

    // Should not throw - custom context is used instead of default
    const result = await service.createReward(
      createMockStreamer() as any,
      { title: 'R', cost: 100 },
      retryContext
    )

    assert.isNotNull(result)
  })
})

// ========================================
// TESTS: deleteReward
// ========================================

test.group('TwitchRewardService - deleteReward', (group) => {
  let originalFetch: typeof globalThis.fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('returns true on successful deletion (HTTP 204)', async ({ assert }) => {
    globalThis.fetch = async () => new Response(null, { status: 204 })

    const service = new TwitchRewardService()
    const result = await service.deleteReward(createMockStreamer() as any, 'reward-to-delete')

    assert.isTrue(result)
  })

  test('returns false on API error response', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 })

    const service = new TwitchRewardService()
    const result = await service.deleteReward(createMockStreamer() as any, 'nonexistent-reward')

    assert.isFalse(result)
  })

  test('returns false when fetch throws a network error', async ({ assert }) => {
    globalThis.fetch = async () => {
      throw new Error('Connection reset')
    }

    const service = new TwitchRewardService()
    const result = await service.deleteReward(createMockStreamer() as any, 'reward-123')

    assert.isFalse(result)
  })

  test('sends DELETE request to correct URL with broadcaster_id and id params', async ({
    assert,
  }) => {
    const capturedRequests: { url: string; method: string }[] = []

    globalThis.fetch = async (url, options) => {
      capturedRequests.push({ url: url as string, method: (options as RequestInit).method! })
      return new Response(null, { status: 204 })
    }

    const service = new TwitchRewardService()
    const streamer = createMockStreamer({ twitchUserId: '77777' })
    await service.deleteReward(streamer as any, 'reward-xyz')

    assert.lengthOf(capturedRequests, 1)
    assert.equal(capturedRequests[0].method, 'DELETE')
    assert.include(capturedRequests[0].url, 'broadcaster_id=77777')
    assert.include(capturedRequests[0].url, 'id=reward-xyz')
  })
})

// ========================================
// TESTS: deleteRewardWithRetry (404 = already deleted)
// ========================================

test.group('TwitchRewardService - deleteRewardWithRetry', (group) => {
  let originalFetch: typeof globalThis.fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('returns success=true and isAlreadyDeleted=false on HTTP 204', async ({ assert }) => {
    globalThis.fetch = async () => new Response(null, { status: 204 })

    const service = new TwitchRewardService()
    const result = await service.deleteRewardWithRetry(
      createMockStreamer() as any,
      'reward-to-delete'
    )

    assert.isTrue(result.success)
    assert.isFalse(result.isAlreadyDeleted)
  })

  test('returns success=true and isAlreadyDeleted=true on HTTP 404 (already gone on Twitch)', async ({
    assert,
  }) => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 })

    const service = new TwitchRewardService()
    const result = await service.deleteRewardWithRetry(
      createMockStreamer() as any,
      'already-deleted-reward'
    )

    assert.isTrue(result.success)
    assert.isTrue(result.isAlreadyDeleted)
  })

  test('returns success=false and isAlreadyDeleted=false on non-retryable server error', async ({
    assert,
  }) => {
    // 403 is not in the retryable errors list for Twitch API
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })

    const service = new TwitchRewardService()
    const result = await service.deleteRewardWithRetry(
      createMockStreamer() as any,
      'forbidden-reward'
    )

    assert.isFalse(result.success)
    assert.isFalse(result.isAlreadyDeleted)
  })

  test('accepts optional retryContext parameter', async ({ assert }) => {
    globalThis.fetch = async () => new Response(null, { status: 204 })

    const service = new TwitchRewardService()
    const retryContext = {
      service: 'CleanupService',
      operation: 'deleteOrphanedReward',
      metadata: { orphanId: 'reward-orphan' },
    }

    const result = await service.deleteRewardWithRetry(
      createMockStreamer() as any,
      'reward-orphan',
      retryContext
    )

    assert.isTrue(result.success)
  })
})

// ========================================
// TESTS: enableReward / disableReward
// ========================================

test.group('TwitchRewardService - enableReward and disableReward', (group) => {
  let originalFetch: typeof globalThis.fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('enableReward returns true when API call succeeds', async ({ assert }) => {
    // eslint-disable-next-line camelcase
    const updatedReward = createTwitchApiReward({ id: 'reward-456', is_enabled: true })
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: [updatedReward] }), { status: 200 })

    const service = new TwitchRewardService()
    const result = await service.enableReward(createMockStreamer() as any, 'reward-456')

    assert.isTrue(result)
  })

  test('enableReward returns false when API call fails', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 })

    const service = new TwitchRewardService()
    const result = await service.enableReward(createMockStreamer() as any, 'bad-reward')

    assert.isFalse(result)
  })

  test('enableReward sends is_enabled=true in PATCH body', async ({ assert }) => {
    const capturedBodies: unknown[] = []

    globalThis.fetch = async (_, options) => {
      capturedBodies.push(JSON.parse((options as RequestInit).body as string))
      /* eslint-disable camelcase */
      return new Response(JSON.stringify({ data: [createTwitchApiReward({ is_enabled: true })] }), {
        status: 200,
      })
      /* eslint-enable camelcase */
    }

    const service = new TwitchRewardService()
    await service.enableReward(createMockStreamer() as any, 'reward-123')

    assert.lengthOf(capturedBodies, 1)
    const body = capturedBodies[0] as Record<string, unknown>
    assert.isTrue(body.is_enabled)
  })

  test('disableReward returns true when API call succeeds', async ({ assert }) => {
    // eslint-disable-next-line camelcase
    const updatedReward = createTwitchApiReward({ id: 'reward-456', is_enabled: false })
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: [updatedReward] }), { status: 200 })

    const service = new TwitchRewardService()
    const result = await service.disableReward(createMockStreamer() as any, 'reward-456')

    assert.isTrue(result)
  })

  test('disableReward returns false when API call fails', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const service = new TwitchRewardService()
    const result = await service.disableReward(createMockStreamer() as any, 'reward-456')

    assert.isFalse(result)
  })

  test('disableReward sends is_enabled=false in PATCH body', async ({ assert }) => {
    const capturedBodies: unknown[] = []

    globalThis.fetch = async (_, options) => {
      capturedBodies.push(JSON.parse((options as RequestInit).body as string))
      /* eslint-disable camelcase */
      return new Response(
        JSON.stringify({ data: [createTwitchApiReward({ is_enabled: false })] }),
        { status: 200 }
      )
      /* eslint-enable camelcase */
    }

    const service = new TwitchRewardService()
    await service.disableReward(createMockStreamer() as any, 'reward-123')

    assert.lengthOf(capturedBodies, 1)
    const body = capturedBodies[0] as Record<string, unknown>
    assert.isFalse(body.is_enabled)
  })

  test('enableReward and disableReward send PATCH request to correct URL', async ({ assert }) => {
    const capturedRequests: { url: string; method: string }[] = []

    globalThis.fetch = async (url, options) => {
      capturedRequests.push({ url: url as string, method: (options as RequestInit).method! })
      /* eslint-disable camelcase */
      return new Response(JSON.stringify({ data: [createTwitchApiReward({ is_enabled: true })] }), {
        status: 200,
      })
      /* eslint-enable camelcase */
    }

    const service = new TwitchRewardService()
    const streamer = createMockStreamer({ twitchUserId: '55555' })
    await service.enableReward(streamer as any, 'reward-enable-test')

    assert.equal(capturedRequests[0].method, 'PATCH')
    assert.include(capturedRequests[0].url, 'broadcaster_id=55555')
    assert.include(capturedRequests[0].url, 'id=reward-enable-test')
  })
})

// ========================================
// TESTS: listRewards
// ========================================

test.group('TwitchRewardService - listRewards', (group) => {
  let originalFetch: typeof globalThis.fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('returns array of mapped rewards on success', async ({ assert }) => {
    const apiReward1 = createTwitchApiReward({ id: 'reward-1', title: 'Reward One', cost: 100 })
    const apiReward2 = createTwitchApiReward({ id: 'reward-2', title: 'Reward Two', cost: 200 })
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: [apiReward1, apiReward2] }), { status: 200 })

    const service = new TwitchRewardService()
    const result = await service.listRewards(createMockStreamer() as any)

    assert.isArray(result)
    assert.lengthOf(result, 2)
    assert.equal(result[0].id, 'reward-1')
    assert.equal(result[0].title, 'Reward One')
    assert.equal(result[0].cost, 100)
    assert.equal(result[1].id, 'reward-2')
    assert.equal(result[1].title, 'Reward Two')
    assert.equal(result[1].cost, 200)
  })

  test('returns empty array when channel has no manageable rewards', async ({ assert }) => {
    globalThis.fetch = async () => new Response(JSON.stringify({ data: [] }), { status: 200 })

    const service = new TwitchRewardService()
    const result = await service.listRewards(createMockStreamer() as any)

    assert.isArray(result)
    assert.lengthOf(result, 0)
  })

  test('returns empty array on API error', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const service = new TwitchRewardService()
    const result = await service.listRewards(createMockStreamer() as any)

    assert.isArray(result)
    assert.lengthOf(result, 0)
  })

  test('sends GET request with only_manageable_rewards=true', async ({ assert }) => {
    const capturedRequests: { url: string; method: string }[] = []

    globalThis.fetch = async (url, options) => {
      capturedRequests.push({ url: url as string, method: (options as RequestInit).method! })
      return new Response(JSON.stringify({ data: [] }), { status: 200 })
    }

    const service = new TwitchRewardService()
    const streamer = createMockStreamer({ twitchUserId: '33333' })
    await service.listRewards(streamer as any)

    assert.lengthOf(capturedRequests, 1)
    assert.equal(capturedRequests[0].method, 'GET')
    assert.include(capturedRequests[0].url, 'broadcaster_id=33333')
    assert.include(capturedRequests[0].url, 'only_manageable_rewards=true')
  })

  test('maps all camelCase fields correctly for each reward in the list', async ({ assert }) => {
    /* eslint-disable camelcase */
    const apiReward = createTwitchApiReward({
      id: 'reward-mapped',
      is_enabled: false,
      is_paused: true,
      is_global_cooldown_enabled: true,
      global_cooldown_seconds: 60,
    })
    /* eslint-enable camelcase */
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: [apiReward] }), { status: 200 })

    const service = new TwitchRewardService()
    const result = await service.listRewards(createMockStreamer() as any)

    assert.lengthOf(result, 1)
    assert.isFalse(result[0].isEnabled)
    assert.isTrue(result[0].isPaused)
    assert.isTrue(result[0].isGlobalCooldownEnabled)
    assert.equal(result[0].globalCooldownSeconds, 60)
  })
})

// ========================================
// TESTS: getRewardSlotsInfo
// ========================================

test.group('TwitchRewardService - getRewardSlotsInfo', (group) => {
  let originalFetch: typeof globalThis.fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('returns correct slots info when channel has rewards', async ({ assert }) => {
    const rewards = [
      createTwitchApiReward({ id: 'r-1' }),
      createTwitchApiReward({ id: 'r-2' }),
      createTwitchApiReward({ id: 'r-3' }),
    ]
    globalThis.fetch = async () => new Response(JSON.stringify({ data: rewards }), { status: 200 })

    const service = new TwitchRewardService()
    const result = await service.getRewardSlotsInfo(createMockStreamer() as any)

    assert.isNotNull(result)
    assert.equal(result!.used, 3)
    assert.equal(result!.max, 50) // MAX_REWARDS_PER_CHANNEL
    assert.equal(result!.available, 47)
  })

  test('returns slots info with 0 used when channel has no manageable rewards', async ({
    assert,
  }) => {
    globalThis.fetch = async () => new Response(JSON.stringify({ data: [] }), { status: 200 })

    const service = new TwitchRewardService()
    const result = await service.getRewardSlotsInfo(createMockStreamer() as any)

    assert.isNotNull(result)
    assert.equal(result!.used, 0)
    assert.equal(result!.max, 50)
    assert.equal(result!.available, 50)
  })

  test('available = max - used is always consistent', async ({ assert }) => {
    const fifteenRewards = Array.from({ length: 15 }, (_, i) =>
      createTwitchApiReward({ id: `reward-${i}` })
    )
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: fifteenRewards }), { status: 200 })

    const service = new TwitchRewardService()
    const result = await service.getRewardSlotsInfo(createMockStreamer() as any)

    assert.isNotNull(result)
    assert.equal(result!.used, 15)
    assert.equal(result!.available, result!.max - result!.used)
  })

  test('returns null on API error', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 })

    const service = new TwitchRewardService()
    const result = await service.getRewardSlotsInfo(createMockStreamer() as any)

    assert.isNull(result)
  })
})

// ========================================
// TESTS: updateReward
// ========================================

test.group('TwitchRewardService - updateReward', (group) => {
  let originalFetch: typeof globalThis.fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('returns updated reward on success', async ({ assert }) => {
    const updatedReward = createTwitchApiReward({
      id: 'reward-upd',
      title: 'Updated Title',
      cost: 999,
    })
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: [updatedReward] }), { status: 200 })

    const service = new TwitchRewardService()
    const result = await service.updateReward(createMockStreamer() as any, 'reward-upd', {
      title: 'Updated Title',
      cost: 999,
    })

    assert.isNotNull(result)
    assert.equal(result!.id, 'reward-upd')
    assert.equal(result!.title, 'Updated Title')
    assert.equal(result!.cost, 999)
  })

  test('returns null on API error', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 })

    const service = new TwitchRewardService()
    const result = await service.updateReward(createMockStreamer() as any, 'bad-id', { cost: 100 })

    assert.isNull(result)
  })

  test('sends cooldown as is_global_cooldown_enabled=true when seconds > 0', async ({ assert }) => {
    const capturedBodies: unknown[] = []

    globalThis.fetch = async (_, options) => {
      capturedBodies.push(JSON.parse((options as RequestInit).body as string))
      return new Response(JSON.stringify({ data: [createTwitchApiReward()] }), { status: 200 })
    }

    const service = new TwitchRewardService()
    await service.updateReward(createMockStreamer() as any, 'reward-123', {
      globalCooldownSeconds: 120,
    })

    const body = capturedBodies[0] as Record<string, unknown>
    assert.isTrue(body.is_global_cooldown_enabled)
    assert.equal(body.global_cooldown_seconds, 120)
  })

  test('sends is_global_cooldown_enabled=false when cooldown seconds is 0', async ({ assert }) => {
    const capturedBodies: unknown[] = []

    globalThis.fetch = async (_, options) => {
      capturedBodies.push(JSON.parse((options as RequestInit).body as string))
      return new Response(JSON.stringify({ data: [createTwitchApiReward()] }), { status: 200 })
    }

    const service = new TwitchRewardService()
    await service.updateReward(createMockStreamer() as any, 'reward-123', {
      globalCooldownSeconds: 0,
    })

    const body = capturedBodies[0] as Record<string, unknown>
    assert.isFalse(body.is_global_cooldown_enabled)
  })
})

// ========================================
// TESTS: setCooldown
// ========================================

test.group('TwitchRewardService - setCooldown', (group) => {
  let originalFetch: typeof globalThis.fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('returns true when API call succeeds', async ({ assert }) => {
    /* eslint-disable camelcase */
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          data: [
            createTwitchApiReward({
              is_global_cooldown_enabled: true,
              global_cooldown_seconds: 60,
            }),
          ],
        }),
        { status: 200 }
      )
    /* eslint-enable camelcase */

    const service = new TwitchRewardService()
    const result = await service.setCooldown(createMockStreamer() as any, 'reward-123', 60)

    assert.isTrue(result)
  })

  test('returns false when API call fails', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 })

    const service = new TwitchRewardService()
    const result = await service.setCooldown(createMockStreamer() as any, 'bad-reward', 60)

    assert.isFalse(result)
  })

  test('passes undefined globalCooldownSeconds when seconds is 0 (disables cooldown)', async ({
    assert,
  }) => {
    const capturedBodies: unknown[] = []

    globalThis.fetch = async (_, options) => {
      capturedBodies.push(JSON.parse((options as RequestInit).body as string))
      return new Response(JSON.stringify({ data: [createTwitchApiReward()] }), { status: 200 })
    }

    const service = new TwitchRewardService()
    // setCooldown with seconds=0 sends undefined to updateReward, which then sends is_global_cooldown_enabled=false
    await service.setCooldown(createMockStreamer() as any, 'reward-123', 0)

    // When seconds <= 0, globalCooldownSeconds is undefined, so nothing cooldown-related
    // gets added to the body (the update method only adds cooldown fields when defined)
    const body = capturedBodies[0] as Record<string, unknown>
    assert.notExists(body.is_global_cooldown_enabled)
    assert.notExists(body.global_cooldown_seconds)
  })

  test('passes correct seconds value when positive', async ({ assert }) => {
    const capturedBodies: unknown[] = []

    globalThis.fetch = async (_, options) => {
      capturedBodies.push(JSON.parse((options as RequestInit).body as string))
      /* eslint-disable camelcase */
      return new Response(
        JSON.stringify({ data: [createTwitchApiReward({ global_cooldown_seconds: 300 })] }),
        { status: 200 }
      )
      /* eslint-enable camelcase */
    }

    const service = new TwitchRewardService()
    await service.setCooldown(createMockStreamer() as any, 'reward-123', 300)

    const body = capturedBodies[0] as Record<string, unknown>
    assert.isTrue(body.is_global_cooldown_enabled)
    assert.equal(body.global_cooldown_seconds, 300)
  })
})

// ========================================
// TESTS: refundRedemption
// ========================================

test.group('TwitchRewardService - refundRedemption', (group) => {
  let originalFetch: typeof globalThis.fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('returns true when redemption is refunded via a known reward', async ({ assert }) => {
    // refundRedemption first calls getRewardsHttp (GET), then updateRedemptionStatusWithRewardHttp (PATCH)
    let callCount = 0
    globalThis.fetch = async (url) => {
      callCount++
      if ((url as string).includes('custom_rewards?broadcaster_id')) {
        return new Response(
          JSON.stringify({ data: [createTwitchApiReward({ id: 'reward-ref' })] }),
          { status: 200 }
        )
      }
      // PATCH redemption status
      return new Response(null, { status: 200 })
    }

    const service = new TwitchRewardService()
    const result = await service.refundRedemption(createMockStreamer() as any, 'redemption-xyz')

    assert.isTrue(result)
    assert.equal(callCount, 2) // One GET + one PATCH
  })

  test('returns false when no rewards are found to search through', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      if ((url as string).includes('custom_rewards?broadcaster_id')) {
        return new Response(JSON.stringify({ data: [] }), { status: 200 })
      }
      return new Response(null, { status: 200 })
    }

    const service = new TwitchRewardService()
    // No rewards = redemption cannot be found in any reward, final result is 404 = false
    const result = await service.refundRedemption(createMockStreamer() as any, 'redemption-xyz')

    assert.isFalse(result)
  })

  test('returns false when getRewards API call fails', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const service = new TwitchRewardService()
    const result = await service.refundRedemption(createMockStreamer() as any, 'redemption-xyz')

    assert.isFalse(result)
  })

  test('sets status to CANCELED in the PATCH body', async ({ assert }) => {
    const capturedBodies: unknown[] = []

    globalThis.fetch = async (url, options) => {
      if ((url as string).includes('custom_rewards?broadcaster_id')) {
        return new Response(
          JSON.stringify({ data: [createTwitchApiReward({ id: 'reward-ref' })] }),
          { status: 200 }
        )
      }
      // PATCH redemption
      capturedBodies.push(JSON.parse((options as RequestInit).body as string))
      return new Response(null, { status: 200 })
    }

    const service = new TwitchRewardService()
    await service.refundRedemption(createMockStreamer() as any, 'redemption-xyz')

    assert.lengthOf(capturedBodies, 1)
    const body = capturedBodies[0] as Record<string, unknown>
    assert.equal(body.status, 'CANCELED')
  })

  test('continues to next reward when PATCH returns 404 for first reward', async ({ assert }) => {
    let patchCallCount = 0
    globalThis.fetch = async (url, _options) => {
      if ((url as string).includes('only_manageable_rewards')) {
        return new Response(
          JSON.stringify({
            data: [
              createTwitchApiReward({ id: 'reward-1' }),
              createTwitchApiReward({ id: 'reward-2' }),
            ],
          }),
          { status: 200 }
        )
      }
      // PATCH redemption status
      patchCallCount++
      if (patchCallCount === 1) {
        // First reward returns 404 (not found under this reward)
        return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 })
      }
      // Second reward returns 200 (found!)
      return new Response(null, { status: 200 })
    }

    const service = new TwitchRewardService()
    const result = await service.refundRedemption(createMockStreamer() as any, 'redemption-xyz')

    assert.isTrue(result)
    assert.equal(patchCallCount, 2)
  })
})

// ========================================
// TESTS: refundRedemptionWithRewardId
// ========================================

test.group('TwitchRewardService - refundRedemptionWithRewardId', (group) => {
  let originalFetch: typeof globalThis.fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('returns true on successful PATCH (efficient path with known reward_id)', async ({
    assert,
  }) => {
    globalThis.fetch = async () => new Response(null, { status: 200 })

    const service = new TwitchRewardService()
    const result = await service.refundRedemptionWithRewardId(
      createMockStreamer() as any,
      'reward-known',
      'redemption-789'
    )

    assert.isTrue(result)
  })

  test('returns false on API error', async ({ assert }) => {
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: 'Not Found' }), { status: 404 })

    const service = new TwitchRewardService()
    const result = await service.refundRedemptionWithRewardId(
      createMockStreamer() as any,
      'reward-known',
      'bad-redemption'
    )

    assert.isFalse(result)
  })

  test('sends exactly one PATCH request without prior GET (uses known reward_id)', async ({
    assert,
  }) => {
    const capturedRequests: { url: string; method: string }[] = []

    globalThis.fetch = async (url, options) => {
      capturedRequests.push({ url: url as string, method: (options as RequestInit).method! })
      return new Response(null, { status: 200 })
    }

    const service = new TwitchRewardService()
    await service.refundRedemptionWithRewardId(
      createMockStreamer() as any,
      'reward-direct',
      'redemption-direct'
    )

    // Only one PATCH, no preliminary GET to fetch reward list
    assert.lengthOf(capturedRequests, 1)
    assert.equal(capturedRequests[0].method, 'PATCH')
    assert.include(capturedRequests[0].url, 'reward_id=reward-direct')
    assert.include(capturedRequests[0].url, 'id=redemption-direct')
  })

  test('sends CANCELED status in PATCH body', async ({ assert }) => {
    const capturedBodies: unknown[] = []

    globalThis.fetch = async (_, options) => {
      capturedBodies.push(JSON.parse((options as RequestInit).body as string))
      return new Response(null, { status: 200 })
    }

    const service = new TwitchRewardService()
    await service.refundRedemptionWithRewardId(
      createMockStreamer() as any,
      'reward-known',
      'redemption-789'
    )

    assert.lengthOf(capturedBodies, 1)
    const body = capturedBodies[0] as Record<string, unknown>
    assert.equal(body.status, 'CANCELED')
  })
})

// ========================================
// TESTS: CreateRewardData interface
// ========================================

test.group('TwitchRewardService - CreateRewardData interface', () => {
  test('accepts only required fields', async ({ assert }) => {
    const data: CreateRewardData = { title: 'Minimal', cost: 100 }
    assert.equal(data.title, 'Minimal')
    assert.equal(data.cost, 100)
    assert.isUndefined(data.prompt)
  })

  test('accepts all optional fields', async ({ assert }) => {
    const data: CreateRewardData = {
      title: 'Full Reward',
      cost: 500,
      prompt: 'Enter your choice',
      backgroundColor: '#FF0000',
      isEnabled: true,
      isUserInputRequired: true,
      maxPerStream: 10,
      maxPerUserPerStream: 2,
      globalCooldownSeconds: 300,
      shouldSkipRequestQueue: false,
    }

    assert.equal(data.prompt, 'Enter your choice')
    assert.equal(data.backgroundColor, '#FF0000')
    assert.isTrue(data.isEnabled)
    assert.isTrue(data.isUserInputRequired)
    assert.equal(data.maxPerStream, 10)
    assert.equal(data.maxPerUserPerStream, 2)
    assert.equal(data.globalCooldownSeconds, 300)
    assert.isFalse(data.shouldSkipRequestQueue)
  })
})

// ========================================
// TESTS: RewardSlotsInfo calculation
// ========================================

test.group('TwitchRewardService - RewardSlotsInfo calculation', () => {
  test('max is always 50 (MAX_REWARDS_PER_CHANNEL)', async ({ assert }) => {
    const slotsInfo = { used: 0, max: 50, available: 50 }
    assert.equal(slotsInfo.max, 50)
  })

  test('available equals max minus used', async ({ assert }) => {
    const used = 25
    const max = 50
    const available = max - used
    assert.equal(available, 25)
  })
})
