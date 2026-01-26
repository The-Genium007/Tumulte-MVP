import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import { createTestUser } from '#tests/helpers/test_utils'
import NotificationPreference from '#models/notification_preference'
import { NotificationPreferenceRepository } from '#repositories/notification_preference_repository'

test.group('NotificationPreferenceRepository - findByUserId', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should return preferences for existing user', async ({ assert }) => {
    const repository = new NotificationPreferenceRepository()
    const user = await createTestUser()

    // Create preferences
    await NotificationPreference.create({
      userId: user.id,
      pushEnabled: true,
      campaignInvitations: true,
      criticalAlerts: true,
      pollStarted: false,
      pollEnded: false,
      campaignMemberJoined: true,
      sessionReminder: true,
      tokenRefreshFailed: true,
      sessionActionRequired: true,
    })

    const preferences = await repository.findByUserId(user.id)

    assert.isNotNull(preferences)
    assert.equal(preferences!.userId, user.id)
    assert.isTrue(preferences!.pushEnabled)
    assert.isFalse(preferences!.pollStarted)
  })

  test('should return null for user without preferences', async ({ assert }) => {
    const repository = new NotificationPreferenceRepository()
    const user = await createTestUser()

    const preferences = await repository.findByUserId(user.id)

    assert.isNull(preferences)
  })

  test('should return null for non-existent user', async ({ assert }) => {
    const repository = new NotificationPreferenceRepository()

    // Use valid UUID format to avoid PostgreSQL type error
    const preferences = await repository.findByUserId('00000000-0000-0000-0000-000000000000')

    assert.isNull(preferences)
  })
})

test.group('NotificationPreferenceRepository - findOrCreate', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should return existing preferences', async ({ assert }) => {
    const repository = new NotificationPreferenceRepository()
    const user = await createTestUser()

    // Create preferences with specific values
    await NotificationPreference.create({
      userId: user.id,
      pushEnabled: false, // Not default
      campaignInvitations: false, // Not default
      criticalAlerts: true,
      pollStarted: true,
      pollEnded: true,
      campaignMemberJoined: false,
      sessionReminder: false,
      tokenRefreshFailed: true,
      sessionActionRequired: true,
    })

    const preferences = await repository.findOrCreate(user.id)

    // Should return existing preferences, not create new ones
    assert.isFalse(preferences.pushEnabled)
    assert.isFalse(preferences.campaignInvitations)
  })

  test('should create default preferences for new user', async ({ assert }) => {
    const repository = new NotificationPreferenceRepository()
    const user = await createTestUser()

    const preferences = await repository.findOrCreate(user.id)

    // Should have default values
    assert.equal(preferences.userId, user.id)
    assert.isTrue(preferences.pushEnabled)
    assert.isTrue(preferences.campaignInvitations)
    assert.isTrue(preferences.criticalAlerts)
    assert.isTrue(preferences.pollStarted)
    assert.isTrue(preferences.pollEnded)
    assert.isFalse(preferences.campaignMemberJoined) // Default false
    assert.isFalse(preferences.sessionReminder) // Default false
    assert.isTrue(preferences.tokenRefreshFailed)
    assert.isTrue(preferences.sessionActionRequired)
  })

  test('should not create duplicate preferences', async ({ assert }) => {
    const repository = new NotificationPreferenceRepository()
    const user = await createTestUser()

    // Call findOrCreate multiple times
    await repository.findOrCreate(user.id)
    await repository.findOrCreate(user.id)
    await repository.findOrCreate(user.id)

    // Count preferences for this user
    const count = await NotificationPreference.query().where('userId', user.id).count('* as total')

    assert.equal(count[0].$extras.total, 1)
  })
})

