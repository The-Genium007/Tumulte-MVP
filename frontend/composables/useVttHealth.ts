import { ref, computed, watch, readonly, toValue, onUnmounted } from 'vue'
import type { MaybeRef } from 'vue'
import type { VttConnectionStatus, VttHealthStatus } from '~/types'

const HEALTH_CHECK_INTERVAL = 30000 // 30 seconds
const HEARTBEAT_TIMEOUT = 120000 // 2 minutes - connection considered disconnected after this

/**
 * Simple semver comparison: returns true if current < latest.
 * Returns false if either version is missing or unparseable.
 */
function isVersionOutdated(
  current: string | null | undefined,
  latest: string | null | undefined
): boolean {
  if (!current || !latest) return false
  const parse = (v: string): [number, number, number] => {
    const parts = v.split('.').map(Number)
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
  }
  const [cMaj, cMin, cPatch] = parse(current)
  const [lMaj, lMin, lPatch] = parse(latest)
  if (Number.isNaN(cMaj) || Number.isNaN(lMaj)) return false
  if (cMaj !== lMaj) return cMaj < lMaj
  if (cMin !== lMin) return cMin < lMin
  return cPatch < lPatch
}

/**
 * Composable for monitoring VTT connection health within a campaign context.
 * Provides polling, health status computation, and real-time updates.
 */
export const useVttHealth = (campaignId: MaybeRef<string | null>) => {
  const config = useRuntimeConfig()
  const API_URL = config.public.apiBase

  // State
  const vttConnection = ref<VttConnectionStatus | null>(null)
  const healthStatus = ref<VttHealthStatus>('not_paired')
  const lastCheck = ref<Date | null>(null)
  const isChecking = ref(false)
  const checkError = ref<string | null>(null)

  // Polling interval
  let pollingInterval: ReturnType<typeof setInterval> | null = null

  /**
   * Compute the health status from VTT connection data
   */
  const computeHealthStatus = (connection: VttConnectionStatus | null): VttHealthStatus => {
    if (!connection) {
      return 'not_paired'
    }

    // Check connection status first
    if (connection.status === 'revoked') {
      return 'revoked'
    }

    if (connection.status === 'expired') {
      return 'error'
    }

    // Check tunnel status
    if (connection.tunnelStatus === 'connected') {
      // Verify heartbeat is recent
      if (connection.lastHeartbeatAt) {
        const heartbeatAge = Date.now() - new Date(connection.lastHeartbeatAt).getTime()
        if (heartbeatAge > HEARTBEAT_TIMEOUT) {
          return 'disconnected'
        }
      }
      return 'connected'
    }

    if (connection.tunnelStatus === 'connecting') {
      return 'connecting'
    }

    if (connection.tunnelStatus === 'error') {
      return 'error'
    }

    return 'disconnected'
  }

  /**
   * Fetch fresh campaign data to update VTT connection status
   */
  const checkHealth = async (): Promise<void> => {
    const id = toValue(campaignId)
    if (!id) return

    isChecking.value = true
    checkError.value = null

    try {
      const response = await fetch(`${API_URL}/mj/campaigns/${id}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 404) {
          // Campaign deleted
          healthStatus.value = 'campaign_deleted'
          vttConnection.value = null
          return
        }
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const campaignData = data.data || data

      // Update VTT connection from campaign data
      vttConnection.value = campaignData.vttConnection || null
      healthStatus.value = computeHealthStatus(vttConnection.value)
      lastCheck.value = new Date()
    } catch (error) {
      console.error('VTT health check failed:', error)
      checkError.value = error instanceof Error ? error.message : 'Unknown error'

      // Don't change status to server_unavailable on first error
      // Keep current status but mark the error
      if (healthStatus.value === 'connected') {
        // If we were connected but can't reach server, might be temporary
        // Only mark as server_unavailable after multiple failures
        healthStatus.value = 'server_unavailable'
      }
    } finally {
      isChecking.value = false
    }
  }

  /**
   * Start polling for health updates
   */
  const startPolling = (): void => {
    if (pollingInterval) return

    // Initial check
    checkHealth()

    // Setup interval
    pollingInterval = setInterval(() => {
      checkHealth()
    }, HEALTH_CHECK_INTERVAL)
  }

  /**
   * Stop polling for health updates
   */
  const stopPolling = (): void => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  }

  /**
   * Check if the connection has issues that need user attention
   */
  const hasIssue = computed(() => {
    return ['error', 'revoked', 'campaign_deleted', 'server_unavailable'].includes(
      healthStatus.value
    )
  })

  /**
   * Check if the connection needs re-pairing
   */
  const needsRepairing = computed(() => {
    return ['revoked', 'error', 'not_paired'].includes(healthStatus.value)
  })

  /**
   * Check if the Foundry module version is outdated compared to latest known version.
   * Independent from health status — a connection can be healthy but have an outdated module.
   */
  const isModuleOutdated = computed(() => {
    return isVersionOutdated(
      vttConnection.value?.moduleVersion,
      vttConnection.value?.latestModuleVersion
    )
  })

  /**
   * Get human-readable status message
   */
  const statusMessage = computed(() => {
    switch (healthStatus.value) {
      case 'connected':
        return 'Foundry VTT connecté'
      case 'connecting':
        return 'Connexion en cours...'
      case 'disconnected':
        return 'Foundry VTT déconnecté'
      case 'server_unavailable':
        return 'Serveur Tumulte indisponible'
      case 'campaign_deleted':
        return 'Campagne supprimée'
      case 'revoked':
        return 'Connexion révoquée'
      case 'error':
        return 'Erreur de connexion'
      case 'module_outdated':
        return 'Module Foundry obsolète'
      case 'not_paired':
      default:
        return 'Non connecté à Foundry'
    }
  })

  // Cleanup on unmount
  onUnmounted(() => {
    stopPolling()
  })

  // Watch for campaignId changes
  watch(
    () => toValue(campaignId),
    (newId) => {
      if (newId) {
        checkHealth()
      } else {
        vttConnection.value = null
        healthStatus.value = 'not_paired'
      }
    },
    { immediate: true }
  )

  return {
    // State
    vttConnection: readonly(vttConnection),
    healthStatus: readonly(healthStatus),
    lastCheck: readonly(lastCheck),
    isChecking: readonly(isChecking),
    checkError: readonly(checkError),

    // Computed
    hasIssue,
    needsRepairing,
    isModuleOutdated,
    statusMessage,

    // Methods
    checkHealth,
    startPolling,
    stopPolling,
  }
}
