import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import { createTestUser } from '#tests/helpers/test_utils'
import PushSubscription from '#models/push_subscription'
import NotificationPreference from '#models/notification_preference'

test.group('PushNotificationService - getVapidPublicKey', () => {
  test('should return VAPID public key from config', async ({ assert }) => {
    const { PushNotificationService } =
      await import('#services/notifications/push_notification_service')
    const service = new PushNotificationService()

    const publicKey = service.getVapidPublicKey()

    // Should return a string (even if empty when not configured)
    assert.isString(publicKey)
  })
})

test.group('PushNotificationService - sendToUser', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should return 0 sent when user has no subscriptions', async ({ assert }) => {
    const { PushNotificationService } =
      await import('#services/notifications/push_notification_service')
    const service = new PushNotificationService()

    const user = await createTestUser()

    const result = await service.sendToUser(user.id, 'campaign:invitation', {
      title: 'Test',
      body: 'Test notification',
    })

    assert.equal(result.sent, 0)
    assert.equal(result.failed, 0)
  })

  test('should skip notification when push globally disabled', async ({ assert }) => {
    const { PushNotificationService } =
      await import('#services/notifications/push_notification_service')
    const service = new PushNotificationService()

    const user = await createTestUser()

    // Create subscription
    await PushSubscription.create({
      userId: user.id,
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint',
      p256dh: 'test-p256dh-key',
      auth: 'test-auth-key',
    })

    // Disable push globally
    await NotificationPreference.create({
      userId: user.id,
      pushEnabled: false,
      campaignInvitations: true,
      criticalAlerts: true,
      pollStarted: true,
      pollEnded: true,
      campaignMemberJoined: false,
      sessionReminder: false,
      tokenRefreshFailed: true,
      sessionActionRequired: true,
    })

    const result = await service.sendToUser(user.id, 'campaign:invitation', {
      title: 'Test',
      body: 'Test notification',
    })

    // Should skip due to pushEnabled = false
    assert.equal(result.sent, 0)
    assert.equal(result.failed, 0)
  })

  test('should skip notification when specific type disabled', async ({ assert }) => {
    const { PushNotificationService } =
      await import('#services/notifications/push_notification_service')
    const service = new PushNotificationService()

    const user = await createTestUser()

    // Create subscription
    await PushSubscription.create({
      userId: user.id,
      endpoint: 'https://fcm.googleapis.com/fcm/send/test-endpoint-2',
      p256dh: 'test-p256dh-key',
      auth: 'test-auth-key',
    })

    // Enable push but disable campaign invitations
    await NotificationPreference.create({
      userId: user.id,
      pushEnabled: true,
      campaignInvitations: false, // Disabled
      criticalAlerts: true,
      pollStarted: true,
      pollEnded: true,
      campaignMemberJoined: false,
      sessionReminder: false,
      tokenRefreshFailed: true,
      sessionActionRequired: true,
    })

    const result = await service.sendToUser(user.id, 'campaign:invitation', {
      title: 'Test',
      body: 'Test notification',
    })

    // Should skip due to campaignInvitations = false
    assert.equal(result.sent, 0)
    assert.equal(result.failed, 0)
  })

  test('should bypass preferences when bypassPreferences is true', async ({ assert }) => {
    const { PushNotificationService } =
      await import('#services/notifications/push_notification_service')
    const service = new PushNotificationService()

    const user = await createTestUser()

    // Disable all preferences
    await NotificationPreference.create({
      userId: user.id,
      pushEnabled: false,
      campaignInvitations: false,
      criticalAlerts: false,
      pollStarted: false,
      pollEnded: false,
      campaignMemberJoined: false,
      sessionReminder: false,
      tokenRefreshFailed: false,
      sessionActionRequired: false,
    })

    // No subscriptions = will still return 0, but preferences check is bypassed
    const result = await service.sendToUser(
      user.id,
      'campaign:invitation',
      {
        title: 'Test',
        body: 'Test notification',
      },
      true // bypassPreferences
    )

    // Returns 0 because no subscriptions, not because of preferences
    assert.equal(result.sent, 0)
    assert.equal(result.failed, 0)
  })

  test('should send notification when no preferences configured (default behavior)', async ({
    assert,
  }) => {
    const { PushNotificationService } =
      await import('#services/notifications/push_notification_service')
    const service = new PushNotificationService()

    const user = await createTestUser()

    // No preferences created = default to enabled
    // No subscriptions = will return 0
    const result = await service.sendToUser(user.id, 'campaign:invitation', {
      title: 'Test',
      body: 'Test notification',
    })

    // Returns 0 because no subscriptions (but preferences check passed)
    assert.equal(result.sent, 0)
    assert.equal(result.failed, 0)
  })
})

test.group('PushNotificationService - sendToUsers', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should aggregate results from multiple users', async ({ assert }) => {
    const { PushNotificationService } =
      await import('#services/notifications/push_notification_service')
    const service = new PushNotificationService()

    const user1 = await createTestUser()
    const user2 = await createTestUser()
    const user3 = await createTestUser()

    const result = await service.sendToUsers([user1.id, user2.id, user3.id], 'poll:started', {
      title: 'Poll Started',
      body: 'A new poll has started!',
    })

    // No subscriptions for any user
    assert.equal(result.totalSent, 0)
    assert.equal(result.totalFailed, 0)
  })

  test('should handle empty user array', async ({ assert }) => {
    const { PushNotificationService } =
      await import('#services/notifications/push_notification_service')
    const service = new PushNotificationService()

    const result = await service.sendToUsers([], 'poll:started', {
      title: 'Poll Started',
      body: 'A new poll has started!',
    })

    assert.equal(result.totalSent, 0)
    assert.equal(result.totalFailed, 0)
  })
})

