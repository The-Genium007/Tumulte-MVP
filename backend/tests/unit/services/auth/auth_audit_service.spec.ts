import { test } from '@japa/runner'
import authAuditService from '#services/auth/auth_audit_service'
import type { HttpContext } from '@adonisjs/core/http'

// ========================================
// HELPERS
// ========================================

/**
 * Returns the AuthAuditService singleton.
 * The service is stateless so the shared instance is safe for isolated tests.
 */
async function getService(): Promise<typeof authAuditService> {
  const mod = await import('#services/auth/auth_audit_service')
  return mod.default
}

/**
 * Builds a minimal mock HttpContext with controllable request headers and ip.
 */
function buildMockCtx(options: {
  forwardedFor?: string
  realIp?: string
  ip?: string
  userAgent?: string
}): HttpContext {
  return {
    request: {
      header: (name: string): string | undefined => {
        const lower = name.toLowerCase()
        if (lower === 'x-forwarded-for') return options.forwardedFor
        if (lower === 'x-real-ip') return options.realIp
        if (lower === 'user-agent') return options.userAgent
        return undefined
      },
      ip: () => options.ip ?? 'unknown',
    },
  } as unknown as HttpContext
}

/**
 * Installs temporary spies on logger.info and logger.warn.
 * Returns captured calls and a restore function.
 */
async function spyOnLogger() {
  const loggerModule = await import('@adonisjs/core/services/logger')
  const logger = loggerModule.default

  const infoLogs: Array<{ data: Record<string, unknown>; message: string }> = []
  const warnLogs: Array<{ data: Record<string, unknown>; message: string }> = []

  const originalInfo = logger.info.bind(logger)
  const originalWarn = logger.warn.bind(logger)

  logger.info = ((data: Record<string, unknown>, message: string) => {
    infoLogs.push({ data, message })
  }) as any

  logger.warn = ((data: Record<string, unknown>, message: string) => {
    warnLogs.push({ data, message })
  }) as any

  const restore = () => {
    logger.info = originalInfo
    logger.warn = originalWarn
  }

  return { infoLogs, warnLogs, restore }
}

// ========================================
// TESTS — email masking
// ========================================

test.group('AuthAuditService — maskEmail (via log output)', (group) => {
  group.each.teardown(async () => {
    // Restore logger after each test in case a spy was left active
  })

  test('masks a standard email: john.doe@gmail.com → j***e@gmail.com', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    try {
      service.log({ event: 'login_success', email: 'john.doe@gmail.com' })

      assert.lengthOf(infoLogs, 1)
      assert.equal(infoLogs[0].data.email, 'j***e@gmail.com')
    } finally {
      restore()
    }
  })

  test('masks a short local part: ab@example.com → a***b@example.com', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    try {
      service.log({ event: 'login_success', email: 'ab@example.com' })

      assert.lengthOf(infoLogs, 1)
      assert.equal(infoLogs[0].data.email, 'a***b@example.com')
    } finally {
      restore()
    }
  })

  test('masks a single-char local part: a@example.com → ***@example.com', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    try {
      // local.length < 2 → '***@domain'
      service.log({ event: 'login_success', email: 'a@example.com' })

      assert.lengthOf(infoLogs, 1)
      assert.equal(infoLogs[0].data.email, '***@example.com')
    } finally {
      restore()
    }
  })

  test('masks a long email: administrator@corporation.org → a***r@corporation.org', async ({
    assert,
  }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    try {
      service.log({ event: 'register', email: 'administrator@corporation.org' })

      assert.lengthOf(infoLogs, 1)
      assert.equal(infoLogs[0].data.email, 'a***r@corporation.org')
    } finally {
      restore()
    }
  })

  test('does not include email in log when no email is provided', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    try {
      service.log({ event: 'logout', userId: 'user-123' })

      assert.lengthOf(infoLogs, 1)
      assert.isUndefined(infoLogs[0].data.email)
    } finally {
      restore()
    }
  })
})

// ========================================
// TESTS — log level selection
// ========================================