test.group('NotificationPreferenceRepository - update', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should update specific preferences', async ({ assert }) => {
    const repository = new NotificationPreferenceRepository()
    const user = await createTestUser()

    // Create default preferences
    await repository.findOrCreate(user.id)

    // Update specific fields
    const updated = await repository.update(user.id, {
      pollStarted: false,
      pollEnded: false,
    })

    assert.isFalse(updated.pollStarted)
    assert.isFalse(updated.pollEnded)
    // Other fields should remain unchanged
    assert.isTrue(updated.pushEnabled)
    assert.isTrue(updated.campaignInvitations)
  })

  test('should create preferences if not exist and update', async ({ assert }) => {
    const repository = new NotificationPreferenceRepository()
    const user = await createTestUser()

    // Update without existing preferences
    const updated = await repository.update(user.id, {
      pushEnabled: false,
    })

    assert.isFalse(updated.pushEnabled)
    // Other fields should have defaults
    assert.isTrue(updated.campaignInvitations)
  })

  test('should preserve other preferences when updating', async ({ assert }) => {
    const repository = new NotificationPreferenceRepository()
    const user = await createTestUser()

    // Create with specific values
    await NotificationPreference.create({
      userId: user.id,
      pushEnabled: true,
      campaignInvitations: false, // Specific value
      criticalAlerts: true,
      pollStarted: true,
      pollEnded: true,
      campaignMemberJoined: true, // Specific value
      sessionReminder: false,
      tokenRefreshFailed: true,
      sessionActionRequired: true,
    })

    // Update only pushEnabled
    const updated = await repository.update(user.id, {
      pushEnabled: false,
    })

    // campaignInvitations and campaignMemberJoined should be preserved
    assert.isFalse(updated.pushEnabled)
    assert.isFalse(updated.campaignInvitations) // Preserved
    assert.isTrue(updated.campaignMemberJoined) // Preserved
  })
})

test.group('NotificationPreferenceRepository - isPushEnabled', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should return true when push enabled', async ({ assert }) => {
    const repository = new NotificationPreferenceRepository()
    const user = await createTestUser()

    await NotificationPreference.create({
      userId: user.id,
      pushEnabled: true,
      campaignInvitations: true,
      criticalAlerts: true,
      pollStarted: true,
      pollEnded: true,
      campaignMemberJoined: false,
      sessionReminder: false,
      tokenRefreshFailed: true,
      sessionActionRequired: true,
    })

    const result = await repository.isPushEnabled(user.id)

    assert.isTrue(result)
  })

  test('should return false when push disabled', async ({ assert }) => {
    const repository = new NotificationPreferenceRepository()
    const user = await createTestUser()

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

    const result = await repository.isPushEnabled(user.id)

    assert.isFalse(result)
  })

  test('should return true by default when no preferences exist', async ({ assert }) => {
    const repository = new NotificationPreferenceRepository()
    const user = await createTestUser()

    // No preferences created
    const result = await repository.isPushEnabled(user.id)

    // Default behavior is enabled
    assert.isTrue(result)
  })
})

test.group('NotificationPreferenceRepository - isTypeEnabled', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should return true when type is enabled', async ({ assert }) => {
    const repository = new NotificationPreferenceRepository()
    const user = await createTestUser()

    await NotificationPreference.create({
      userId: user.id,
      pushEnabled: true,
      campaignInvitations: true,
      criticalAlerts: true,
      pollStarted: true,
      pollEnded: true,
      campaignMemberJoined: false,
      sessionReminder: false,
      tokenRefreshFailed: true,
      sessionActionRequired: true,
    })

    const result = await repository.isTypeEnabled(user.id, 'campaignInvitations')

    assert.isTrue(result)
  })

  test('should return false when type is disabled', async ({ assert }) => {
    const repository = new NotificationPreferenceRepository()
    const user = await createTestUser()

    await NotificationPreference.create({
      userId: user.id,
      pushEnabled: true,
      campaignInvitations: true,
      criticalAlerts: true,
      pollStarted: true,
      pollEnded: true,
      campaignMemberJoined: false, // Disabled
      sessionReminder: false,
      tokenRefreshFailed: true,
      sessionActionRequired: true,
    })

    const result = await repository.isTypeEnabled(user.id, 'campaignMemberJoined')

    assert.isFalse(result)
  })

  test('should return false when push is globally disabled', async ({ assert }) => {
    const repository = new NotificationPreferenceRepository()
    const user = await createTestUser()

    await NotificationPreference.create({
      userId: user.id,
      pushEnabled: false, // Globally disabled
      campaignInvitations: true, // Type is enabled
      criticalAlerts: true,
      pollStarted: true,
      pollEnded: true,
      campaignMemberJoined: false,
      sessionReminder: false,
      tokenRefreshFailed: true,
      sessionActionRequired: true,
    })

    // Even though campaignInvitations is true, push is disabled
    const result = await repository.isTypeEnabled(user.id, 'campaignInvitations')

    assert.isFalse(result)
  })

  test('should return false when no preferences exist', async ({ assert }) => {
    const repository = new NotificationPreferenceRepository()
    const user = await createTestUser()

    // No preferences created - isTypeEnabled returns false when preferences don't exist
    // because preferences?.pushEnabled is undefined (falsy)
    const result = await repository.isTypeEnabled(user.id, 'pollStarted')

    // When no preferences exist, pushEnabled check returns false
    assert.isFalse(result)
  })
})