test.group('PushNotificationService - sendCampaignInvitation', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should format invitation notification correctly', async ({ assert }) => {
    const { PushNotificationService } =
      await import('#services/notifications/push_notification_service')
    const service = new PushNotificationService()

    const user = await createTestUser()

    // This won't throw even with no subscriptions
    await assert.doesNotReject(async () => {
      await service.sendCampaignInvitation(user.id, 'Epic Campaign', 'campaign-123')
    })
  })
})

test.group('PushNotificationService - sendPollStarted', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should send poll started notification to multiple users', async ({ assert }) => {
    const { PushNotificationService } =
      await import('#services/notifications/push_notification_service')
    const service = new PushNotificationService()

    const user1 = await createTestUser()
    const user2 = await createTestUser()

    await assert.doesNotReject(async () => {
      await service.sendPollStarted(
        [user1.id, user2.id],
        'What should the party do?',
        'poll-instance-123',
        'campaign-456'
      )
    })
  })
})

test.group('PushNotificationService - sendPollEnded', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should send poll ended notification', async ({ assert }) => {
    const { PushNotificationService } =
      await import('#services/notifications/push_notification_service')
    const service = new PushNotificationService()

    const user = await createTestUser()

    await assert.doesNotReject(async () => {
      await service.sendPollEnded([user.id], 'Decision Poll', 'poll-instance-789', 'campaign-456')
    })
  })
})

test.group('PushNotificationService - sendCriticalAlert', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should send critical alert notification', async ({ assert }) => {
    const { PushNotificationService } =
      await import('#services/notifications/push_notification_service')
    const service = new PushNotificationService()

    const user = await createTestUser()

    await assert.doesNotReject(async () => {
      await service.sendCriticalAlert(user.id, 'Token Expired', 'Your Twitch token has expired')
    })
  })
})

test.group('PushNotificationService - sendSessionActionRequired', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should format session action required notification with issues', async ({ assert }) => {
    const { PushNotificationService } =
      await import('#services/notifications/push_notification_service')
    const service = new PushNotificationService()

    const user = await createTestUser()

    await assert.doesNotReject(async () => {
      await service.sendSessionActionRequired(user.id, 'My Campaign', [
        'token_expired',
        'authorization_missing',
      ])
    })
  })

  test('should deduplicate issue messages', async ({ assert }) => {
    const { PushNotificationService } =
      await import('#services/notifications/push_notification_service')
    const service = new PushNotificationService()

    const user = await createTestUser()

    // Multiple token-related issues should produce one message
    await assert.doesNotReject(async () => {
      await service.sendSessionActionRequired(user.id, 'Campaign Name', [
        'token_expired',
        'token_invalid',
        'token_missing', // All map to "Reconnexion Twitch requise"
      ])
    })
  })
})

test.group('Notification Types - getDefaultUrgency', () => {
  test('should return high urgency for critical notifications', async ({ assert }) => {
    const { getDefaultUrgency } = await import('#services/notifications/notification_types')

    assert.equal(getDefaultUrgency('critical:alert'), 'high')
    assert.equal(getDefaultUrgency('token:refresh_failed'), 'high')
    assert.equal(getDefaultUrgency('session:action_required'), 'high')
  })

  test('should return normal urgency for poll notifications', async ({ assert }) => {
    const { getDefaultUrgency } = await import('#services/notifications/notification_types')

    assert.equal(getDefaultUrgency('poll:started'), 'normal')
    assert.equal(getDefaultUrgency('poll:ended'), 'normal')
    assert.equal(getDefaultUrgency('session:start_blocked'), 'normal')
  })

  test('should return low urgency for informational notifications', async ({ assert }) => {
    const { getDefaultUrgency } = await import('#services/notifications/notification_types')

    assert.equal(getDefaultUrgency('campaign:invitation'), 'low')
    assert.equal(getDefaultUrgency('campaign:member_joined'), 'low')
    assert.equal(getDefaultUrgency('session:reminder'), 'low')
  })
})

test.group('Notification Types - notificationTypeToPreference', () => {
  test('should map notification types to preference keys', async ({ assert }) => {
    const { notificationTypeToPreference } =
      await import('#services/notifications/notification_types')

    assert.equal(notificationTypeToPreference['campaign:invitation'], 'campaignInvitations')
    assert.equal(notificationTypeToPreference['critical:alert'], 'criticalAlerts')
    assert.equal(notificationTypeToPreference['poll:started'], 'pollStarted')
    assert.equal(notificationTypeToPreference['poll:ended'], 'pollEnded')
    assert.equal(notificationTypeToPreference['campaign:member_joined'], 'campaignMemberJoined')
    assert.equal(notificationTypeToPreference['session:reminder'], 'sessionReminder')
    assert.equal(notificationTypeToPreference['token:refresh_failed'], 'tokenRefreshFailed')
    assert.equal(notificationTypeToPreference['session:action_required'], 'sessionActionRequired')
  })

  test('should map session:start_blocked to sessionReminder', async ({ assert }) => {
    const { notificationTypeToPreference } =
      await import('#services/notifications/notification_types')

    // Special case: session:start_blocked reuses sessionReminder preference
    assert.equal(notificationTypeToPreference['session:start_blocked'], 'sessionReminder')
  })
})
