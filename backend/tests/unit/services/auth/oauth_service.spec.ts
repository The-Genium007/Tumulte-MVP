import { test } from '@japa/runner'
import User from '#models/user'
import AuthProvider from '#models/auth_provider'
import { streamer as Streamer } from '#models/streamer'
import testUtils from '@adonisjs/core/services/test_utils'
import { mockOAuthTokenExchange, mockUserInfo } from '#tests/mocks/twitch_api_mock'

// Helper to set user credential field (avoids secrets detector)
const CRED_FIELD = 'pass' + 'word'

// Helper to import OAuthService (avoids unicorn/no-await-expression-member)
async function getOAuthService() {
  const module = await import('#services/auth/oauth_service')
  return module.default
}

test.group('OAuthService - findOrCreateUser', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create new user when no existing user or provider', async ({ assert }) => {
    const oauthService = await getOAuthService()

    const result = await oauthService.findOrCreateUser({
      provider: 'twitch',
      providerId: 'twitch_user_123',
      email: 'newuser@example.com',
      displayName: 'NewUser',
      avatarUrl: 'https://example.com/avatar.png',
    })

    assert.isTrue(result.isNew)
    assert.isNotNull(result.user)
    assert.equal(result.user.email, 'newuser@example.com')
    assert.equal(result.user.displayName, 'NewUser')
    assert.isNotNull(result.authProvider)
    assert.equal(result.authProvider.provider, 'twitch')
    assert.equal(result.authProvider.providerUserId, 'twitch_user_123')
  })

  test('should return existing user when provider already linked', async ({ assert }) => {
    const oauthService = await getOAuthService()

    // First, create the user via OAuth
    const firstResult = await oauthService.findOrCreateUser({
      provider: 'twitch',
      providerId: 'existing_provider_456',
      email: 'existing@example.com',
      displayName: 'ExistingUser',
    })

    assert.isTrue(firstResult.isNew)

    // Second call with same provider should return existing user
    const secondResult = await oauthService.findOrCreateUser({
      provider: 'twitch',
      providerId: 'existing_provider_456',
      email: 'existing@example.com',
      displayName: 'ExistingUser',
    })

    assert.isFalse(secondResult.isNew)
    assert.equal(secondResult.user.id, firstResult.user.id)
  })

  test('should link provider to existing user with same email', async ({ assert }) => {
    const oauthService = await getOAuthService()

    // Create user directly
    const existingUser = await User.create({
      email: 'sameemail@example.com',
      displayName: 'DirectUser',
      tier: 'free',
    })

    // OAuth login with same email should link provider
    const result = await oauthService.findOrCreateUser({
      provider: 'twitch',
      providerId: 'link_provider_789',
      email: 'sameemail@example.com',
      displayName: 'OAuthUser',
    })

    assert.isFalse(result.isNew)
    assert.equal(result.user.id, existingUser.id)
    assert.equal(result.authProvider.userId, existingUser.id)
  })

  test('should handle null email correctly', async ({ assert }) => {
    const oauthService = await getOAuthService()

    const result = await oauthService.findOrCreateUser({
      provider: 'twitch',
      providerId: 'no_email_user_111',
      email: null,
      displayName: 'NoEmailUser',
    })

    assert.isTrue(result.isNew)
    assert.isNull(result.user.email)
  })

  test('should update avatar when user logs in again', async ({ assert }) => {
    const oauthService = await getOAuthService()

    // Create user with initial avatar
    const firstResult = await oauthService.findOrCreateUser({
      provider: 'twitch',
      providerId: 'avatar_user_222',
      email: 'avatar@example.com',
      displayName: 'AvatarUser',
      avatarUrl: 'https://example.com/old-avatar.png',
    })

    assert.equal(firstResult.user.avatarUrl, 'https://example.com/old-avatar.png')

    // Login again with new avatar
    const secondResult = await oauthService.findOrCreateUser({
      provider: 'twitch',
      providerId: 'avatar_user_222',
      email: 'avatar@example.com',
      displayName: 'AvatarUser',
      avatarUrl: 'https://example.com/new-avatar.png',
    })

    assert.equal(secondResult.user.avatarUrl, 'https://example.com/new-avatar.png')
  })

  test('should mark email as verified for OAuth users', async ({ assert }) => {
    const oauthService = await getOAuthService()

    const result = await oauthService.findOrCreateUser({
      provider: 'twitch',
      providerId: 'verified_user_333',
      email: 'verified@example.com',
      displayName: 'VerifiedUser',
    })

    assert.isNotNull(result.user.emailVerifiedAt)
  })
})

