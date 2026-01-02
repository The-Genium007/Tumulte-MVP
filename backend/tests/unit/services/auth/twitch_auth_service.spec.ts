import { test } from '@japa/runner'
import { twitchAuthService as TwitchAuthService } from '#services/auth/twitch_auth_service'

test.group('TwitchAuthService - Authorization URL', () => {
  test('should generate authorization URL with all required params', ({ assert }) => {
    const service = new TwitchAuthService()
    const state = 'random_csrf_state_12345'

    const url = service.getAuthorizationUrl(state)

    assert.include(url, 'https://id.twitch.tv/oauth2/authorize')
    assert.include(url, `state=${state}`)
    assert.include(url, 'responseType=code')
    assert.include(url, 'channel%3Amanage%3Apolls') // URL encoded scope
    assert.include(url, 'channel%3Aread%3Apolls')
    assert.include(url, 'user%3Aread%3Aemail')
    assert.include(url, 'chat%3Aread')
    assert.include(url, 'chat%3Aedit')
  })

  test('should include force_verify=true by default', ({ assert }) => {
    const service = new TwitchAuthService()
    const state = 'test_state'

    const url = service.getAuthorizationUrl(state)

    assert.include(url, 'force_verify=true')
  })

  test('should exclude force_verify when explicitly set to false', ({ assert }) => {
    const service = new TwitchAuthService()
    const state = 'test_state'

    const url = service.getAuthorizationUrl(state, false)

    assert.notInclude(url, 'force_verify')
  })

  test('should include CSRF state parameter', ({ assert }) => {
    const service = new TwitchAuthService()
    const state = 'unique_csrf_token_abc123'

    const url = service.getAuthorizationUrl(state)

    assert.include(url, `state=${state}`)
  })
})

test.group('TwitchAuthService - Scopes Management', () => {
  test('should return required scopes as array', ({ assert }) => {
    const service = new TwitchAuthService()

    const scopes = service.getRequiredScopes()

    assert.isArray(scopes)
    assert.lengthOf(scopes, 5)
    assert.deepEqual(scopes, [
      'channel:manage:polls',
      'channel:read:polls',
      'user:read:email',
      'chat:read',
      'chat:edit',
    ])
  })

  test('should return a copy of scopes array (not reference)', ({ assert }) => {
    const service = new TwitchAuthService()

    const scopes1 = service.getRequiredScopes()
    const scopes2 = service.getRequiredScopes()

    scopes1.push('extra:scope')

    assert.notDeepEqual(scopes1, scopes2)
    assert.lengthOf(scopes2, 5) // Original should not be modified
  })

  test('should validate that user has all required scopes', ({ assert }) => {
    const service = new TwitchAuthService()

    const userScopes = [
      'channel:manage:polls',
      'channel:read:polls',
      'user:read:email',
      'chat:read',
      'chat:edit',
      'extra:bonus:scope', // Extra scope is fine
    ]

    const hasAll = service.hasAllRequiredScopes(userScopes)

    assert.isTrue(hasAll)
  })

  test('should detect missing required scopes', ({ assert }) => {
    const service = new TwitchAuthService()

    const userScopes = [
      'channel:manage:polls',
      'channel:read:polls',
      // Missing: user:read:email, chat:read, chat:edit
    ]

    const hasAll = service.hasAllRequiredScopes(userScopes)

    assert.isFalse(hasAll)
  })

  test('should detect single missing scope', ({ assert }) => {
    const service = new TwitchAuthService()

    const userScopes = [
      'channel:manage:polls',
      'channel:read:polls',
      'user:read:email',
      'chat:read',
      // Missing: chat:edit
    ]

    const hasAll = service.hasAllRequiredScopes(userScopes)

    assert.isFalse(hasAll)
  })

  test('should return false for empty scopes array', ({ assert }) => {
    const service = new TwitchAuthService()

    const hasAll = service.hasAllRequiredScopes([])

    assert.isFalse(hasAll)
  })
})

