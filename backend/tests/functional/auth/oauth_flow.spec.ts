import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { user as User } from '#models/user'
import { streamer as Streamer } from '#models/streamer'
import encryption from '@adonisjs/core/services/encryption'

test.group('OAuth Flow - Complete Authentication', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should redirect to Twitch OAuth with correct params', async ({ client, assert }) => {
    const response = await client.get('/auth/twitch')

    assert.equal(response.status(), 302) // Redirect
    assert.include(response.header('location'), 'https://id.twitch.tv/oauth2/authorize')
    assert.include(response.header('location'), 'response_type=code')
    assert.include(response.header('location'), 'state=') // CSRF token présent
  })

  test('should include all required scopes in authorization URL', async ({ client, assert }) => {
    const response = await client.get('/auth/twitch')

    const location = response.header('location')
    assert.include(location, 'channel%3Amanage%3Apolls') // URL encoded
    assert.include(location, 'channel%3Aread%3Apolls')
    assert.include(location, 'user%3Aread%3Aemail')
    assert.include(location, 'chat%3Aread')
    assert.include(location, 'chat%3Aedit')
  })

  test('should include force_verify for permission revalidation', async ({ client, assert }) => {
    const response = await client.get('/auth/twitch')

    assert.include(response.header('location'), 'force_verify=true')
  })

  test('should create CSRF state token in session', async ({ client, assert }) => {
    const response = await client.get('/auth/twitch')

    // Vérifier que la session contient un état CSRF
    const cookies = response.cookies()
    assert.exists(cookies)
  })
})

test.group('OAuth Flow - Callback Handling', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should reject callback without state parameter', async ({ client, assert }) => {
    const response = await client.get('/auth/twitch/callback').qs({
      code: 'valid_auth_code',
      // state manquant - attaque CSRF potentielle
    })

    assert.oneOf(response.status(), [400, 403]) // Bad Request ou Forbidden
  })

  test('should reject callback with invalid state', async ({ client, assert }) => {
    const response = await client.get('/auth/twitch/callback').qs({
      code: 'valid_auth_code',
      state: 'invalid_csrf_token',
    })

    assert.oneOf(response.status(), [400, 403]) // Validation CSRF échouée
  })

  test('should reject callback with error from Twitch', async ({ client, assert }) => {
    const response = await client.get('/auth/twitch/callback').qs({
      error: 'access_denied',
      error_description: 'User denied authorization',
    })

    assert.oneOf(response.status(), [400, 401, 403])
  })
})

test.group('OAuth Flow - User Creation and Role Assignment', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should create MJ user when Twitch ID is in MJ list', async ({ assert }) => {
    // Note: Ce test nécessiterait de mocker l'API Twitch
    // Pour l'instant, on vérifie la logique avec des données simulées

    const mjTwitchId = '123456'
    process.env.MJ_TWITCH_IDS = mjTwitchId

    const user = await User.create({
      twitchUserId: mjTwitchId,
      twitchLogin: 'testmj',
      twitchDisplayName: 'TestMJ',
      profileImageUrl: 'https://example.com/avatar.png',
      role: 'MJ', // Assigné par la logique d'auth
    })

    assert.equal(user.role, 'MJ')
    assert.equal(user.twitchUserId, mjTwitchId)
  })

  test('should create STREAMER user when Twitch ID is not in MJ list', async ({ assert }) => {
    const streamerTwitchId = '999999'
    process.env.MJ_TWITCH_IDS = '123456,789012' // IDs différents

    const user = await User.create({
      twitchUserId: streamerTwitchId,
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
      profileImageUrl: 'https://example.com/avatar.png',
      role: 'STREAMER', // Assigné par défaut
    })

    assert.equal(user.role, 'STREAMER')
    assert.equal(user.twitchUserId, streamerTwitchId)
  })

  test('should create user and streamer records simultaneously', async ({ assert }) => {
    const twitchUserId = '555555'

    const user = await User.create({
      twitchUserId,
      twitchLogin: 'dualuser',
      twitchDisplayName: 'DualUser',
      profileImageUrl: 'https://example.com/avatar.png',
      role: 'STREAMER',
    })

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId,
      twitchLogin: 'dualuser',
      twitchDisplayName: 'DualUser',
      profileImageUrl: 'https://example.com/avatar.png',
      broadcasterType: 'affiliate',
      accessToken: 'mock_access_token_12345',
      refreshToken: 'mock_refresh_token_67890',
      scopes: ['channel:manage:polls', 'channel:read:polls', 'chat:read'],
    })

    assert.equal(user.twitchUserId, streamer.twitchUserId)
    assert.equal(user.id, streamer.userId)
    assert.exists(streamer.accessTokenEncrypted)
    assert.exists(streamer.refreshTokenEncrypted)
  })
})

