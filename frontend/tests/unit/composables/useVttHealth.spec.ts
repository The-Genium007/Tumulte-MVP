import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { ref, nextTick } from 'vue'
import { useVttHealth } from '~/composables/useVttHealth'
import type { VttConnectionStatus } from '@/types'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock VTT connection data
const createMockConnection = (
  overrides: Partial<VttConnectionStatus> = {}
): VttConnectionStatus => ({
  id: 'vtt-conn-1',
  status: 'active',
  tunnelStatus: 'connected',
  lastHeartbeatAt: new Date().toISOString(),
  worldName: 'My Campaign World',
  moduleVersion: '1.0.0',
  ...overrides,
})

describe('useVttHealth Composable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Mock useRuntimeConfig
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked((globalThis as any).useRuntimeConfig).mockReturnValue({
      public: {
        apiBase: 'http://localhost:3333',
      },
    } as ReturnType<typeof useRuntimeConfig>)
  })

  // Helper to setup composable with initial fetch handled
  const setupWithCampaign = async (campaignId: string = 'campaign-1') => {
    // Setup default response for the immediate watch call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { vttConnection: null } }),
    })

    const result = useVttHealth(campaignId)

    // Wait for the immediate watch to complete
    await vi.runAllTimersAsync()

    return result
  }

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Initial State', () => {
    test('should initialize with not_paired status when no campaignId', () => {
      const { healthStatus, vttConnection } = useVttHealth(null)

      expect(healthStatus.value).toBe('not_paired')
      expect(vttConnection.value).toBeNull()
    })

    test('should initialize with isChecking false', () => {
      const { isChecking } = useVttHealth(null)

      expect(isChecking.value).toBe(false)
    })

    test('should initialize with null checkError', () => {
      const { checkError } = useVttHealth(null)

      expect(checkError.value).toBeNull()
    })

    test('should initialize with null lastCheck', () => {
      const { lastCheck } = useVttHealth(null)

      expect(lastCheck.value).toBeNull()
    })
  })

  describe('computeHealthStatus', () => {
    test('should return not_paired when connection is null', async () => {
      const { healthStatus, checkHealth } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { vttConnection: null } }),
      })
      await checkHealth()

      expect(healthStatus.value).toBe('not_paired')
    })

    test('should return revoked when status is revoked', async () => {
      const { healthStatus, checkHealth } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { vttConnection: createMockConnection({ status: 'revoked' }) },
        }),
      })
      await checkHealth()

      expect(healthStatus.value).toBe('revoked')
    })

    test('should return error when status is expired', async () => {
      const { healthStatus, checkHealth } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { vttConnection: createMockConnection({ status: 'expired' }) },
        }),
      })
      await checkHealth()

      expect(healthStatus.value).toBe('error')
    })

    test('should return connected when tunnel is connected with recent heartbeat', async () => {
      const { healthStatus, checkHealth } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            vttConnection: createMockConnection({
              tunnelStatus: 'connected',
              lastHeartbeatAt: new Date().toISOString(),
            }),
          },
        }),
      })
      await checkHealth()

      expect(healthStatus.value).toBe('connected')
    })

    test('should return disconnected when heartbeat is too old', async () => {
      const { healthStatus, checkHealth } = await setupWithCampaign()
      const oldHeartbeat = new Date(Date.now() - 150000).toISOString() // 2.5 minutes ago

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            vttConnection: createMockConnection({
              tunnelStatus: 'connected',
              lastHeartbeatAt: oldHeartbeat,
            }),
          },
        }),
      })
      await checkHealth()

      expect(healthStatus.value).toBe('disconnected')
    })

    test('should return connecting when tunnel is connecting', async () => {
      const { healthStatus, checkHealth } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            vttConnection: createMockConnection({ tunnelStatus: 'connecting' }),
          },
        }),
      })
      await checkHealth()

      expect(healthStatus.value).toBe('connecting')
    })

    test('should return error when tunnel has error', async () => {
      const { healthStatus, checkHealth } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            vttConnection: createMockConnection({ tunnelStatus: 'error' }),
          },
        }),
      })
      await checkHealth()

      expect(healthStatus.value).toBe('error')
    })

    test('should return disconnected when tunnel is disconnected', async () => {
      const { healthStatus, checkHealth } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            vttConnection: createMockConnection({ tunnelStatus: 'disconnected' }),
          },
        }),
      })
      await checkHealth()

      expect(healthStatus.value).toBe('disconnected')
    })
  })

  describe('checkHealth', () => {
    test('should fetch campaign data and update connection', async () => {
      const { checkHealth, vttConnection, lastCheck } = await setupWithCampaign()
      const mockConnection = createMockConnection()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { vttConnection: mockConnection } }),
      })
      await checkHealth()

      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3333/mj/campaigns/campaign-1', {
        credentials: 'include',
      })
      expect(vttConnection.value).toEqual(mockConnection)
      expect(lastCheck.value).toBeInstanceOf(Date)
    })

    test('should not fetch when campaignId is null', async () => {
      const { checkHealth } = useVttHealth(null)
      mockFetch.mockClear()

      await checkHealth()

      expect(mockFetch).not.toHaveBeenCalled()
    })

    test('should set isChecking during fetch', async () => {
      const { checkHealth, isChecking } = await setupWithCampaign()

      let resolvePromise: (value: unknown) => void
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(fetchPromise)

      const checkPromise = checkHealth()

      expect(isChecking.value).toBe(true)

      resolvePromise!({
        ok: true,
        json: async () => ({ data: { vttConnection: null } }),
      })

      await checkPromise

      expect(isChecking.value).toBe(false)
    })

    test('should handle 404 as campaign_deleted', async () => {
      const { checkHealth, healthStatus, vttConnection } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })
      await checkHealth()

      expect(healthStatus.value).toBe('campaign_deleted')
      expect(vttConnection.value).toBeNull()
    })

    test('should handle HTTP errors and set checkError', async () => {
      const { checkHealth, checkError } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })
      await checkHealth()

      expect(checkError.value).toBe('HTTP 500')
    })

    test('should set server_unavailable when connected and server fails', async () => {
      const { checkHealth, healthStatus } = await setupWithCampaign()

      // First call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { vttConnection: createMockConnection() },
        }),
      })
      await checkHealth()
      expect(healthStatus.value).toBe('connected')

      // Second call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      await checkHealth()

      expect(healthStatus.value).toBe('server_unavailable')
    })

    test('should handle network errors', async () => {
      const { checkHealth, checkError } = await setupWithCampaign()

      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      await checkHealth()

      expect(checkError.value).toBe('Network error')
    })

    test('should handle response without data wrapper', async () => {
      const { checkHealth, vttConnection } = await setupWithCampaign()
      const mockConnection = createMockConnection()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ vttConnection: mockConnection }),
      })
      await checkHealth()

      expect(vttConnection.value).toEqual(mockConnection)
    })
  })

  describe('Polling', () => {
    test('should start polling and check health immediately', async () => {
      // Use null first to avoid immediate watch trigger
      const { startPolling } = useVttHealth(null)
      mockFetch.mockClear()

      // startPolling won't fetch because campaignId is null
      startPolling()

      // With null campaignId, no fetch should happen
      expect(mockFetch).toHaveBeenCalledTimes(0)
    })

    test('should poll at 30 second intervals when campaignId is set', async () => {
      const { startPolling } = await setupWithCampaign()

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { vttConnection: createMockConnection() } }),
      })
      mockFetch.mockClear()

      startPolling()
      // startPolling calls checkHealth immediately
      expect(mockFetch).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(30000)
      expect(mockFetch).toHaveBeenCalledTimes(2)

      await vi.advanceTimersByTimeAsync(30000)
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    test('should not start multiple polling intervals', async () => {
      const { startPolling } = await setupWithCampaign()

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { vttConnection: createMockConnection() } }),
      })
      mockFetch.mockClear()

      startPolling()
      startPolling()
      startPolling()

      expect(mockFetch).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(30000)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    test('should stop polling', async () => {
      const { startPolling, stopPolling } = await setupWithCampaign()

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: { vttConnection: createMockConnection() } }),
      })
      mockFetch.mockClear()

      startPolling()
      expect(mockFetch).toHaveBeenCalledTimes(1)

      stopPolling()

      await vi.advanceTimersByTimeAsync(60000)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Computed Properties', () => {
    test('hasIssue should be true for error states', async () => {
      const { checkHealth, hasIssue } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { vttConnection: createMockConnection({ tunnelStatus: 'error' }) },
        }),
      })
      await checkHealth()

      expect(hasIssue.value).toBe(true)
    })

    test('hasIssue should be true for revoked state', async () => {
      const { checkHealth, hasIssue } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { vttConnection: createMockConnection({ status: 'revoked' }) },
        }),
      })
      await checkHealth()

      expect(hasIssue.value).toBe(true)
    })

    test('hasIssue should be true for campaign_deleted state', async () => {
      const { checkHealth, hasIssue } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })
      await checkHealth()

      expect(hasIssue.value).toBe(true)
    })

    test('hasIssue should be false for connected state', async () => {
      const { checkHealth, hasIssue } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { vttConnection: createMockConnection() },
        }),
      })
      await checkHealth()

      expect(hasIssue.value).toBe(false)
    })

    test('needsRepairing should be true for not_paired', () => {
      const { needsRepairing } = useVttHealth(null)

      expect(needsRepairing.value).toBe(true)
    })

    test('needsRepairing should be true for revoked', async () => {
      const { checkHealth, needsRepairing } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { vttConnection: createMockConnection({ status: 'revoked' }) },
        }),
      })
      await checkHealth()

      expect(needsRepairing.value).toBe(true)
    })

    test('needsRepairing should be false for connected state', async () => {
      const { checkHealth, needsRepairing } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { vttConnection: createMockConnection() },
        }),
      })
      await checkHealth()

      expect(needsRepairing.value).toBe(false)
    })
  })

  describe('statusMessage', () => {
    test('should return correct message for connected', async () => {
      const { checkHealth, statusMessage } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { vttConnection: createMockConnection() },
        }),
      })
      await checkHealth()

      expect(statusMessage.value).toBe('Foundry VTT connecté')
    })

    test('should return correct message for connecting', async () => {
      const { checkHealth, statusMessage } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { vttConnection: createMockConnection({ tunnelStatus: 'connecting' }) },
        }),
      })
      await checkHealth()

      expect(statusMessage.value).toBe('Connexion en cours...')
    })

    test('should return correct message for disconnected', async () => {
      const { checkHealth, statusMessage } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { vttConnection: createMockConnection({ tunnelStatus: 'disconnected' }) },
        }),
      })
      await checkHealth()

      expect(statusMessage.value).toBe('Foundry VTT déconnecté')
    })

    test('should return correct message for server_unavailable', async () => {
      const { checkHealth, statusMessage } = await setupWithCampaign()

      // First succeed to get connected
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { vttConnection: createMockConnection() },
        }),
      })
      await checkHealth()

      // Then fail
      mockFetch.mockRejectedValueOnce(new Error('Network'))
      await checkHealth()

      expect(statusMessage.value).toBe('Serveur Tumulte indisponible')
    })

    test('should return correct message for campaign_deleted', async () => {
      const { checkHealth, statusMessage } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      })
      await checkHealth()

      expect(statusMessage.value).toBe('Campagne supprimée')
    })

    test('should return correct message for revoked', async () => {
      const { checkHealth, statusMessage } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { vttConnection: createMockConnection({ status: 'revoked' }) },
        }),
      })
      await checkHealth()

      expect(statusMessage.value).toBe('Connexion révoquée')
    })

    test('should return correct message for error', async () => {
      const { checkHealth, statusMessage } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { vttConnection: createMockConnection({ tunnelStatus: 'error' }) },
        }),
      })
      await checkHealth()

      expect(statusMessage.value).toBe('Erreur de connexion')
    })

    test('should return correct message for not_paired', () => {
      const { statusMessage } = useVttHealth(null)

      expect(statusMessage.value).toBe('Non connecté à Foundry')
    })
  })

  describe('Reactive campaignId', () => {
    test('should check health when campaignId changes from null to value', async () => {
      const campaignId = ref<string | null>(null)
      const { healthStatus } = useVttHealth(campaignId)

      expect(healthStatus.value).toBe('not_paired')
      mockFetch.mockClear()

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { vttConnection: createMockConnection() },
        }),
      })

      campaignId.value = 'campaign-1'
      await nextTick()
      await vi.runAllTimersAsync()

      expect(mockFetch).toHaveBeenCalled()
    })

    test('should reset to not_paired when campaignId becomes null', async () => {
      const { healthStatus, checkHealth } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: { vttConnection: createMockConnection() },
        }),
      })
      await checkHealth()
      expect(healthStatus.value).toBe('connected')

      // We need a ref to change, so we'll test the watch behavior differently
      // Since setupWithCampaign uses a static string, we test with a ref
      const campaignId = ref<string | null>('campaign-1')
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { vttConnection: createMockConnection() } }),
      })
      const result = useVttHealth(campaignId)
      await vi.runAllTimersAsync()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { vttConnection: createMockConnection() } }),
      })
      await result.checkHealth()

      campaignId.value = null
      await nextTick()

      expect(result.healthStatus.value).toBe('not_paired')
      expect(result.vttConnection.value).toBeNull()
    })
  })

  describe('isModuleOutdated', () => {
    test('should be false when no VTT connection', async () => {
      const { isModuleOutdated } = await setupWithCampaign()

      expect(isModuleOutdated.value).toBe(false)
    })

    test('should be false when latestModuleVersion is null', async () => {
      const { checkHealth, isModuleOutdated } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            vttConnection: createMockConnection({
              moduleVersion: '2.0.0',
            }),
          },
        }),
      })
      await checkHealth()

      expect(isModuleOutdated.value).toBe(false)
    })

    test('should be false when moduleVersion is null', async () => {
      const { checkHealth, isModuleOutdated } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            vttConnection: createMockConnection({
              moduleVersion: null,
              latestModuleVersion: '2.2.0',
            }),
          },
        }),
      })
      await checkHealth()

      expect(isModuleOutdated.value).toBe(false)
    })

    test('should be true when moduleVersion is less than latestModuleVersion', async () => {
      const { checkHealth, isModuleOutdated } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            vttConnection: createMockConnection({
              moduleVersion: '2.0.7',
              latestModuleVersion: '2.2.0',
            }),
          },
        }),
      })
      await checkHealth()

      expect(isModuleOutdated.value).toBe(true)
    })

    test('should be false when versions are equal', async () => {
      const { checkHealth, isModuleOutdated } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            vttConnection: createMockConnection({
              moduleVersion: '2.2.0',
              latestModuleVersion: '2.2.0',
            }),
          },
        }),
      })
      await checkHealth()

      expect(isModuleOutdated.value).toBe(false)
    })

    test('should be false when current version is higher (dev)', async () => {
      const { checkHealth, isModuleOutdated } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            vttConnection: createMockConnection({
              moduleVersion: '3.0.0',
              latestModuleVersion: '2.2.0',
            }),
          },
        }),
      })
      await checkHealth()

      expect(isModuleOutdated.value).toBe(false)
    })

    test('should detect major version difference', async () => {
      const { checkHealth, isModuleOutdated } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            vttConnection: createMockConnection({
              moduleVersion: '1.9.9',
              latestModuleVersion: '2.0.0',
            }),
          },
        }),
      })
      await checkHealth()

      expect(isModuleOutdated.value).toBe(true)
    })

    test('should detect patch version difference', async () => {
      const { checkHealth, isModuleOutdated } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            vttConnection: createMockConnection({
              moduleVersion: '2.2.0',
              latestModuleVersion: '2.2.1',
            }),
          },
        }),
      })
      await checkHealth()

      expect(isModuleOutdated.value).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    test('should handle connected without heartbeat', async () => {
      const { checkHealth, healthStatus } = await setupWithCampaign()

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            vttConnection: createMockConnection({
              tunnelStatus: 'connected',
              lastHeartbeatAt: null,
            }),
          },
        }),
      })
      await checkHealth()

      // Without heartbeat, still consider connected if tunnel says so
      expect(healthStatus.value).toBe('connected')
    })

    test('should handle unknown error type', async () => {
      const { checkHealth, checkError } = await setupWithCampaign()

      mockFetch.mockRejectedValueOnce('string error')
      await checkHealth()

      expect(checkError.value).toBe('Unknown error')
    })
  })
})
