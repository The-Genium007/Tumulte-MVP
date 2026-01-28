import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import { createTestUser } from '#tests/helpers/test_utils'
import PushSubscription from '#models/push_subscription'
import { PushSubscriptionRepository } from '#repositories/push_subscription_repository'

test.group('PushSubscriptionRepository - findByUserId', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should return all subscriptions for user', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()
    const user = await createTestUser()

    // Create multiple subscriptions
    await PushSubscription.create({
      userId: user.id,
      endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint1',
      p256dh: 'p256dh-key-1',
      auth: 'auth-key-1',
    })
    await PushSubscription.create({
      userId: user.id,
      endpoint: 'https://fcm.googleapis.com/fcm/send/endpoint2',
      p256dh: 'p256dh-key-2',
      auth: 'auth-key-2',
    })

    const subscriptions = await repository.findByUserId(user.id)

    assert.lengthOf(subscriptions, 2)
  })

  test('should return empty array for user without subscriptions', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()
    const user = await createTestUser()

    const subscriptions = await repository.findByUserId(user.id)

    assert.isArray(subscriptions)
    assert.lengthOf(subscriptions, 0)
  })

  test('should order by created_at descending', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()
    const user = await createTestUser()

    // Create subscriptions with small delay
    await PushSubscription.create({
      userId: user.id,
      endpoint: 'https://fcm.googleapis.com/fcm/send/first',
      p256dh: 'p256dh-key-1',
      auth: 'auth-key-1',
    })

    await new Promise((resolve) => setTimeout(resolve, 10))

    await PushSubscription.create({
      userId: user.id,
      endpoint: 'https://fcm.googleapis.com/fcm/send/second',
      p256dh: 'p256dh-key-2',
      auth: 'auth-key-2',
    })

    const subscriptions = await repository.findByUserId(user.id)

    // Most recent should be first
    assert.include(subscriptions[0].endpoint, 'second')
    assert.include(subscriptions[1].endpoint, 'first')
  })
})

test.group('PushSubscriptionRepository - findByEndpoint', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should find subscription by endpoint', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()
    const user = await createTestUser()
    const endpoint = 'https://fcm.googleapis.com/fcm/send/unique-endpoint'

    await PushSubscription.create({
      userId: user.id,
      endpoint,
      p256dh: 'p256dh-key',
      auth: 'auth-key',
    })

    const subscription = await repository.findByEndpoint(endpoint)

    assert.isNotNull(subscription)
    assert.equal(subscription!.endpoint, endpoint)
  })

  test('should return null for non-existent endpoint', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()

    const subscription = await repository.findByEndpoint('https://non-existent-endpoint')

    assert.isNull(subscription)
  })
})

test.group('PushSubscriptionRepository - findById', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should find subscription by ID', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()
    const user = await createTestUser()

    const created = await PushSubscription.create({
      userId: user.id,
      endpoint: 'https://fcm.googleapis.com/fcm/send/test',
      p256dh: 'p256dh-key',
      auth: 'auth-key',
    })

    const subscription = await repository.findById(created.id)

    assert.isNotNull(subscription)
    assert.equal(subscription!.id, created.id)
  })

  test('should return null for non-existent ID', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()

    const subscription = await repository.findById('00000000-0000-0000-0000-000000000000')

    assert.isNull(subscription)
  })
})

test.group('PushSubscriptionRepository - create', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create new subscription', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()
    const user = await createTestUser()

    const subscription = await repository.create({
      userId: user.id,
      endpoint: 'https://fcm.googleapis.com/fcm/send/new-endpoint',
      p256dh: 'new-p256dh-key',
      auth: 'new-auth-key',
      userAgent: 'Mozilla/5.0 Test Browser',
      deviceName: 'Test Device',
    })

    assert.exists(subscription.id)
    assert.equal(subscription.userId, user.id)
    assert.equal(subscription.endpoint, 'https://fcm.googleapis.com/fcm/send/new-endpoint')
    assert.equal(subscription.userAgent, 'Mozilla/5.0 Test Browser')
    assert.equal(subscription.deviceName, 'Test Device')
  })

  test('should create subscription without optional fields', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()
    const user = await createTestUser()

    const subscription = await repository.create({
      userId: user.id,
      endpoint: 'https://fcm.googleapis.com/fcm/send/minimal',
      p256dh: 'p256dh-key',
      auth: 'auth-key',
    })

    assert.exists(subscription.id)
    // Optional fields may be undefined or null depending on DB driver
    assert.notExists(subscription.userAgent)
    assert.notExists(subscription.deviceName)
  })
})