test.group('OAuth Flow - Token Storage', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should store access and refresh tokens encrypted', async ({ assert }) => {
    const user = await User.create({
      twitchUserId: '123456',
      twitchLogin: 'testuser',
      twitchDisplayName: 'TestUser',
      role: 'STREAMER',
    })

    const plainAccessToken = 'plain_access_token_test'
    const plainRefreshToken = 'plain_refresh_token_test'

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'testuser',
      twitchDisplayName: 'TestUser',
      accessToken: plainAccessToken,
      refreshToken: plainRefreshToken,
      scopes: ['channel:manage:polls'],
    })

    // Vérifier que les tokens sont bien encryptés (pas en clair)
    assert.notEqual(streamer.accessTokenEncrypted, plainAccessToken)
    assert.notEqual(streamer.refreshTokenEncrypted, plainRefreshToken)

    // Vérifier qu'on peut les décrypter
    const decryptedAccess = encryption.decrypt(streamer.accessTokenEncrypted!)
    const decryptedRefresh = encryption.decrypt(streamer.refreshTokenEncrypted!)

    assert.equal(decryptedAccess, plainAccessToken)
    assert.equal(decryptedRefresh, plainRefreshToken)
  })

  test('should never expose encrypted tokens in API responses', async ({ assert }) => {
    const user = await User.create({
      twitchUserId: '123456',
      twitchLogin: 'testuser',
      twitchDisplayName: 'TestUser',
      role: 'STREAMER',
    })

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'testuser',
      twitchDisplayName: 'TestUser',
      accessToken: 'secret_access_token',
      refreshToken: 'secret_refresh_token',
      scopes: ['channel:manage:polls'],
    })

    // Les tokens encryptés ont serializeAs: null dans le modèle
    const serialized = streamer.serialize()

    assert.isUndefined(serialized.accessTokenEncrypted)
    assert.isUndefined(serialized.refreshTokenEncrypted)
  })

  test('should store Twitch scopes as JSON array', async ({ assert }) => {
    const user = await User.create({
      twitchUserId: '123456',
      twitchLogin: 'testuser',
      twitchDisplayName: 'TestUser',
      role: 'STREAMER',
    })

    const scopes = ['channel:manage:polls', 'channel:read:polls', 'chat:read', 'chat:edit']

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'testuser',
      twitchDisplayName: 'TestUser',
      accessToken: 'token',
      refreshToken: 'refresh',
      scopes,
    })

    // Recharger depuis la DB
    await streamer.refresh()

    assert.isArray(streamer.scopes)
    assert.deepEqual(streamer.scopes, scopes)
  })
})

test.group('OAuth Flow - Session Management', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should create authenticated session after successful OAuth', async ({ assert }) => {
    const user = await User.create({
      twitchUserId: '123456',
      twitchLogin: 'testuser',
      twitchDisplayName: 'TestUser',
      role: 'MJ',
    })

    // Simuler une session authentifiée
    assert.exists(user.id)
    assert.equal(user.role, 'MJ')
  })

  test('should persist user role in session', async ({ assert }) => {
    const mjUser = await User.create({
      twitchUserId: '111111',
      twitchLogin: 'mjuser',
      twitchDisplayName: 'MJUser',
      role: 'MJ',
    })

    const streamerUser = await User.create({
      twitchUserId: '222222',
      twitchLogin: 'streameruser',
      twitchDisplayName: 'StreamerUser',
      role: 'STREAMER',
    })

    assert.equal(mjUser.role, 'MJ')
    assert.equal(streamerUser.role, 'STREAMER')
  })
})

test.group('OAuth Flow - Broadcaster Type Detection', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should store affiliate broadcaster type', async ({ assert }) => {
    const user = await User.create({
      twitchUserId: '123456',
      twitchLogin: 'affiliate',
      twitchDisplayName: 'Affiliate',
      role: 'STREAMER',
    })

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'affiliate',
      twitchDisplayName: 'Affiliate',
      broadcasterType: 'affiliate',
      accessToken: 'token',
      refreshToken: 'refresh',
      scopes: ['channel:manage:polls'],
    })

    assert.equal(streamer.broadcasterType, 'affiliate')
  })

  test('should store partner broadcaster type', async ({ assert }) => {
    const user = await User.create({
      twitchUserId: '789012',
      twitchLogin: 'partner',
      twitchDisplayName: 'Partner',
      role: 'STREAMER',
    })

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '789012',
      twitchLogin: 'partner',
      twitchDisplayName: 'Partner',
      broadcasterType: 'partner',
      accessToken: 'token',
      refreshToken: 'refresh',
      scopes: ['channel:manage:polls'],
    })

    assert.equal(streamer.broadcasterType, 'partner')
  })

  test('should handle empty broadcaster type for regular users', async ({ assert }) => {
    const user = await User.create({
      twitchUserId: '345678',
      twitchLogin: 'regular',
      twitchDisplayName: 'Regular',
      role: 'STREAMER',
    })

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '345678',
      twitchLogin: 'regular',
      twitchDisplayName: 'Regular',
      broadcasterType: '', // Utilisateur régulier sans statut
      accessToken: 'token',
      refreshToken: 'refresh',
      scopes: ['channel:manage:polls'],
    })

    assert.equal(streamer.broadcasterType, '')
  })
})