test.group('AuthAuditService — log level selection', () => {
  test('login_failed uses warn level', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, warnLogs, restore } = await spyOnLogger()

    try {
      service.log({ event: 'login_failed', email: 'user@example.com', reason: 'bad password' })

      assert.lengthOf(warnLogs, 1)
      assert.lengthOf(infoLogs, 0)
      assert.equal(warnLogs[0].message, 'Auth audit: login_failed')
    } finally {
      restore()
    }
  })

  test('login_locked uses warn level', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, warnLogs, restore } = await spyOnLogger()

    try {
      service.log({ event: 'login_locked', email: 'user@example.com' })

      assert.lengthOf(warnLogs, 1)
      assert.lengthOf(infoLogs, 0)
      assert.equal(warnLogs[0].message, 'Auth audit: login_locked')
    } finally {
      restore()
    }
  })

  test('session_expired uses warn level', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, warnLogs, restore } = await spyOnLogger()

    try {
      service.log({ event: 'session_expired', userId: 'user-123' })

      assert.lengthOf(warnLogs, 1)
      assert.lengthOf(infoLogs, 0)
      assert.equal(warnLogs[0].message, 'Auth audit: session_expired')
    } finally {
      restore()
    }
  })

  test('login_success uses info level', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, warnLogs, restore } = await spyOnLogger()

    try {
      service.log({ event: 'login_success', userId: 'user-123', email: 'user@example.com' })

      assert.lengthOf(infoLogs, 1)
      assert.lengthOf(warnLogs, 0)
      assert.equal(infoLogs[0].message, 'Auth audit: login_success')
    } finally {
      restore()
    }
  })

  test('register uses info level', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, warnLogs, restore } = await spyOnLogger()

    try {
      service.log({ event: 'register', userId: 'user-123', email: 'user@example.com' })

      assert.lengthOf(infoLogs, 1)
      assert.lengthOf(warnLogs, 0)
    } finally {
      restore()
    }
  })

  test('oauth_login uses info level', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, warnLogs, restore } = await spyOnLogger()

    try {
      service.log({ event: 'oauth_login', userId: 'user-123', provider: 'twitch' })

      assert.lengthOf(infoLogs, 1)
      assert.lengthOf(warnLogs, 0)
    } finally {
      restore()
    }
  })
})

// ========================================
// TESTS — IP extraction priority
// ========================================

test.group('AuthAuditService — IP extraction', () => {
  test('prefers x-forwarded-for over x-real-ip and request.ip()', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    const ctx = buildMockCtx({
      forwardedFor: '203.0.113.1, 10.0.0.1',
      realIp: '203.0.113.2',
      ip: '203.0.113.3',
    })

    try {
      service.log({ event: 'login_success' }, ctx)

      assert.lengthOf(infoLogs, 1)
      // Takes the first IP from the x-forwarded-for chain
      assert.equal(infoLogs[0].data.ip, '203.0.113.1')
    } finally {
      restore()
    }
  })

  test('falls back to x-real-ip when x-forwarded-for is absent', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    const ctx = buildMockCtx({
      realIp: '203.0.113.5',
      ip: '203.0.113.6',
    })

    try {
      service.log({ event: 'login_success' }, ctx)

      assert.equal(infoLogs[0].data.ip, '203.0.113.5')
    } finally {
      restore()
    }
  })

  test('falls back to request.ip() when both proxy headers are absent', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    const ctx = buildMockCtx({ ip: '192.168.0.42' })

    try {
      service.log({ event: 'login_success' }, ctx)

      assert.equal(infoLogs[0].data.ip, '192.168.0.42')
    } finally {
      restore()
    }
  })

  test('returns "unknown" when context is not provided', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    try {
      service.log({ event: 'login_success' })

      assert.equal(infoLogs[0].data.ip, 'unknown')
      assert.equal(infoLogs[0].data.userAgent, 'unknown')
    } finally {
      restore()
    }
  })

  test('extracts user-agent from context', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    const ctx = buildMockCtx({
      ip: '10.0.0.1',
      userAgent: 'Mozilla/5.0 (compatible; Tumulte/1.0)',
    })

    try {
      service.log({ event: 'login_success' }, ctx)

      assert.equal(infoLogs[0].data.userAgent, 'Mozilla/5.0 (compatible; Tumulte/1.0)')
    } finally {
      restore()
    }
  })

  test('returns "unknown" for user-agent when header is missing', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    const ctx = buildMockCtx({ ip: '10.0.0.1' })

    try {
      service.log({ event: 'login_success' }, ctx)

      assert.equal(infoLogs[0].data.userAgent, 'unknown')
    } finally {
      restore()
    }
  })
})

// ========================================
// TESTS — log payload structure
// ========================================

