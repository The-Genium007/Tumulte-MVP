import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import jwt from 'jsonwebtoken'
import testUtils from '#tests/helpers/database'
import env from '#start/env'
import {
  createTestUser,
  createTestVttProvider,
  createTestVttConnection,
} from '#tests/helpers/test_utils'
import VttConnection from '#models/vtt_connection'
import TokenRevocationList from '#models/token_revocation_list'

test.group('VttPairingService - parsePairingUrl', () => {
  test('should parse valid foundry:// URL', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()

    const url = 'foundry://connect?token=test-jwt-token&state=csrf-state-123'
    const result = service.parsePairingUrl(url)

    assert.equal(result.token, 'test-jwt-token')
    assert.equal(result.state, 'csrf-state-123')
  })

  test('should throw error for invalid protocol', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()

    const url = 'http://connect?token=test-jwt-token&state=csrf-state-123'

    assert.throws(() => service.parsePairingUrl(url), 'Invalid pairing URL')
  })

  test('should throw error for missing token parameter', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()

    const url = 'foundry://connect?state=csrf-state-123'

    assert.throws(() => service.parsePairingUrl(url), 'Missing token or state parameter')
  })

  test('should throw error for missing state parameter', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()

    const url = 'foundry://connect?token=test-jwt-token'

    assert.throws(() => service.parsePairingUrl(url), 'Missing token or state parameter')
  })
})

test.group('VttPairingService - validatePairingToken', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should validate a valid JWT token', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()
    const secret = env.get('APP_KEY')

    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'vtt:foundry',
      aud: 'tumulte:api',
      iss: 'foundry-module:tumulte',
      pairing_code: 'ABC-123',
      world_id: 'test-world-id',
      world_name: 'Test World',
      gm_user_id: 'gm-user-123',
      module_version: '2.0.0',
      iat: now,
      exp: now + 300,
      nonce: 'random-nonce',
      jti: 'unique-token-id',
    }

    const token = jwt.sign(payload, secret, { algorithm: 'HS256' })

    const claims = await service.validatePairingToken(token)

    assert.equal(claims.pairing_code, 'ABC-123')
    assert.equal(claims.world_id, 'test-world-id')
    assert.equal(claims.world_name, 'Test World')
  })

  test('should reject expired token', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()
    const secret = env.get('APP_KEY')

    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'vtt:foundry',
      aud: 'tumulte:api',
      iss: 'foundry-module:tumulte',
      pairing_code: 'ABC-123',
      world_id: 'test-world-id',
      world_name: 'Test World',
      gm_user_id: 'gm-user-123',
      module_version: '2.0.0',
      iat: now - 600,
      exp: now - 300, // Expired 5 minutes ago
      nonce: 'random-nonce',
      jti: 'unique-token-id',
    }

    const token = jwt.sign(payload, secret, { algorithm: 'HS256' })

    await assert.rejects(() => service.validatePairingToken(token), /Invalid JWT|expired/i)
  })

  test('should reject token with invalid audience', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()
    const secret = env.get('APP_KEY')

    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'vtt:foundry',
      aud: 'wrong-audience',
      iss: 'foundry-module:tumulte',
      pairing_code: 'ABC-123',
      world_id: 'test-world-id',
      world_name: 'Test World',
      gm_user_id: 'gm-user-123',
      module_version: '2.0.0',
      iat: now,
      exp: now + 300,
      nonce: 'random-nonce',
      jti: 'unique-token-id',
    }

    const token = jwt.sign(payload, secret, { algorithm: 'HS256' })

    await assert.rejects(() => service.validatePairingToken(token), /Invalid JWT|audience/i)
  })

  test('should reject token missing required claims', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()
    const secret = env.get('APP_KEY')

    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'vtt:foundry',
      aud: 'tumulte:api',
      iss: 'foundry-module:tumulte',
      // Missing pairing_code, world_id, world_name
      iat: now,
      exp: now + 300,
      jti: 'unique-token-id',
    }

    const token = jwt.sign(payload, secret, { algorithm: 'HS256' })

    await assert.rejects(() => service.validatePairingToken(token), /Missing required claims/i)
  })

  test('should reject token signed with wrong secret', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()

    const now = Math.floor(Date.now() / 1000)
    const payload = {
      sub: 'vtt:foundry',
      aud: 'tumulte:api',
      iss: 'foundry-module:tumulte',
      pairing_code: 'ABC-123',
      world_id: 'test-world-id',
      world_name: 'Test World',
      gm_user_id: 'gm-user-123',
      module_version: '2.0.0',
      iat: now,
      exp: now + 300,
      nonce: 'random-nonce',
      jti: 'unique-token-id',
    }

    const token = jwt.sign(payload, 'wrong-secret', { algorithm: 'HS256' })

    await assert.rejects(() => service.validatePairingToken(token), /Invalid JWT|signature/i)
  })
})

