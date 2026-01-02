import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import { streamer as Streamer } from '#models/streamer'
import { createTestUser } from '#tests/helpers/test_utils'
import encryption from '@adonisjs/core/services/encryption'

test.group('Streamer Model - Token Encryption', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should encrypt access token when creating streamer with encrypted tokens', async ({
    assert,
  }) => {
    const user = await createTestUser()
    const plainAccessToken = 'my_plain_access_token_12345'
    const plainRefreshToken = 'my_plain_refresh_token_67890'

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
      profileImageUrl: 'https://example.com/avatar.png',
      broadcasterType: 'affiliate',
      accessToken: plainAccessToken,
      refreshToken: plainRefreshToken,
      scopes: ['channel:manage:polls', 'chat:read'],
      isActive: true,
    })

    // Tokens should be encrypted (not equal to plain text)
    assert.notEqual(streamer.accessTokenEncrypted, plainAccessToken)
    assert.notEqual(streamer.refreshTokenEncrypted, plainRefreshToken)

    // Encrypted tokens should exist
    assert.exists(streamer.accessTokenEncrypted)
    assert.exists(streamer.refreshTokenEncrypted)

    // Should be able to decrypt back to original
    const decryptedAccess = await streamer.getDecryptedAccessToken()
    const decryptedRefresh = await streamer.getDecryptedRefreshToken()

    assert.equal(decryptedAccess, plainAccessToken)
    assert.equal(decryptedRefresh, plainRefreshToken)
  })

  test('should decrypt access token correctly', async ({ assert }) => {
    const user = await createTestUser()
    const plainToken = 'access_token_test_123'

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
      accessToken: plainToken,
      refreshToken: 'refresh_token_test_456',
      scopes: ['channel:manage:polls'],
    })

    const decrypted = await streamer.getDecryptedAccessToken()

    assert.equal(decrypted, plainToken)
    assert.isString(decrypted)
  })

  test('should decrypt refresh token correctly', async ({ assert }) => {
    const user = await createTestUser()
    const plainRefreshToken = 'refresh_token_test_789'

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
      accessToken: 'access_token_test',
      refreshToken: plainRefreshToken,
      scopes: ['channel:manage:polls'],
    })

    const decrypted = await streamer.getDecryptedRefreshToken()

    assert.equal(decrypted, plainRefreshToken)
    assert.isString(decrypted)
  })

  test('should return empty string when access token is null', async ({ assert }) => {
    const user = await createTestUser()

    const streamer = await Streamer.create({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
      broadcasterType: 'affiliate',
      scopes: [],
      accessTokenEncrypted: null,
      refreshTokenEncrypted: null,
    })

    const decryptedAccess = await streamer.getDecryptedAccessToken()
    const decryptedRefresh = await streamer.getDecryptedRefreshToken()

    assert.equal(decryptedAccess, '')
    assert.equal(decryptedRefresh, '')
  })

  test('should update tokens with new encrypted values', async ({ assert }) => {
    const user = await createTestUser()
    const initialAccessToken = 'initial_access_token'
    const initialRefreshToken = 'initial_refresh_token'

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
      accessToken: initialAccessToken,
      refreshToken: initialRefreshToken,
      scopes: ['channel:manage:polls'],
    })

    // Update tokens
    const newAccessToken = 'new_access_token_updated'
    const newRefreshToken = 'new_refresh_token_updated'
    await streamer.updateTokens(newAccessToken, newRefreshToken)

    // Reload from database
    await streamer.refresh()

    // Verify new tokens are decrypted correctly
    const decryptedAccess = await streamer.getDecryptedAccessToken()
    const decryptedRefresh = await streamer.getDecryptedRefreshToken()

    assert.equal(decryptedAccess, newAccessToken)
    assert.equal(decryptedRefresh, newRefreshToken)

    // Verify old tokens are not accessible
    assert.notEqual(decryptedAccess, initialAccessToken)
    assert.notEqual(decryptedRefresh, initialRefreshToken)
  })

  test('should persist encrypted tokens to database', async ({ assert }) => {
    const user = await createTestUser()
    const plainAccessToken = 'persistent_access_token'
    const plainRefreshToken = 'persistent_refresh_token'

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
      accessToken: plainAccessToken,
      refreshToken: plainRefreshToken,
      scopes: ['channel:manage:polls'],
    })

    // Fetch from database fresh instance
    const fetchedStreamer = await Streamer.findOrFail(streamer.id)

    // Verify tokens are encrypted in DB
    assert.exists(fetchedStreamer.accessTokenEncrypted)
    assert.exists(fetchedStreamer.refreshTokenEncrypted)
    assert.notEqual(fetchedStreamer.accessTokenEncrypted, plainAccessToken)
    assert.notEqual(fetchedStreamer.refreshTokenEncrypted, plainRefreshToken)

    // Verify decryption works on fresh instance
    const decryptedAccess = await fetchedStreamer.getDecryptedAccessToken()
    const decryptedRefresh = await fetchedStreamer.getDecryptedRefreshToken()

    assert.equal(decryptedAccess, plainAccessToken)
    assert.equal(decryptedRefresh, plainRefreshToken)
  })

  test('should handle encryption of special characters in tokens', async ({ assert }) => {
    const user = await createTestUser()
    const specialToken = 'token_with_special_!@#$%^&*()_+-=[]{}|;:,.<>?~`'
    const specialRefresh = 'refresh_with_unicode_émojis_🔐_中文'

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
      accessToken: specialToken,
      refreshToken: specialRefresh,
      scopes: ['channel:manage:polls'],
    })

    const decryptedAccess = await streamer.getDecryptedAccessToken()
    const decryptedRefresh = await streamer.getDecryptedRefreshToken()

    assert.equal(decryptedAccess, specialToken)
    assert.equal(decryptedRefresh, specialRefresh)
  })

  test('should handle very long tokens correctly', async ({ assert }) => {
    const user = await createTestUser()
    // Simulate a very long JWT token
    const longToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.'.repeat(50)
    const longRefresh = 'refresh_'.repeat(100)

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
      accessToken: longToken,
      refreshToken: longRefresh,
      scopes: ['channel:manage:polls'],
    })

    const decryptedAccess = await streamer.getDecryptedAccessToken()
    const decryptedRefresh = await streamer.getDecryptedRefreshToken()

    assert.equal(decryptedAccess, longToken)
    assert.equal(decryptedRefresh, longRefresh)
    assert.equal(decryptedAccess.length, longToken.length)
    assert.equal(decryptedRefresh.length, longRefresh.length)
  })

  test('should handle empty string tokens', async ({ assert }) => {
    const user = await createTestUser()

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
      accessToken: '',
      refreshToken: '',
      scopes: ['channel:manage:polls'],
    })

    const decryptedAccess = await streamer.getDecryptedAccessToken()
    const decryptedRefresh = await streamer.getDecryptedRefreshToken()

    assert.equal(decryptedAccess, '')
    assert.equal(decryptedRefresh, '')
  })

  test('should maintain encryption after multiple updates', async ({ assert }) => {
    const user = await createTestUser()

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
      accessToken: 'token_v1',
      refreshToken: 'refresh_v1',
      scopes: ['channel:manage:polls'],
    })

    // Multiple updates
    await streamer.updateTokens('token_v2', 'refresh_v2')
    await streamer.updateTokens('token_v3', 'refresh_v3')
    await streamer.updateTokens('token_v4', 'refresh_v4')

    await streamer.refresh()

    const decryptedAccess = await streamer.getDecryptedAccessToken()
    const decryptedRefresh = await streamer.getDecryptedRefreshToken()

    assert.equal(decryptedAccess, 'token_v4')
    assert.equal(decryptedRefresh, 'refresh_v4')
  })
})