test.group('TwitchAuthService - Code Exchange (with mocked fetch)', (group) => {
  let originalFetch: typeof globalThis.fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('should exchange authorization code for tokens successfully', async ({ assert }) => {
    const service = new TwitchAuthService()

    // Mock fetch to return successful token response
    globalThis.fetch = async () => {
      return {
        ok: true,
        json: async () => ({
          access_token: 'mock_access_token_12345',
          refresh_token: 'mock_refresh_token_67890',
          expires_in: 14400,
          scope: ['channel:manage:polls', 'channel:read:polls', 'chat:read'],
          token_type: 'bearer',
        }),
      } as Response
    }

    const result = await service.exchangeCodeForTokens('auth_code_abc123')

    assert.equal(result.access_token, 'mock_access_token_12345')
    assert.equal(result.refresh_token, 'mock_refresh_token_67890')
    assert.equal(result.expires_in, 14400)
    assert.isArray(result.scope)
    assert.lengthOf(result.scope, 3)
  })

  test('should handle scope as string and convert to array', async ({ assert }) => {
    const service = new TwitchAuthService()

    // Mock fetch with scope as string (Twitch sometimes returns string)
    globalThis.fetch = async () => {
      return {
        ok: true,
        json: async () => ({
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 14400,
          scope: 'channel:manage:polls channel:read:polls chat:read', // String format
          token_type: 'bearer',
        }),
      } as Response
    }

    const result = await service.exchangeCodeForTokens('auth_code')

    assert.isArray(result.scope)
    assert.lengthOf(result.scope, 3)
    assert.deepEqual(result.scope, ['channel:manage:polls', 'channel:read:polls', 'chat:read'])
  })

  test('should handle scope as array directly', async ({ assert }) => {
    const service = new TwitchAuthService()

    globalThis.fetch = async () => {
      return {
        ok: true,
        json: async () => ({
          access_token: 'token',
          refresh_token: 'refresh',
          expires_in: 14400,
          scope: ['channel:manage:polls', 'channel:read:polls'], // Array format
          token_type: 'bearer',
        }),
      } as Response
    }

    const result = await service.exchangeCodeForTokens('auth_code')

    assert.isArray(result.scope)
    assert.deepEqual(result.scope, ['channel:manage:polls', 'channel:read:polls'])
  })

  test('should throw error when token exchange fails', async ({ assert }) => {
    const service = new TwitchAuthService()

    // Mock fetch to return error response
    globalThis.fetch = async () => {
      return {
        ok: false,
        text: async () => 'Invalid authorization code',
      } as Response
    }

    await assert.rejects(
      async () => await service.exchangeCodeForTokens('invalid_code'),
      'Failed to exchange code for tokens: Invalid authorization code'
    )
  })

  test('should throw error when Twitch returns 400 Bad Request', async ({ assert }) => {
    const service = new TwitchAuthService()

    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 400,
        text: async () => 'Bad Request: invalid grant',
      } as Response
    }

    await assert.rejects(
      async () => await service.exchangeCodeForTokens('bad_code'),
      'Failed to exchange code for tokens'
    )
  })
})

