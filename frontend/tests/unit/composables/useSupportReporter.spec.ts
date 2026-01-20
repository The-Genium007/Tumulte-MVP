import { describe, test, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// Mock the stores
const mockAuthStore = {
  user: null as {
    id: string
    email: string
    displayName?: string
    streamer?: unknown
  } | null,
  fetchMe: vi.fn(),
}

const mockPollControlStore = {
  activeSession: null as { id: string } | null,
  pollStatus: 'idle' as string,
  currentPollIndex: 0,
  countdown: 0,
  launchedPolls: [] as unknown[],
}

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuthStore,
}))

vi.mock('@/stores/pollControl', () => ({
  usePollControlStore: () => mockPollControlStore,
}))

// Mock supportTelemetry
const mockSupportSnapshot = {
  consoleLogs: [{ level: 'info', message: 'Test log', timestamp: '2024-01-01T00:00:00Z' }],
  errors: [],
  sessionId: 'test-session-id-123',
}

vi.mock('@/utils/supportTelemetry', () => ({
  getSupportSnapshot: () => mockSupportSnapshot,
}))

// Mock useRuntimeConfig
vi.stubGlobal('useRuntimeConfig', () => ({
  public: { apiBase: 'http://localhost:3333/api/v2' },
}))

// Mock global objects
vi.stubGlobal('window', {
  location: { href: 'http://localhost:3000/test-page' },
  innerWidth: 1920,
  innerHeight: 1080,
  screen: { width: 1920, height: 1080 },
})

vi.stubGlobal('navigator', {
  userAgent: 'Mozilla/5.0 Test Agent',
  language: 'fr-FR',
})

// Mock performance API
vi.stubGlobal('performance', {
  getEntriesByType: vi.fn().mockReturnValue([
    {
      duration: 1000,
      domContentLoadedEventEnd: 500,
      loadEventEnd: 800,
      transferSize: 50000,
    },
  ]),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
  },
})

// Mock Intl
vi.stubGlobal('Intl', {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  DateTimeFormat: () => ({
    resolvedOptions: () => ({ timeZone: 'Europe/Paris' }),
  }),
})

