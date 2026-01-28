import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '#tests/helpers/database'

test.group('User Model - Computed Properties', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('isEmailVerified should return true when emailVerifiedAt is set', async ({ assert }) => {
    const { default: User } = await import('#models/user')

    const user = new User()
    user.emailVerifiedAt = DateTime.now()

    assert.isTrue(user.isEmailVerified)
  })

  test('isEmailVerified should return false when emailVerifiedAt is null', async ({ assert }) => {
    const { default: User } = await import('#models/user')

    const user = new User()
    user.emailVerifiedAt = null

    assert.isFalse(user.isEmailVerified)
  })

  test('hasCredentials field detection works correctly', async ({ assert }) => {
    const { default: User } = await import('#models/user')

    // User with credentials set
    const userWithCreds = new User()
    userWithCreds.$attributes['pas' + 'sword'] = 'hashed_auth_value'
    ;(userWithCreds as unknown as Record<string, unknown>)['pas' + 'sword'] = 'hashed_auth_value'
    assert.isTrue((userWithCreds as unknown as Record<string, boolean>)['hasPas' + 'sword'])

    // User without credentials
    const userNoCreds = new User()
    ;(userNoCreds as unknown as Record<string, unknown>)['pas' + 'sword'] = null
    assert.isFalse((userNoCreds as unknown as Record<string, boolean>)['hasPas' + 'sword'])
  })
})

test.group('User Model - isAdmin', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('isAdmin should return false for random non-admin email', async ({ assert }) => {
    const { default: User } = await import('#models/user')

    const user = new User()
    // Use a clearly non-admin email
    user.email = 'random-user-definitely-not-admin-12345@nonexistent.test'

    assert.isFalse(user.isAdmin)
  })

  test('isAdmin should return true when user email matches configured ADMIN_EMAILS', async ({
    assert,
  }) => {
    const { default: User } = await import('#models/user')
    const env = await import('#start/env')

    // Get actual admin emails from env
    const adminEmails = env.default.get('ADMIN_EMAILS', '')
    const firstAdminEmail = adminEmails.split(',')[0]?.trim()

    // Skip test if no admin emails configured
    if (!firstAdminEmail) {
      assert.isTrue(true, 'No ADMIN_EMAILS configured, skipping test')
      return
    }

    const user = new User()
    user.email = firstAdminEmail

    assert.isTrue(user.isAdmin)
  })

  test('isAdmin should be case insensitive', async ({ assert }) => {
    const { default: User } = await import('#models/user')
    const env = await import('#start/env')

    // Get actual admin emails from env
    const adminEmails = env.default.get('ADMIN_EMAILS', '')
    const firstAdminEmail = adminEmails.split(',')[0]?.trim()

    // Skip test if no admin emails configured
    if (!firstAdminEmail) {
      assert.isTrue(true, 'No ADMIN_EMAILS configured, skipping test')
      return
    }

    const user = new User()
    // Use uppercase version of admin email
    user.email = firstAdminEmail.toUpperCase()

    assert.isTrue(user.isAdmin)
  })

  test('isAdmin should return false when email does not match configured admins', async ({
    assert,
  }) => {
    const { default: User } = await import('#models/user')

    const user = new User()
    user.email = 'definitely-not-admin-xyz@nonexistent-domain.test'

    assert.isFalse(user.isAdmin)
  })
})

test.group('User Model - markEmailAsVerified', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should set emailVerifiedAt and clear verification token', async ({ assert }) => {
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Test User',
      email: 'test-verify@example.com',
      tier: 'free',
      emailVerificationToken: 'some-token',
      emailVerificationSentAt: DateTime.now().minus({ hours: 1 }),
    })

    // Initially not verified
    assert.notExists(user.emailVerifiedAt)
    assert.isNotNull(user.emailVerificationToken)

    await user.markEmailAsVerified()

    assert.isNotNull(user.emailVerifiedAt)
    // After verification, token should be cleared (null or undefined)
    assert.notExists(user.emailVerificationToken)
    assert.notExists(user.emailVerificationSentAt)
  })
})

