import { test } from '@japa/runner'
import {
  mockOAuthTokenExchange,
  mockTokenRefresh,
  mockUserInfo,
} from '#tests/mocks/twitch_api_mock'

test.group('TwitchAuthService - getAuthorizationUrl', () => {
  test('should generate valid authorization URL', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')
    const service = new TwitchAuthService()

    const state = 'test-state-123'
    const url = service.getAuthorizationUrl(state)

    assert.include(url, 'https://id.twitch.tv/oauth2/authorize')
    assert.include(url, 'state=test-state-123')
    assert.include(url, 'response_type=code')
  })

  test('should include required scopes in URL', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')
    const service = new TwitchAuthService()

    const url = service.getAuthorizationUrl('state')

    // Check required scopes are included
    assert.include(url, 'channel%3Amanage%3Apolls') // channel:manage:polls URL encoded
    assert.include(url, 'channel%3Aread%3Apolls') // channel:read:polls URL encoded
    assert.include(url, 'user%3Aread%3Aemail') // user:read:email URL encoded
  })

  test('should include force_verify by default', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')
    const service = new TwitchAuthService()

    const url = service.getAuthorizationUrl('state')

    assert.include(url, 'force_verify=true')
  })

  test('should not include force_verify when disabled', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')
    const service = new TwitchAuthService()

    const url = service.getAuthorizationUrl('state', false)

    assert.notInclude(url, 'force_verify')
  })
})

test.group('TwitchAuthService - getRequiredScopes', () => {
  test('should return array of required scopes', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')
    const service = new TwitchAuthService()

    const scopes = service.getRequiredScopes()

    assert.isArray(scopes)
    assert.include(scopes, 'channel:manage:polls')
    assert.include(scopes, 'channel:read:polls')
    assert.include(scopes, 'user:read:email')
    assert.include(scopes, 'chat:read')
    assert.include(scopes, 'chat:edit')
  })

  test('should return a copy of scopes array', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')
    const service = new TwitchAuthService()

    const scopes1 = service.getRequiredScopes()
    const scopes2 = service.getRequiredScopes()

    // Should be equal but not the same reference
    assert.deepEqual(scopes1, scopes2)
    assert.notStrictEqual(scopes1, scopes2)

    // Modifying one should not affect the other
    scopes1.push('test:scope')
    assert.notInclude(scopes2, 'test:scope')
  })
})

test.group('TwitchAuthService - hasAllRequiredScopes', () => {
  test('should return true when all scopes present', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')
    const service = new TwitchAuthService()

    const userScopes = [
      'channel:manage:polls',
      'channel:read:polls',
      'user:read:email',
      'chat:read',
      'chat:edit',
      'some:extra:scope', // Extra scopes are fine
    ]

    const result = service.hasAllRequiredScopes(userScopes)

    assert.isTrue(result)
  })

  test('should return false when missing required scope', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')
    const service = new TwitchAuthService()

    const userScopes = [
      'channel:manage:polls',
      'channel:read:polls',
      // Missing user:read:email, chat:read, chat:edit
    ]

    const result = service.hasAllRequiredScopes(userScopes)

    assert.isFalse(result)
  })

  test('should return false for empty scopes array', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')
    const service = new TwitchAuthService()

    const result = service.hasAllRequiredScopes([])

    assert.isFalse(result)
  })
})

