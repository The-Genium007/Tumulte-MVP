import { test } from '@japa/runner'
import { TokenCheck } from '#services/preflight/checks/token_check'
import type { CheckContext } from '#services/preflight/types'

// ========================================
// HELPERS
// ========================================

/**
 * TokenCheck instantiates its own dependencies internally.
 * To test it in isolation, we override the private properties after construction.
 */
function createTokenCheck(overrides: {
  memberships?: any[]
  mjUser?: any | null
  refreshResult?: boolean
  fetchResponse?: { ok: boolean }
}) {
  const check = new TokenCheck()

  // Override campaignMembershipRepository
  ;(check as any).campaignMembershipRepository = {
    findActiveByCampaign: async () => overrides.memberships || [],
  }

  // Override userRepository
  ;(check as any).userRepository = {
    findByIdWithStreamer: async () => overrides.mjUser ?? null,
  }

  // Override tokenRefreshService
  ;(check as any).tokenRefreshService = {
    refreshStreamerToken: async () =>
      overrides.refreshResult !== undefined ? overrides.refreshResult : true,
  }

  // Mock global fetch for Twitch validation
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (url: string | URL | Request) => {
    const urlStr = typeof url === 'string' ? url : url.toString()
    if (urlStr.includes('id.twitch.tv/oauth2/validate')) {
      return {
        ok: overrides.fetchResponse?.ok ?? true,
        status: overrides.fetchResponse?.ok !== false ? 200 : 401,
      } as Response
    }
    return originalFetch(url)
  }

  return { check, cleanup: () => (globalThis.fetch = originalFetch) }
}

function createMockStreamer(overrides: Record<string, any> = {}) {
  const hasAccessKey = Object.prototype.hasOwnProperty.call(overrides, 'accessToken')
  const hasRefreshKey = Object.prototype.hasOwnProperty.call(overrides, 'refreshToken')
  return {
    id: overrides.id || 'streamer-1',
    twitchDisplayName: overrides.twitchDisplayName || 'TestStreamer',
    isActive: overrides.isActive !== undefined ? overrides.isActive : true,
    getDecryptedAccessToken: async () => (hasAccessKey ? overrides.accessToken : 'mock-at'),
    getDecryptedRefreshToken: async () => (hasRefreshKey ? overrides.refreshToken : 'mock-rt'),
    ...overrides,
  }
}

function createMockMembership(overrides: Record<string, any> = {}) {
  return {
    streamerId: overrides.streamerId || 'streamer-1',
    pollAuthorizationExpiresAt:
      overrides.pollAuthorizationExpiresAt || new Date(Date.now() + 86400000),
    isPollAuthorizationActive:
      overrides.isPollAuthorizationActive !== undefined
        ? overrides.isPollAuthorizationActive
        : true,
    streamer: overrides.streamer || createMockStreamer(),
    ...overrides,
  }
}

// ========================================
// TESTS — TokenCheck metadata
// ========================================

test.group('TokenCheck — metadata', () => {
  test('should have correct name', async ({ assert }) => {
    const check = new TokenCheck()
    assert.equal(check.name, 'tokens')
  })

  test('should apply to all event categories', async ({ assert }) => {
    const check = new TokenCheck()
    assert.deepEqual(check.appliesTo, ['all'])
  })

  test('should have priority 10', async ({ assert }) => {
    const check = new TokenCheck()
    assert.equal(check.priority, 10)
  })
})

// ========================================
// TESTS — execute with all tokens valid
// ========================================

test.group('TokenCheck — all tokens valid', () => {
  test('should pass when all streamer tokens are valid', async ({ assert }) => {
    const streamer = createMockStreamer()
    const membership = createMockMembership({ streamer })

    const { check, cleanup } = createTokenCheck({
      memberships: [membership],
      fetchResponse: { ok: true },
    })

    try {
      const ctx: CheckContext = { campaignId: 'campaign-1', eventType: 'all', mode: 'full' }
      const result = await check.execute(ctx)

      assert.equal(result.status, 'pass')
      assert.equal(result.name, 'tokens')
      assert.exists(result.durationMs)
    } finally {
      cleanup()
    }
  })

  test('should pass when there are no members', async ({ assert }) => {
    const { check, cleanup } = createTokenCheck({
      memberships: [],
    })

    try {
      const ctx: CheckContext = { campaignId: 'campaign-1', eventType: 'all', mode: 'full' }
      const result = await check.execute(ctx)

      assert.equal(result.status, 'pass')
    } finally {
      cleanup()
    }
  })
})

// ========================================
// TESTS — execute with invalid tokens
// ========================================