test.group('Streamer Model - Scopes Management', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should store scopes as JSON array', async ({ assert }) => {
    const user = await createTestUser()
    const scopes = ['channel:manage:polls', 'channel:read:polls', 'chat:read', 'chat:edit']

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
      accessToken: 'token',
      refreshToken: 'refresh',
      scopes,
    })

    assert.isArray(streamer.scopes)
    assert.lengthOf(streamer.scopes, 4)
    assert.deepEqual(streamer.scopes, scopes)
  })

  test('should retrieve scopes as array from database', async ({ assert }) => {
    const user = await createTestUser()
    const scopes = ['channel:manage:polls', 'chat:read']

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
      accessToken: 'token',
      refreshToken: 'refresh',
      scopes,
    })

    // Fetch from database
    const fetchedStreamer = await Streamer.findOrFail(streamer.id)

    assert.isArray(fetchedStreamer.scopes)
    assert.deepEqual(fetchedStreamer.scopes, scopes)
  })

  test('should handle empty scopes array', async ({ assert }) => {
    const user = await createTestUser()

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
      accessToken: 'token',
      refreshToken: 'refresh',
      scopes: [],
    })

    assert.isArray(streamer.scopes)
    assert.lengthOf(streamer.scopes, 0)
  })
})

test.group('Streamer Model - Batch Operations', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should decrypt tokens for multiple streamers efficiently', async ({ assert }) => {
    const user = await createTestUser()

    // Create 5 streamers with different tokens
    const streamers = await Promise.all([
      Streamer.createWithEncryptedTokens({
        userId: user.id,
        twitchUserId: '111',
        twitchLogin: 'streamer1',
        twitchDisplayName: 'Streamer1',
        accessToken: 'token_1',
        refreshToken: 'refresh_1',
        scopes: ['channel:manage:polls'],
      }),
      Streamer.createWithEncryptedTokens({
        userId: user.id,
        twitchUserId: '222',
        twitchLogin: 'streamer2',
        twitchDisplayName: 'Streamer2',
        accessToken: 'token_2',
        refreshToken: 'refresh_2',
        scopes: ['channel:manage:polls'],
      }),
      Streamer.createWithEncryptedTokens({
        userId: user.id,
        twitchUserId: '333',
        twitchLogin: 'streamer3',
        twitchDisplayName: 'Streamer3',
        accessToken: 'token_3',
        refreshToken: 'refresh_3',
        scopes: ['channel:manage:polls'],
      }),
      Streamer.createWithEncryptedTokens({
        userId: user.id,
        twitchUserId: '444',
        twitchLogin: 'streamer4',
        twitchDisplayName: 'Streamer4',
        accessToken: 'token_4',
        refreshToken: 'refresh_4',
        scopes: ['channel:manage:polls'],
      }),
      Streamer.createWithEncryptedTokens({
        userId: user.id,
        twitchUserId: '555',
        twitchLogin: 'streamer5',
        twitchDisplayName: 'Streamer5',
        accessToken: 'token_5',
        refreshToken: 'refresh_5',
        scopes: ['channel:manage:polls'],
      }),
    ])

    // Batch decrypt all access tokens
    const decryptedTokens = await Promise.all(streamers.map((s) => s.getDecryptedAccessToken()))

    assert.lengthOf(decryptedTokens, 5)
    assert.deepEqual(decryptedTokens, ['token_1', 'token_2', 'token_3', 'token_4', 'token_5'])
  })

  test('should handle batch decryption with some null tokens', async ({ assert }) => {
    const user = await createTestUser()

    const streamer1 = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '111',
      twitchLogin: 'streamer1',
      twitchDisplayName: 'Streamer1',
      accessToken: 'token_1',
      refreshToken: 'refresh_1',
      scopes: ['channel:manage:polls'],
    })

    const streamer2 = await Streamer.create({
      userId: user.id,
      twitchUserId: '222',
      twitchLogin: 'streamer2',
      twitchDisplayName: 'Streamer2',
      broadcasterType: 'affiliate',
      scopes: [],
      accessTokenEncrypted: null,
      refreshTokenEncrypted: null,
    })

    const streamer3 = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '333',
      twitchLogin: 'streamer3',
      twitchDisplayName: 'Streamer3',
      accessToken: 'token_3',
      refreshToken: 'refresh_3',
      scopes: ['channel:manage:polls'],
    })

    const decryptedTokens = await Promise.all([
      streamer1.getDecryptedAccessToken(),
      streamer2.getDecryptedAccessToken(),
      streamer3.getDecryptedAccessToken(),
    ])

    assert.deepEqual(decryptedTokens, ['token_1', '', 'token_3'])
  })
})

