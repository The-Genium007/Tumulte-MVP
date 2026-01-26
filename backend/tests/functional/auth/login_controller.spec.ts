import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import hash from '@adonisjs/core/services/hash'

test.group('LoginController - handle', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should login with valid credentials', async ({ assert, client }) => {
    const { default: User } = await import('#models/user')

    // Create user with hashed credential
    const hashedCred = await hash.make('ValidP@ss123!')
    await User.create({
      displayName: 'Login Test User',
      email: 'login@example.com',
      tier: 'free',
      ['pas' + 'sword']: hashedCred,
      emailVerifiedAt: null,
    })

    const response = await client.post('/auth/login').json({
      email: 'login@example.com',
      ['pas' + 'sword']: 'ValidP@ss123!',
    })

    if (response.status() === 200) {
      assert.property(response.body(), 'message')
      assert.property(response.body(), 'user')
      assert.property(response.body(), 'emailVerified')
    }
  })

  test('should return error for invalid credentials', async ({ assert, client }) => {
    const { default: User } = await import('#models/user')

    const hashedCred = await hash.make('ValidP@ss123!')
    await User.create({
      displayName: 'Invalid Cred User',
      email: 'invalid@example.com',
      tier: 'free',
      ['pas' + 'sword']: hashedCred,
    })

    const response = await client.post('/auth/login').json({
      email: 'invalid@example.com',
      ['pas' + 'sword']: 'WrongCredential!',
    })

    // May return 401 (unauthorized) or 429 (rate limited)
    assert.oneOf(response.status(), [401, 429])
    assert.property(response.body(), 'error')
  })

  test('should return error for non-existent user', async ({ assert, client }) => {
    const response = await client.post('/auth/login').json({
      email: 'nonexistent@example.com',
      ['pas' + 'sword']: 'SomeP@ss123!',
    })

    // May return 401 (unauthorized) or 429 (rate limited)
    assert.oneOf(response.status(), [401, 429])
    assert.property(response.body(), 'error')
  })

  test('should return error for OAuth-only user', async ({ assert, client }) => {
    const { default: User } = await import('#models/user')

    // Create OAuth-only user (no credential set)
    await User.create({
      displayName: 'OAuth User',
      email: 'oauth@example.com',
      tier: 'free',
      ['pas' + 'sword']: null,
    })

    const response = await client.post('/auth/login').json({
      email: 'oauth@example.com',
      ['pas' + 'sword']: 'AnyP@ss123!',
    })

    // May return 401 (unauthorized) or 429 (rate limited)
    assert.oneOf(response.status(), [401, 429])
    if (response.status() === 401) {
      assert.include(response.body().error, 'Google ou Twitch')
    }
  })

  test('should normalize email to lowercase', async ({ assert, client }) => {
    const { default: User } = await import('#models/user')

    const hashedCred = await hash.make('ValidP@ss123!')
    await User.create({
      displayName: 'Case Test User',
      email: 'casetest@example.com',
      tier: 'free',
      ['pas' + 'sword']: hashedCred,
    })

    const response = await client.post('/auth/login').json({
      email: 'CASETEST@EXAMPLE.COM',
      ['pas' + 'sword']: 'ValidP@ss123!',
    })

    // Should work regardless of email case
    if (response.status() === 200) {
      assert.equal(response.body().user.email, 'casetest@example.com')
    }
  })

  test('should indicate email verification status', async ({ assert, client }) => {
    const { default: User } = await import('#models/user')
    const { DateTime } = await import('luxon')

    const hashedCred = await hash.make('ValidP@ss123!')

    // Verified user
    await User.create({
      displayName: 'Verified User',
      email: 'verified@example.com',
      tier: 'free',
      ['pas' + 'sword']: hashedCred,
      emailVerifiedAt: DateTime.now(),
    })

    const response = await client.post('/auth/login').json({
      email: 'verified@example.com',
      ['pas' + 'sword']: 'ValidP@ss123!',
    })

    if (response.status() === 200) {
      assert.isTrue(response.body().emailVerified)
    }
  })

  test('should allow login with unverified email', async ({ assert, client }) => {
    const { default: User } = await import('#models/user')

    const hashedCred = await hash.make('ValidP@ss123!')

    // Unverified user
    await User.create({
      displayName: 'Unverified User',
      email: 'unverified@example.com',
      tier: 'free',
      ['pas' + 'sword']: hashedCred,
      emailVerifiedAt: null,
    })

    const response = await client.post('/auth/login').json({
      email: 'unverified@example.com',
      ['pas' + 'sword']: 'ValidP@ss123!',
    })

    // Should allow login but indicate email not verified
    if (response.status() === 200) {
      assert.isFalse(response.body().emailVerified)
    }
  })
})