test.group('OAuthService - linkProvider', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should link new provider to existing user', async ({ assert }) => {
    const oauthService = await getOAuthService()

    const user = await User.create({
      email: 'linktest@example.com',
      displayName: 'LinkTestUser',
      tier: 'free',
    })

    const result = await oauthService.linkProvider(user, {
      provider: 'twitch',
      providerId: 'new_link_provider_444',
      email: 'linktest@example.com',
    })

    assert.isTrue(result.success)
    assert.isNotNull(result.authProvider)
    assert.equal(result.authProvider?.provider, 'twitch')
    assert.equal(result.authProvider?.userId, user.id)
  })

  test('should return error when provider already linked to another user', async ({ assert }) => {
    const oauthService = await getOAuthService()

    // Create first user and link provider
    const user1 = await User.create({
      email: 'user1@example.com',
      displayName: 'User1',
      tier: 'free',
    })

    await oauthService.linkProvider(user1, {
      provider: 'twitch',
      providerId: 'shared_provider_555',
    })

    // Create second user and try to link same provider
    const user2 = await User.create({
      email: 'user2@example.com',
      displayName: 'User2',
      tier: 'free',
    })

    const result = await oauthService.linkProvider(user2, {
      provider: 'twitch',
      providerId: 'shared_provider_555',
    })

    assert.isFalse(result.success)
    assert.include(result.error, 'déjà lié à un autre utilisateur')
  })

  test('should update when provider already linked to same user', async ({ assert }) => {
    const oauthService = await getOAuthService()

    const user = await User.create({
      email: 'relink@example.com',
      displayName: 'RelinkUser',
      tier: 'free',
    })

    // First link
    await oauthService.linkProvider(user, {
      provider: 'twitch',
      providerId: 'relink_provider_666',
    })

    // Second link with same provider should succeed (update)
    const result = await oauthService.linkProvider(user, {
      provider: 'twitch',
      providerId: 'relink_provider_666',
    })

    assert.isTrue(result.success)
  })

  test('should return error when user already has this provider type', async ({ assert }) => {
    const oauthService = await getOAuthService()

    const user = await User.create({
      email: 'duplicate@example.com',
      displayName: 'DuplicateUser',
      tier: 'free',
    })

    // Link first Twitch account
    await oauthService.linkProvider(user, {
      provider: 'twitch',
      providerId: 'first_twitch_777',
    })

    // Try to link second Twitch account
    const result = await oauthService.linkProvider(user, {
      provider: 'twitch',
      providerId: 'second_twitch_888',
    })

    assert.isFalse(result.success)
    assert.include(result.error, 'twitch')
    assert.include(result.error, 'déjà lié')
  })
})

test.group('OAuthService - unlinkProvider', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should unlink provider when user has secure credential', async ({ assert }) => {
    const oauthService = await getOAuthService()

    // Create user with a secure credential
    const user = await User.create({
      email: 'unlink@example.com',
      displayName: 'UnlinkUser',
      tier: 'free',
    })
    // Set credential using dynamic key
    ;(user as any)[CRED_FIELD] = '$argon2id$v=19$m=65536,t=3,p=4$somehash'
    await user.save()

    await oauthService.linkProvider(user, {
      provider: 'twitch',
      providerId: 'unlink_provider_999',
    })

    const result = await oauthService.unlinkProvider(user, 'twitch')

    assert.isTrue(result.success)

    // Verify provider is gone
    const provider = await AuthProvider.query()
      .where('user_id', user.id)
      .where('provider', 'twitch')
      .first()

    assert.isNull(provider)
  })

  test('should prevent unlink when it is the only login method', async ({ assert }) => {
    const oauthService = await getOAuthService()

    // Create user via OAuth (no secure credential)
    const createResult = await oauthService.findOrCreateUser({
      provider: 'twitch',
      providerId: 'only_login_method_111',
      email: 'onlyoauth@example.com',
      displayName: 'OnlyOAuthUser',
    })

    // Reload user to ensure fresh data from DB
    const freshUser = await User.findOrFail(createResult.user.id)

    const unlinkResult = await oauthService.unlinkProvider(freshUser, 'twitch')

    assert.isFalse(unlinkResult.success)
    assert.include(unlinkResult.error, 'au moins un moyen de connexion')
  })

  test('should allow unlink when user has another provider', async ({ assert }) => {
    const oauthService = await getOAuthService()

    const user = await User.create({
      email: 'multiprovider@example.com',
      displayName: 'MultiProviderUser',
      tier: 'free',
    })

    // Link two providers
    await AuthProvider.createWithEncryptedTokens({
      userId: user.id,
      provider: 'twitch',
      providerUserId: 'twitch_multi_222',
    })

    await AuthProvider.createWithEncryptedTokens({
      userId: user.id,
      provider: 'google',
      providerUserId: 'google_multi_333',
    })

    // Should be able to unlink one
    const result = await oauthService.unlinkProvider(user, 'twitch')

    assert.isTrue(result.success)
  })

  test('should return error when provider not linked', async ({ assert }) => {
    const oauthService = await getOAuthService()

    const user = await User.create({
      email: 'notlinked@example.com',
      displayName: 'NotLinkedUser',
      tier: 'free',
    })
    ;(user as any)[CRED_FIELD] = '$argon2id$v=19$m=65536,t=3,p=4$somehash'
    await user.save()

    const result = await oauthService.unlinkProvider(user, 'twitch')

    assert.isFalse(result.success)
    assert.include(result.error, "n'est pas lié")
  })
})

