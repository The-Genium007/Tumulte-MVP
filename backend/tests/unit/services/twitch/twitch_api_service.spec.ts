import { test } from '@japa/runner'
import { TwitchApiService as twitchApiService } from '#services/twitch/twitch_api_service'

test.group('TwitchApiService - App Access Token', (group) => {
  let originalFetch: typeof globalThis.fetch
  let service: twitchApiService

  group.each.setup(() => {
    originalFetch = globalThis.fetch
    service = new twitchApiService()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('should get app access token successfully', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      if (typeof url === 'string' && url.includes('oauth2/token')) {
        return {
          ok: true,
          json: async () => ({
            access_token: 'app_token_123',
            expires_in: 5000000,
          }),
        } as Response
      }
      return { ok: false } as Response
    }

    const token = await service.getAppAccessToken()

    assert.equal(token, 'app_token_123')
  })

  test('should cache app access token and reuse it', async ({ assert }) => {
    let fetchCallCount = 0

    globalThis.fetch = async (url) => {
      if (typeof url === 'string' && url.includes('oauth2/token')) {
        fetchCallCount++
        return {
          ok: true,
          json: async () => ({
            access_token: 'cached_token',
            expires_in: 5000000,
          }),
        } as Response
      }
      return { ok: false } as Response
    }

    // First call
    const token1 = await service.getAppAccessToken()

    // Second call should use cache
    const token2 = await service.getAppAccessToken()

    assert.equal(fetchCallCount, 1) // Only fetched once
    assert.equal(token1, token2)
  })

  test('should refresh token when expired with 5 minute buffer', async ({ assert }) => {
    let fetchCallCount = 0

    globalThis.fetch = async (url) => {
      if (typeof url === 'string' && url.includes('oauth2/token')) {
        fetchCallCount++
        // Return token that expires in 400 seconds (< 5min buffer = 300s)
        return {
          ok: true,
          json: async () => ({
            access_token: `token_call_${fetchCallCount}`,
            expires_in: 400, // Will expire immediately with 5min buffer
          }),
        } as Response
      }
      return { ok: false } as Response
    }

    const token1 = await service.getAppAccessToken()
    assert.equal(token1, 'token_call_1')

    // Wait a bit to ensure token is considered expired
    await new Promise((resolve) => setTimeout(resolve, 200))

    const token2 = await service.getAppAccessToken()

    // Should have fetched new token because of 5min buffer
    assert.isTrue(fetchCallCount >= 1)
  })

  test('should throw error if credentials missing', async ({ assert }) => {
    // Create new service instance with missing credentials
    const oldClientId = process.env.TWITCH_CLIENT_ID
    const oldClientSecret = process.env.TWITCH_CLIENT_SECRET

    delete process.env.TWITCH_CLIENT_ID
    delete process.env.TWITCH_CLIENT_SECRET

    const tempService = new twitchApiService()

    await assert.rejects(
      async () => await tempService.getAppAccessToken(),
      /Missing Twitch credentials/
    )

    // Restore
    process.env.TWITCH_CLIENT_ID = oldClientId
    process.env.TWITCH_CLIENT_SECRET = oldClientSecret
  })

  test('should throw error if token request fails', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      if (typeof url === 'string' && url.includes('oauth2/token')) {
        return {
          ok: false,
          status: 401,
        } as Response
      }
      return { ok: false } as Response
    }

    await assert.rejects(async () => await service.getAppAccessToken(), /Failed to get app access/)
  })
})