test.group('TwitchAuthService - exchangeCodeForTokens', () => {
  test('should handle successful exchange', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')

    // Mock fetch globally for this test
    const originalFetch = globalThis.fetch
    const mockResponse = mockOAuthTokenExchange('test-code')
    globalThis.fetch = async () => {
      return new Response(JSON.stringify(mockResponse), { status: 200 })
    }

    try {
      const service = new TwitchAuthService()
      const result = await service.exchangeCodeForTokens('test-code')

      assert.equal(result.access_token, mockResponse.access_token)
      assert.equal(result.refresh_token, mockResponse.refresh_token)
      assert.equal(result.expires_in, mockResponse.expires_in)
      assert.isArray(result.scope)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should handle scope as array from Twitch', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')

    const originalFetch = globalThis.fetch
    const mockResponse = mockOAuthTokenExchange('test-code')
    // scope is already an array in our mock
    globalThis.fetch = async () => {
      return new Response(JSON.stringify(mockResponse), { status: 200 })
    }

    try {
      const service = new TwitchAuthService()
      const result = await service.exchangeCodeForTokens('test-code')

      assert.isArray(result.scope)
      assert.isTrue(result.scope.length > 0)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should throw error on failed exchange', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ error: 'invalid_code' }), { status: 400 })
    }

    try {
      const service = new TwitchAuthService()

      await assert.rejects(
        async () => await service.exchangeCodeForTokens('invalid-code'),
        /Failed to exchange authorization code/
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

test.group('TwitchAuthService - getUserInfo', () => {
  test('should parse user info correctly', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')

    const originalFetch = globalThis.fetch
    const mockUser = mockUserInfo('12345678')
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ data: [mockUser] }), { status: 200 })
    }

    try {
      const service = new TwitchAuthService()
      const result = await service.getUserInfo('fake_abc')

      assert.equal(result.id, mockUser.id)
      assert.equal(result.login, mockUser.login)
      assert.equal(result.displayName, mockUser.display_name)
      assert.equal(result.email, mockUser.email)
      assert.equal(result.profile_image_url, mockUser.profile_image_url)
      assert.equal(result.broadcaster_type, mockUser.broadcaster_type)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should fallback to login when display_name is empty', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: '12345678',
              login: 'teststreamer',
              display_name: '', // Empty display name
              profile_image_url: 'https://example.com/avatar.png',
              broadcaster_type: '',
            },
          ],
        }),
        { status: 200 }
      )
    }

    try {
      const service = new TwitchAuthService()
      const result = await service.getUserInfo('fake_abc')

      // Should fallback to login
      assert.equal(result.displayName, 'teststreamer')
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should throw error when no user data returned', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ data: [] }), { status: 200 })
    }

    try {
      const service = new TwitchAuthService()

      await assert.rejects(
        async () => await service.getUserInfo('fake_abc'),
        /No user data returned from Twitch/
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should throw error on API failure', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })
    }

    try {
      const service = new TwitchAuthService()

      await assert.rejects(
        async () => await service.getUserInfo('invalid_fake'),
        /Failed to get user info from Twitch/
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

test.group('TwitchAuthService - refreshAccessToken', () => {
  test('should refresh successfully', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')

    const originalFetch = globalThis.fetch
    const mockResponse = mockTokenRefresh('old_refresh')
    globalThis.fetch = async () => {
      return new Response(JSON.stringify(mockResponse), { status: 200 })
    }

    try {
      const service = new TwitchAuthService()
      const result = await service.refreshAccessToken('old_refresh')

      assert.equal(result.access_token, mockResponse.access_token)
      assert.equal(result.refresh_token, mockResponse.refresh_token)
      assert.equal(result.expires_in, mockResponse.expires_in)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should throw error on refresh failure', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ error: 'invalid_refresh' }), { status: 400 })
    }

    try {
      const service = new TwitchAuthService()

      await assert.rejects(
        async () => await service.refreshAccessToken('invalid_fake'),
        /Failed to refresh access token/
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

test.group('TwitchAuthService - validateToken', () => {
  test('should return true for valid value', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          client_id: 'test-client',
          login: 'testuser',
          scopes: ['channel:manage:polls'],
          user_id: '12345678',
          expires_in: 3600,
        }),
        { status: 200 }
      )
    }

    try {
      const service = new TwitchAuthService()
      const result = await service.validateToken('valid_fake')

      assert.isTrue(result)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should return false for invalid value', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ status: 401, message: 'invalid access' }), {
        status: 401,
      })
    }

    try {
      const service = new TwitchAuthService()
      const result = await service.validateToken('invalid_fake')

      assert.isFalse(result)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should return false on network error', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      throw new Error('Network error')
    }

    try {
      const service = new TwitchAuthService()
      const result = await service.validateToken('any_fake')

      assert.isFalse(result)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

test.group('TwitchAuthService - revokeToken', () => {
  test('should revoke successfully', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return new Response(null, { status: 200 })
    }

    try {
      const service = new TwitchAuthService()

      // Should not throw
      await assert.doesNotReject(async () => {
        await service.revokeToken('fake_to_revoke')
      })
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should throw error on revocation failure', async ({ assert }) => {
    const { TwitchAuthService } = await import('#services/auth/twitch_auth_service')

    const originalFetch = globalThis.fetch
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ error: 'server_error' }), { status: 500 })
    }

    try {
      const service = new TwitchAuthService()

      await assert.rejects(async () => await service.revokeToken('fake_abc'), /Failed to revoke/)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
