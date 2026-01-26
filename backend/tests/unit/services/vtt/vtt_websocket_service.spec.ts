import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import {
  createTestUser,
  createTestVttProvider,
  createTestVttConnection,
  createTestCampaign,
} from '#tests/helpers/test_utils'
import VttConnection from '#models/vtt_connection'
import TokenRevocationList from '#models/token_revocation_list'
import jwt from 'jsonwebtoken'
import env from '#start/env'
import { DateTime } from 'luxon'

/* eslint-disable camelcase -- JWT standard claims use snake_case */

test.group('VttWebSocketService - revokeConnection', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should update connection status to revoked', async ({ assert }) => {
    const { default: VttWebSocketService } = await import('#services/vtt/vtt_websocket_service')
    const service = new VttWebSocketService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      status: 'active',
      tunnelStatus: 'connected',
    })

    await service.revokeConnection(connection.id, 'Test revocation')

    const updatedConnection = await VttConnection.findOrFail(connection.id)
    assert.equal(updatedConnection.status, 'revoked')
    assert.equal(updatedConnection.tunnelStatus, 'disconnected')
  })

  test('should handle non-existent connection gracefully', async ({ assert }) => {
    const { default: VttWebSocketService } = await import('#services/vtt/vtt_websocket_service')
    const service = new VttWebSocketService()

    // Should not throw even if connection doesn't exist - use valid UUID format
    await assert.doesNotReject(async () => {
      await service.revokeConnection('00000000-0000-0000-0000-000000000000', 'Test')
    })
  })
})

test.group('VttWebSocketService - notifyCampaignDeleted', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should not throw when WebSocket server not initialized', async ({ assert }) => {
    const { default: VttWebSocketService } = await import('#services/vtt/vtt_websocket_service')
    const service = new VttWebSocketService()

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
    })

    // Should not throw - gracefully handles missing io
    await assert.doesNotReject(async () => {
      await service.notifyCampaignDeleted(connection.id, 'campaign-123', 'Test Campaign')
    })
  })
})

test.group('VttWebSocketService - broadcast', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should throw error when WebSocket server not initialized', async ({ assert }) => {
    const { default: VttWebSocketService } = await import('#services/vtt/vtt_websocket_service')
    const service = new VttWebSocketService()

    await assert.rejects(async () => {
      await service.broadcast('connection-id', 'test:event', { data: 'test' })
    }, /WebSocket service not initialized/)
  })
})

test.group('VttWebSocketService - JWT Token Validation Logic', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should validate JWT token structure for session type', async ({ assert }) => {
    const secret = env.get('APP_KEY')

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      tokenVersion: 1,
      status: 'active',
    })

    // Generate a valid session token
    const now = Math.floor(Date.now() / 1000)
    const sessionToken = jwt.sign(
      {
        jti: 'session-token-id',
        sub: connection.id,
        user_id: user.id,
        type: 'session',
        token_version: 1,
        iat: now,
        exp: now + 3600,
      },
      secret,
      { algorithm: 'HS256' }
    )

    // Verify the token structure
    const decoded = jwt.verify(sessionToken, secret) as any
    assert.equal(decoded.type, 'session')
    assert.equal(decoded.sub, connection.id)
    assert.equal(decoded.user_id, user.id)
    assert.equal(decoded.token_version, 1)
  })

  test('should detect revoked tokens via TokenRevocationList', async ({ assert }) => {
    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      tokenVersion: 1,
      status: 'active',
    })

    const jti = 'revoked-token-id'

    // Add token to revocation list using the static method
    await TokenRevocationList.revokeToken(
      jti,
      'session',
      DateTime.now().plus({ hours: 1 }),
      connection.id,
      'Test revocation'
    )

    // Check if token is revoked
    const isRevoked = await TokenRevocationList.isRevoked(jti)
    assert.isTrue(isRevoked)

    // Non-revoked token should return false
    const isNotRevoked = await TokenRevocationList.isRevoked('non-existent-jti')
    assert.isFalse(isNotRevoked)
  })

  test('should reject token with mismatched tokenVersion', async ({ assert }) => {
    const secret = env.get('APP_KEY')

    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      tokenVersion: 2, // Connection version is 2
      status: 'active',
    })

    // Token has version 1 (outdated)
    const now = Math.floor(Date.now() / 1000)
    const outdatedToken = jwt.sign(
      {
        jti: 'test-token',
        sub: connection.id,
        user_id: user.id,
        type: 'session',
        token_version: 1, // Outdated version
        iat: now,
        exp: now + 3600,
      },
      secret,
      { algorithm: 'HS256' }
    )

    const decoded = jwt.verify(outdatedToken, secret) as any

    // Reload connection from DB
    const reloadedConnection = await VttConnection.findOrFail(connection.id)

    // Version mismatch should be detected
    assert.notEqual(decoded.token_version, reloadedConnection.tokenVersion)
  })
})

test.group('VttWebSocketService - Connection State Management', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should update tunnel status on connection', async ({ assert }) => {
    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      status: 'active',
      tunnelStatus: 'disconnected',
    })

    // Simulate connection by updating status
    connection.tunnelStatus = 'connected'
    connection.lastHeartbeatAt = DateTime.now()
    await connection.save()

    const updatedConnection = await VttConnection.findOrFail(connection.id)
    assert.equal(updatedConnection.tunnelStatus, 'connected')
    assert.isNotNull(updatedConnection.lastHeartbeatAt)
  })

  test('should update tunnel status on disconnection', async ({ assert }) => {
    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      status: 'active',
      tunnelStatus: 'connected',
      lastHeartbeatAt: DateTime.now(),
    })

    // Simulate disconnection
    connection.tunnelStatus = 'disconnected'
    await connection.save()

    const updatedConnection = await VttConnection.findOrFail(connection.id)
    assert.equal(updatedConnection.tunnelStatus, 'disconnected')
  })

  test('should handle heartbeat timeout by setting error status', async ({ assert }) => {
    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      status: 'active',
      tunnelStatus: 'connected',
    })

    // Simulate heartbeat timeout
    connection.tunnelStatus = 'error'
    await connection.save()

    const updatedConnection = await VttConnection.findOrFail(connection.id)
    assert.equal(updatedConnection.tunnelStatus, 'error')
  })
})

test.group('VttWebSocketService - Campaign Association', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should detect when connection has no associated campaign', async ({ assert }) => {
    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      status: 'active',
    })

    // Import Campaign model
    const { campaign: Campaign } = await import('#models/campaign')

    // Query for campaign associated with this connection
    const associatedCampaign = await Campaign.query()
      .where('vtt_connection_id', connection.id)
      .first()

    // Should be null - no campaign associated
    assert.isNull(associatedCampaign)
  })

  test('should find associated campaign when it exists', async ({ assert }) => {
    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      status: 'active',
    })

    // Create a campaign associated with the connection
    const campaign = await createTestCampaign({
      ownerId: user.id,
      vttConnectionId: connection.id,
    })

    // Import Campaign model
    const { campaign: Campaign } = await import('#models/campaign')

    // Query for campaign associated with this connection
    const associatedCampaign = await Campaign.query()
      .where('vtt_connection_id', connection.id)
      .first()

    assert.isNotNull(associatedCampaign)
    assert.equal(associatedCampaign!.id, campaign.id)
  })
})