test.group('TwitchApiService - Search Users', (group) => {
  let originalFetch: typeof globalThis.fetch
  let service: twitchApiService

  group.each.setup(() => {
    originalFetch = globalThis.fetch
    service = new twitchApiService()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('should search users successfully', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()

      if (urlString.includes('search/channels')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'user-1',
                broadcaster_login: 'testuser1',
                display_name: 'TestUser1',
                thumbnail_url: 'https://example.com/thumb1.jpg',
                broadcaster_type: 'partner',
              },
              {
                id: 'user-2',
                broadcaster_login: 'testuser2',
                display_name: 'TestUser2',
                thumbnail_url: 'https://example.com/thumb2.jpg',
                broadcaster_type: 'affiliate',
              },
            ],
          }),
        } as Response
      }

      if (urlString.includes('helix/users')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'user-1',
                login: 'testuser1',
                displayName: 'TestUser1',
                profile_image_url: 'https://example.com/avatar1.png',
                broadcaster_type: 'partner',
              },
              {
                id: 'user-2',
                login: 'testuser2',
                displayName: 'TestUser2',
                profile_image_url: 'https://example.com/avatar2.png',
                broadcaster_type: 'affiliate',
              },
            ],
          }),
        } as Response
      }

      return { ok: false } as Response
    }

    const results = await service.searchUsers('test', 'mock_access_token')

    assert.lengthOf(results, 2)
    assert.equal(results[0].id, 'user-1')
    assert.equal(results[0].login, 'testuser1')
    assert.equal(results[0].display_name, 'TestUser1')
    assert.equal(results[0].profile_image_url, 'https://example.com/avatar1.png')
    assert.equal(results[0].broadcaster_type, 'partner')
  })

  test('should URL encode search query', async ({ assert }) => {
    let capturedUrl = ''

    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()
      capturedUrl = urlString

      if (urlString.includes('search/channels')) {
        return {
          ok: true,
          json: async () => ({ data: [] }),
        } as Response
      }

      if (urlString.includes('helix/users')) {
        return {
          ok: true,
          json: async () => ({ data: [] }),
        } as Response
      }

      return { ok: false } as Response
    }

    await service.searchUsers('test user with spaces', 'token')

    assert.include(capturedUrl, 'test%20user%20with%20spaces')
  })

  test('should throw error if search fails', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()

      if (urlString.includes('search/channels')) {
        return {
          ok: false,
          status: 401,
          text: async () => 'Unauthorized',
        } as Response
      }

      return { ok: false } as Response
    }

    await assert.rejects(async () => await service.searchUsers('test', 'invalid_token'), /401/)
  })

  test('should map profile images from getUsersByIds', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()

      if (urlString.includes('search/channels')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'user-1',
                broadcaster_login: 'user1',
                display_name: 'User1',
                thumbnail_url: 'https://old-thumbnail.jpg',
              },
            ],
          }),
        } as Response
      }

      if (urlString.includes('helix/users')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'user-1',
                login: 'user1',
                displayName: 'User1',
                profile_image_url: 'https://new-profile-image.png',
                broadcaster_type: '',
              },
            ],
          }),
        } as Response
      }

      return { ok: false } as Response
    }

    const results = await service.searchUsers('user1', 'token')

    // Should use profile image from getUsersByIds, not thumbnail
    assert.equal(results[0].profile_image_url, 'https://new-profile-image.png')
  })
})

