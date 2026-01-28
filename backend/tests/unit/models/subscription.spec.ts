import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import testUtils from '#tests/helpers/database'

test.group('Subscription Model - isActive', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should return true for active status without end date', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Test User',
      email: 'test@example.com',
      tier: 'free',
    })

    const subscription = await Subscription.create({
      userId: user.id,
      tier: 'premium',
      status: 'active',
      isManual: true,
    })

    assert.isTrue(subscription.isActive)
  })

  test('should return true for trialing status', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Trial User',
      email: 'trial@example.com',
      tier: 'free',
    })

    const subscription = await Subscription.create({
      userId: user.id,
      tier: 'premium',
      status: 'trialing',
      isManual: false,
    })

    assert.isTrue(subscription.isActive)
  })

  test('should return false for cancelled status', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Cancelled User',
      email: 'cancelled@example.com',
      tier: 'free',
    })

    const subscription = await Subscription.create({
      userId: user.id,
      tier: 'premium',
      status: 'cancelled',
      isManual: true,
    })

    assert.isFalse(subscription.isActive)
  })

  test('should return false for expired status', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Expired User',
      email: 'expired@example.com',
      tier: 'free',
    })

    const subscription = await Subscription.create({
      userId: user.id,
      tier: 'premium',
      status: 'expired',
      isManual: true,
    })

    assert.isFalse(subscription.isActive)
  })

  test('should return false for past_due status', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Past Due User',
      email: 'pastdue@example.com',
      tier: 'free',
    })

    const subscription = await Subscription.create({
      userId: user.id,
      tier: 'premium',
      status: 'past_due',
      isManual: true,
    })

    assert.isFalse(subscription.isActive)
  })

  test('should return false when endsAt is in the past', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Ended User',
      email: 'ended@example.com',
      tier: 'free',
    })

    const subscription = await Subscription.create({
      userId: user.id,
      tier: 'premium',
      status: 'active',
      isManual: true,
      endsAt: DateTime.now().minus({ days: 1 }),
    })

    assert.isFalse(subscription.isActive)
  })

  test('should return true when endsAt is in the future', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Future User',
      email: 'future@example.com',
      tier: 'free',
    })

    const subscription = await Subscription.create({
      userId: user.id,
      tier: 'premium',
      status: 'active',
      isManual: true,
      endsAt: DateTime.now().plus({ days: 30 }),
    })

    assert.isTrue(subscription.isActive)
  })
})

test.group('Subscription Model - isPremium', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should return true for active premium subscription', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Premium User',
      email: 'premium@example.com',
      tier: 'free',
    })

    const subscription = await Subscription.create({
      userId: user.id,
      tier: 'premium',
      status: 'active',
      isManual: true,
    })

    assert.isTrue(subscription.isPremium)
  })

  test('should return false for free tier', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Free User',
      email: 'free@example.com',
      tier: 'free',
    })

    const subscription = await Subscription.create({
      userId: user.id,
      tier: 'free',
      status: 'active',
      isManual: true,
    })

    assert.isFalse(subscription.isPremium)
  })

  test('should return false for inactive premium subscription', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Inactive Premium',
      email: 'inactive@example.com',
      tier: 'free',
    })

    const subscription = await Subscription.create({
      userId: user.id,
      tier: 'premium',
      status: 'cancelled',
      isManual: true,
    })

    assert.isFalse(subscription.isPremium)
  })
})

test.group('Subscription Model - grantPremium', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should create a new premium subscription', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Grant User',
      email: 'grant@example.com',
      tier: 'free',
    })

    const admin = await User.create({
      displayName: 'Admin User',
      email: 'admin@example.com',
      tier: 'free',
    })

    const subscription = await Subscription.grantPremium(user.id, admin.id, 'Test grant')

    assert.equal(subscription.tier, 'premium')
    assert.equal(subscription.status, 'active')
    assert.isTrue(subscription.isManual)
    assert.equal(subscription.grantedByUserId, admin.id)
    assert.equal(subscription.manualReason, 'Test grant')
    assert.isNotNull(subscription.currentPeriodStart)
  })

  test('should expire existing subscriptions when granting new one', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Existing Sub User',
      email: 'existing@example.com',
      tier: 'free',
    })

    const admin = await User.create({
      displayName: 'Admin',
      email: 'admin2@example.com',
      tier: 'free',
    })

    // Create existing subscription
    const existingSub = await Subscription.create({
      userId: user.id,
      tier: 'premium',
      status: 'active',
      isManual: true,
    })

    // Grant new subscription
    const newSub = await Subscription.grantPremium(user.id, admin.id, 'New grant')

    // Reload existing subscription
    await existingSub.refresh()

    assert.equal(existingSub.status, 'expired')
    assert.equal(newSub.status, 'active')
    assert.notEqual(existingSub.id, newSub.id)
  })

  test('should set endsAt when provided', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Limited User',
      email: 'limited@example.com',
      tier: 'free',
    })

    const admin = await User.create({
      displayName: 'Admin3',
      email: 'admin3@example.com',
      tier: 'free',
    })

    const endsAt = DateTime.now().plus({ months: 1 })
    const subscription = await Subscription.grantPremium(user.id, admin.id, 'Limited grant', endsAt)

    assert.isNotNull(subscription.endsAt)
    // Compare timestamps (within 1 second tolerance)
    const diff = Math.abs(subscription.endsAt!.toMillis() - endsAt.toMillis())
    assert.isBelow(diff, 1000)
  })

  test('should work without reason', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'No Reason User',
      email: 'noreason@example.com',
      tier: 'free',
    })

    const admin = await User.create({
      displayName: 'Admin4',
      email: 'admin4@example.com',
      tier: 'free',
    })

    const subscription = await Subscription.grantPremium(user.id, admin.id)

    assert.isNull(subscription.manualReason)
    assert.equal(subscription.status, 'active')
  })
})