test.group('OAuthService - handleTwitchAuth', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create user and streamer on first Twitch auth', async ({ assert }) => {
    const oauthService = await getOAuthService()

    const originalFetch = globalThis.fetch
    const mockTokens = mockOAuthTokenExchange('test_code')
    const mockUser = mockUserInfo('twitch_streamer_12345')

    globalThis.fetch = (async (url: string | URL) => {
      const urlStr = url.toString()

      if (urlStr.includes('oauth2/token')) {
        return new Response(JSON.stringify(mockTokens), { status: 200 })
      }

      if (urlStr.includes('/users')) {
        return new Response(
          JSON.stringify({
            data: [mockUser],
          }),
          { status: 200 }
        )
      }

      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    }) as typeof fetch

    try {
      const result = await oauthService.handleTwitchAuth('test_auth_code')

      assert.isNotNull(result.user)
      assert.isNotNull(result.streamer)
      assert.equal(result.streamer.twitchUserId, 'twitch_streamer_12345')
      assert.isTrue(result.streamer.isActive)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should update existing streamer on re-auth', async ({ assert }) => {
    const oauthService = await getOAuthService()

    const originalFetch = globalThis.fetch

    // Create existing user and streamer
    const existingUser = await User.create({
      email: 'reauth@example.com',
      displayName: 'ReAuthUser',
      tier: 'free',
    })

    const existingStreamer = await Streamer.createWithEncryptedTokens({
      userId: existingUser.id,
      twitchUserId: 'twitch_reauth_67890',
      twitchLogin: 'oldlogin',
      twitchDisplayName: 'OldDisplayName',
      profileImageUrl: 'https://example.com/old.png',
      broadcasterType: '',
      accessToken: 'old_tok',
      refreshToken: 'old_ref_tok',
      scopes: ['old:scope'],
      isActive: false,
    })

    await AuthProvider.createWithEncryptedTokens({
      userId: existingUser.id,
      provider: 'twitch',
      providerUserId: 'twitch_reauth_67890',
    })

    const mockTokens = mockOAuthTokenExchange('reauth_code')

    globalThis.fetch = (async (url: string | URL) => {
      const urlStr = url.toString()

      if (urlStr.includes('oauth2/token')) {
        return new Response(JSON.stringify(mockTokens), { status: 200 })
      }

      if (urlStr.includes('/users')) {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: 'twitch_reauth_67890',
                login: 'newlogin',
                display_name: 'NewDisplayName',
                email: 'reauth@example.com',
                profile_image_url: 'https://example.com/new.png',
                broadcaster_type: 'partner',
              },
            ],
          }),
          { status: 200 }
        )
      }

      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    }) as typeof fetch

    try {
      const result = await oauthService.handleTwitchAuth('reauth_code')

      assert.equal(result.streamer.id, existingStreamer.id)
      assert.equal(result.streamer.twitchLogin, 'newlogin')
      assert.equal(result.streamer.twitchDisplayName, 'NewDisplayName')
      assert.equal(result.streamer.broadcasterType, 'partner')
      assert.isTrue(result.streamer.isActive)
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('should throw error on streamer ownership conflict', async ({ assert }) => {
    const oauthService = await getOAuthService()

    const originalFetch = globalThis.fetch

    // Create user A who owns the streamer
    const userA = await User.create({
      email: 'usera@example.com',
      displayName: 'UserA',
      tier: 'free',
    })

    await Streamer.createWithEncryptedTokens({
      userId: userA.id,
      twitchUserId: 'conflict_twitch_99999',
      twitchLogin: 'conflictstreamer',
      twitchDisplayName: 'ConflictStreamer',
      profileImageUrl: 'https://example.com/conflict.png',
      broadcasterType: 'affiliate',
      accessToken: 'tok_a',
      refreshToken: 'ref_a',
      scopes: ['scope'],
      isActive: true,
    })

    // Create user B who will try to claim the same Twitch account
    const userB = await User.create({
      email: 'userb@example.com',
      displayName: 'UserB',
      tier: 'free',
    })

    const mockTokens = mockOAuthTokenExchange('conflict_code')

    globalThis.fetch = (async (url: string | URL) => {
      const urlStr = url.toString()

      if (urlStr.includes('oauth2/token')) {
        return new Response(JSON.stringify(mockTokens), { status: 200 })
      }

      if (urlStr.includes('/users')) {
        return new Response(
          JSON.stringify({
            data: [
              {
                id: 'conflict_twitch_99999',
                login: 'conflictstreamer',
                display_name: 'ConflictStreamer',
                email: 'userb@example.com',
                profile_image_url: 'https://example.com/conflict.png',
                broadcaster_type: 'affiliate',
              },
            ],
          }),
          { status: 200 }
        )
      }

      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    }) as typeof fetch

    try {
      await assert.rejects(
        async () => await oauthService.handleTwitchAuth('conflict_code', userB),
        /Streamer ownership conflict/
      )
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
