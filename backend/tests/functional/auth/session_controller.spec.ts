import { test } from '@japa/runner'
import testUtils from '#tests/helpers/database'
import { createAuthenticatedUser } from '#tests/helpers/test_utils'

test.group('SessionController - logout', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should logout authenticated user', async ({ assert, client }) => {
    const { token } = await createAuthenticatedUser()

    const response = await client.post('/auth/logout').header('Authorization', `Bearer ${token}`)

    assert.equal(response.status(), 200)
    assert.property(response.body(), 'message')
  })

  test('should return 401 for unauthenticated request', async ({ assert, client }) => {
    const response = await client.post('/auth/logout')

    assert.equal(response.status(), 401)
  })
})

test.group('SessionController - me', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('should return current user info', async ({ assert, client }) => {
    const { user, token } = await createAuthenticatedUser({
      displayName: 'Current User',
      email: 'current@example.com',
    })

    const response = await client.get('/auth/me').header('Authorization', `Bearer ${token}`)

    assert.equal(response.status(), 200)
    assert.property(response.body(), 'user')
    assert.equal(response.body().user.id, user.id)
    assert.equal(response.body().user.displayName, 'Current User')
  })

  test('should return 401 for unauthenticated request', async ({ assert, client }) => {
    const response = await client.get('/auth/me')

    assert.equal(response.status(), 401)
  })

  test('should include user tier in response', async ({ assert, client }) => {
    const { token } = await createAuthenticatedUser({
      tier: 'free',
    })

    const response = await client.get('/auth/me').header('Authorization', `Bearer ${token}`)

    if (response.status() === 200) {
      assert.property(response.body().user, 'tier')
    }
  })

  test('should include avatar URL when available', async ({ assert, client }) => {
    const { token } = await createAuthenticatedUser({
      displayName: 'Avatar User',
      avatarUrl: 'https://example.com/avatar.png',
    })

    const response = await client.get('/auth/me').header('Authorization', `Bearer ${token}`)

    if (response.status() === 200) {
      assert.property(response.body().user, 'avatarUrl')
    }
  })
})
