import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import redis from '@adonisjs/redis/services/main'
import { faker } from '@faker-js/faker'
import {
  createTestUser,
  createTestVttProvider,
  createTestVttConnection,
} from '#tests/helpers/test_utils'

/**
 * Integration tests for the complete Foundry VTT pairing flow.
 * These tests simulate the full lifecycle:
 * 1. Module requests pairing code
 * 2. Module polls for status (pending)
 * 3. User completes pairing on Tumulte dashboard
 * 4. Module polls and receives tokens (completed)
 * 5. Module can then use ping/revoke endpoints
 */
test.group('Foundry Webhook - Complete Pairing Flow', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  // Clean up Redis after each test
  group.each.teardown(async () => {
    const keys = await redis.keys('pairing:*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  })

  test('Complete pairing flow: request -> poll pending -> complete -> poll completed', async ({
    assert,
    client,
  }) => {
    const worldId = 'flow-test-world-' + Date.now()
    const worldName = 'Flow Test Campaign'

    // Step 1: Request pairing code (simulates Foundry module)
    const requestResponse = await client.post('/webhooks/foundry/request-pairing').json({
      worldId,
      worldName,
      gmUserId: 'gm-flow-123',
      moduleVersion: '2.0.2',
    })

    requestResponse.assertStatus(200)
    const code = requestResponse.body().code
    assert.exists(code)
    assert.match(code, /^[A-Z0-9]{3}-[A-Z0-9]{3}$/)

    // Step 2: Poll for status - should be pending
    const pendingResponse = await client.get('/webhooks/foundry/pairing-status').qs({ worldId })

    pendingResponse.assertStatus(200)
    assert.equal(pendingResponse.body().status, 'pending')
    assert.equal(pendingResponse.body().code, code)
    assert.isAbove(pendingResponse.body().remainingSeconds, 0)

    // Step 3: Simulate user completing pairing on Tumulte dashboard
    // In real flow, this is done by VttConnectionsController.completePairing
    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      worldId,
      worldName,
      status: 'active',
    })

    const completedData = {
      connectionId: connection.id,
      apiKey: connection.apiKey,
      sessionToken: 'test_session_' + faker.string.alphanumeric(40),
      refreshToken: 'test_refresh_' + faker.string.alphanumeric(40),
      expiresIn: 3600,
      serverUrl: 'https://api-app.tumulte.app',
    }
    await redis.setex(`pairing:completed:${worldId}`, 300, JSON.stringify(completedData))

    // Step 4: Poll for status - should be completed with tokens
    const completedResponse = await client.get('/webhooks/foundry/pairing-status').qs({ worldId })

    completedResponse.assertStatus(200)
    assert.equal(completedResponse.body().status, 'completed')
    assert.equal(completedResponse.body().connectionId, connection.id)
    assert.exists(completedResponse.body().sessionToken)
    assert.exists(completedResponse.body().refreshToken)
    assert.equal(completedResponse.body().serverUrl, 'https://api-app.tumulte.app')

    // Step 5: Module can now use ping endpoint
    const pingResponse = await client.post('/webhooks/foundry/ping').json({
      connectionId: connection.id,
      apiKey: connection.apiKey,
    })

    pingResponse.assertStatus(200)
    assert.isTrue(pingResponse.body().success)
  })

  test('Pairing flow with expiration: request -> wait -> expired', async ({ assert, client }) => {
    const worldId = 'expiry-flow-world-' + Date.now()

    // Step 1: Create an already-expired pairing directly in Redis
    const expiredPairing = {
      code: 'EXP-123',
      worldId,
      worldName: 'Expiry Test',
      gmUserId: 'gm-123',
      moduleVersion: '2.0.0',
      createdAt: Date.now() - 600000, // 10 minutes ago
      expiresAt: Date.now() - 300000, // Expired 5 minutes ago
    }
    await redis.setex(`pairing:world:${worldId}`, 60, JSON.stringify(expiredPairing))
    await redis.setex(`pairing:code:EXP-123`, 60, JSON.stringify(expiredPairing))

    // Step 2: Poll for status - should be expired
    const expiredResponse = await client.get('/webhooks/foundry/pairing-status').qs({ worldId })

    expiredResponse.assertStatus(200)
    assert.equal(expiredResponse.body().status, 'expired')

    // Step 3: Redis should be cleaned up
    const worldKey = await redis.get(`pairing:world:${worldId}`)
    const codeKey = await redis.get(`pairing:code:EXP-123`)
    assert.isNull(worldKey)
    assert.isNull(codeKey)
  })

  test('Full lifecycle: pair -> connect -> ping -> revoke', async ({ assert, client }) => {
    const worldId = 'lifecycle-world-' + Date.now()

    // Step 1: Request pairing
    const requestResponse = await client.post('/webhooks/foundry/request-pairing').json({
      worldId,
      worldName: 'Lifecycle Test',
    })
    requestResponse.assertStatus(200)

    // Step 2: Create connection and complete pairing
    const user = await createTestUser()
    const provider = await createTestVttProvider()
    const connection = await createTestVttConnection({
      userId: user.id,
      vttProviderId: provider.id,
      worldId,
      worldName: 'Lifecycle Test',
      status: 'active',
      tokenVersion: 1,
    })

    await redis.setex(
      `pairing:completed:${worldId}`,
      300,
      JSON.stringify({
        connectionId: connection.id,
        apiKey: connection.apiKey,
        sessionToken: 'test_session_' + faker.string.alphanumeric(40),
        refreshToken: 'test_refresh_' + faker.string.alphanumeric(40),
        expiresIn: 3600,
      })
    )

    // Step 3: Get completed status
    const completedResponse = await client.get('/webhooks/foundry/pairing-status').qs({ worldId })
    completedResponse.assertStatus(200)
    assert.equal(completedResponse.body().status, 'completed')

    // Step 4: Send heartbeat ping
    const pingResponse = await client.post('/webhooks/foundry/ping').json({
      connectionId: connection.id,
      apiKey: connection.apiKey,
    })
    pingResponse.assertStatus(200)

    // Step 5: Revoke connection
    const revokeResponse = await client.post('/webhooks/foundry/revoke').json({
      connectionId: connection.id,
      apiKey: connection.apiKey,
      reason: 'Lifecycle test complete',
    })
    revokeResponse.assertStatus(200)
    assert.isTrue(revokeResponse.body().success)

    // Step 6: Ping should still work (apiKey still valid, just revoked status)
    // But in practice, module should stop using revoked connections
  })

  test('Multiple worlds can pair simultaneously', async ({ assert, client }) => {
    const world1Id = 'multi-world-1-' + Date.now()
    const world2Id = 'multi-world-2-' + Date.now()

    // Request pairing for both worlds
    const response1 = await client.post('/webhooks/foundry/request-pairing').json({
      worldId: world1Id,
      worldName: 'World 1',
    })
    const response2 = await client.post('/webhooks/foundry/request-pairing').json({
      worldId: world2Id,
      worldName: 'World 2',
    })

    response1.assertStatus(200)
    response2.assertStatus(200)

    // Codes should be different
    assert.notEqual(response1.body().code, response2.body().code)

    // Both should be pending
    const status1 = await client.get('/webhooks/foundry/pairing-status').qs({ worldId: world1Id })
    const status2 = await client.get('/webhooks/foundry/pairing-status').qs({ worldId: world2Id })

    assert.equal(status1.body().status, 'pending')
    assert.equal(status2.body().status, 'pending')
    assert.equal(status1.body().code, response1.body().code)
    assert.equal(status2.body().code, response2.body().code)
  })
})
