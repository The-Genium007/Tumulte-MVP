import { test } from '@japa/runner'
import { twitchPollService as TwitchPollService } from '#services/twitch/twitch_poll_service'

test.group('TwitchPollService - Create Poll', (group) => {
  let originalFetch: typeof globalThis.fetch
  let service: TwitchPollService

  group.each.setup(() => {
    originalFetch = globalThis.fetch
    service = new TwitchPollService()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('should create poll without channel points', async ({ assert }) => {
    let capturedBody: any = null

    globalThis.fetch = async (url, options) => {
      if (typeof url === 'string' && url.includes('helix/polls')) {
        if (options?.method === 'POST') {
          capturedBody = JSON.parse(options.body as string)
          return {
            ok: true,
            json: async () => ({
              data: [
                {
                  id: 'poll-123',
                  broadcasterId: 'broadcaster-1',
                  broadcasterName: 'TestStreamer',
                  broadcasterLogin: 'teststreamer',
                  title: 'Test Poll',
                  choices: [
                    { id: 'choice-1', title: 'Option 1', votes: 0 },
                    { id: 'choice-2', title: 'Option 2', votes: 0 },
                  ],
                  channelPointsVotingEnabled: false,
                  channelPointsPerVote: 0,
                  status: 'ACTIVE',
                  duration: 60,
                  started_at: '2024-01-01T12:00:00Z',
                },
              ],
            }),
          } as Response
        }
      }
      return { ok: false } as Response
    }

    const result = await service.createPoll(
      'broadcaster-1',
      'token123',
      'Test Poll',
      ['Option 1', 'Option 2'],
      60,
      false
    )

    assert.equal(result.id, 'poll-123')
    assert.equal(result.status, 'ACTIVE')
    assert.equal(capturedBody.broadcasterId, 'broadcaster-1')
    assert.equal(capturedBody.title, 'Test Poll')
    assert.equal(capturedBody.duration, 60)
    assert.lengthOf(capturedBody.choices, 2)
    assert.equal(capturedBody.choices[0].title, 'Option 1')
    assert.equal(capturedBody.choices[1].title, 'Option 2')
    assert.isUndefined(capturedBody.channelPointsVotingEnabled)
  })

  test('should create poll with channel points enabled', async ({ assert }) => {
    let capturedBody: any = null

    globalThis.fetch = async (url, options) => {
      if (typeof url === 'string' && url.includes('helix/polls')) {
        if (options?.method === 'POST') {
          capturedBody = JSON.parse(options.body as string)
          return {
            ok: true,
            json: async () => ({
              data: [
                {
                  id: 'poll-456',
                  broadcasterId: 'broadcaster-1',
                  broadcasterName: 'TestStreamer',
                  broadcasterLogin: 'teststreamer',
                  title: 'CP Poll',
                  choices: [
                    { id: 'choice-1', title: 'A', votes: 0 },
                    { id: 'choice-2', title: 'B', votes: 0 },
                  ],
                  channelPointsVotingEnabled: true,
                  channelPointsPerVote: 100,
                  status: 'ACTIVE',
                  duration: 120,
                  started_at: '2024-01-01T12:00:00Z',
                },
              ],
            }),
          } as Response
        }
      }
      return { ok: false } as Response
    }

    const result = await service.createPoll(
      'broadcaster-1',
      'token123',
      'CP Poll',
      ['A', 'B'],
      120,
      true,
      100
    )

    assert.equal(result.id, 'poll-456')
    assert.equal(result.status, 'ACTIVE')
    assert.isTrue(capturedBody.channelPointsVotingEnabled)
    assert.equal(capturedBody.channelPointsPerVote, 100)
  })

  test('should not enable channel points if points per vote is 0', async ({ assert }) => {
    let capturedBody: any = null

    globalThis.fetch = async (url, options) => {
      if (typeof url === 'string' && url.includes('helix/polls')) {
        if (options?.method === 'POST') {
          capturedBody = JSON.parse(options.body as string)
          return {
            ok: true,
            json: async () => ({
              data: [
                {
                  id: 'poll-789',
                  status: 'ACTIVE',
                },
              ],
            }),
          } as Response
        }
      }
      return { ok: false } as Response
    }

    await service.createPoll('broadcaster-1', 'token123', 'Poll', ['A', 'B'], 60, true, 0)

    assert.isUndefined(capturedBody.channelPointsVotingEnabled)
    assert.isUndefined(capturedBody.channelPointsPerVote)
  })

  test('should include authorization and client-id headers', async ({ assert }) => {
    let capturedHeaders: Record<string, string> = {}

    globalThis.fetch = async (_url, options) => {
      if (options?.headers) {
        capturedHeaders = options.headers as Record<string, string>
      }
      return {
        ok: true,
        json: async () => ({
          data: [{ id: 'poll-1', status: 'ACTIVE' }],
        }),
      } as Response
    }

    await service.createPoll('broadcaster-1', 'my_token', 'Poll', ['A', 'B'], 60)

    assert.equal(capturedHeaders['Authorization'], 'Bearer my_token')
    assert.exists(capturedHeaders['Client-Id'])
    assert.equal(capturedHeaders['Content-Type'], 'application/json')
  })

  test('should throw UNAUTHORIZED on 401 response', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      if (typeof url === 'string' && url.includes('helix/polls')) {
        return {
          ok: false,
          status: 401,
          text: async () => 'Invalid OAuth token',
        } as Response
      }
      return { ok: false } as Response
    }

    await assert.rejects(
      async () => await service.createPoll('broadcaster-1', 'invalid_token', 'Poll', ['A'], 60),
      /UNAUTHORIZED/
    )
  })

  test('should throw error on other API failures', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      if (typeof url === 'string' && url.includes('helix/polls')) {
        return {
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        } as Response
      }
      return { ok: false } as Response
    }

    await assert.rejects(
      async () => await service.createPoll('broadcaster-1', 'token', 'Poll', ['A'], 60),
      /Failed to create poll: Internal Server Error/
    )
  })

  test('should throw error if no poll data returned', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      if (typeof url === 'string' && url.includes('helix/polls')) {
        return {
          ok: true,
          json: async () => ({ data: [] }),
        } as Response
      }
      return { ok: false } as Response
    }

    await assert.rejects(
      async () => await service.createPoll('broadcaster-1', 'token', 'Poll', ['A'], 60),
      /No poll data returned from Twitch/
    )
  })

  test('should map choices correctly with title field', async ({ assert }) => {
    let capturedBody: any = null

    globalThis.fetch = async (url, options) => {
      if (typeof url === 'string' && url.includes('helix/polls')) {
        if (options?.method === 'POST') {
          capturedBody = JSON.parse(options.body as string)
          return {
            ok: true,
            json: async () => ({
              data: [{ id: 'poll-1', status: 'ACTIVE' }],
            }),
          } as Response
        }
      }
      return { ok: false } as Response
    }

    await service.createPoll('broadcaster-1', 'token', 'Poll', ['First', 'Second', 'Third'], 60)

    assert.lengthOf(capturedBody.choices, 3)
    assert.equal(capturedBody.choices[0].title, 'First')
    assert.equal(capturedBody.choices[1].title, 'Second')
    assert.equal(capturedBody.choices[2].title, 'Third')
  })
})