test.group('AuthAuditService — log payload structure', () => {
  test('log payload includes audit, event, timestamp fields', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    try {
      service.log({ event: 'login_success', userId: 'user-abc' })

      const data = infoLogs[0].data
      assert.equal(data.audit, 'auth')
      assert.equal(data.event, 'login_success')
      assert.equal(data.userId, 'user-abc')
      assert.isString(data.timestamp)
      // Verify timestamp is a valid ISO 8601 string
      assert.isTrue(!Number.isNaN(Date.parse(data.timestamp as string)))
    } finally {
      restore()
    }
  })

  test('metadata fields are spread into log data', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    try {
      service.log({
        event: 'login_success',
        userId: 'user-xyz',
        metadata: { attemptCount: 3, source: 'web' },
      })

      const data = infoLogs[0].data
      assert.equal(data.attemptCount, 3)
      assert.equal(data.source, 'web')
    } finally {
      restore()
    }
  })

  test('provider field is forwarded for oauth events', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    try {
      service.log({ event: 'oauth_link', userId: 'user-123', provider: 'twitch' })

      assert.equal(infoLogs[0].data.provider, 'twitch')
    } finally {
      restore()
    }
  })

  test('reason field is forwarded when provided', async ({ assert }) => {
    const service = await getService()
    const { warnLogs, restore } = await spyOnLogger()

    try {
      service.log({ event: 'login_failed', email: 'user@example.com', reason: 'invalid_password' })

      assert.equal(warnLogs[0].data.reason, 'invalid_password')
    } finally {
      restore()
    }
  })
})

// ========================================
// TESTS — convenience methods
// ========================================

test.group('AuthAuditService — loginSuccess', () => {
  test('loginSuccess logs at info level with correct event type', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, warnLogs, restore } = await spyOnLogger()

    try {
      service.loginSuccess('user-1', 'user@example.com')

      assert.lengthOf(infoLogs, 1)
      assert.lengthOf(warnLogs, 0)
      assert.equal(infoLogs[0].data.event, 'login_success')
      assert.equal(infoLogs[0].data.userId, 'user-1')
    } finally {
      restore()
    }
  })

  test('loginSuccess works without context', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    try {
      assert.doesNotThrow(() => service.loginSuccess('user-1', 'user@example.com'))
      assert.lengthOf(infoLogs, 1)
    } finally {
      restore()
    }
  })

  test('loginSuccess works with context', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()
    const ctx = buildMockCtx({ ip: '1.2.3.4', userAgent: 'TestAgent/1.0' })

    try {
      service.loginSuccess('user-1', 'user@example.com', ctx)

      assert.equal(infoLogs[0].data.ip, '1.2.3.4')
      assert.equal(infoLogs[0].data.userAgent, 'TestAgent/1.0')
    } finally {
      restore()
    }
  })
})

test.group('AuthAuditService — loginFailed', () => {
  test('loginFailed logs at warn level with correct event type and reason', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, warnLogs, restore } = await spyOnLogger()

    try {
      service.loginFailed('user@example.com', 'invalid_credentials')

      assert.lengthOf(warnLogs, 1)
      assert.lengthOf(infoLogs, 0)
      assert.equal(warnLogs[0].data.event, 'login_failed')
      assert.equal(warnLogs[0].data.reason, 'invalid_credentials')
    } finally {
      restore()
    }
  })
})

test.group('AuthAuditService — loginLocked', () => {
  test('loginLocked logs at warn level with Too many failed attempts reason', async ({
    assert,
  }) => {
    const service = await getService()
    const { warnLogs, restore } = await spyOnLogger()

    try {
      service.loginLocked('user@example.com')

      assert.lengthOf(warnLogs, 1)
      assert.equal(warnLogs[0].data.event, 'login_locked')
      assert.equal(warnLogs[0].data.reason, 'Too many failed attempts')
    } finally {
      restore()
    }
  })
})

test.group('AuthAuditService — logout and logoutAll', () => {
  test('logout logs at info level without email', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, warnLogs, restore } = await spyOnLogger()

    try {
      service.logout('user-99')

      assert.lengthOf(infoLogs, 1)
      assert.lengthOf(warnLogs, 0)
      assert.equal(infoLogs[0].data.event, 'logout')
      assert.equal(infoLogs[0].data.userId, 'user-99')
      assert.isUndefined(infoLogs[0].data.email)
    } finally {
      restore()
    }
  })

  test('logoutAll logs at info level', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    try {
      service.logoutAll('user-99')

      assert.equal(infoLogs[0].data.event, 'logout_all')
      assert.equal(infoLogs[0].data.userId, 'user-99')
    } finally {
      restore()
    }
  })
})

