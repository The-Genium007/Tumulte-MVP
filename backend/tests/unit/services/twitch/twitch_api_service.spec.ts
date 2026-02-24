import { test } from '@japa/runner'
import { mockUserInfo } from '#tests/mocks/twitch_api_mock'

// Helper to create mock token response (Twitch API uses snake_case)
function createMockTokenResponse(token: string, expiresIn: number) {
  return { access_token: token, expires_in: expiresIn }
}

// Helper to create mock stream (Twitch API uses snake_case)
function createMockStream(userId: string, streamId: string) {
  /* eslint-disable camelcase */
  return {
    id: streamId,
    user_id: userId,
    user_login: `streamer_${userId}`,
    user_name: `Streamer${userId}`,
    game_name: 'Just Chatting',
    title: 'Live Stream',
    viewer_count: 100,
    started_at: new Date().toISOString(),
  }
  /* eslint-enable camelcase */
}

test.group('TwitchApiService - getAppAccessToken', (group) => {
  group.each.setup(async () => {
    // Reset static token cache between tests
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    ;(TwitchApiService as any).appAccessToken = null
    ;(TwitchApiService as any).tokenExpiry = 0
  })

  test('should return cached token if still valid', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const originalFetch = globalThis.fetch
    let fetchCallCount = 0
    globalThis.fetch = async () => {
      fetchCallCount++
      return new Response(JSON.stringify(createMockTokenResponse('test_app_tok', 3600)), {
        status: 200,
      })
    }

    try {
      // First call should fetch
      const token1 = await service.getAppAccessToken()
      assert.equal(token1, 'test_app_tok')
      assert.equal(fetchCallCount, 1)

      // Second call should return cached
      const token2 = await service.getAppAccessToken()
      assert.equal(token2, 'test_app_tok')
      assert.equal(fetchCallCount, 1) // No additional fetch
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should fetch new token when expired', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const originalFetch = globalThis.fetch
    let callCount = 0
    globalThis.fetch = async () => {
      callCount++
      return new Response(JSON.stringify(createMockTokenResponse(`app_tok_${callCount}`, 1)), {
        status: 200,
      })
    }

    try {
      const token1 = await service.getAppAccessToken()
      assert.equal(token1, 'app_tok_1')

      // Wait for token to "expire" (token expires immediately due to 5 min buffer)
      // Since expires_in is 1 second and buffer is 300 seconds, token is already expired
      const token2 = await service.getAppAccessToken()
      assert.equal(token2, 'app_tok_2')
      assert.equal(callCount, 2)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should throw error on failed token fetch', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ error: 'unauthorized_client' }), { status: 400 })
    }

    try {
      await assert.rejects(
        async () => await service.getAppAccessToken(),
        /Failed to get app access token/
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

test.group('TwitchApiService - searchUsers', () => {
  test('should return mapped user results', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const originalFetch = globalThis.fetch
    const mockChannel = {
      id: '12345',
      broadcaster_login: 'teststreamer',
      display_name: 'TestStreamer',
      thumbnail_url: 'https://example.com/thumb.jpg',
      broadcaster_type: 'affiliate',
    }
    const mockUser = mockUserInfo('12345')

    let callCount = 0
    globalThis.fetch = (async (url: string | URL) => {
      callCount++
      const urlStr = url.toString()

      if (urlStr.includes('/search/channels')) {
        return new Response(JSON.stringify({ data: [mockChannel] }), { status: 200 })
      }
      if (urlStr.includes('/users')) {
        return new Response(JSON.stringify({ data: [mockUser] }), { status: 200 })
      }

      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    }) as typeof fetch

    try {
      const results = await service.searchUsers('test', 'fake_tok')

      assert.lengthOf(results, 1)
      assert.equal(results[0].id, '12345')
      assert.equal(results[0].login, 'teststreamer')
      assert.equal(results[0].display_name, 'TestStreamer')
      assert.equal(results[0].profile_image_url, mockUser.profile_image_url)
      assert.equal(callCount, 2) // Search + Users call
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should throw error on API failure', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    }

    try {
      await assert.rejects(
        async () => await service.searchUsers('test', 'invalid_tok'),
        /Twitch API error: 401/
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

test.group('TwitchApiService - getUsersByIds', () => {
  test('should return empty array for empty input', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const result = await service.getUsersByIds([], 'fake_tok')
    assert.deepEqual(result, [])
  })

  test('should fetch users in chunks of 100', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const originalFetch = globalThis.fetch
    let fetchCalls = 0

    // Create 150 IDs (should result in 2 API calls)
    const userIds = Array.from({ length: 150 }, (_, i) => `user_${i}`)

    globalThis.fetch = (async (url: string | URL) => {
      fetchCalls++
      const urlStr = url.toString()
      const ids = urlStr.match(/id=([^&]+)/g) || []

      const users = ids.map((idParam: string) => {
        const id = decodeURIComponent(idParam.replace('id=', ''))
        return mockUserInfo(id)
      })

      return new Response(JSON.stringify({ data: users }), { status: 200 })
    }) as typeof fetch

    try {
      const results = await service.getUsersByIds(userIds, 'fake_tok')

      assert.equal(fetchCalls, 2) // 100 + 50
      assert.lengthOf(results, 150)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should throw error on API failure', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return new Response('Server Error', { status: 500 })
    }

    try {
      await assert.rejects(
        async () => await service.getUsersByIds(['123'], 'fake_tok'),
        /Twitch API error: 500/
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

test.group('TwitchApiService - getStreamsByUserIds', () => {
  test('should return empty map for empty input', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const result = await service.getStreamsByUserIds([], 'fake_tok')
    assert.instanceOf(result, Map)
    assert.equal(result.size, 0)
  })

  test('should return map of live streams', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const originalFetch = globalThis.fetch
    const mockStream = createMockStream('12345', 'stream_123')

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ data: [mockStream] }), { status: 200 })
    }

    try {
      const results = await service.getStreamsByUserIds(['12345', '67890'], 'fake_tok')

      assert.instanceOf(results, Map)
      assert.equal(results.size, 1)
      assert.isTrue(results.has('12345'))

      const stream = results.get('12345')
      assert.equal(stream?.id, 'stream_123')
      assert.equal(stream?.viewer_count, 100)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should handle multiple chunks', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const originalFetch = globalThis.fetch
    let fetchCalls = 0

    // 150 user IDs should result in 2 API calls
    const userIds = Array.from({ length: 150 }, (_, i) => `user_${i}`)

    globalThis.fetch = async () => {
      fetchCalls++
      const mockStream = createMockStream(`user_${fetchCalls}`, `stream_${fetchCalls}`)
      return new Response(JSON.stringify({ data: [mockStream] }), { status: 200 })
    }

    try {
      const results = await service.getStreamsByUserIds(userIds, 'fake_tok')

      assert.equal(fetchCalls, 2)
      assert.equal(results.size, 2) // 1 stream per chunk
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should throw error on API failure', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return new Response('Service Unavailable', { status: 503 })
    }

    try {
      await assert.rejects(
        async () => await service.getStreamsByUserIds(['123'], 'fake_tok'),
        /Twitch API error: 503/
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

test.group('TwitchApiService - getStreamsByUserIdsWithRetry', () => {
  test('should return early for empty input', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const result = await service.getStreamsByUserIdsWithRetry([], 'fake_tok')

    assert.isTrue(result.success)
    assert.instanceOf(result.data, Map)
    assert.equal(result.data?.size, 0)
    assert.equal(result.attempts, 0)
  })

  test('should succeed on first attempt', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const originalFetch = globalThis.fetch
    const mockStream = createMockStream('12345', 'stream_123')

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ data: [mockStream] }), { status: 200 })
    }

    try {
      const result = await service.getStreamsByUserIdsWithRetry(['12345'], 'fake_tok')

      assert.isTrue(result.success)
      assert.equal(result.attempts, 1)
      assert.equal(result.data?.size, 1)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should retry on failure and eventually succeed', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const originalFetch = globalThis.fetch
    let attempts = 0
    const mockStream = createMockStream('12345', 'stream_123')

    globalThis.fetch = async () => {
      attempts++
      if (attempts < 2) {
        return new Response('Server Error', { status: 500 })
      }
      return new Response(JSON.stringify({ data: [mockStream] }), { status: 200 })
    }

    try {
      const result = await service.getStreamsByUserIdsWithRetry(['12345'], 'fake_tok')

      assert.isTrue(result.success)
      assert.isAtLeast(result.attempts, 2)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

test.group('TwitchApiService - getUsersByIdsWithRetry', () => {
  test('should return early for empty input', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const result = await service.getUsersByIdsWithRetry([], 'fake_tok')

    assert.isTrue(result.success)
    assert.deepEqual(result.data, [])
    assert.equal(result.attempts, 0)
  })

  test('should succeed with user data', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const originalFetch = globalThis.fetch
    const mockUser = mockUserInfo('12345')

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ data: [mockUser] }), { status: 200 })
    }

    try {
      const result = await service.getUsersByIdsWithRetry(['12345'], 'fake_tok')

      assert.isTrue(result.success)
      assert.lengthOf(result.data || [], 1)
      assert.equal(result.data?.[0].id, '12345')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

test.group('TwitchApiService - getAppAccessTokenWithRetry', (group) => {
  group.each.setup(async () => {
    // Reset static token cache between tests
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    ;(TwitchApiService as any).appAccessToken = null
    ;(TwitchApiService as any).tokenExpiry = 0
  })

  test('should return cached token without API call', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const originalFetch = globalThis.fetch
    let fetchCalled = false

    // First, populate the cache
    globalThis.fetch = async () => {
      fetchCalled = true
      return new Response(JSON.stringify(createMockTokenResponse('cached_tok', 3600)), {
        status: 200,
      })
    }

    try {
      // First call to cache
      await service.getAppAccessToken()
      assert.isTrue(fetchCalled)

      // Reset for retry version
      fetchCalled = false

      // Should return cached without fetch
      const result = await service.getAppAccessTokenWithRetry()

      assert.isTrue(result.success)
      assert.equal(result.data, 'cached_tok')
      assert.equal(result.attempts, 0)
      assert.isFalse(fetchCalled)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should fetch new token with retry on failure', async ({ assert }) => {
    const { TwitchApiService } = await import('#services/twitch/twitch_api_service')
    const service = new TwitchApiService()

    const originalFetch = globalThis.fetch
    let attempts = 0

    globalThis.fetch = async () => {
      attempts++
      if (attempts < 2) {
        return new Response('Server Error', { status: 500 })
      }
      return new Response(JSON.stringify(createMockTokenResponse('new_tok', 3600)), { status: 200 })
    }

    try {
      const result = await service.getAppAccessTokenWithRetry()

      assert.isTrue(result.success)
      assert.equal(result.data, 'new_tok')
      assert.isAtLeast(result.attempts, 2)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
