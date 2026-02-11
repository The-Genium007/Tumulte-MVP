<script setup lang="ts">
import type { VttConnectionStatus, VttHealthStatus } from '~/types'

const props = defineProps<{
  vttConnection?: VttConnectionStatus | null
  campaignId: string
}>()

// Compute health status based on connection data
const healthStatus = computed<VttHealthStatus>(() => {
  if (!props.vttConnection) {
    return 'not_paired'
  }

  // Check connection status first
  if (props.vttConnection.status === 'revoked') {
    return 'revoked'
  }

  if (props.vttConnection.status === 'expired') {
    return 'error'
  }

  // Check tunnel status
  if (props.vttConnection.tunnelStatus === 'connected') {
    // Verify heartbeat is recent (< 2 minutes)
    if (props.vttConnection.lastHeartbeatAt) {
      const heartbeatAge = Date.now() - new Date(props.vttConnection.lastHeartbeatAt).getTime()
      if (heartbeatAge > 120000) {
        // More than 2 minutes since last heartbeat
        return 'disconnected'
      }
    }
    return 'connected'
  }

  if (props.vttConnection.tunnelStatus === 'connecting') {
    return 'connecting'
  }

  if (props.vttConnection.tunnelStatus === 'error') {
    return 'error'
  }

  return 'disconnected'
})

// Status display configuration
const statusConfig = computed(() => {
  switch (healthStatus.value) {
    case 'connected':
      return {
        icon: 'i-lucide-plug-zap',
        color: 'success',
        bgClass: 'bg-success-light',
        iconClass: 'text-success-500',
        label: 'Foundry',
        value: 'Connecté',
      }
    case 'connecting':
      return {
        icon: 'i-game-icons-dice-twenty-faces-twenty',
        color: 'warning',
        bgClass: 'bg-warning-light',
        iconClass: 'text-warning-500 animate-spin',
        label: 'Foundry',
        value: 'Connexion...',
      }
    case 'disconnected':
      return {
        icon: 'i-lucide-plug-zap',
        color: 'neutral',
        bgClass: 'bg-muted',
        iconClass: 'text-muted',
        label: 'Foundry',
        value: 'Déconnecté',
      }
    case 'server_unavailable':
      return {
        icon: 'i-lucide-cloud-off',
        color: 'warning',
        bgClass: 'bg-warning-light',
        iconClass: 'text-warning-500',
        label: 'Foundry',
        value: 'Serveur indispo.',
      }
    case 'revoked':
    case 'error':
      return {
        icon: 'i-lucide-alert-triangle',
        color: 'error',
        bgClass: 'bg-error-light',
        iconClass: 'text-error-500',
        label: 'Foundry',
        value: 'Erreur',
      }
    case 'not_paired':
    default:
      return {
        icon: 'i-lucide-link',
        color: 'info',
        bgClass: 'bg-info-light',
        iconClass: 'text-info-500',
        label: 'Foundry',
        value: 'Non connecté',
      }
  }
})

// Tooltip text
const tooltipText = computed(() => {
  if (!props.vttConnection) {
    return 'Aucune connexion Foundry VTT'
  }

  const worldName = props.vttConnection.worldName || 'Monde inconnu'
  const version = props.vttConnection.moduleVersion || 'N/A'

  switch (healthStatus.value) {
    case 'connected':
      return `${worldName} (v${version}) - Connecté`
    case 'connecting':
      return `${worldName} - Connexion en cours...`
    case 'disconnected':
      return `${worldName} - Module déconnecté`
    case 'server_unavailable':
      return 'Serveur Tumulte temporairement indisponible'
    case 'revoked':
      return 'Connexion révoquée'
    case 'error':
      return 'Erreur de connexion'
    default:
      return 'Aucune connexion Foundry VTT'
  }
})
</script>

<template>
  <!-- Desktop version (square card) - Indicative only, not clickable -->
  <div class="hidden lg:block">
    <UTooltip :text="tooltipText">
      <div
        :class="[
          'size-32 rounded-3xl flex flex-col items-center justify-center text-center gap-2',
          statusConfig.bgClass,
        ]"
      >
        <UIcon :name="statusConfig.icon" :class="['size-7', statusConfig.iconClass]" />
        <div class="flex flex-col items-center">
          <p class="text-xs text-primary font-medium">{{ statusConfig.label }}</p>
          <p class="text-xl font-bold text-primary">{{ statusConfig.value }}</p>
        </div>
      </div>
    </UTooltip>
  </div>

  <!-- Mobile version (inline) - Indicative only, not clickable -->
  <div class="lg:hidden">
    <UTooltip :text="tooltipText">
      <div class="flex items-center gap-3">
        <div
          :class="[
            'size-10 rounded-lg flex items-center justify-center shrink-0',
            statusConfig.bgClass,
          ]"
        >
          <UIcon :name="statusConfig.icon" :class="['size-5', statusConfig.iconClass]" />
        </div>
        <div class="flex-1">
          <p class="text-xs text-primary font-medium">{{ statusConfig.label }}</p>
          <p class="text-lg font-bold text-primary">{{ statusConfig.value }}</p>
        </div>
      </div>
    </UTooltip>
  </div>
</template>