test.group('TwitchPollService - Get Poll', (group) => {
  let originalFetch: typeof globalThis.fetch
  let service: TwitchPollService

  group.each.setup(() => {
    originalFetch = globalThis.fetch
    service = new TwitchPollService()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('should get poll successfully', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()

      if (urlString.includes('helix/polls')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'poll-123',
                broadcasterId: 'broadcaster-1',
                broadcasterName: 'TestStreamer',
                broadcasterLogin: 'teststreamer',
                title: 'Test Poll',
                choices: [
                  { id: 'choice-1', title: 'Option 1', votes: 50 },
                  { id: 'choice-2', title: 'Option 2', votes: 30 },
                ],
                channelPointsVotingEnabled: false,
                channelPointsPerVote: 0,
                status: 'ACTIVE',
                duration: 60,
                started_at: '2024-01-01T12:00:00Z',
              },
            ],
          }),
        } as Response
      }

      return { ok: false } as Response
    }

    const result = await service.getPoll('broadcaster-1', 'poll-123', 'token123')

    assert.equal(result.id, 'poll-123')
    assert.equal(result.status, 'ACTIVE')
    assert.lengthOf(result.choices, 2)
    assert.equal(result.choices[0].id, 'choice-1')
    assert.equal(result.choices[0].title, 'Option 1')
    assert.equal(result.choices[0].votes, 50)
    assert.equal(result.choices[1].id, 'choice-2')
    assert.equal(result.choices[1].title, 'Option 2')
    assert.equal(result.choices[1].votes, 30)
  })

  test('should aggregate votes from multiple vote types', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()

      if (urlString.includes('helix/polls')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'poll-123',
                broadcasterId: 'broadcaster-1',
                broadcasterName: 'TestStreamer',
                broadcasterLogin: 'teststreamer',
                title: 'Test Poll',
                choices: [
                  {
                    id: 'choice-1',
                    title: 'Option 1',
                    votes: 10,
                    channel_points_votes: 20,
                    bits_votes: 5,
                  },
                  { id: 'choice-2', title: 'Option 2', votes: 15 },
                ],
                channelPointsVotingEnabled: true,
                channelPointsPerVote: 100,
                status: 'ACTIVE',
                duration: 60,
                started_at: '2024-01-01T12:00:00Z',
              },
            ],
          }),
        } as Response
      }

      return { ok: false } as Response
    }

    const result = await service.getPoll('broadcaster-1', 'poll-123', 'token123')

    // Choice 1: 10 + 20 + 5 = 35 votes total
    assert.equal(result.choices[0].votes, 35)
    // Choice 2: 15 + 0 + 0 = 15 votes total
    assert.equal(result.choices[1].votes, 15)
  })

  test('should handle missing vote fields gracefully', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()

      if (urlString.includes('helix/polls')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'poll-123',
                broadcasterId: 'broadcaster-1',
                broadcasterName: 'TestStreamer',
                broadcasterLogin: 'teststreamer',
                title: 'Test Poll',
                choices: [
                  { id: 'choice-1', title: 'Option 1' }, // No votes field
                  { id: 'choice-2', title: 'Option 2' },
                ],
                channelPointsVotingEnabled: false,
                channelPointsPerVote: 0,
                status: 'ACTIVE',
                duration: 60,
                started_at: '2024-01-01T12:00:00Z',
              },
            ],
          }),
        } as Response
      }

      return { ok: false } as Response
    }

    const result = await service.getPoll('broadcaster-1', 'poll-123', 'token123')

    // Should default to 0 votes
    assert.equal(result.choices[0].votes, 0)
    assert.equal(result.choices[1].votes, 0)
  })

  test('should include broadcaster and poll ID in query params', async ({ assert }) => {
    let capturedUrl = ''

    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()
      capturedUrl = urlString

      if (urlString.includes('helix/polls')) {
        return {
          ok: true,
          json: async () => ({
            data: [{ id: 'poll-123', status: 'ACTIVE', choices: [] }],
          }),
        } as Response
      }

      return { ok: false } as Response
    }

    await service.getPoll('broadcaster-456', 'poll-789', 'token')

    assert.include(capturedUrl, 'broadcasterId=broadcaster-456')
    assert.include(capturedUrl, 'id=poll-789')
  })

  test('should throw UNAUTHORIZED on 401 response', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()

      if (urlString.includes('helix/polls')) {
        return {
          ok: false,
          status: 401,
          text: async () => 'Invalid OAuth token',
        } as Response
      }

      return { ok: false } as Response
    }

    await assert.rejects(
      async () => await service.getPoll('broadcaster-1', 'poll-123', 'invalid_token'),
      /UNAUTHORIZED/
    )
  })

  test('should throw error on other API failures', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()

      if (urlString.includes('helix/polls')) {
        return {
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        } as Response
      }

      return { ok: false } as Response
    }

    await assert.rejects(
      async () => await service.getPoll('broadcaster-1', 'poll-123', 'token'),
      /Failed to get poll: Internal Server Error/
    )
  })

  test('should throw error if poll not found', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()

      if (urlString.includes('helix/polls')) {
        return {
          ok: true,
          json: async () => ({ data: [] }),
        } as Response
      }

      return { ok: false } as Response
    }

    await assert.rejects(
      async () => await service.getPoll('broadcaster-1', 'nonexistent', 'token'),
      /Poll not found/
    )
  })

  test('should map COMPLETED status correctly', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()

      if (urlString.includes('helix/polls')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'poll-123',
                status: 'COMPLETED',
                choices: [],
                started_at: '2024-01-01T12:00:00Z',
                ended_at: '2024-01-01T12:01:00Z',
              },
            ],
          }),
        } as Response
      }

      return { ok: false } as Response
    }

    const result = await service.getPoll('broadcaster-1', 'poll-123', 'token')

    assert.equal(result.status, 'COMPLETED')
  })

  test('should map TERMINATED status correctly', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      const urlString = typeof url === 'string' ? url : url.toString()

      if (urlString.includes('helix/polls')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'poll-123',
                status: 'TERMINATED',
                choices: [],
                started_at: '2024-01-01T12:00:00Z',
                ended_at: '2024-01-01T12:00:30Z',
              },
            ],
          }),
        } as Response
      }

      return { ok: false } as Response
    }

    const result = await service.getPoll('broadcaster-1', 'poll-123', 'token')

    assert.equal(result.status, 'TERMINATED')
  })
})

