import { describe, test, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { usePollsStore } from '~/stores/polls'
import { createMockPoll, createMockPollInstance } from '../../helpers/mockFactory'

// Mock fetch globally
global.fetch = vi.fn()

describe('Polls Store (new architecture)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Mock useRuntimeConfig
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: 'http://localhost:3333/api/v2',
      },
    } as ReturnType<typeof useRuntimeConfig>)
  })

  test('should initialize with default state', () => {
    const store = usePollsStore()

    expect(store.polls).toEqual([])
    expect(store.activePollInstance).toBeNull()
    expect(store.lastLaunchedPollId).toBeNull()
    expect(store.loading).toBe(false)
    expect(store.launching).toBe(false)
    expect(store.error).toBeNull()
  })

  test('hasActivePoll should return true when there is an active poll instance', () => {
    const store = usePollsStore()

    expect(store.hasActivePoll).toBe(false)

    store.activePollInstance = createMockPollInstance()

    expect(store.hasActivePoll).toBe(true)
  })

  test('sortedPolls should return polls sorted by updatedAt DESC', () => {
    const store = usePollsStore()

    store.polls = [
      createMockPoll({ id: '1', updatedAt: '2024-01-01T00:00:00Z' }),
      createMockPoll({ id: '2', updatedAt: '2024-01-03T00:00:00Z' }),
      createMockPoll({ id: '3', updatedAt: '2024-01-02T00:00:00Z' }),
    ]

    const sorted = store.sortedPolls

    expect(sorted[0]!.id).toBe('2') // Most recent
    expect(sorted[1]!.id).toBe('3')
    expect(sorted[2]!.id).toBe('1') // Oldest
  })

  test('fetchPolls() should load polls for a campaign', async () => {
    const mockPolls = [
      createMockPoll({ id: 'poll-1', campaignId: 'campaign-123' }),
      createMockPoll({ id: 'poll-2', campaignId: 'campaign-123' }),
    ]

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockPolls }),
    } as Response)

    const store = usePollsStore()
    await store.fetchPolls('campaign-123')

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3333/api/v2/mj/campaigns/campaign-123/polls',
      { credentials: 'include' }
    )
    expect(store.polls).toEqual(mockPolls)
    expect(store.loading).toBe(false)
  })

  test('fetchPolls() should set active poll instance if returned', async () => {
    const mockPolls = [createMockPoll()]
    const mockActivePollInstance = createMockPollInstance({
      status: 'RUNNING',
    })

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mockPolls,
        activePollInstance: mockActivePollInstance,
      }),
    } as Response)

    const store = usePollsStore()
    await store.fetchPolls('campaign-123')

    expect(store.activePollInstance).toEqual(mockActivePollInstance)
  })

  test('fetchPolls() should handle errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const store = usePollsStore()
    await store.fetchPolls('campaign-123')

    expect(store.polls).toEqual([])
    expect(store.error).toBe('Impossible de charger les sondages')

    consoleErrorSpy.mockRestore()
  })

  test('createPoll() should create a new poll', async () => {
    const newPoll = createMockPoll({
      id: 'new-poll',
      question: 'Test question?',
    })

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: newPoll }),
    } as Response)

    const store = usePollsStore()
    const result = await store.createPoll('campaign-123', {
      question: 'Test question?',
      options: ['Option 1', 'Option 2'],
      type: 'STANDARD',
      durationSeconds: 60,
    })

    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:3333/api/v2/mj/campaigns/campaign-123/polls',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          question: 'Test question?',
          options: ['Option 1', 'Option 2'],
          type: 'STANDARD',
          durationSeconds: 60,
        }),
      }
    )
    expect(result).toEqual(newPoll)
    expect(store.polls).toContainEqual(newPoll)
  })

  test('createPoll() should handle errors', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Validation error' }),
    } as Response)

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const store = usePollsStore()

    await expect(
      store.createPoll('campaign-123', {
        question: 'Test?',
        options: ['A'],
      })
    ).rejects.toThrow('Validation error')

    consoleErrorSpy.mockRestore()
  })

  test('updatePoll() should update an existing poll', async () => {
    const existingPoll = createMockPoll({
      id: 'poll-1',
      question: 'Old question',
    })
    const updatedPoll = createMockPoll({
      id: 'poll-1',
      question: 'New question',
    })

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedPoll }),
    } as Response)

    const store = usePollsStore()
    store.polls = [existingPoll]

    const result = await store.updatePoll('poll-1', {
      question: 'New question',
    })

    expect(fetch).toHaveBeenCalledWith('http://localhost:3333/api/v2/mj/polls/poll-1', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ question: 'New question' }),
    })
    expect(result.question).toBe('New question')
    expect(store.polls[0]!.question).toBe('New question')
  })

  test('deletePoll() should remove poll from list', async () => {
    const poll1 = createMockPoll({ id: 'poll-1' })
    const poll2 = createMockPoll({ id: 'poll-2' })

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
    } as Response)

    const store = usePollsStore()
    store.polls = [poll1, poll2]

    await store.deletePoll('poll-1')

    expect(fetch).toHaveBeenCalledWith('http://localhost:3333/api/v2/mj/polls/poll-1', {
      method: 'DELETE',
      credentials: 'include',
    })
    expect(store.polls).toHaveLength(1)
    expect(store.polls[0]!.id).toBe('poll-2')
  })

  test('launchPoll() should launch a poll and set active instance', async () => {
    const pollInstance = createMockPollInstance({
      id: 'instance-1',
      pollId: 'poll-1',
      status: 'RUNNING',
    })

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: pollInstance, pollId: 'poll-1' }),
    } as Response)

    const store = usePollsStore()
    store.polls = [createMockPoll({ id: 'poll-1' })]

    const result = await store.launchPoll('poll-1')

    expect(fetch).toHaveBeenCalledWith('http://localhost:3333/api/v2/mj/polls/poll-1/launch', {
      method: 'POST',
      credentials: 'include',
    })
    expect(result.pollInstance).toEqual(pollInstance)
    expect(result.pollId).toBe('poll-1')
    expect(store.activePollInstance).toEqual(pollInstance)
    expect(store.lastLaunchedPollId).toBe('poll-1')
  })

  test('launchPoll() should handle conflict (poll already running)', async () => {
    const activePoll = createMockPollInstance({ status: 'RUNNING' })

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        error: 'Un sondage est déjà en cours',
        activePollInstance: activePoll,
      }),
    } as Response)

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const store = usePollsStore()

    await expect(store.launchPoll('poll-1')).rejects.toThrow('Un sondage est déjà en cours')
    expect(store.activePollInstance).toEqual(activePoll)

    consoleErrorSpy.mockRestore()
  })

  test('launchPoll() should handle 503 (streamers not ready)', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({
        error: 'Les streamers ne sont pas prêts',
      }),
    } as Response)

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const store = usePollsStore()

    await expect(store.launchPoll('poll-1')).rejects.toThrow('Les streamers ne sont pas prêts')

    consoleErrorSpy.mockRestore()
  })

  test('cancelPoll() should cancel active poll and clear instance', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
    } as Response)

    const store = usePollsStore()
    store.activePollInstance = createMockPollInstance({ status: 'RUNNING' })

    await store.cancelPoll('instance-1')

    expect(fetch).toHaveBeenCalledWith('http://localhost:3333/api/v2/mj/polls/instance-1/cancel', {
      method: 'POST',
      credentials: 'include',
    })
    expect(store.activePollInstance).toBeNull()
  })

  test('clearActivePoll() should set active poll instance to null', () => {
    const store = usePollsStore()
    store.activePollInstance = createMockPollInstance()

    store.clearActivePoll()

    expect(store.activePollInstance).toBeNull()
  })

  test('setActivePollInstance() should set active poll and update lastLaunchedPollId', () => {
    const store = usePollsStore()
    const instance = createMockPollInstance({
      pollId: 'poll-123',
      status: 'RUNNING',
    })

    store.setActivePollInstance(instance)

    expect(store.activePollInstance).toEqual(instance)
    expect(store.lastLaunchedPollId).toBe('poll-123')
  })

  test('clearPolls() should reset all state', () => {
    const store = usePollsStore()
    store.polls = [createMockPoll()]
    store.activePollInstance = createMockPollInstance()
    store.lastLaunchedPollId = 'poll-1'
    store.error = 'Some error'

    store.clearPolls()

    expect(store.polls).toEqual([])
    expect(store.activePollInstance).toBeNull()
    expect(store.lastLaunchedPollId).toBeNull()
    expect(store.error).toBeNull()
  })

  test('markPollEnded() should set lastPollEndedAt to current date', () => {
    const store = usePollsStore()

    expect(store.lastPollEndedAt).toBeNull()

    const beforeCall = new Date()
    store.markPollEnded()
    const afterCall = new Date()

    expect(store.lastPollEndedAt).not.toBeNull()
    expect(store.lastPollEndedAt!.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime())
    expect(store.lastPollEndedAt!.getTime()).toBeLessThanOrEqual(afterCall.getTime())
  })

  test('setActivePollInstance() with null should clear active poll but not lastLaunchedPollId', () => {
    const store = usePollsStore()
    store.activePollInstance = createMockPollInstance({ pollId: 'poll-123' })
    store.lastLaunchedPollId = 'poll-123'

    store.setActivePollInstance(null)

    expect(store.activePollInstance).toBeNull()
    expect(store.lastLaunchedPollId).toBe('poll-123') // Should remain unchanged
  })

  test('createPoll() should track first poll creation', async () => {
    const newPoll = createMockPoll({
      id: 'first-poll',
      question: 'First poll ever?',
    })

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: newPoll }),
    } as Response)

    const store = usePollsStore()
    // Ensure polls is empty (first poll scenario)
    store.polls = []

    await store.createPoll('campaign-123', {
      question: 'First poll ever?',
      options: ['Yes', 'No'],
    })

    // Poll should be added
    expect(store.polls).toHaveLength(1)
    expect(store.polls[0]!.id).toBe('first-poll')
  })

  test('launchPoll() should update lastLaunchedAt in polls list', async () => {
    const poll = createMockPoll({ id: 'poll-1', lastLaunchedAt: null })
    const pollInstance = createMockPollInstance({
      id: 'instance-1',
      pollId: 'poll-1',
      status: 'RUNNING',
    })

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: pollInstance, pollId: 'poll-1' }),
    } as Response)

    const store = usePollsStore()
    store.polls = [poll]

    const beforeLaunch = new Date()
    await store.launchPoll('poll-1')

    // lastLaunchedAt should be updated
    const updatedPoll = store.polls.find((p) => p.id === 'poll-1')
    expect(updatedPoll?.lastLaunchedAt).not.toBeNull()
    expect(new Date(updatedPoll!.lastLaunchedAt!).getTime()).toBeGreaterThanOrEqual(
      beforeLaunch.getTime()
    )
  })
})