test.group('TwitchAuthService - Get User Info (with mocked fetch)', (group) => {
  let originalFetch: typeof globalThis.fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('should fetch user info with access token', async ({ assert }) => {
    const service = new TwitchAuthService()
    const consoleLogSpy: string[] = []
    const originalLog = console.log
    console.log = (...args: unknown[]) => {
      consoleLogSpy.push(args.join(' '))
    }

    globalThis.fetch = async () => {
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              id: '123456',
              login: 'teststreamer',
              display_name: 'TestStreamer',
              email: 'test@example.com',
              profile_image_url: 'https://example.com/avatar.png',
              broadcaster_type: 'affiliate',
            },
          ],
        }),
      } as Response
    }

    const userInfo = await service.getUserInfo('valid_access_token')

    console.log = originalLog

    assert.equal(userInfo.id, '123456')
    assert.equal(userInfo.login, 'teststreamer')
    assert.equal(userInfo.displayName, 'TestStreamer')
    assert.equal(userInfo.email, 'test@example.com')
    assert.equal(userInfo.profile_image_url, 'https://example.com/avatar.png')
    assert.equal(userInfo.broadcaster_type, 'affiliate')
  })

  test('should fallback to login when display_name is empty', async ({ assert }) => {
    const service = new TwitchAuthService()
    const originalLog = console.log
    console.log = () => {} // Silence logs

    globalThis.fetch = async () => {
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              id: '123456',
              login: 'testuser',
              display_name: '', // Empty display name
              profile_image_url: 'https://example.com/avatar.png',
              broadcaster_type: '',
            },
          ],
        }),
      } as Response
    }

    const userInfo = await service.getUserInfo('token')

    console.log = originalLog

    assert.equal(userInfo.displayName, 'testuser') // Should fallback to login
  })

  test('should throw error when API returns 401 Unauthorized', async ({ assert }) => {
    const service = new TwitchAuthService()

    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      } as Response
    }

    await assert.rejects(
      async () => await service.getUserInfo('invalid_token'),
      'Failed to get user info: Unauthorized'
    )
  })

  test('should throw error when no user data returned', async ({ assert }) => {
    const service = new TwitchAuthService()

    globalThis.fetch = async () => {
      return {
        ok: true,
        json: async () => ({
          data: [], // Empty array
        }),
      } as Response
    }

    await assert.rejects(
      async () => await service.getUserInfo('token'),
      'No user data returned from Twitch'
    )
  })

  test('should handle broadcaster_type as empty string for non-affiliates', async ({ assert }) => {
    const service = new TwitchAuthService()
    const originalLog = console.log
    console.log = () => {}

    globalThis.fetch = async () => {
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              id: '123456',
              login: 'regularuser',
              display_name: 'RegularUser',
              profile_image_url: 'https://example.com/avatar.png',
              broadcaster_type: '', // Not an affiliate/partner
            },
          ],
        }),
      } as Response
    }

    const userInfo = await service.getUserInfo('token')

    console.log = originalLog

    assert.equal(userInfo.broadcaster_type, '')
  })

  test('should handle optional email field when not present', async ({ assert }) => {
    const service = new TwitchAuthService()
    const originalLog = console.log
    console.log = () => {}

    globalThis.fetch = async () => {
      return {
        ok: true,
        json: async () => ({
          data: [
            {
              id: '123456',
              login: 'testuser',
              display_name: 'TestUser',
              // email: undefined, // Not present
              profile_image_url: 'https://example.com/avatar.png',
              broadcaster_type: 'partner',
            },
          ],
        }),
      } as Response
    }

    const userInfo = await service.getUserInfo('token')

    console.log = originalLog

    assert.isUndefined(userInfo.email)
  })
})

test.group('TwitchAuthService - Token Refresh (with mocked fetch)', (group) => {
  let originalFetch: typeof globalThis.fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('should refresh access token successfully', async ({ assert }) => {
    const service = new TwitchAuthService()

    globalThis.fetch = async () => {
      return {
        ok: true,
        json: async () => ({
          access_token: 'new_access_token_12345',
          refresh_token: 'new_refresh_token_67890',
          expires_in: 14400,
          token_type: 'bearer',
        }),
      } as Response
    }

    const result = await service.refreshAccessToken('old_refresh_token')

    assert.equal(result.access_token, 'new_access_token_12345')
    assert.equal(result.refresh_token, 'new_refresh_token_67890')
    assert.equal(result.expires_in, 14400)
  })

  test('should throw error when refresh token is invalid', async ({ assert }) => {
    const service = new TwitchAuthService()

    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 400,
        text: async () => 'Invalid refresh token',
      } as Response
    }

    await assert.rejects(
      async () => await service.refreshAccessToken('invalid_refresh_token'),
      'Failed to refresh token: Invalid refresh token'
    )
  })

  test('should throw error when refresh token is revoked', async ({ assert }) => {
    const service = new TwitchAuthService()

    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 401,
        text: async () => 'Token has been revoked',
      } as Response
    }

    await assert.rejects(
      async () => await service.refreshAccessToken('revoked_token'),
      'Failed to refresh token'
    )
  })
})