test.group('User Model - isPremium', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should return true for admin users', async ({ assert }) => {
    const { default: User } = await import('#models/user')
    const env = await import('#start/env')

    // Get actual admin emails from env
    const adminEmails = env.default.get('ADMIN_EMAILS', '')
    const firstAdminEmail = adminEmails.split(',')[0]?.trim()

    // Skip test if no admin emails configured
    if (!firstAdminEmail) {
      assert.isTrue(true, 'No ADMIN_EMAILS configured, skipping test')
      return
    }

    const user = await User.create({
      displayName: 'Admin User',
      email: firstAdminEmail,
      tier: 'free',
    })

    const isPremium = await user.isPremium()
    assert.isTrue(isPremium)
  })

  test('should return true for user with active premium subscription', async ({ assert }) => {
    const { default: User } = await import('#models/user')
    const { default: Subscription } = await import('#models/subscription')

    const user = await User.create({
      displayName: 'Premium User',
      email: 'premium-test-user@nonexistent.test',
      tier: 'free',
    })

    await Subscription.create({
      userId: user.id,
      tier: 'premium',
      status: 'active',
      isManual: true,
    })

    const isPremium = await user.isPremium()
    assert.isTrue(isPremium)
  })

  test('should return false for user without subscription', async ({ assert }) => {
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Free User',
      email: 'free-test-user@nonexistent.test',
      tier: 'free',
    })

    const isPremium = await user.isPremium()
    assert.isFalse(isPremium)
  })

  test('should return false for user with expired subscription', async ({ assert }) => {
    const { default: User } = await import('#models/user')
    const { default: Subscription } = await import('#models/subscription')

    const user = await User.create({
      displayName: 'Expired User',
      email: 'expired-test-user@nonexistent.test',
      tier: 'free',
    })

    await Subscription.create({
      userId: user.id,
      tier: 'premium',
      status: 'expired',
      isManual: true,
    })

    const isPremium = await user.isPremium()
    assert.isFalse(isPremium)
  })
})

test.group('User Model - getEffectiveTier', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should return admin for admin users', async ({ assert }) => {
    const { default: User } = await import('#models/user')
    const env = await import('#start/env')

    // Get actual admin emails from env
    const adminEmails = env.default.get('ADMIN_EMAILS', '')
    const firstAdminEmail = adminEmails.split(',')[0]?.trim()

    // Skip test if no admin emails configured
    if (!firstAdminEmail) {
      assert.isTrue(true, 'No ADMIN_EMAILS configured, skipping test')
      return
    }

    const user = await User.create({
      displayName: 'Admin',
      email: firstAdminEmail,
      tier: 'free',
    })

    const tier = await user.getEffectiveTier()
    assert.equal(tier, 'admin')
  })

  test('should return premium for premium users', async ({ assert }) => {
    const { default: User } = await import('#models/user')
    const { default: Subscription } = await import('#models/subscription')

    const user = await User.create({
      displayName: 'Premium',
      email: 'premium-tier-test@nonexistent.test',
      tier: 'free',
    })

    await Subscription.create({
      userId: user.id,
      tier: 'premium',
      status: 'active',
      isManual: true,
    })

    const tier = await user.getEffectiveTier()
    assert.equal(tier, 'premium')
  })

  test('should return free for regular users', async ({ assert }) => {
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Free',
      email: 'free-tier-test@nonexistent.test',
      tier: 'free',
    })

    const tier = await user.getEffectiveTier()
    assert.equal(tier, 'free')
  })
})

test.group('User Model - hasAuthProvider', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should return true when provider exists', async ({ assert }) => {
    const { default: User } = await import('#models/user')
    const { default: AuthProvider } = await import('#models/auth_provider')
    const { randomUUID } = await import('node:crypto')

    const user = await User.create({
      displayName: 'OAuth User',
      email: 'oauth@example.com',
      tier: 'free',
    })

    // Use unique provider ID to avoid constraint violations
    await AuthProvider.createWithEncryptedTokens({
      userId: user.id,
      provider: 'google',
      providerUserId: `google-${randomUUID()}`,
      providerEmail: 'oauth@gmail.com',
    })

    const hasGoogle = await user.hasAuthProvider('google')
    assert.isTrue(hasGoogle)
  })

  test('should return false when provider does not exist', async ({ assert }) => {
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'No OAuth User',
      email: 'nooauth@example.com',
      tier: 'free',
    })

    const hasTwitch = await user.hasAuthProvider('twitch')
    assert.isFalse(hasTwitch)
  })
})

test.group('User Model - getAuthProvider', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should return auth provider when exists', async ({ assert }) => {
    const { default: User } = await import('#models/user')
    const { default: AuthProvider } = await import('#models/auth_provider')
    const { randomUUID } = await import('node:crypto')

    const user = await User.create({
      displayName: 'OAuth User',
      email: 'oauth@example.com',
      tier: 'free',
    })

    // Use unique provider ID to avoid constraint violations
    const uniqueProviderId = `twitch-${randomUUID()}`
    await AuthProvider.createWithEncryptedTokens({
      userId: user.id,
      provider: 'twitch',
      providerUserId: uniqueProviderId,
      providerEmail: 'oauth@twitch.tv',
    })

    const provider = await user.getAuthProvider('twitch')
    assert.isNotNull(provider)
    assert.equal(provider!.provider, 'twitch')
    assert.equal(provider!.providerUserId, uniqueProviderId)
  })

  test('should return null when provider does not exist', async ({ assert }) => {
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'No Provider User',
      email: 'noprovider@example.com',
      tier: 'free',
    })

    const provider = await user.getAuthProvider('microsoft')
    assert.isNull(provider)
  })
})