test.group('PushSubscriptionRepository - upsert', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create new subscription if not exists', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()
    const user = await createTestUser()
    const endpoint = 'https://fcm.googleapis.com/fcm/send/upsert-new'

    const subscription = await repository.upsert({
      userId: user.id,
      endpoint,
      p256dh: 'p256dh-key',
      auth: 'auth-key',
    })

    assert.exists(subscription.id)
    assert.equal(subscription.endpoint, endpoint)

    // Verify only one subscription exists
    const count = await PushSubscription.query().where('endpoint', endpoint).count('* as total')
    assert.equal(count[0].$extras.total, 1)
  })

  test('should update existing subscription by endpoint', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()
    const user = await createTestUser()
    const endpoint = 'https://fcm.googleapis.com/fcm/send/upsert-existing'

    // Create initial subscription
    await PushSubscription.create({
      userId: user.id,
      endpoint,
      p256dh: 'old-p256dh',
      auth: 'old-auth',
    })

    // Upsert with new keys
    const subscription = await repository.upsert({
      userId: user.id,
      endpoint,
      p256dh: 'new-p256dh',
      auth: 'new-auth',
    })

    assert.equal(subscription.p256dh, 'new-p256dh')
    assert.equal(subscription.auth, 'new-auth')

    // Verify still only one subscription
    const count = await PushSubscription.query().where('endpoint', endpoint).count('* as total')
    assert.equal(count[0].$extras.total, 1)
  })

  test('should update userId when endpoint exists for different user', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()
    const user1 = await createTestUser()
    const user2 = await createTestUser()
    const endpoint = 'https://fcm.googleapis.com/fcm/send/shared-endpoint'

    // Create subscription for user1
    await PushSubscription.create({
      userId: user1.id,
      endpoint,
      p256dh: 'p256dh-key',
      auth: 'auth-key',
    })

    // Upsert with user2 (same endpoint, different user)
    const subscription = await repository.upsert({
      userId: user2.id,
      endpoint,
      p256dh: 'new-p256dh',
      auth: 'new-auth',
    })

    // Should update to user2
    assert.equal(subscription.userId, user2.id)
  })
})

test.group('PushSubscriptionRepository - delete', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should delete subscription by ID', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()
    const user = await createTestUser()

    const subscription = await PushSubscription.create({
      userId: user.id,
      endpoint: 'https://fcm.googleapis.com/fcm/send/to-delete',
      p256dh: 'p256dh-key',
      auth: 'auth-key',
    })

    await repository.delete(subscription.id)

    const found = await PushSubscription.find(subscription.id)
    assert.isNull(found)
  })

  test('should handle deletion of non-existent ID gracefully', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()

    // Should not throw - use valid UUID format
    await assert.doesNotReject(async () => {
      await repository.delete('00000000-0000-0000-0000-000000000000')
    })
  })
})

test.group('PushSubscriptionRepository - deleteByEndpoint', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should delete subscription by endpoint', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()
    const user = await createTestUser()
    const endpoint = 'https://fcm.googleapis.com/fcm/send/delete-by-endpoint'

    await PushSubscription.create({
      userId: user.id,
      endpoint,
      p256dh: 'p256dh-key',
      auth: 'auth-key',
    })

    await repository.deleteByEndpoint(endpoint)

    const found = await PushSubscription.findBy('endpoint', endpoint)
    assert.isNull(found)
  })

  test('should handle deletion of non-existent endpoint gracefully', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()

    // Should not throw
    await assert.doesNotReject(async () => {
      await repository.deleteByEndpoint('https://non-existent-endpoint')
    })
  })
})

test.group('PushSubscriptionRepository - updateLastUsed', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should update lastUsedAt timestamp', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()
    const user = await createTestUser()

    const subscription = await PushSubscription.create({
      userId: user.id,
      endpoint: 'https://fcm.googleapis.com/fcm/send/last-used',
      p256dh: 'p256dh-key',
      auth: 'auth-key',
    })

    // Initially null or undefined
    assert.notExists(subscription.lastUsedAt)

    await repository.updateLastUsed(subscription.id)

    // Reload and check
    await subscription.refresh()
    assert.isNotNull(subscription.lastUsedAt)
  })
})

test.group('PushSubscriptionRepository - countByUserId', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should return correct count', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()
    const user = await createTestUser()

    // Create 3 subscriptions
    for (let i = 0; i < 3; i++) {
      await PushSubscription.create({
        userId: user.id,
        endpoint: `https://fcm.googleapis.com/fcm/send/count-${i}`,
        p256dh: `p256dh-key-${i}`,
        auth: `auth-key-${i}`,
      })
    }

    const count = await repository.countByUserId(user.id)

    assert.equal(count, 3)
  })

  test('should return 0 for user without subscriptions', async ({ assert }) => {
    const repository = new PushSubscriptionRepository()
    const user = await createTestUser()

    const count = await repository.countByUserId(user.id)

    assert.equal(count, 0)
  })
})