test.group('TwitchApiService - Get Users By IDs', (group) => {
  let originalFetch: typeof globalThis.fetch
  let service: twitchApiService

  group.each.setup(() => {
    originalFetch = globalThis.fetch
    service = new twitchApiService()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('should get users by IDs successfully', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()

      if (urlString.includes('helix/users')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: '123',
                login: 'user123',
                displayName: 'User123',
                profile_image_url: 'https://example.com/123.png',
                broadcaster_type: 'partner',
              },
              {
                id: '456',
                login: 'user456',
                displayName: 'User456',
                profile_image_url: 'https://example.com/456.png',
                broadcaster_type: 'affiliate',
              },
            ],
          }),
        } as Response
      }

      return { ok: false } as Response
    }

    const results = await service.getUsersByIds(['123', '456'], 'mock_token')

    assert.lengthOf(results, 2)
    assert.equal(results[0].id, '123')
    assert.equal(results[1].id, '456')
  })

  test('should return empty array for empty IDs list', async ({ assert }) => {
    const results = await service.getUsersByIds([], 'token')

    assert.lengthOf(results, 0)
  })

  test('should chunk requests for more than 100 users', async ({ assert }) => {
    let requestCount = 0

    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()

      if (urlString.includes('helix/users')) {
        requestCount++
        return {
          ok: true,
          json: async () => ({
            data: Array.from({ length: 100 }, (_, i) => ({
              id: `user-${requestCount}-${i}`,
              login: `login${i}`,
              displayName: `Display${i}`,
              profile_image_url: `https://example.com/${i}.png`,
              broadcaster_type: '',
            })),
          }),
        } as Response
      }

      return { ok: false } as Response
    }

    // Create 250 IDs (should chunk into 3 requests: 100, 100, 50)
    const ids = Array.from({ length: 250 }, (_, i) => `user-${i}`)
    const results = await service.getUsersByIds(ids, 'token')

    assert.equal(requestCount, 3) // 3 chunks
    assert.lengthOf(results, 300) // 100 per request
  })

  test('should handle API errors gracefully', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()

      if (urlString.includes('helix/users')) {
        return {
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        } as Response
      }

      return { ok: false } as Response
    }

    await assert.rejects(
      async () => await service.getUsersByIds(['123'], 'token'),
      /Twitch API error: 500/
    )
  })

  test('should throw error if client ID missing', async ({ assert }) => {
    const oldClientId = process.env.TWITCH_CLIENT_ID
    delete process.env.TWITCH_CLIENT_ID

    const tempService = new twitchApiService()

    await assert.rejects(
      async () => await tempService.getUsersByIds(['123'], 'token'),
      /Missing Twitch Client ID/
    )

    process.env.TWITCH_CLIENT_ID = oldClientId
  })

  test('should properly encode user IDs in URL params', async ({ assert }) => {
    let capturedUrl = ''

    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()
      capturedUrl = urlString

      if (urlString.includes('helix/users')) {
        return {
          ok: true,
          json: async () => ({ data: [] }),
        } as Response
      }

      return { ok: false } as Response
    }

    await service.getUsersByIds(['123', '456', '789'], 'token')

    assert.include(capturedUrl, 'id=123')
    assert.include(capturedUrl, 'id=456')
    assert.include(capturedUrl, 'id=789')
  })
})

test.group('TwitchApiService - Authorization Headers', (group) => {
  let originalFetch: typeof globalThis.fetch
  let service: twitchApiService

  group.each.setup(() => {
    originalFetch = globalThis.fetch
    service = new twitchApiService()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('should include Bearer token in Authorization header', async ({ assert }) => {
    let capturedHeaders: Record<string, string> = {}

    globalThis.fetch = async (_url, options) => {
      if (options && options.headers) {
        capturedHeaders = options.headers as Record<string, string>
      }

      return {
        ok: true,
        json: async () => ({ data: [] }),
      } as Response
    }

    await service.getUsersByIds(['123'], 'my_access_token')

    assert.equal(capturedHeaders['Authorization'], 'Bearer my_access_token')
  })

  test('should include Client-Id header', async ({ assert }) => {
    let capturedHeaders: Record<string, string> = {}

    globalThis.fetch = async (_url, options) => {
      if (options && options.headers) {
        capturedHeaders = options.headers as Record<string, string>
      }

      return {
        ok: true,
        json: async () => ({ data: [] }),
      } as Response
    }

    await service.getUsersByIds(['123'], 'token')

    assert.exists(capturedHeaders['Client-Id'])
  })
})

test.group('TwitchApiService - Error Handling', (group) => {
  let originalFetch: typeof globalThis.fetch
  let service: twitchApiService

  group.each.setup(() => {
    originalFetch = globalThis.fetch
    service = new twitchApiService()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('should handle 401 Unauthorized error', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()

      if (urlString.includes('search/channels')) {
        return {
          ok: false,
          status: 401,
          text: async () => 'Invalid OAuth token',
        } as Response
      }

      return { ok: false } as Response
    }

    await assert.rejects(
      async () => await service.searchUsers('test', 'invalid_token'),
      /Twitch API error: 401/
    )
  })

  test('should handle 429 Rate Limit error', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()

      if (urlString.includes('helix/users')) {
        return {
          ok: false,
          status: 429,
          text: async () => 'Rate limit exceeded',
        } as Response
      }

      return { ok: false } as Response
    }

    await assert.rejects(
      async () => await service.getUsersByIds(['123'], 'token'),
      /Twitch API error: 429/
    )
  })

  test('should handle network errors', async ({ assert }) => {
    globalThis.fetch = async () => {
      throw new Error('Network connection failed')
    }

    await assert.rejects(
      async () => await service.searchUsers('test', 'token'),
      /Network connection failed/
    )
  })
})
