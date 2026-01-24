import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import redis from '@adonisjs/redis/services/main'
import { faker } from '@faker-js/faker'

test.group('Foundry Webhook - Pairing Status', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  // Clean up Redis after each test
  group.each.teardown(async () => {
    const keys = await redis.keys('pairing:*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  })

  test('GET /webhooks/foundry/pairing-status should return pending for active pairing', async ({
    assert,
    client,
  }) => {
    const worldId = 'pending-test-world-' + Date.now()

    // First create a pairing
    const createResponse = await client.post('/webhooks/foundry/request-pairing').json({
      worldId,
      worldName: 'Pending Test World',
    })
    createResponse.assertStatus(200)
    const code = createResponse.body().code

    // Check status
    const statusResponse = await client.get('/webhooks/foundry/pairing-status').qs({ worldId })

    statusResponse.assertStatus(200)
    assert.equal(statusResponse.body().status, 'pending')
    assert.equal(statusResponse.body().code, code)
    assert.property(statusResponse.body(), 'expiresAt')
    assert.property(statusResponse.body(), 'remainingSeconds')
  })

  test('GET /webhooks/foundry/pairing-status should return completed with tokens', async ({
    assert,
    client,
  }) => {
    const worldId = 'completed-test-world-' + Date.now()

    // First create a pairing
    await client.post('/webhooks/foundry/request-pairing').json({
      worldId,
      worldName: 'Completed Test World',
    })

    // Simulate pairing completion by setting completed data in Redis
    const completedData = {
      connectionId: faker.string.uuid(),
      apiKey: 'test_' + faker.string.alphanumeric(32),
      sessionToken: 'test_session_' + faker.string.alphanumeric(20),
      refreshToken: 'test_refresh_' + faker.string.alphanumeric(20),
      expiresIn: 3600,
      serverUrl: 'https://api-app.tumulte.app',
    }
    await redis.setex(`pairing:completed:${worldId}`, 300, JSON.stringify(completedData))

    // Check status - should return completed with tokens
    const statusResponse = await client.get('/webhooks/foundry/pairing-status').qs({ worldId })

    statusResponse.assertStatus(200)
    assert.equal(statusResponse.body().status, 'completed')
    assert.equal(statusResponse.body().connectionId, completedData.connectionId)
    assert.exists(statusResponse.body().apiKey)
    assert.exists(statusResponse.body().sessionToken)
    assert.exists(statusResponse.body().refreshToken)
    assert.equal(statusResponse.body().serverUrl, 'https://api-app.tumulte.app')
  })

  test('GET /webhooks/foundry/pairing-status should cleanup Redis after completion', async ({
    assert,
    client,
  }) => {
    const worldId = 'cleanup-test-world-' + Date.now()

    // Create pairing
    await client.post('/webhooks/foundry/request-pairing').json({
      worldId,
      worldName: 'Cleanup Test World',
    })

    // Simulate completion
    await redis.setex(
      `pairing:completed:${worldId}`,
      300,
      JSON.stringify({
        connectionId: faker.string.uuid(),
        apiKey: 'test_' + faker.string.alphanumeric(32),
        sessionToken: 'test_session_' + faker.string.alphanumeric(20),
        refreshToken: 'test_refresh_' + faker.string.alphanumeric(20),
      })
    )

    // Get completed status (triggers cleanup)
    const statusResponse = await client.get('/webhooks/foundry/pairing-status').qs({ worldId })

    statusResponse.assertStatus(200)
    assert.equal(statusResponse.body().status, 'completed')

    // Verify Redis keys are cleaned up
    const completedKey = await redis.get(`pairing:completed:${worldId}`)
    const worldKey = await redis.get(`pairing:world:${worldId}`)

    assert.isNull(completedKey)
    assert.isNull(worldKey)
    // Note: code key may still exist if not explicitly deleted
  })

  test('GET /webhooks/foundry/pairing-status should return not_found for unknown worldId', async ({
    assert,
    client,
  }) => {
    const statusResponse = await client
      .get('/webhooks/foundry/pairing-status')
      .qs({ worldId: 'unknown-world-12345' })

    statusResponse.assertStatus(200)
    assert.equal(statusResponse.body().status, 'not_found')
    assert.property(statusResponse.body(), 'message')
  })

  test('GET /webhooks/foundry/pairing-status should return expired for timed out pairing', async ({
    assert,
    client,
  }) => {
    const worldId = 'expired-test-world-' + Date.now()

    // Create an expired pairing directly in Redis
    const expiredPairing = {
      code: 'EXP-IRE',
      worldId,
      worldName: 'Expired World',
      gmUserId: 'gm-123',
      moduleVersion: '2.0.0',
      createdAt: Date.now() - 600000, // 10 minutes ago
      expiresAt: Date.now() - 300000, // Expired 5 minutes ago
    }
    await redis.setex(`pairing:world:${worldId}`, 60, JSON.stringify(expiredPairing))

    // Check status - should return expired
    const statusResponse = await client.get('/webhooks/foundry/pairing-status').qs({ worldId })

    statusResponse.assertStatus(200)
    assert.equal(statusResponse.body().status, 'expired')
  })

  test('GET /webhooks/foundry/pairing-status should reject missing worldId', async ({ client }) => {
    const statusResponse = await client.get('/webhooks/foundry/pairing-status')

    statusResponse.assertStatus(400)
    statusResponse.assertBodyContains({ error: 'Missing required parameter: worldId' })
  })
})