test.group('TwitchPollService - End Poll', (group) => {
  let originalFetch: typeof globalThis.fetch
  let service: TwitchPollService

  group.each.setup(() => {
    originalFetch = globalThis.fetch
    service = new TwitchPollService()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('should end poll with TERMINATED status', async ({ assert }) => {
    let capturedBody: any = null

    globalThis.fetch = async (url, options) => {
      if (typeof url === 'string' && url.includes('helix/polls')) {
        if (options?.method === 'PATCH') {
          capturedBody = JSON.parse(options.body as string)
          return {
            ok: true,
            json: async () => ({
              data: [{ id: 'poll-123', status: 'TERMINATED' }],
            }),
          } as Response
        }
      }
      return { ok: false } as Response
    }

    await service.endPoll('broadcaster-1', 'poll-123', 'token123', 'TERMINATED')

    assert.equal(capturedBody.broadcasterId, 'broadcaster-1')
    assert.equal(capturedBody.id, 'poll-123')
    assert.equal(capturedBody.status, 'TERMINATED')
  })

  test('should end poll with ARCHIVED status', async ({ assert }) => {
    let capturedBody: any = null

    globalThis.fetch = async (url, options) => {
      if (typeof url === 'string' && url.includes('helix/polls')) {
        if (options?.method === 'PATCH') {
          capturedBody = JSON.parse(options.body as string)
          return {
            ok: true,
            json: async () => ({
              data: [{ id: 'poll-456', status: 'ARCHIVED' }],
            }),
          } as Response
        }
      }
      return { ok: false } as Response
    }

    await service.endPoll('broadcaster-2', 'poll-456', 'token456', 'ARCHIVED')

    assert.equal(capturedBody.broadcasterId, 'broadcaster-2')
    assert.equal(capturedBody.id, 'poll-456')
    assert.equal(capturedBody.status, 'ARCHIVED')
  })

  test('should include authorization and client-id headers', async ({ assert }) => {
    let capturedHeaders: Record<string, string> = {}

    globalThis.fetch = async (_url, options) => {
      if (options?.headers) {
        capturedHeaders = options.headers as Record<string, string>
      }
      return {
        ok: true,
        json: async () => ({ data: [] }),
      } as Response
    }

    await service.endPoll('broadcaster-1', 'poll-123', 'my_token', 'TERMINATED')

    assert.equal(capturedHeaders['Authorization'], 'Bearer my_token')
    assert.exists(capturedHeaders['Client-Id'])
    assert.equal(capturedHeaders['Content-Type'], 'application/json')
  })

  test('should throw UNAUTHORIZED on 401 response', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      if (typeof url === 'string' && url.includes('helix/polls')) {
        return {
          ok: false,
          status: 401,
          text: async () => 'Invalid OAuth token',
        } as Response
      }
      return { ok: false } as Response
    }

    await assert.rejects(
      async () => await service.endPoll('broadcaster-1', 'poll-123', 'invalid_token', 'TERMINATED'),
      /UNAUTHORIZED/
    )
  })

  test('should throw error on other API failures', async ({ assert }) => {
    globalThis.fetch = async (url) => {
      if (typeof url === 'string' && url.includes('helix/polls')) {
        return {
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        } as Response
      }
      return { ok: false } as Response
    }

    await assert.rejects(
      async () => await service.endPoll('broadcaster-1', 'poll-123', 'token', 'TERMINATED'),
      /Failed to end poll: Internal Server Error/
    )
  })
})