test.group('TwitchAuthService - Token Validation (with mocked fetch)', (group) => {
  let originalFetch: typeof globalThis.fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('should return true for valid token', async ({ assert }) => {
    const service = new TwitchAuthService()

    globalThis.fetch = async () => {
      return {
        ok: true,
        json: async () => ({
          client_id: 'test_client_id',
          login: 'testuser',
          scopes: ['channel:manage:polls'],
          user_id: '123456',
          expires_in: 3600,
        }),
      } as Response
    }

    const isValid = await service.validateToken('valid_token')

    assert.isTrue(isValid)
  })

  test('should return false for invalid token', async ({ assert }) => {
    const service = new TwitchAuthService()

    globalThis.fetch = async () => {
      return {
        ok: false,
        status: 401,
      } as Response
    }

    const isValid = await service.validateToken('invalid_token')

    assert.isFalse(isValid)
  })

  test('should return false when network error occurs', async ({ assert }) => {
    const service = new TwitchAuthService()

    globalThis.fetch = async () => {
      throw new Error('Network error')
    }

    const isValid = await service.validateToken('token')

    assert.isFalse(isValid)
  })
})

test.group('TwitchAuthService - Token Revocation (with mocked fetch)', (group) => {
  let originalFetch: typeof globalThis.fetch

  group.each.setup(() => {
    originalFetch = globalThis.fetch
  })

  group.each.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('should revoke token successfully', async ({ assert }) => {
    const service = new TwitchAuthService()

    let revokeCallMade = false
    globalThis.fetch = async () => {
      revokeCallMade = true
      return {
        ok: true,
      } as Response
    }

    await service.revokeToken('token_to_revoke')

    assert.isTrue(revokeCallMade)
  })

  test('should throw error when revocation fails', async ({ assert }) => {
    const service = new TwitchAuthService()

    globalThis.fetch = async () => {
      return {
        ok: false,
        text: async () => 'Revocation failed',
      } as Response
    }

    await assert.rejects(
      async () => await service.revokeToken('token'),
      'Failed to revoke token: Revocation failed'
    )
  })
})

test.group('TwitchAuthService - MJ Detection', (group) => {
  let originalEnv: NodeJS.ProcessEnv

  group.each.setup(() => {
    originalEnv = { ...process.env }
  })

  group.each.teardown(() => {
    process.env = originalEnv
  })

  test('should identify MJ by Twitch ID', ({ assert }) => {
    process.env.MJ_TWITCH_IDS = '123456,789012,345678'
    const service = new TwitchAuthService()

    const isMJ1 = service.isMJ('123456')
    const isMJ2 = service.isMJ('789012')
    const isMJ3 = service.isMJ('345678')

    assert.isTrue(isMJ1)
    assert.isTrue(isMJ2)
    assert.isTrue(isMJ3)
  })

  test('should return false for non-MJ Twitch ID', ({ assert }) => {
    process.env.MJ_TWITCH_IDS = '123456,789012'
    const service = new TwitchAuthService()

    const isMJ = service.isMJ('999999')

    assert.isFalse(isMJ)
  })

  test('should handle empty MJ_TWITCH_IDS env var', ({ assert }) => {
    process.env.MJ_TWITCH_IDS = ''
    const service = new TwitchAuthService()

    const isMJ = service.isMJ('123456')

    assert.isFalse(isMJ)
  })

  test('should handle missing MJ_TWITCH_IDS env var', ({ assert }) => {
    delete process.env.MJ_TWITCH_IDS
    const service = new TwitchAuthService()

    const isMJ = service.isMJ('123456')

    assert.isFalse(isMJ)
  })

  test('should filter out empty IDs from comma-separated list', ({ assert }) => {
    process.env.MJ_TWITCH_IDS = '123456,,789012,' // Extra commas
    const service = new TwitchAuthService()

    const isMJ1 = service.isMJ('123456')
    const isMJ2 = service.isMJ('789012')
    const isMJEmpty = service.isMJ('')

    assert.isTrue(isMJ1)
    assert.isTrue(isMJ2)
    assert.isFalse(isMJEmpty)
  })
})