test.group('AuthAuditService — register and emailVerified', () => {
  test('register logs at info level with masked email', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    try {
      service.register('user-42', 'newbie@example.com')

      assert.equal(infoLogs[0].data.event, 'register')
      assert.equal(infoLogs[0].data.userId, 'user-42')
      assert.equal(infoLogs[0].data.email, 'n***e@example.com')
    } finally {
      restore()
    }
  })

  test('emailVerified logs at info level', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    try {
      service.emailVerified('user-42', 'verified@example.com')

      assert.equal(infoLogs[0].data.event, 'email_verified')
      assert.equal(infoLogs[0].data.userId, 'user-42')
    } finally {
      restore()
    }
  })
})

test.group('AuthAuditService — password events', () => {
  test('passwordResetRequested logs at info level', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, warnLogs, restore } = await spyOnLogger()

    try {
      service.passwordResetRequested('user@example.com')

      assert.lengthOf(infoLogs, 1)
      assert.lengthOf(warnLogs, 0)
      assert.equal(infoLogs[0].data.event, 'password_reset_requested')
    } finally {
      restore()
    }
  })

  test('passwordResetCompleted logs at info level with userId', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    try {
      service.passwordResetCompleted('user-55')

      assert.equal(infoLogs[0].data.event, 'password_reset_completed')
      assert.equal(infoLogs[0].data.userId, 'user-55')
    } finally {
      restore()
    }
  })

  test('passwordChanged logs at info level with userId', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    try {
      service.passwordChanged('user-55')

      assert.equal(infoLogs[0].data.event, 'password_changed')
      assert.equal(infoLogs[0].data.userId, 'user-55')
    } finally {
      restore()
    }
  })
})

test.group('AuthAuditService — oauth events', () => {
  test('oauthLogin logs at info level with provider', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, warnLogs, restore } = await spyOnLogger()

    try {
      service.oauthLogin('user-77', 'twitch')

      assert.lengthOf(infoLogs, 1)
      assert.lengthOf(warnLogs, 0)
      assert.equal(infoLogs[0].data.event, 'oauth_login')
      assert.equal(infoLogs[0].data.provider, 'twitch')
      assert.equal(infoLogs[0].data.userId, 'user-77')
    } finally {
      restore()
    }
  })

  test('oauthLink logs at info level with provider', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    try {
      service.oauthLink('user-77', 'google')

      assert.equal(infoLogs[0].data.event, 'oauth_link')
      assert.equal(infoLogs[0].data.provider, 'google')
    } finally {
      restore()
    }
  })

  test('oauthUnlink logs at info level with provider', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    try {
      service.oauthUnlink('user-77', 'twitch')

      assert.equal(infoLogs[0].data.event, 'oauth_unlink')
      assert.equal(infoLogs[0].data.provider, 'twitch')
    } finally {
      restore()
    }
  })
})

// ========================================
// TESTS — null / undefined context handling
// ========================================

test.group('AuthAuditService — context edge cases', () => {
  test('all convenience methods work without throwing when ctx is undefined', async ({
    assert,
  }) => {
    const service = await getService()
    const { restore } = await spyOnLogger()

    try {
      assert.doesNotThrow(() => service.loginSuccess('u1', 'a@b.com'))
      assert.doesNotThrow(() => service.loginFailed('a@b.com', 'reason'))
      assert.doesNotThrow(() => service.loginLocked('a@b.com'))
      assert.doesNotThrow(() => service.logout('u1'))
      assert.doesNotThrow(() => service.logoutAll('u1'))
      assert.doesNotThrow(() => service.register('u1', 'a@b.com'))
      assert.doesNotThrow(() => service.emailVerified('u1', 'a@b.com'))
      assert.doesNotThrow(() => service.passwordResetRequested('a@b.com'))
      assert.doesNotThrow(() => service.passwordResetCompleted('u1'))
      assert.doesNotThrow(() => service.passwordChanged('u1'))
      assert.doesNotThrow(() => service.oauthLogin('u1', 'twitch'))
      assert.doesNotThrow(() => service.oauthLink('u1', 'twitch'))
      assert.doesNotThrow(() => service.oauthUnlink('u1', 'twitch'))
    } finally {
      restore()
    }
  })

  test('x-forwarded-for with multiple IPs uses only the first one', async ({ assert }) => {
    const service = await getService()
    const { infoLogs, restore } = await spyOnLogger()

    const ctx = buildMockCtx({
      forwardedFor: '192.0.2.1, 198.51.100.1, 203.0.113.1',
    })

    try {
      service.log({ event: 'login_success' }, ctx)

      assert.equal(infoLogs[0].data.ip, '192.0.2.1')
    } finally {
      restore()
    }
  })
})