test.group('TwitchPollService - Token Refresh', (group) => {
  let originalFetch: typeof globalThis.fetch
  let service: TwitchPollService

  group.each.setup(() => {
    originalFetch = globalThis.fetch
    service = new TwitchPollService()
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('should execute operation successfully without refresh', async ({ assert }) => {
    let operationCalled = false
    let getAccessTokenCalled = false

    const operation = async (token: string) => {
      operationCalled = true
      assert.equal(token, 'current_token')
      return { success: true }
    }

    const getAccessToken = async () => {
      getAccessTokenCalled = true
      return 'current_token'
    }

    const refreshToken = 'refresh_token'
    const onTokenRefreshed = async () => {
      assert.fail('Should not be called')
    }

    const result = await service.withTokenRefresh(
      operation,
      getAccessToken,
      refreshToken,
      onTokenRefreshed
    )

    assert.isTrue(operationCalled)
    assert.isTrue(getAccessTokenCalled)
    assert.isTrue(result.success)
  })

  test('should refresh token on UNAUTHORIZED error and retry', async ({ assert }) => {
    let operationCallCount = 0
    let refreshCalled = false
    let onTokenRefreshedCalled = false

    // Mock auth service refresh
    const mockAuthService = {
      async refreshAccessToken(refreshToken: string) {
        refreshCalled = true
        assert.equal(refreshToken, 'old_refresh_token')
        return {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
        }
      },
    }

    // Replace auth service instance
    ;(service as any).authService = mockAuthService

    const operation = async (token: string) => {
      operationCallCount++
      if (operationCallCount === 1) {
        assert.equal(token, 'expired_token')
        throw new Error('UNAUTHORIZED')
      }
      assert.equal(token, 'new_access_token')
      return { success: true }
    }

    const getAccessToken = async () => 'expired_token'

    const onTokenRefreshed = async (newAccessToken: string, newRefreshToken: string) => {
      onTokenRefreshedCalled = true
      assert.equal(newAccessToken, 'new_access_token')
      assert.equal(newRefreshToken, 'new_refresh_token')
    }

    const result = await service.withTokenRefresh(
      operation,
      getAccessToken,
      'old_refresh_token',
      onTokenRefreshed
    )

    assert.equal(operationCallCount, 2)
    assert.isTrue(refreshCalled)
    assert.isTrue(onTokenRefreshedCalled)
    assert.isTrue(result.success)
  })

  test('should propagate non-UNAUTHORIZED errors', async ({ assert }) => {
    const operation = async () => {
      throw new Error('Network error')
    }

    const getAccessToken = async () => 'token'

    await assert.rejects(
      async () =>
        await service.withTokenRefresh(operation, getAccessToken, 'refresh_token', async () => {}),
      /Network error/
    )
  })

  test('should handle refresh token failure', async ({ assert }) => {
    const mockAuthService = {
      async refreshAccessToken() {
        throw new Error('Refresh token expired')
      },
    }

    ;(service as any).authService = mockAuthService

    const operation = async () => {
      throw new Error('UNAUTHORIZED')
    }

    const getAccessToken = async () => 'expired_token'

    await assert.rejects(
      async () =>
        await service.withTokenRefresh(operation, getAccessToken, 'refresh_token', async () => {}),
      /Refresh token expired/
    )
  })

  test('should call onTokenRefreshed with new tokens', async ({ assert }) => {
    let capturedAccessToken = ''
    let capturedRefreshToken = ''

    const mockAuthService = {
      async refreshAccessToken() {
        return {
          access_token: 'brand_new_access',
          refresh_token: 'brand_new_refresh',
        }
      },
    }

    ;(service as any).authService = mockAuthService

    let operationAttempt = 0
    const operation = async (token: string) => {
      operationAttempt++
      if (operationAttempt === 1) {
        throw new Error('UNAUTHORIZED')
      }
      return { token }
    }

    const getAccessToken = async () => 'old_token'

    const onTokenRefreshed = async (newAccess: string, newRefresh: string) => {
      capturedAccessToken = newAccess
      capturedRefreshToken = newRefresh
    }

    await service.withTokenRefresh(operation, getAccessToken, 'old_refresh', onTokenRefreshed)

    assert.equal(capturedAccessToken, 'brand_new_access')
    assert.equal(capturedRefreshToken, 'brand_new_refresh')
  })

  test('should use refreshed token in retry operation', async ({ assert }) => {
    const mockAuthService = {
      async refreshAccessToken() {
        return {
          access_token: 'refreshed_token',
          refresh_token: 'new_refresh',
        }
      },
    }

    ;(service as any).authService = mockAuthService

    let tokenUsedInRetry = ''
    let operationAttempt = 0

    const operation = async (token: string) => {
      operationAttempt++
      if (operationAttempt === 1) {
        throw new Error('UNAUTHORIZED')
      }
      tokenUsedInRetry = token
      return { done: true }
    }

    const getAccessToken = async () => 'expired_token'

    await service.withTokenRefresh(operation, getAccessToken, 'old_refresh', async () => {})

    assert.equal(tokenUsedInRetry, 'refreshed_token')
  })
})