test.group('Subscription Model - revoke', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should set status to cancelled and set endsAt', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Revoke User',
      email: 'revoke@example.com',
      tier: 'free',
    })

    const subscription = await Subscription.create({
      userId: user.id,
      tier: 'premium',
      status: 'active',
      isManual: true,
    })

    assert.isTrue(subscription.isActive)

    await subscription.revoke()

    assert.equal(subscription.status, 'cancelled')
    assert.isNotNull(subscription.cancelledAt)
    assert.isNotNull(subscription.endsAt)
    assert.isFalse(subscription.isActive)
  })

  test('should persist revocation to database', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Persist Revoke',
      email: 'persist@example.com',
      tier: 'free',
    })

    const subscription = await Subscription.create({
      userId: user.id,
      tier: 'premium',
      status: 'active',
      isManual: true,
    })

    await subscription.revoke()

    // Fetch fresh from database
    const fetched = await Subscription.findOrFail(subscription.id)

    assert.equal(fetched.status, 'cancelled')
    assert.isNotNull(fetched.cancelledAt)
    assert.isNotNull(fetched.endsAt)
  })
})

test.group('Subscription Model - Relations', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should belong to a user', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Relation User',
      email: 'relation@example.com',
      tier: 'free',
    })

    const subscription = await Subscription.create({
      userId: user.id,
      tier: 'premium',
      status: 'active',
      isManual: true,
    })

    await subscription.load('user')

    assert.exists(subscription.user)
    assert.equal(subscription.user.id, user.id)
    assert.equal(subscription.user.email, 'relation@example.com')
  })

  test('should belong to grantedBy user when manual', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Granted User',
      email: 'granted@example.com',
      tier: 'free',
    })

    const admin = await User.create({
      displayName: 'Granter Admin',
      email: 'granter@example.com',
      tier: 'free',
    })

    const subscription = await Subscription.grantPremium(user.id, admin.id, 'Test')

    await subscription.load('grantedBy')

    assert.exists(subscription.grantedBy)
    assert.equal(subscription.grantedBy.id, admin.id)
    assert.equal(subscription.grantedBy.email, 'granter@example.com')
  })
})

test.group('Subscription Model - Lemon Squeezy Fields', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should allow storing Lemon Squeezy IDs', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'LS User',
      email: 'lemonsqueezy@example.com',
      tier: 'free',
    })

    const subscription = await Subscription.create({
      userId: user.id,
      tier: 'premium',
      status: 'active',
      isManual: false,
      lemonSqueezySubscriptionId: 'sub_123456',
      lemonSqueezyCustomerId: 'cus_789012',
      lemonSqueezyVariantId: 'var_345678',
      lemonSqueezyProductId: 'prod_901234',
    })

    // Fetch fresh
    const fetched = await Subscription.findOrFail(subscription.id)

    assert.equal(fetched.lemonSqueezySubscriptionId, 'sub_123456')
    assert.equal(fetched.lemonSqueezyCustomerId, 'cus_789012')
    assert.equal(fetched.lemonSqueezyVariantId, 'var_345678')
    assert.equal(fetched.lemonSqueezyProductId, 'prod_901234')
  })

  test('should allow null Lemon Squeezy IDs for manual subscriptions', async ({ assert }) => {
    const { default: Subscription } = await import('#models/subscription')
    const { default: User } = await import('#models/user')

    const user = await User.create({
      displayName: 'Manual User',
      email: 'manual@example.com',
      tier: 'free',
    })

    const subscription = await Subscription.create({
      userId: user.id,
      tier: 'premium',
      status: 'active',
      isManual: true,
    })

    // Optional fields may be undefined or null depending on DB driver
    assert.notExists(subscription.lemonSqueezySubscriptionId)
    assert.notExists(subscription.lemonSqueezyCustomerId)
    assert.notExists(subscription.lemonSqueezyVariantId)
    assert.notExists(subscription.lemonSqueezyProductId)
  })
})