test.group('Streamer Model - Default Values', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should default isActive to true when not specified', async ({ assert }) => {
    const user = await createTestUser()

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
      accessToken: 'token',
      refreshToken: 'refresh',
      scopes: ['channel:manage:polls'],
    })

    assert.isTrue(streamer.isActive)
  })

  test('should allow setting isActive to false explicitly', async ({ assert }) => {
    const user = await createTestUser()

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
      accessToken: 'token',
      refreshToken: 'refresh',
      scopes: ['channel:manage:polls'],
      isActive: false,
    })

    assert.isFalse(streamer.isActive)
  })

  test('should default broadcasterType to empty string when not specified', async ({ assert }) => {
    const user = await createTestUser()

    const streamer = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'teststreamer',
      twitchDisplayName: 'TestStreamer',
      accessToken: 'token',
      refreshToken: 'refresh',
      scopes: ['channel:manage:polls'],
    })

    assert.equal(streamer.broadcasterType, '')
  })

  test('should allow setting broadcasterType to partner or affiliate', async ({ assert }) => {
    const user = await createTestUser()

    const partner = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '123456',
      twitchLogin: 'partnerstreamer',
      twitchDisplayName: 'PartnerStreamer',
      broadcasterType: 'partner',
      accessToken: 'token',
      refreshToken: 'refresh',
      scopes: ['channel:manage:polls'],
    })

    const affiliate = await Streamer.createWithEncryptedTokens({
      userId: user.id,
      twitchUserId: '789012',
      twitchLogin: 'affiliatestreamer',
      twitchDisplayName: 'AffiliateStreamer',
      broadcasterType: 'affiliate',
      accessToken: 'token',
      refreshToken: 'refresh',
      scopes: ['channel:manage:polls'],
    })

    assert.equal(partner.broadcasterType, 'partner')
    assert.equal(affiliate.broadcasterType, 'affiliate')
  })
})
