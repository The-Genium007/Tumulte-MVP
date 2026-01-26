import { test } from '@japa/runner'
import jwt from 'jsonwebtoken'
import testUtils from '#tests/helpers/database'
import env from '#start/env'
import {
  createTestUser,
  createTestVttProvider,
  createTestVttConnection,
} from '#tests/helpers/test_utils'
import VttConnection from '#models/vtt_connection'

/* eslint-disable camelcase -- JWT standard claims use snake_case */

test.group('VttPairingService - generateSessionTokensForConnection', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should generate valid session and refresh tokens', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()
    const secret = env.get('APP_KEY')

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      tokenVersion: 1,
      status: 'active',
    })

    const tokens = await service.generateSessionTokensForConnection(
      connection.id,
      user.id,
      connection.tokenVersion
    )

    assert.exists(tokens.sessionToken)
    assert.exists(tokens.refreshToken)
    assert.equal(tokens.expiresIn, 3600)

    // Verify session token structure
    const sessionDecoded = jwt.verify(tokens.sessionToken, secret) as any
    assert.equal(sessionDecoded.sub, connection.id)
    assert.equal(sessionDecoded.user_id, user.id)
    assert.equal(sessionDecoded.type, 'session')
    assert.equal(sessionDecoded.token_version, 1)

    // Verify refresh token structure
    const refreshDecoded = jwt.verify(tokens.refreshToken, secret) as any
    assert.equal(refreshDecoded.sub, connection.id)
    assert.equal(refreshDecoded.user_id, user.id)
    assert.equal(refreshDecoded.type, 'refresh')
    assert.equal(refreshDecoded.token_version, 1)
  })
})

test.group('VttPairingService - refreshSessionToken', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should refresh valid refresh token', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()
    const secret = env.get('APP_KEY')

    // Create test connection
    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      tokenVersion: 1,
      status: 'active',
    })

    // Generate a valid refresh token
    const now = Math.floor(Date.now() / 1000)
    const refreshToken = jwt.sign(
      {
        jti: 'refresh-token-id',
        sub: connection.id,
        user_id: user.id,
        type: 'refresh',
        token_version: 1,
        iat: now,
        exp: now + 604800,
      },
      secret,
      { algorithm: 'HS256' }
    )

    const tokens = await service.refreshSessionToken(refreshToken)

    assert.exists(tokens.sessionToken)
    assert.exists(tokens.refreshToken)
    assert.equal(tokens.expiresIn, 3600)
  })

  test('should reject session token used as refresh token', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()
    const secret = env.get('APP_KEY')

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      tokenVersion: 1,
    })

    // Generate a session token (not refresh)
    const now = Math.floor(Date.now() / 1000)
    const sessionToken = jwt.sign(
      {
        jti: 'session-token-id',
        sub: connection.id,
        user_id: user.id,
        type: 'session', // Wrong type
        token_version: 1,
        iat: now,
        exp: now + 3600,
      },
      secret,
      { algorithm: 'HS256' }
    )

    await assert.rejects(() => service.refreshSessionToken(sessionToken), /Invalid token type/i)
  })

  test('should reject token with outdated tokenVersion', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()
    const secret = env.get('APP_KEY')

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      tokenVersion: 2, // Connection has version 2
      status: 'active',
    })

    // Generate refresh token with version 1 (outdated)
    const now = Math.floor(Date.now() / 1000)
    const refreshToken = jwt.sign(
      {
        jti: 'refresh-token-id',
        sub: connection.id,
        user_id: user.id,
        type: 'refresh',
        token_version: 1, // Old version
        iat: now,
        exp: now + 604800,
      },
      secret,
      { algorithm: 'HS256' }
    )

    await assert.rejects(
      () => service.refreshSessionToken(refreshToken),
      /Token has been invalidated/i
    )
  })

  test('should reject token for revoked connection', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()
    const secret = env.get('APP_KEY')

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      tokenVersion: 1,
      status: 'revoked', // Connection is revoked
    })

    const now = Math.floor(Date.now() / 1000)
    const refreshToken = jwt.sign(
      {
        jti: 'refresh-token-id',
        sub: connection.id,
        user_id: user.id,
        type: 'refresh',
        token_version: 1,
        iat: now,
        exp: now + 604800,
      },
      secret,
      { algorithm: 'HS256' }
    )

    await assert.rejects(
      () => service.refreshSessionToken(refreshToken),
      /Connection has been revoked/i
    )
  })
})

test.group('VttPairingService - revokeConnectionTokens', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should increment tokenVersion and set status to revoked', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      tokenVersion: 1,
      status: 'active',
      tunnelStatus: 'connected',
    })

    await service.revokeConnectionTokens(connection.id, 'Test revocation')

    // Reload from database
    const updatedConnection = await VttConnection.findOrFail(connection.id)

    assert.equal(updatedConnection.tokenVersion, 2) // Incremented
    assert.equal(updatedConnection.status, 'revoked')
    assert.equal(updatedConnection.tunnelStatus, 'disconnected')
  })

  test('should handle multiple revocations by incrementing each time', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      tokenVersion: 5,
      status: 'active',
    })

    await service.revokeConnectionTokens(connection.id, 'First revocation')

    const updated = await VttConnection.findOrFail(connection.id)
    assert.equal(updated.tokenVersion, 6)
  })
})

test.group('VttPairingService - invalidateAllTokens', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should increment tokenVersion without changing status', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      tokenVersion: 1,
      status: 'active',
      tunnelStatus: 'connected',
    })

    await service.invalidateAllTokens(connection.id)

    const updatedConnection = await VttConnection.findOrFail(connection.id)

    assert.equal(updatedConnection.tokenVersion, 2) // Incremented
    assert.equal(updatedConnection.status, 'active') // Unchanged
    assert.equal(updatedConnection.tunnelStatus, 'connected') // Unchanged
  })
})