test.group('TokenCheck — invalid tokens', () => {
  test('should fail when streamer is inactive', async ({ assert }) => {
    const streamer = createMockStreamer({ isActive: false })
    const membership = createMockMembership({ streamer })

    const { check, cleanup } = createTokenCheck({
      memberships: [membership],
    })

    try {
      const ctx: CheckContext = { campaignId: 'campaign-1', eventType: 'all', mode: 'full' }
      const result = await check.execute(ctx)

      assert.equal(result.status, 'fail')
      assert.include(result.message, '1 streamer')
      assert.isArray(result.details)

      const detail = (result.details as any[])[0]
      assert.equal(detail.issue, 'streamer_inactive')
    } finally {
      cleanup()
    }
  })

  test('should fail when poll authorization is missing', async ({ assert }) => {
    const streamer = createMockStreamer()
    const membership = createMockMembership({
      streamer,
      pollAuthorizationExpiresAt: null,
    })

    const { check, cleanup } = createTokenCheck({
      memberships: [membership],
    })

    try {
      const ctx: CheckContext = { campaignId: 'campaign-1', eventType: 'all', mode: 'full' }
      const result = await check.execute(ctx)

      assert.equal(result.status, 'fail')
      const detail = (result.details as any[])[0]
      assert.equal(detail.issue, 'authorization_missing')
    } finally {
      cleanup()
    }
  })

  test('should fail when poll authorization is expired', async ({ assert }) => {
    const streamer = createMockStreamer()
    const membership = createMockMembership({
      streamer,
      isPollAuthorizationActive: false,
    })

    const { check, cleanup } = createTokenCheck({
      memberships: [membership],
    })

    try {
      const ctx: CheckContext = { campaignId: 'campaign-1', eventType: 'all', mode: 'full' }
      const result = await check.execute(ctx)

      assert.equal(result.status, 'fail')
      const detail = (result.details as any[])[0]
      assert.equal(detail.issue, 'authorization_expired')
    } finally {
      cleanup()
    }
  })

  test('should fail when tokens are missing', async ({ assert }) => {
    const streamer = createMockStreamer({
      accessToken: null,
      refreshToken: null,
    })
    const membership = createMockMembership({ streamer })

    const { check, cleanup } = createTokenCheck({
      memberships: [membership],
    })

    try {
      const ctx: CheckContext = { campaignId: 'campaign-1', eventType: 'all', mode: 'full' }
      const result = await check.execute(ctx)

      assert.equal(result.status, 'fail')
      const detail = (result.details as any[])[0]
      assert.equal(detail.issue, 'token_missing')
    } finally {
      cleanup()
    }
  })

  test('should fail when token validation fails and refresh fails', async ({ assert }) => {
    const streamer = createMockStreamer()
    const membership = createMockMembership({ streamer })

    const { check, cleanup } = createTokenCheck({
      memberships: [membership],
      fetchResponse: { ok: false },
      refreshResult: false,
    })

    try {
      const ctx: CheckContext = { campaignId: 'campaign-1', eventType: 'all', mode: 'full' }
      const result = await check.execute(ctx)

      assert.equal(result.status, 'fail')
      const detail = (result.details as any[])[0]
      assert.equal(detail.issue, 'token_invalid')
    } finally {
      cleanup()
    }
  })

  test('should pass when token validation fails but refresh succeeds', async ({ assert }) => {
    const streamer = createMockStreamer()
    const membership = createMockMembership({ streamer })

    const { check, cleanup } = createTokenCheck({
      memberships: [membership],
      fetchResponse: { ok: false },
      refreshResult: true,
    })

    try {
      const ctx: CheckContext = { campaignId: 'campaign-1', eventType: 'all', mode: 'full' }
      const result = await check.execute(ctx)

      assert.equal(result.status, 'pass')
    } finally {
      cleanup()
    }
  })
})

// ========================================
// TESTS — MJ token check
// ========================================

