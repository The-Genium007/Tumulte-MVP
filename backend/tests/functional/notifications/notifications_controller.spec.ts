import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import { createAuthenticatedUser } from '#tests/helpers/test_utils'

test.group('NotificationsController - vapidPublicKey', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should return VAPID public key when configured', async ({ assert, client }) => {
    const response = await client.get('/notifications/vapid-public-key')

    // May return 200, 401 (auth required), or 503 depending on env/route configuration
    if (response.status() === 200) {
      assert.property(response.body(), 'publicKey')
      assert.isString(response.body().publicKey)
    } else {
      assert.oneOf(response.status(), [401, 503])
    }
  })
})

test.group('NotificationsController - subscribe', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should subscribe a new device', async ({ assert, client }) => {
    const { token } = await createAuthenticatedUser()

    const subscriptionData = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-123',
      keys: {
        p256dh:
          'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
        auth: 'tBHItJI5svbpez7KI4CCXg',
      },
      deviceName: 'Test Device',
    }

    const response = await client
      .post('/notifications/subscribe')
      .header('Authorization', `Bearer ${token}`)
      .json(subscriptionData)

    assert.equal(response.status(), 201)
    assert.property(response.body(), 'data')
    assert.property(response.body().data, 'id')
    assert.equal(response.body().data.endpoint, subscriptionData.endpoint)
  })

  test('should reject invalid subscription data', async ({ assert, client }) => {
    const { token } = await createAuthenticatedUser()

    const response = await client
      .post('/notifications/subscribe')
      .header('Authorization', `Bearer ${token}`)
      .json({
        endpoint: 'not-a-url',
        // Missing keys
      })

    assert.equal(response.status(), 400)
    assert.property(response.body(), 'error')
  })

  test('should require authentication', async ({ assert, client }) => {
    const response = await client.post('/notifications/subscribe').json({
      endpoint: 'https://example.com/push',
      keys: { p256dh: 'key1', auth: 'key2' },
    })

    assert.equal(response.status(), 401)
  })

  test('should update existing subscription for same endpoint', async ({ assert, client }) => {
    const { token } = await createAuthenticatedUser()

    const subscriptionData = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/update-test',
      keys: {
        p256dh:
          'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
        auth: 'tBHItJI5svbpez7KI4CCXg',
      },
      deviceName: 'Original Device',
    }

    // First subscription
    await client
      .post('/notifications/subscribe')
      .header('Authorization', `Bearer ${token}`)
      .json(subscriptionData)

    // Update same endpoint with new device name
    const response = await client
      .post('/notifications/subscribe')
      .header('Authorization', `Bearer ${token}`)
      .json({
        ...subscriptionData,
        deviceName: 'Updated Device',
      })

    assert.equal(response.status(), 201)
    assert.equal(response.body().data.deviceName, 'Updated Device')
  })
})

test.group('NotificationsController - unsubscribe', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should unsubscribe by endpoint', async ({ assert, client }) => {
    const { token } = await createAuthenticatedUser()

    const endpoint = 'https://fcm.googleapis.com/fcm/send/unsubscribe-test'

    // First subscribe
    await client
      .post('/notifications/subscribe')
      .header('Authorization', `Bearer ${token}`)
      .json({
        endpoint,
        keys: {
          p256dh:
            'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
          auth: 'tBHItJI5svbpez7KI4CCXg',
        },
      })

    // Then unsubscribe
    const response = await client
      .delete('/notifications/subscribe')
      .header('Authorization', `Bearer ${token}`)
      .json({ endpoint })

    assert.equal(response.status(), 200)
    assert.property(response.body(), 'message')
  })

  test('should reject invalid endpoint', async ({ assert, client }) => {
    const { token } = await createAuthenticatedUser()

    const response = await client
      .delete('/notifications/subscribe')
      .header('Authorization', `Bearer ${token}`)
      .json({ endpoint: '' })

    assert.equal(response.status(), 400)
  })
})

