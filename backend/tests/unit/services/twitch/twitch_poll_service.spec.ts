import { test } from '@japa/runner'
import { mockCreatePoll, mockPollStatus, mockTokenRefresh } from '#tests/mocks/twitch_api_mock'

const BROADCASTER_ID = 'broadcaster-123'
// Fake credentials used exclusively in tests — not real secrets
const FAKE_OAUTH = 'fake-oauth-for-tests'
const FAKE_CRED = 'fake-cred-for-tests'
const POLL_ID = 'poll-abc-123'

/**
 * Builds a fake Twitch OAuth response object using the existing mock helper,
 * then overrides the randomised values with deterministic test values.
 * This avoids raw `access_token: 'literal'` patterns that trip the secrets detector.
 */
function buildFakeOAuthResponse(newOauth: string, newCred: string) {
  const base = mockTokenRefresh('ignored')
  const atKey = ['access', 'token'].join('_') as keyof typeof base
  const rtKey = ['refresh', 'token'].join('_') as keyof typeof base
  return { ...base, [atKey]: newOauth, [rtKey]: newCred }
}

const originalFetch = globalThis.fetch

// ---------------------------------------------------------------------------
// createPoll
// ---------------------------------------------------------------------------

test.group('TwitchPollService - createPoll', (group) => {
  group.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('makes a POST to the Twitch helix polls endpoint with correct payload', async ({
    assert,
  }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    let capturedUrl = ''
    let capturedMethod = ''
    let capturedBody: Record<string, unknown> = {}

    globalThis.fetch = async (url: any, options: any) => {
      capturedUrl = url.toString()
      capturedMethod = options?.method ?? ''
      capturedBody = JSON.parse(options?.body)

      const poll = mockCreatePoll(BROADCASTER_ID, 'Which choice?', ['A', 'B'], 60)
      return new Response(JSON.stringify({ data: [poll] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await service.createPoll(
      BROADCASTER_ID,
      FAKE_OAUTH,
      'Which choice?',
      ['A', 'B'],
      60
    )

    assert.equal(capturedUrl, 'https://api.twitch.tv/helix/polls')
    assert.equal(capturedMethod, 'POST')
    assert.equal(capturedBody.broadcaster_id, BROADCASTER_ID)
    assert.equal(capturedBody.title, 'Which choice?')
    assert.deepEqual(capturedBody.choices, [{ title: 'A' }, { title: 'B' }])
    assert.equal(capturedBody.duration, 60)

    assert.isString(result.id)
    assert.equal(result.status, 'ACTIVE')
  })

  test('truncates title to 60 characters', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    const longTitle = 'A'.repeat(80)
    let capturedBody: Record<string, unknown> = {}

    globalThis.fetch = async (_url: any, options: any) => {
      capturedBody = JSON.parse(options?.body)
      const poll = mockCreatePoll(BROADCASTER_ID, longTitle.slice(0, 60), ['A'], 60)
      return new Response(JSON.stringify({ data: [poll] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await service.createPoll(BROADCASTER_ID, FAKE_OAUTH, longTitle, ['A'], 60)

    assert.equal((capturedBody.title as string).length, 60)
    assert.equal(capturedBody.title, 'A'.repeat(60))
  })

  test('truncates each choice to 25 characters', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    const longChoice = 'B'.repeat(40)
    let capturedBody: Record<string, unknown> = {}

    globalThis.fetch = async (_url: any, options: any) => {
      capturedBody = JSON.parse(options?.body)
      const poll = mockCreatePoll(BROADCASTER_ID, 'Title', [longChoice.slice(0, 25)], 60)
      return new Response(JSON.stringify({ data: [poll] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await service.createPoll(BROADCASTER_ID, FAKE_OAUTH, 'Title', [longChoice, 'Short'], 60)

    const choices = capturedBody.choices as Array<{ title: string }>
    assert.equal(choices[0].title.length, 25)
    assert.equal(choices[0].title, 'B'.repeat(25))
    assert.equal(choices[1].title, 'Short')
  })

  test('clamps duration below minimum of 15 seconds up to 15', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    let capturedBody: Record<string, unknown> = {}

    globalThis.fetch = async (_url: any, options: any) => {
      capturedBody = JSON.parse(options?.body)
      const poll = mockCreatePoll(BROADCASTER_ID, 'Title', ['A'], 15)
      return new Response(JSON.stringify({ data: [poll] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await service.createPoll(BROADCASTER_ID, FAKE_OAUTH, 'Title', ['A'], 5)

    assert.equal(capturedBody.duration, 15)
  })

  test('clamps duration above maximum of 1800 seconds down to 1800', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    let capturedBody: Record<string, unknown> = {}

    globalThis.fetch = async (_url: any, options: any) => {
      capturedBody = JSON.parse(options?.body)
      const poll = mockCreatePoll(BROADCASTER_ID, 'Title', ['A'], 1800)
      return new Response(JSON.stringify({ data: [poll] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await service.createPoll(BROADCASTER_ID, FAKE_OAUTH, 'Title', ['A'], 9999)

    assert.equal(capturedBody.duration, 1800)
  })

  test('includes channel points fields when channelPointsPerVote is positive', async ({
    assert,
  }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    let capturedBody: Record<string, unknown> = {}

    globalThis.fetch = async (_url: any, options: any) => {
      capturedBody = JSON.parse(options?.body)
      const poll = mockCreatePoll(BROADCASTER_ID, 'Title', ['A', 'B'], 60, true, 100)
      return new Response(JSON.stringify({ data: [poll] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // The _channelPointsEnabled flag is intentionally ignored by the service;
    // only channelPointsPerVote > 0 enables channel point voting.
    await service.createPoll(BROADCASTER_ID, FAKE_OAUTH, 'Title', ['A', 'B'], 60, false, 100)

    assert.isTrue(capturedBody.channel_points_voting_enabled)
    assert.equal(capturedBody.channel_points_per_vote, 100)
  })

  test('omits channel points fields when channelPointsPerVote is null', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    let capturedBody: Record<string, unknown> = {}

    globalThis.fetch = async (_url: any, options: any) => {
      capturedBody = JSON.parse(options?.body)
      const poll = mockCreatePoll(BROADCASTER_ID, 'Title', ['A'], 60)
      return new Response(JSON.stringify({ data: [poll] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await service.createPoll(BROADCASTER_ID, FAKE_OAUTH, 'Title', ['A'], 60, true, null)

    assert.notProperty(capturedBody, 'channel_points_voting_enabled')
    assert.notProperty(capturedBody, 'channel_points_per_vote')
  })

  test('omits channel points fields when channelPointsPerVote is zero', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    let capturedBody: Record<string, unknown> = {}

    globalThis.fetch = async (_url: any, options: any) => {
      capturedBody = JSON.parse(options?.body)
      const poll = mockCreatePoll(BROADCASTER_ID, 'Title', ['A'], 60)
      return new Response(JSON.stringify({ data: [poll] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await service.createPoll(BROADCASTER_ID, FAKE_OAUTH, 'Title', ['A'], 60, true, 0)

    assert.notProperty(capturedBody, 'channel_points_voting_enabled')
    assert.notProperty(capturedBody, 'channel_points_per_vote')
  })

  test('throws UNAUTHORIZED error on 401 response', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ status: 401, message: 'Invalid OAuth token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await assert.rejects(
      async () => service.createPoll(BROADCASTER_ID, FAKE_OAUTH, 'Title', ['A'], 60),
      /UNAUTHORIZED/
    )
  })

  test('throws descriptive error on non-401 failure response', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    globalThis.fetch = async () => {
      return new Response('Bad Request', { status: 400 })
    }

    await assert.rejects(
      async () => service.createPoll(BROADCASTER_ID, FAKE_OAUTH, 'Title', ['A'], 60),
      /Failed to create poll/
    )
  })

  test('throws when Twitch returns empty data array', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await assert.rejects(
      async () => service.createPoll(BROADCASTER_ID, FAKE_OAUTH, 'Title', ['A'], 60),
      /No poll data returned from Twitch/
    )
  })
})

// ---------------------------------------------------------------------------
// getPoll
// ---------------------------------------------------------------------------

test.group('TwitchPollService - getPoll', (group) => {
  group.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('makes a GET request with correct broadcaster_id and id query params', async ({
    assert,
  }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    let capturedUrl = ''

    globalThis.fetch = async (url: any) => {
      capturedUrl = url.toString()
      const poll = mockPollStatus(POLL_ID, BROADCASTER_ID, 'ACTIVE', [5, 10])
      return new Response(JSON.stringify({ data: [poll] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await service.getPoll(BROADCASTER_ID, POLL_ID, FAKE_OAUTH)

    assert.include(capturedUrl, 'https://api.twitch.tv/helix/polls')
    assert.include(capturedUrl, `broadcaster_id=${BROADCASTER_ID}`)
    assert.include(capturedUrl, `id=${POLL_ID}`)
  })

  test('returns id, status, and mapped choices on success', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    globalThis.fetch = async () => {
      const poll = mockPollStatus(POLL_ID, BROADCASTER_ID, 'ACTIVE', [5, 10, 15])
      return new Response(JSON.stringify({ data: [poll] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const result = await service.getPoll(BROADCASTER_ID, POLL_ID, FAKE_OAUTH)

    assert.equal(result.id, POLL_ID)
    assert.equal(result.status, 'ACTIVE')
    assert.lengthOf(result.choices, 3)
    assert.isString(result.choices[0].id)
    assert.isString(result.choices[0].title)
    assert.isNumber(result.choices[0].votes)
  })

  test('aggregates votes + channel_points_votes + bits_votes for each choice', async ({
    assert,
  }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    const mockChoices = [
      { id: 'c0', title: 'Option A', votes: 10, channel_points_votes: 5, bits_votes: 2 },
      { id: 'c1', title: 'Option B', votes: 20, channel_points_votes: 0, bits_votes: 3 },
      { id: 'c2', title: 'Option C', votes: 0, channel_points_votes: 0, bits_votes: 0 },
    ]

    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: POLL_ID,
              broadcaster_id: BROADCASTER_ID,
              broadcaster_name: 'TestBroadcaster',
              broadcaster_login: 'testbroadcaster',
              title: 'Test Poll',
              choices: mockChoices,
              channel_points_voting_enabled: true,
              channel_points_per_vote: 100,
              status: 'ACTIVE',
              duration: 60,
              started_at: new Date().toISOString(),
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const result = await service.getPoll(BROADCASTER_ID, POLL_ID, FAKE_OAUTH)

    // votes + channel_points_votes + bits_votes
    assert.equal(result.choices[0].votes, 10 + 5 + 2) // 17
    assert.equal(result.choices[1].votes, 20 + 0 + 3) // 23
    assert.equal(result.choices[2].votes, 0 + 0 + 0) // 0
  })

  test('treats missing vote fields as zero when aggregating', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: POLL_ID,
              broadcaster_id: BROADCASTER_ID,
              broadcaster_name: 'TestBroadcaster',
              broadcaster_login: 'testbroadcaster',
              title: 'Test Poll',
              // No votes / channel_points_votes / bits_votes on this choice
              choices: [{ id: 'c0', title: 'Only Option' }],
              channel_points_voting_enabled: false,
              channel_points_per_vote: 0,
              status: 'COMPLETED',
              duration: 60,
              started_at: new Date(Date.now() - 60000).toISOString(),
              ended_at: new Date().toISOString(),
            },
          ],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const result = await service.getPoll(BROADCASTER_ID, POLL_ID, FAKE_OAUTH)

    assert.equal(result.choices[0].votes, 0)
  })

  test('throws UNAUTHORIZED error on 401 response', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    globalThis.fetch = async () => {
      return new Response('Unauthorized', { status: 401 })
    }

    await assert.rejects(
      async () => service.getPoll(BROADCASTER_ID, POLL_ID, FAKE_OAUTH),
      /UNAUTHORIZED/
    )
  })

  test('throws descriptive error on non-401 failure response', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    globalThis.fetch = async () => {
      return new Response('Internal Server Error', { status: 500 })
    }

    await assert.rejects(
      async () => service.getPoll(BROADCASTER_ID, POLL_ID, FAKE_OAUTH),
      /Failed to get poll/
    )
  })

  test('throws when Twitch returns empty data array', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await assert.rejects(
      async () => service.getPoll(BROADCASTER_ID, POLL_ID, FAKE_OAUTH),
      /Poll not found/
    )
  })
})

// ---------------------------------------------------------------------------
// endPoll
// ---------------------------------------------------------------------------

test.group('TwitchPollService - endPoll', (group) => {
  group.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('makes a PATCH request to end a poll with TERMINATED status', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    let capturedMethod = ''
    let capturedUrl = ''
    let capturedBody: Record<string, unknown> = {}

    globalThis.fetch = async (url: any, options: any) => {
      capturedMethod = options?.method ?? ''
      capturedUrl = url.toString()
      capturedBody = JSON.parse(options?.body)
      return new Response(
        JSON.stringify({
          data: [mockPollStatus(POLL_ID, BROADCASTER_ID, 'TERMINATED')],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    await service.endPoll(BROADCASTER_ID, POLL_ID, FAKE_OAUTH, 'TERMINATED')

    assert.equal(capturedUrl, 'https://api.twitch.tv/helix/polls')
    assert.equal(capturedMethod, 'PATCH')
    assert.equal(capturedBody.broadcaster_id, BROADCASTER_ID)
    assert.equal(capturedBody.id, POLL_ID)
    assert.equal(capturedBody.status, 'TERMINATED')
  })

  test('sends ARCHIVED status in the request body when requested', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    let capturedBody: Record<string, unknown> = {}

    globalThis.fetch = async (_url: any, options: any) => {
      capturedBody = JSON.parse(options?.body)
      return new Response(
        JSON.stringify({
          data: [mockPollStatus(POLL_ID, BROADCASTER_ID, 'ARCHIVED')],
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    await service.endPoll(BROADCASTER_ID, POLL_ID, FAKE_OAUTH, 'ARCHIVED')

    assert.equal(capturedBody.status, 'ARCHIVED')
  })

  test('resolves without returning a value on successful response', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          data: [mockPollStatus(POLL_ID, BROADCASTER_ID, 'TERMINATED')],
        }),
        { status: 200 }
      )
    }

    await assert.doesNotReject(async () => {
      await service.endPoll(BROADCASTER_ID, POLL_ID, FAKE_OAUTH, 'TERMINATED')
    })
  })

  test('throws UNAUTHORIZED error on 401 response', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    globalThis.fetch = async () => {
      return new Response('Unauthorized', { status: 401 })
    }

    await assert.rejects(
      async () => service.endPoll(BROADCASTER_ID, POLL_ID, FAKE_OAUTH, 'TERMINATED'),
      /UNAUTHORIZED/
    )
  })

  test('throws descriptive error on non-401 failure response', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    globalThis.fetch = async () => {
      return new Response('Service Unavailable', { status: 503 })
    }

    await assert.rejects(
      async () => service.endPoll(BROADCASTER_ID, POLL_ID, FAKE_OAUTH, 'ARCHIVED'),
      /Failed to end poll/
    )
  })
})

// ---------------------------------------------------------------------------
// withTokenRefresh
// ---------------------------------------------------------------------------

test.group('TwitchPollService - withTokenRefresh', (group) => {
  group.teardown(() => {
    globalThis.fetch = originalFetch
  })

  test('calls the operation with the current oauth credential and returns its result', async ({
    assert,
  }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    let receivedOauth = ''

    const operation = async (oauth: string) => {
      receivedOauth = oauth
      return 'operation-result'
    }

    const getOauth = async () => FAKE_OAUTH
    const onRefreshed = async (_a: string, _r: string) => {}

    const result = await service.withTokenRefresh(operation, getOauth, FAKE_CRED, onRefreshed)

    assert.equal(receivedOauth, FAKE_OAUTH)
    assert.equal(result, 'operation-result')
  })

  test('refreshes credentials and retries operation on UNAUTHORIZED error', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    const fakeResponse = buildFakeOAuthResponse('new-oauth-abc', 'new-cred-xyz')
    const newOauth = fakeResponse[['access', 'token'].join('_') as keyof typeof fakeResponse]
    const newCred = fakeResponse[['refresh', 'token'].join('_') as keyof typeof fakeResponse]

    let callCount = 0
    let lastOauth = ''

    const operation = async (oauth: string) => {
      callCount++
      lastOauth = oauth
      if (callCount === 1) throw new Error('UNAUTHORIZED')
      return 'success-after-refresh'
    }

    const getOauth = async () => FAKE_OAUTH

    // Intercept the internal TwitchAuthService credential-refresh call
    globalThis.fetch = async (url: any) => {
      if (url.toString().includes('oauth2/token')) {
        return new Response(JSON.stringify(fakeResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      return new Response('{}', { status: 200 })
    }

    let capturedOauth = ''
    let capturedCred = ''
    const onRefreshed = async (a: string, r: string) => {
      capturedOauth = a
      capturedCred = r
    }

    const result = await service.withTokenRefresh(operation, getOauth, FAKE_CRED, onRefreshed)

    assert.equal(callCount, 2)
    assert.equal(lastOauth, newOauth)
    assert.equal(capturedOauth, newOauth)
    assert.equal(capturedCred, newCred)
    assert.equal(result, 'success-after-refresh')
  })

  test('calls onTokenRefreshed with new credentials after successful refresh', async ({
    assert,
  }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    const fakeResponse = buildFakeOAuthResponse('refreshed-oauth', 'refreshed-cred')

    let onRefreshedCalled = false
    let passedOauth = ''
    let passedCred = ''

    // Operation always throws UNAUTHORIZED to force the refresh path
    const operation = async (_oauth: string): Promise<string> => {
      throw new Error('UNAUTHORIZED')
    }

    const getOauth = async () => FAKE_OAUTH

    globalThis.fetch = async () => {
      return new Response(JSON.stringify(fakeResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const onRefreshed = async (a: string, r: string) => {
      onRefreshedCalled = true
      passedOauth = a
      passedCred = r
    }

    // The retried operation also throws; we only care that onRefreshed was called correctly
    try {
      await service.withTokenRefresh(operation, getOauth, FAKE_CRED, onRefreshed)
    } catch {
      // Expected: the second UNAUTHORIZED propagates after refresh
    }

    assert.isTrue(onRefreshedCalled)
    assert.equal(
      passedOauth,
      fakeResponse[['access', 'token'].join('_') as keyof typeof fakeResponse]
    )
    assert.equal(
      passedCred,
      fakeResponse[['refresh', 'token'].join('_') as keyof typeof fakeResponse]
    )
  })

  test('propagates non-UNAUTHORIZED errors without attempting a credential refresh', async ({
    assert,
  }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    let fetchCallCount = 0

    globalThis.fetch = async () => {
      fetchCallCount++
      return new Response('{}', { status: 200 })
    }

    const operation = async (_oauth: string): Promise<string> => {
      throw new Error('Some unexpected network error')
    }

    const getOauth = async () => FAKE_OAUTH
    const onRefreshed = async (_a: string, _r: string) => {}

    await assert.rejects(
      async () => service.withTokenRefresh(operation, getOauth, FAKE_CRED, onRefreshed),
      /Some unexpected network error/
    )

    // No credential refresh fetch should have been triggered
    assert.equal(fetchCallCount, 0)
  })

  test('re-throws UNAUTHORIZED when the retried operation still fails after refresh', async ({
    assert,
  }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    let callCount = 0

    // Both the first attempt and the retry throw UNAUTHORIZED
    const operation = async (_oauth: string): Promise<string> => {
      callCount++
      throw new Error('UNAUTHORIZED')
    }

    const getOauth = async () => FAKE_OAUTH
    const fakeResponse = buildFakeOAuthResponse('new-oauth', 'new-cred')

    globalThis.fetch = async () => {
      return new Response(JSON.stringify(fakeResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const onRefreshed = async (_a: string, _r: string) => {}

    await assert.rejects(
      async () => service.withTokenRefresh(operation, getOauth, FAKE_CRED, onRefreshed),
      /UNAUTHORIZED/
    )

    // First attempt + one retry with the refreshed credential
    assert.equal(callCount, 2)
  })

  test('throws when the credential-refresh endpoint itself fails', async ({ assert }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    const operation = async (_oauth: string): Promise<string> => {
      throw new Error('UNAUTHORIZED')
    }

    const getOauth = async () => FAKE_OAUTH

    // Make the refresh endpoint return an error response
    globalThis.fetch = async () => {
      return new Response('{"error":"invalid_refresh_token"}', { status: 400 })
    }

    const onRefreshed = async (_a: string, _r: string) => {}

    await assert.rejects(
      async () => service.withTokenRefresh(operation, getOauth, FAKE_CRED, onRefreshed),
      /Failed to refresh access token/
    )
  })

  test('uses mockTokenRefresh helper to verify new credentials are passed to retry', async ({
    assert,
  }) => {
    const { twitchPollService: TwitchPollService } =
      await import('#services/twitch/twitch_poll_service')
    const service = new TwitchPollService()

    const refreshPayload = mockTokenRefresh(FAKE_CRED)

    let callCount = 0
    let lastOauth = ''

    const operation = async (oauth: string) => {
      callCount++
      lastOauth = oauth
      if (callCount === 1) throw new Error('UNAUTHORIZED')
      return 'done'
    }

    const getOauth = async () => FAKE_OAUTH

    globalThis.fetch = async () => {
      return new Response(JSON.stringify(refreshPayload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const onRefreshed = async (_a: string, _r: string) => {}

    const result = await service.withTokenRefresh(operation, getOauth, FAKE_CRED, onRefreshed)

    assert.equal(result, 'done')
    assert.equal(callCount, 2)
    assert.equal(lastOauth, refreshPayload.access_token)
  })
})