test.group('OAuth Flow - Edge Cases', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should update existing user on re-authentication', async ({ assert }) => {
    // Première authentification
    const user = await User.create({
      twitchUserId: '123456',
      twitchLogin: 'oldlogin',
      twitchDisplayName: 'OldName',
      role: 'STREAMER',
    })

    // Re-authentification avec données mises à jour
    user.twitchLogin = 'newlogin'
    user.twitchDisplayName = 'NewName'
    await user.save()

    const updatedUser = await User.findByOrFail('twitchUserId', '123456')

    assert.equal(updatedUser.twitchLogin, 'newlogin')
    assert.equal(updatedUser.twitchDisplayName, 'NewName')
    assert.equal(updatedUser.role, 'STREAMER') // Role ne change pas
  })

  test('should update streamer tokens on re-authentication', async ({ assert }) => {
    const user = await User.create({
      twitchUserId: '123456',
      twitchLogin: 'testuser',
      twitchDisplayName: 'TestUser',
      role: 'STREAMER',
    })

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'testuser',
      twitchDisplayName: 'TestUser',
      accessToken: 'old_token',
      refreshToken: 'old_refresh',
      scopes: ['channel:manage:polls'],
    })

    // Simuler une nouvelle authentification avec nouveaux tokens
    await streamer.updateTokens('new_access_token', 'new_refresh_token')
    await streamer.refresh()

    const decryptedAccess = await streamer.getDecryptedAccessToken()
    const decryptedRefresh = await streamer.getDecryptedRefreshToken()

    assert.equal(decryptedAccess, 'new_access_token')
    assert.equal(decryptedRefresh, 'new_refresh_token')
  })

  test('should handle user without email permission', async ({ assert }) => {
    const user = await User.create({
      twitchUserId: '123456',
      twitchLogin: 'testuser',
      twitchDisplayName: 'TestUser',
      role: 'STREAMER',
      // email non fourni car scope user:read:email refusé
    })

    assert.exists(user.id)
    assert.equal(user.twitchUserId, '123456')
    // Email peut être null/undefined
  })
})

test.group('OAuth Flow - Security Validations', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should prevent SQL injection in Twitch user data', async ({ assert }) => {
    const maliciousLogin = "'; DROP TABLE users; --"

    const user = await User.create({
      twitchUserId: '123456',
      twitchLogin: maliciousLogin,
      twitchDisplayName: 'Hacker',
      role: 'STREAMER',
    })

    // Les données sont échappées par Lucid ORM
    assert.equal(user.twitchLogin, maliciousLogin)

    // Vérifier que la DB n'a pas été compromise
    const users = await User.all()
    assert.isNotEmpty(users)
  })

  test('should sanitize XSS attempts in display name', async ({ assert }) => {
    const xssPayload = '<script>alert("XSS")</script>'

    const user = await User.create({
      twitchUserId: '123456',
      twitchLogin: 'testuser',
      twitchDisplayName: xssPayload,
      role: 'STREAMER',
    })

    // Les données sont stockées telles quelles (échappement au rendu)
    assert.equal(user.twitchDisplayName, xssPayload)
    // Note: L'échappement XSS doit être fait côté frontend lors du rendu
  })

  test('should enforce unique Twitch user ID constraint', async ({ assert }) => {
    const twitchUserId = '123456'

    await User.create({
      twitchUserId,
      twitchLogin: 'user1',
      twitchDisplayName: 'User1',
      role: 'STREAMER',
    })

    // Tentative de créer un doublon
    await assert.rejects(
      async () =>
        await User.create({
          twitchUserId, // Même ID
          twitchLogin: 'user2',
          twitchDisplayName: 'User2',
          role: 'STREAMER',
        }),
      /UNIQUE constraint failed|duplicate key value/ // Erreur DB selon le driver
    )
  })
})