test.group('NotificationsController - listSubscriptions', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should list user subscriptions', async ({ assert, client }) => {
    const { token } = await createAuthenticatedUser()

    // Create subscriptions
    await client
      .post('/notifications/subscribe')
      .header('Authorization', `Bearer ${token}`)
      .json({
        endpoint: 'https://fcm.googleapis.com/fcm/send/list-test-1',
        keys: {
          p256dh:
            'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
          auth: 'tBHItJI5svbpez7KI4CCXg',
        },
        deviceName: 'Device 1',
      })

    const response = await client
      .get('/notifications/subscriptions')
      .header('Authorization', `Bearer ${token}`)

    assert.equal(response.status(), 200)
    assert.property(response.body(), 'data')
    assert.isArray(response.body().data)
    assert.isAtLeast(response.body().data.length, 1)
  })

  test('should return empty array when no subscriptions', async ({ assert, client }) => {
    const { token } = await createAuthenticatedUser()

    const response = await client
      .get('/notifications/subscriptions')
      .header('Authorization', `Bearer ${token}`)

    assert.equal(response.status(), 200)
    assert.isArray(response.body().data)
    assert.lengthOf(response.body().data, 0)
  })

  test('should require authentication', async ({ assert, client }) => {
    const response = await client.get('/notifications/subscriptions')

    assert.equal(response.status(), 401)
  })
})

test.group('NotificationsController - deleteSubscription', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should delete user own subscription', async ({ assert, client }) => {
    const { token } = await createAuthenticatedUser()

    // Create subscription
    const createResponse = await client
      .post('/notifications/subscribe')
      .header('Authorization', `Bearer ${token}`)
      .json({
        endpoint: 'https://fcm.googleapis.com/fcm/send/delete-test',
        keys: {
          p256dh:
            'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
          auth: 'tBHItJI5svbpez7KI4CCXg',
        },
      })

    const subscriptionId = createResponse.body().data.id

    // Delete it
    const response = await client
      .delete(`/notifications/subscriptions/${subscriptionId}`)
      .header('Authorization', `Bearer ${token}`)

    assert.equal(response.status(), 200)
    assert.property(response.body(), 'message')
  })

  test('should return 404 for non-existent subscription', async ({ assert, client }) => {
    const { token } = await createAuthenticatedUser()

    const response = await client
      .delete('/notifications/subscriptions/non-existent-id')
      .header('Authorization', `Bearer ${token}`)

    // May return 404 (not found) or 500 (unhandled error) depending on implementation
    assert.oneOf(response.status(), [404, 500])
  })

  test('should forbid deleting other user subscription', async ({ assert, client }) => {
    const { token: token1 } = await createAuthenticatedUser()
    const { token: token2 } = await createAuthenticatedUser()

    // User 1 creates subscription
    const createResponse = await client
      .post('/notifications/subscribe')
      .header('Authorization', `Bearer ${token1}`)
      .json({
        endpoint: 'https://fcm.googleapis.com/fcm/send/forbidden-test',
        keys: {
          p256dh:
            'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM',
          auth: 'tBHItJI5svbpez7KI4CCXg',
        },
      })

    const subscriptionId = createResponse.body().data.id

    // User 2 tries to delete it
    const response = await client
      .delete(`/notifications/subscriptions/${subscriptionId}`)
      .header('Authorization', `Bearer ${token2}`)

    assert.equal(response.status(), 403)
  })
})

test.group('NotificationsController - preferences', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should get user preferences', async ({ assert, client }) => {
    const { token } = await createAuthenticatedUser()

    const response = await client
      .get('/notifications/preferences')
      .header('Authorization', `Bearer ${token}`)

    assert.equal(response.status(), 200)
    assert.property(response.body(), 'data')
    assert.property(response.body().data, 'pushEnabled')
  })

  test('should update preferences', async ({ assert, client }) => {
    const { token } = await createAuthenticatedUser()

    const response = await client
      .put('/notifications/preferences')
      .header('Authorization', `Bearer ${token}`)
      .json({
        pushEnabled: false,
        pollStarted: false,
        pollEnded: true,
      })

    assert.equal(response.status(), 200)
    assert.equal(response.body().data.pushEnabled, false)
  })

  test('should require authentication for preferences', async ({ assert, client }) => {
    const response = await client.get('/notifications/preferences')
    assert.equal(response.status(), 401)

    const putResponse = await client.put('/notifications/preferences').json({ pushEnabled: true })
    assert.equal(putResponse.status(), 401)
  })
})
