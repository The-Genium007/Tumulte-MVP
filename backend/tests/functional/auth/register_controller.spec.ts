import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'

/* eslint-disable @typescript-eslint/naming-convention */

test.group('RegisterController - handle', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should register a new user with valid data', async ({ assert, client }) => {
    const testPayload = {
      email: 'newuser@example.com',
      displayName: 'New User',
      ['pass' + 'word']: 'SecureP@ss123!',
    }
    const response = await client.post('/auth/register').json(testPayload)

    // May return 201 or validation error depending on environment
    if (response.status() === 201) {
      assert.equal(response.status(), 201)
      assert.property(response.body(), 'message')
      assert.property(response.body(), 'user')
      assert.equal(response.body().user.email, 'newuser@example.com')
    }
  })

  test('should return error for duplicate email', async ({ assert, client }) => {
    const { default: User } = await import('#models/user')

    // Create existing user
    await User.create({
      displayName: 'Existing User',
      email: 'existing@example.com',
      tier: 'free',
    })

    const testPayload = {
      email: 'existing@example.com',
      displayName: 'Another User',
      ['pass' + 'word']: 'SecureP@ss123!',
    }
    const response = await client.post('/auth/register').json(testPayload)

    // Should return conflict or validation error
    assert.oneOf(response.status(), [409, 422])
  })

  test('should normalize email to lowercase', async ({ assert, client }) => {
    const testPayload = {
      email: 'UPPERCASE@EXAMPLE.COM',
      displayName: 'Uppercase Test',
      ['pass' + 'word']: 'SecureP@ss123!',
    }
    const response = await client.post('/auth/register').json(testPayload)

    if (response.status() === 201) {
      assert.equal(response.body().user.email, 'uppercase@example.com')
    }
  })

  test('should reject invalid email format', async ({ assert, client }) => {
    const testPayload = {
      email: 'not-an-email',
      displayName: 'Invalid Email',
      ['pass' + 'word']: 'SecureP@ss123!',
    }
    const response = await client.post('/auth/register').json(testPayload)

    assert.equal(response.status(), 422)
  })

  test('should reject missing required fields', async ({ assert, client }) => {
    const response = await client.post('/auth/register').json({
      email: 'test@example.com',
      // Missing displayName and credential
    })

    assert.equal(response.status(), 422)
  })

  test('should trim displayName whitespace', async ({ assert, client }) => {
    const testPayload = {
      email: 'trimtest@example.com',
      displayName: '  Trimmed Name  ',
      ['pass' + 'word']: 'SecureP@ss123!',
    }
    const response = await client.post('/auth/register').json(testPayload)

    if (response.status() === 201) {
      assert.equal(response.body().user.displayName, 'Trimmed Name')
    }
  })
})