test.group('TokenCheck — MJ token check', () => {
  test('should check MJ token when userId is provided', async ({ assert }) => {
    const mjStreamer = createMockStreamer({ id: 'mj-streamer' })
    const mjUser = { streamer: mjStreamer }

    const { check, cleanup } = createTokenCheck({
      mjUser,
      memberships: [],
      fetchResponse: { ok: true },
    })

    try {
      const ctx: CheckContext = {
        campaignId: 'campaign-1',
        userId: 'user-1',
        eventType: 'all',
        mode: 'full',
      }
      const result = await check.execute(ctx)

      assert.equal(result.status, 'pass')
    } finally {
      cleanup()
    }
  })

  test('should skip MJ check when userId is not provided', async ({ assert }) => {
    const { check, cleanup } = createTokenCheck({
      memberships: [],
    })

    try {
      const ctx: CheckContext = { campaignId: 'campaign-1', eventType: 'all', mode: 'full' }
      const result = await check.execute(ctx)

      assert.equal(result.status, 'pass')
    } finally {
      cleanup()
    }
  })

  test('should not re-check MJ streamer in campaign members', async ({ assert }) => {
    let fetchCallCount = 0
    const originalFetch = globalThis.fetch

    const mjStreamer = createMockStreamer({ id: 'streamer-shared' })
    const mjUser = { streamer: mjStreamer }

    const membership = createMockMembership({
      streamerId: 'streamer-shared',
      streamer: createMockStreamer({ id: 'streamer-shared' }),
    })

    const check = new TokenCheck()
    ;(check as any).campaignMembershipRepository = {
      findActiveByCampaign: async () => [membership],
    }
    ;(check as any).userRepository = {
      findByIdWithStreamer: async () => mjUser,
    }
    ;(check as any).tokenRefreshService = {
      refreshStreamerToken: async () => true,
    }

    globalThis.fetch = async () => {
      fetchCallCount++
      return { ok: true, status: 200 } as Response
    }

    try {
      const ctx: CheckContext = {
        campaignId: 'campaign-1',
        userId: 'user-1',
        eventType: 'all',
        mode: 'full',
      }
      await check.execute(ctx)

      // MJ streamer should only be checked once, not again in members
      assert.equal(fetchCallCount, 1)
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

// ========================================
// TESTS — error handling
// ========================================

test.group('TokenCheck — error handling', () => {
  test('should return fail on unexpected errors', async ({ assert }) => {
    const check = new TokenCheck()
    ;(check as any).campaignMembershipRepository = {
      findActiveByCampaign: async () => {
        throw new Error('DB crashed')
      },
    }
    ;(check as any).userRepository = {
      findByIdWithStreamer: async () => null,
    }

    const ctx: CheckContext = { campaignId: 'campaign-1', eventType: 'all', mode: 'full' }
    const result = await check.execute(ctx)

    assert.equal(result.status, 'fail')
    assert.include(result.message, 'DB crashed')
  })

  test('should include remediation text for each issue type', async ({ assert }) => {
    const streamers = [
      createMockStreamer({ id: 's1', isActive: false, twitchDisplayName: 'Inactive' }),
    ]

    const memberships = [
      createMockMembership({
        streamerId: 's1',
        streamer: streamers[0],
      }),
    ]

    const { check, cleanup } = createTokenCheck({
      memberships,
    })

    try {
      const ctx: CheckContext = { campaignId: 'campaign-1', eventType: 'all', mode: 'full' }
      const result = await check.execute(ctx)

      assert.equal(result.status, 'fail')
      assert.exists(result.remediation)
      assert.include(result.remediation!, 'Inactive')
    } finally {
      cleanup()
    }
  })

  test('should handle streamer token decryption errors', async ({ assert }) => {
    const streamer = createMockStreamer({
      getDecryptedAccessToken: async () => {
        throw new Error('Decryption failed')
      },
    })
    const membership = createMockMembership({ streamer })

    const { check, cleanup } = createTokenCheck({
      memberships: [membership],
    })

    try {
      const ctx: CheckContext = { campaignId: 'campaign-1', eventType: 'all', mode: 'full' }
      const result = await check.execute(ctx)

      assert.equal(result.status, 'fail')
      const detail = (result.details as any[])[0]
      assert.equal(detail.issue, 'token_invalid')
      assert.include(detail.error, 'Decryption failed')
    } finally {
      cleanup()
    }
  })
})

// ========================================
// TESTS — multiple streamers
// ========================================

test.group('TokenCheck — multiple streamers', () => {
  test('should report multiple invalid streamers', async ({ assert }) => {
    const memberships = [
      createMockMembership({
        streamerId: 's1',
        streamer: createMockStreamer({ id: 's1', isActive: false, twitchDisplayName: 'Streamer1' }),
      }),
      createMockMembership({
        streamerId: 's2',
        pollAuthorizationExpiresAt: null,
        streamer: createMockStreamer({ id: 's2', twitchDisplayName: 'Streamer2' }),
      }),
    ]

    const { check, cleanup } = createTokenCheck({ memberships })

    try {
      const ctx: CheckContext = { campaignId: 'campaign-1', eventType: 'all', mode: 'full' }
      const result = await check.execute(ctx)

      assert.equal(result.status, 'fail')
      assert.include(result.message, '2 streamer')
      assert.lengthOf(result.details as any[], 2)
    } finally {
      cleanup()
    }
  })

  test('should skip members without streamer relation', async ({ assert }) => {
    const memberships = [createMockMembership({ streamer: null })]

    const { check, cleanup } = createTokenCheck({
      memberships,
      fetchResponse: { ok: true },
    })

    try {
      const ctx: CheckContext = { campaignId: 'campaign-1', eventType: 'all', mode: 'full' }
      const result = await check.execute(ctx)

      assert.equal(result.status, 'pass')
    } finally {
      cleanup()
    }
  })
})