// Mock fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('useSupportReporter Composable', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Reset store state
    mockAuthStore.user = null
    mockAuthStore.fetchMe.mockReset()
    mockPollControlStore.activeSession = null
    mockPollControlStore.pollStatus = 'idle'
    mockPollControlStore.currentPollIndex = 0
    mockPollControlStore.countdown = 0
    mockPollControlStore.launchedPolls = []

    // Reset fetch mock
    mockFetch.mockReset()
  })

  describe('Return values', () => {
    test('should return sendBugReport and sendSuggestion functions', async () => {
      const { useSupportReporter } = await import('~/composables/useSupportReporter')
      const result = useSupportReporter()

      expect(result).toHaveProperty('sendBugReport')
      expect(result).toHaveProperty('sendSuggestion')
      expect(typeof result.sendBugReport).toBe('function')
      expect(typeof result.sendSuggestion).toBe('function')
    })
  })

  describe('sendBugReport()', () => {
    describe('Validation', () => {
      test('should throw error if title is too short', async () => {
        const { useSupportReporter } = await import('~/composables/useSupportReporter')
        const { sendBugReport } = useSupportReporter()

        await expect(sendBugReport('Hi', 'Valid description text')).rejects.toThrow(
          'Le titre doit faire au moins 5 caractères.'
        )
      })

      test('should throw error if title is empty', async () => {
        const { useSupportReporter } = await import('~/composables/useSupportReporter')
        const { sendBugReport } = useSupportReporter()

        await expect(sendBugReport('', 'Valid description text')).rejects.toThrow(
          'Le titre doit faire au moins 5 caractères.'
        )
      })

      test('should throw error if description is too short', async () => {
        const { useSupportReporter } = await import('~/composables/useSupportReporter')
        const { sendBugReport } = useSupportReporter()

        await expect(sendBugReport('Valid title', 'Short')).rejects.toThrow(
          'La description doit faire au moins 10 caractères.'
        )
      })

      test('should throw error if description is empty', async () => {
        const { useSupportReporter } = await import('~/composables/useSupportReporter')
        const { sendBugReport } = useSupportReporter()

        await expect(sendBugReport('Valid title', '')).rejects.toThrow(
          'La description doit faire au moins 10 caractères.'
        )
      })
    })

    describe('Successful submission', () => {
      test('should send bug report with diagnostics by default', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ data: { logs: [] } }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () =>
              Promise.resolve({
                message: 'Bug signalé avec succès',
                githubIssueUrl: 'https://github.com/test/issues/1',
                discordSent: true,
              }),
          })

        const { useSupportReporter } = await import('~/composables/useSupportReporter')
        const { sendBugReport } = useSupportReporter()

        const result = await sendBugReport('Test bug title', 'This is a valid bug description')

        expect(result.message).toBe('Bug signalé avec succès')
        expect(result.githubIssueUrl).toBe('https://github.com/test/issues/1')
        expect(result.discordSent).toBe(true)

        // Check that report endpoint was called
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3333/api/v2/support/report',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              'X-Session-Id': 'test-session-id-123',
            }),
          })
        )
      })

      test('should send bug report without diagnostics when specified', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              message: 'Bug signalé',
              discordSent: false,
            }),
        })

        const { useSupportReporter } = await import('~/composables/useSupportReporter')
        const { sendBugReport } = useSupportReporter()

        const result = await sendBugReport('Test bug title', 'This is a valid bug description', {
          includeDiagnostics: false,
        })

        expect(result.message).toBe('Bug signalé')
        expect(result.githubIssueUrl).toBeNull()
        expect(result.discordSent).toBe(false)

        // Should NOT have called logs endpoint
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      test('should try to fetch user if not authenticated', async () => {
        mockAuthStore.user = null
        mockAuthStore.fetchMe.mockResolvedValue(undefined)

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ data: { logs: [] } }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ message: 'OK' }),
          })

        const { useSupportReporter } = await import('~/composables/useSupportReporter')
        const { sendBugReport } = useSupportReporter()

        await sendBugReport('Valid title', 'Valid description text')

        expect(mockAuthStore.fetchMe).toHaveBeenCalled()
      })

      test('should continue even if fetchMe fails', async () => {
        mockAuthStore.user = null
        mockAuthStore.fetchMe.mockRejectedValue(new Error('Auth failed'))

        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ data: { logs: [] } }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ message: 'OK' }),
          })

        const { useSupportReporter } = await import('~/composables/useSupportReporter')
        const { sendBugReport } = useSupportReporter()

        // Should not throw
        const result = await sendBugReport('Valid title', 'Valid description text')
        expect(result.message).toBe('OK')
      })
    })

    describe('Error handling', () => {
      test('should throw error on API failure with error message', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ data: { logs: [] } }),
          })
          .mockResolvedValueOnce({
            ok: false,
            json: () => Promise.resolve({ error: 'Rate limited' }),
          })

        const { useSupportReporter } = await import('~/composables/useSupportReporter')
        const { sendBugReport } = useSupportReporter()

        await expect(sendBugReport('Valid title', 'Valid description text')).rejects.toThrow(
          'Rate limited'
        )
      })

      test('should throw generic error on API failure without error message', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ data: { logs: [] } }),
          })
          .mockResolvedValueOnce({
            ok: false,
            json: () => Promise.reject(new Error('Parse error')),
          })

        const { useSupportReporter } = await import('~/composables/useSupportReporter')
        const { sendBugReport } = useSupportReporter()

        await expect(sendBugReport('Valid title', 'Valid description text')).rejects.toThrow(
          "Impossible d'envoyer le rapport de bug."
        )
      })

      test('should handle backend logs fetch failure gracefully', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: false, // Logs fetch fails
          })
          .mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ message: 'OK' }),
          })

        const { useSupportReporter } = await import('~/composables/useSupportReporter')
        const { sendBugReport } = useSupportReporter()

        // Should not throw, just continue without backend logs
        const result = await sendBugReport('Valid title', 'Valid description text')
        expect(result.message).toBe('OK')
      })
    })
  })

  describe('sendSuggestion()', () => {
    describe('Validation', () => {
      test('should throw error if title is too short', async () => {
        const { useSupportReporter } = await import('~/composables/useSupportReporter')
        const { sendSuggestion } = useSupportReporter()

        await expect(sendSuggestion('Hi', 'Valid suggestion description')).rejects.toThrow(
          'Le titre doit faire au moins 5 caractères.'
        )
      })

      test('should throw error if description is too short', async () => {
        const { useSupportReporter } = await import('~/composables/useSupportReporter')
        const { sendSuggestion } = useSupportReporter()

        await expect(sendSuggestion('Valid title', 'Short')).rejects.toThrow(
          'La description doit faire au moins 10 caractères.'
        )
      })
    })

    describe('Successful submission', () => {
      test('should send suggestion successfully', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              message: 'Suggestion envoyée avec succès',
              githubDiscussionUrl: 'https://github.com/test/discussions/1',
              discordSent: true,
            }),
        })

        const { useSupportReporter } = await import('~/composables/useSupportReporter')
        const { sendSuggestion } = useSupportReporter()

        const result = await sendSuggestion(
          'Feature request',
          'This is a valid suggestion description'
        )

        expect(result.message).toBe('Suggestion envoyée avec succès')
        expect(result.githubDiscussionUrl).toBe('https://github.com/test/discussions/1')
        expect(result.discordSent).toBe(true)

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:3333/api/v2/support/suggestion',
          expect.objectContaining({
            method: 'POST',
            credentials: 'include',
          })
        )
      })

      test('should try to fetch user if not authenticated', async () => {
        mockAuthStore.user = null
        mockAuthStore.fetchMe.mockResolvedValue(undefined)

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'OK' }),
        })

        const { useSupportReporter } = await import('~/composables/useSupportReporter')
        const { sendSuggestion } = useSupportReporter()

        await sendSuggestion('Valid title', 'Valid description text')

        expect(mockAuthStore.fetchMe).toHaveBeenCalled()
      })
    })

    describe('Error handling', () => {
      test('should throw error on API failure', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Server error' }),
        })

        const { useSupportReporter } = await import('~/composables/useSupportReporter')
        const { sendSuggestion } = useSupportReporter()

        await expect(sendSuggestion('Valid title', 'Valid description text')).rejects.toThrow(
          'Server error'
        )
      })

      test('should throw generic error on API failure without message', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          json: () => Promise.reject(new Error('Parse error')),
        })

        const { useSupportReporter } = await import('~/composables/useSupportReporter')
        const { sendSuggestion } = useSupportReporter()

        await expect(sendSuggestion('Valid title', 'Valid description text')).rejects.toThrow(
          "Impossible d'envoyer la suggestion."
        )
      })
    })
  })

  describe('Data sanitization', () => {
    test('should sanitize Bearer tokens in description', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { logs: [] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'OK' }),
        })

      const { useSupportReporter } = await import('~/composables/useSupportReporter')
      const { sendBugReport } = useSupportReporter()

      // Use "Bearer " followed by a long alphanumeric string (simulates a token pattern)
      await sendBugReport(
        'Bug with token',
        'Error with Bearer abcdefghijklmnopqrstuvwxyz1234567890 in the request'
      )

      const callBody = JSON.parse(mockFetch.mock.calls[1]![1].body)
      expect(callBody.description).toContain('[REDACTED]')
      expect(callBody.description).not.toContain('abcdefghijklmnopqrstuvwxyz')
    })

    test('should sanitize long alphanumeric strings (potential tokens)', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { logs: [] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'OK' }),
        })

      const { useSupportReporter } = await import('~/composables/useSupportReporter')
      const { sendBugReport } = useSupportReporter()

      // Long alphanumeric string (30+ chars) should be sanitized
      await sendBugReport(
        'Bug with long string',
        'Found this string: abcdefghijklmnopqrstuvwxyz1234567890abcdef in logs'
      )

      const callBody = JSON.parse(mockFetch.mock.calls[1]![1].body)
      expect(callBody.description).toContain('[REDACTED]')
    })
  })

  describe('Context building', () => {
    test('should include browser context in bug report', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { logs: [] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'OK' }),
        })

      const { useSupportReporter } = await import('~/composables/useSupportReporter')
      const { sendBugReport } = useSupportReporter()

      await sendBugReport('Test bug', 'Valid description for bug report')

      const callBody = JSON.parse(mockFetch.mock.calls[1]![1].body)

      expect(callBody.frontend).toMatchObject({
        url: 'http://localhost:3000/test-page',
        userAgent: 'Mozilla/5.0 Test Agent',
        locale: 'fr-FR',
        timezone: 'Europe/Paris',
        viewport: { width: 1920, height: 1080 },
        screen: { width: 1920, height: 1080 },
        sessionId: 'test-session-id-123',
      })
    })

    test('should include store state when diagnostics enabled', async () => {
      mockAuthStore.user = {
        id: 'user-123',
        email: 'test@example.com',
        displayName: 'TestUser',
        streamer: { id: 'streamer-456' },
      }

      mockPollControlStore.activeSession = { id: 'session-789' }
      mockPollControlStore.pollStatus = 'running'
      mockPollControlStore.currentPollIndex = 2
      mockPollControlStore.countdown = 30
      mockPollControlStore.launchedPolls = [{}, {}, {}]

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { logs: [] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'OK' }),
        })

      const { useSupportReporter } = await import('~/composables/useSupportReporter')
      const { sendBugReport } = useSupportReporter()

      await sendBugReport('Test bug', 'Valid description for bug report')

      const callBody = JSON.parse(mockFetch.mock.calls[1]![1].body)

      expect(callBody.frontend.storeState).toBeDefined()
      expect(callBody.frontend.storeState.auth.userId).toBe('user-123')
      expect(callBody.frontend.storeState.pollControl.pollStatus).toBe('running')
      expect(callBody.frontend.storeState.pollControl.launchedPollsCount).toBe(3)
    })

    test('should include performance data when diagnostics enabled', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: { logs: [] } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'OK' }),
        })

      const { useSupportReporter } = await import('~/composables/useSupportReporter')
      const { sendBugReport } = useSupportReporter()

      await sendBugReport('Test bug', 'Valid description for bug report')

      const callBody = JSON.parse(mockFetch.mock.calls[1]![1].body)

      expect(callBody.frontend.performance).toBeDefined()
      expect(callBody.frontend.performance.navigation).toMatchObject({
        duration: 1000,
        domContentLoaded: 500,
        load: 800,
      })
      expect(callBody.frontend.performance.memory).toMatchObject({
        usedJSHeapSize: 1000000,
        totalJSHeapSize: 2000000,
      })
    })

    test('should not include store state when diagnostics disabled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'OK' }),
      })

      const { useSupportReporter } = await import('~/composables/useSupportReporter')
      const { sendBugReport } = useSupportReporter()

      await sendBugReport('Test bug', 'Valid description for bug report', {
        includeDiagnostics: false,
      })

      const callBody = JSON.parse(mockFetch.mock.calls[0]![1].body)

      expect(callBody.frontend.storeState).toBeUndefined()
      expect(callBody.frontend.consoleLogs).toBeUndefined()
      expect(callBody.frontend.performance).toBeUndefined()
    })
  })

  describe('Backend logs fetching', () => {
    test('should fetch backend logs when diagnostics enabled', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                logs: [
                  { level: 'info', message: 'Backend log 1' },
                  { level: 'error', message: 'Backend log 2' },
                ],
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ message: 'OK' }),
        })

      const { useSupportReporter } = await import('~/composables/useSupportReporter')
      const { sendBugReport } = useSupportReporter()

      await sendBugReport('Test bug', 'Valid description for bug report')

      // First call should be to /support/logs
      expect(mockFetch.mock.calls[0]![0]).toBe('http://localhost:3333/api/v2/support/logs')

      const callBody = JSON.parse(mockFetch.mock.calls[1]![1].body)
      expect(callBody.backendLogs).toEqual([
        { level: 'info', message: 'Backend log 1' },
        { level: 'error', message: 'Backend log 2' },
      ])
    })

    test('should not fetch backend logs when diagnostics disabled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'OK' }),
      })

      const { useSupportReporter } = await import('~/composables/useSupportReporter')
      const { sendBugReport } = useSupportReporter()

      await sendBugReport('Test bug', 'Valid description for bug report', {
        includeDiagnostics: false,
      })

      // Should only call report endpoint, not logs endpoint
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch.mock.calls[0]![0]).toBe('http://localhost:3333/api/v2/support/report')
    })
  })
})