test.group('VttPairingService - refreshSessionToken', (group) => {
  group.each.setup(() => testUtils.db().truncate())

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
  group.each.setup(() => testUtils.db().truncate())

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
  group.each.setup(() => testUtils.db().truncate())

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

test.group('VttPairingService - testConnection', () => {
  test('should return reachable with world info (mock)', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()

    const claims = {
      sub: 'vtt:foundry',
      aud: 'tumulte:api',
      iss: 'foundry-module:tumulte',
      pairing_code: 'ABC-123',
      world_id: 'test-world-id',
      world_name: 'Test World',
      gm_user_id: 'gm-user-123',
      module_version: '2.0.0',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
      nonce: 'random-nonce',
      jti: 'unique-token-id',
    }

    const result = await service.testConnection(claims)

    assert.isTrue(result.reachable)
    assert.exists(result.worldInfo)
    assert.equal(result.worldInfo?.id, 'test-world-id')
    assert.equal(result.worldInfo?.name, 'Test World')
    assert.equal(result.worldInfo?.version, '2.0.0')
  })
})

test.group('VttPairingService - completePairing', (group) => {
  group.each.setup(() => testUtils.db().truncate())

  test('should create connection and return tokens', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()

    // Create user and provider
    const user = await createTestUser()
    await createTestVttProvider({ name: 'foundry' })

    const claims = {
      sub: 'vtt:foundry',
      aud: 'tumulte:api',
      iss: 'foundry-module:tumulte',
      pairing_code: 'ABC-123',
      world_id: 'unique-world-id-123',
      world_name: 'Test World',
      gm_user_id: 'gm-user-123',
      module_version: '2.0.0',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
      nonce: 'random-nonce',
      jti: 'unique-token-id',
    }

    const result = await service.completePairing(claims, user.id)

    // Verify connection was created
    assert.exists(result.connection)
    assert.equal(result.connection.worldId, 'unique-world-id-123')
    assert.equal(result.connection.worldName, 'Test World')
    assert.equal(result.connection.status, 'active')
    assert.equal(result.connection.tokenVersion, 1)

    // Verify tokens were generated
    assert.exists(result.tokens.sessionToken)
    assert.exists(result.tokens.refreshToken)
    assert.equal(result.tokens.expiresIn, 3600)
  })

  test('should reject duplicate connection for same world', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()

    const user = await createTestUser()
    const provider = await createTestVttProvider({ name: 'foundry' })

    // Create existing connection for this world
    await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      worldId: 'existing-world-id',
    })

    const claims = {
      sub: 'vtt:foundry',
      aud: 'tumulte:api',
      iss: 'foundry-module:tumulte',
      pairing_code: 'ABC-123',
      world_id: 'existing-world-id', // Same world ID
      world_name: 'Test World',
      gm_user_id: 'gm-user-123',
      module_version: '2.0.0',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
      nonce: 'random-nonce',
      jti: 'unique-token-id',
    }

    await assert.rejects(
      () => service.completePairing(claims, user.id),
      /Connection already exists/i
    )
  })

  test('should reject unknown VTT provider', async ({ assert }) => {
    const { default: VttPairingService } = await import('#services/vtt/vtt_pairing_service')
    const service = new VttPairingService()

    const user = await createTestUser()
    // Note: No provider created

    const claims = {
      sub: 'vtt:unknown-vtt', // Unknown provider
      aud: 'tumulte:api',
      iss: 'foundry-module:tumulte',
      pairing_code: 'ABC-123',
      world_id: 'test-world-id',
      world_name: 'Test World',
      gm_user_id: 'gm-user-123',
      module_version: '2.0.0',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
      nonce: 'random-nonce',
      jti: 'unique-token-id',
    }

    await assert.rejects(() => service.completePairing(claims, user.id), /not found/i)
  })
})
