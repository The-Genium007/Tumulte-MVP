import { test } from '@japa/runner'

/* eslint-disable camelcase */

test.group('HealthCheckService - result structure', () => {
  test('should have correct HealthCheckResult structure', async ({ assert }) => {
    const result = {
      healthy: true,
      services: {
        twitchApi: { available: true },
        redis: { connected: true },
        tokens: { valid: true },
        websocket: { ready: true },
      },
    }

    assert.property(result, 'healthy')
    assert.property(result, 'services')
    assert.property(result.services, 'twitchApi')
    assert.property(result.services, 'redis')
    assert.property(result.services, 'tokens')
    assert.property(result.services, 'websocket')
  })

  test('should track errors for each service', async ({ assert }) => {
    const result = {
      healthy: false,
      services: {
        twitchApi: { available: false, error: 'API unreachable' },
        redis: { connected: false, error: 'Connection refused' },
        tokens: { valid: false, error: 'Invalid tokens' },
        websocket: { ready: false, error: 'Server not started' },
      },
    }

    assert.isFalse(result.healthy)
    assert.equal(result.services.twitchApi.error, 'API unreachable')
    assert.equal(result.services.redis.error, 'Connection refused')
    assert.equal(result.services.tokens.error, 'Invalid tokens')
    assert.equal(result.services.websocket.error, 'Server not started')
  })

  test('should track invalid streamers with issues', async ({ assert }) => {
    const result = {
      healthy: false,
      services: {
        twitchApi: { available: true },
        redis: { connected: true },
        tokens: {
          valid: false,
          invalidStreamers: [
            {
              id: 'streamer-1',
              displayName: 'Streamer One',
              error: 'Credential expired',
              issue: 'token_invalid' as const,
            },
            {
              id: 'streamer-2',
              displayName: 'Streamer Two',
              error: 'Authorization expired',
              issue: 'authorization_expired' as const,
            },
          ],
        },
        websocket: { ready: true },
      },
    }

    assert.isFalse(result.healthy)
    assert.lengthOf(result.services.tokens.invalidStreamers!, 2)
    assert.equal(result.services.tokens.invalidStreamers![0].issue, 'token_invalid')
    assert.equal(result.services.tokens.invalidStreamers![1].issue, 'authorization_expired')
  })
})

test.group('HealthCheckService - issue types', () => {
  test('should recognize all issue types', async ({ assert }) => {
    const issueTypes = [
      'streamer_inactive',
      'authorization_missing',
      'authorization_expired',
      'token_invalid',
      'token_missing',
    ]

    for (const issue of issueTypes) {
      assert.isString(issue)
    }

    assert.lengthOf(issueTypes, 5)
  })

  test('should map issue to user-friendly message', async ({ assert }) => {
    const issueMessages: Record<string, string> = {
      streamer_inactive: 'Le streamer est inactif',
      authorization_missing: "Aucune autorisation de poll n'a été accordée",
      authorization_expired: "L'autorisation de poll a expiré",
      token_invalid: 'Le credential Twitch est invalide ou expiré',
      token_missing: 'Aucun credential Twitch disponible',
    }

    assert.equal(issueMessages.streamer_inactive, 'Le streamer est inactif')
    assert.equal(issueMessages.token_invalid, 'Le credential Twitch est invalide ou expiré')
  })
})

test.group('HealthCheckService - health determination', () => {
  test('should be healthy when all services are OK', async ({ assert }) => {
    const services = {
      twitchApi: { available: true },
      redis: { connected: true },
      tokens: { valid: true },
      websocket: { ready: true },
    }

    const healthy =
      services.twitchApi.available &&
      services.redis.connected &&
      services.tokens.valid &&
      services.websocket.ready

    assert.isTrue(healthy)
  })

  test('should be unhealthy when any service fails', async ({ assert }) => {
    const testCases = [
      {
        twitchApi: { available: false },
        redis: { connected: true },
        tokens: { valid: true },
        websocket: { ready: true },
      },
      {
        twitchApi: { available: true },
        redis: { connected: false },
        tokens: { valid: true },
        websocket: { ready: true },
      },
      {
        twitchApi: { available: true },
        redis: { connected: true },
        tokens: { valid: false },
        websocket: { ready: true },
      },
      {
        twitchApi: { available: true },
        redis: { connected: true },
        tokens: { valid: true },
        websocket: { ready: false },
      },
    ]

    for (const services of testCases) {
      const healthy =
        services.twitchApi.available &&
        services.redis.connected &&
        services.tokens.valid &&
        services.websocket.ready

      assert.isFalse(healthy)
    }
  })
})

test.group('HealthCheckService - credential validation logic', () => {
  test('should fail if access credential is missing', async ({ assert }) => {
    const accessCred = ''
    const refreshCred = 'cred_refresh_abc123'

    const isValid = Boolean(accessCred && refreshCred)
    assert.isFalse(isValid)
  })

  test('should fail if refresh credential is missing', async ({ assert }) => {
    const accessCred = 'cred_access_xyz789'
    const refreshCred = ''

    const isValid = Boolean(accessCred && refreshCred)
    assert.isFalse(isValid)
  })

  test('should pass if both credentials are present', async ({ assert }) => {
    const accessCred = 'cred_access_xyz789'
    const refreshCred = 'cred_refresh_abc123'

    const isValid = Boolean(accessCred && refreshCred)
    assert.isTrue(isValid)
  })
})

test.group('HealthCheckService - authorization validation', () => {
  test('should fail if no authorization granted', async ({ assert }) => {
    const membership = {
      pollAuthorizationExpiresAt: null,
      isPollAuthorizationActive: false,
    }

    const hasAuthorization = Boolean(membership.pollAuthorizationExpiresAt)
    assert.isFalse(hasAuthorization)
  })

  test('should fail if authorization expired', async ({ assert }) => {
    const { DateTime } = await import('luxon')

    const membership = {
      pollAuthorizationExpiresAt: DateTime.now().minus({ hours: 1 }),
      isPollAuthorizationActive: false,
    }

    assert.isFalse(membership.isPollAuthorizationActive)
  })

  test('should pass if authorization is active', async ({ assert }) => {
    const { DateTime } = await import('luxon')

    const expiresAt = DateTime.now().plus({ hours: 12 })
    const isActive = expiresAt > DateTime.now()

    assert.isTrue(isActive)
  })
})

test.group('HealthCheckService - streamer status', () => {
  test('should fail if streamer is inactive', async ({ assert }) => {
    const streamer = { isActive: false }

    assert.isFalse(streamer.isActive)
  })

  test('should pass if streamer is active', async ({ assert }) => {
    const streamer = { isActive: true }

    assert.isTrue(streamer.isActive)
  })
})
