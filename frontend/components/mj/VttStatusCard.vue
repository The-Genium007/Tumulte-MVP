<script setup lang="ts">
import type { VttConnectionStatus, VttHealthStatus } from '~/types'

// eslint-disable-next-line @typescript-eslint/naming-convention, no-undef
const NuxtLink = resolveComponent('NuxtLink')

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
        icon: 'i-lucide-loader',
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
        bgClass: 'bg-neutral-100',
        iconClass: 'text-neutral-400',
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

// Show action button for error states
const showActionButton = computed(() => {
  return ['revoked', 'error', 'not_paired'].includes(healthStatus.value)
})

// Tooltip text
const tooltipText = computed(() => {
  if (!props.vttConnection) {
    return 'Cliquez pour connecter Foundry VTT'
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
      return 'Connexion révoquée - Cliquez pour reconnecter'
    case 'error':
      return 'Erreur de connexion - Cliquez pour reconnecter'
    default:
      return 'Cliquez pour connecter Foundry VTT'
  }
})
</script>

<template>
  <!-- Desktop version (square card) -->
  <UTooltip :text="tooltipText" class="hidden lg:block">
    <component
      :is="showActionButton ? NuxtLink : 'div'"
      :to="showActionButton ? '/mj/campaigns/import' : undefined"
      class="block"
    >
      <div
        :class="[
          'relative size-32 rounded-3xl flex flex-col items-center justify-center text-center gap-2 transition-all',
          statusConfig.bgClass,
          showActionButton ? 'hover:scale-105 cursor-pointer' : '',
        ]"
      >
        <!-- Clickable indicator -->
        <UIcon
          v-if="showActionButton"
          name="i-lucide-arrow-up-right"
          class="absolute top-2 right-2 size-4 text-primary-400"
        />
        <UIcon :name="statusConfig.icon" :class="['size-7', statusConfig.iconClass]" />
        <div>
          <p class="text-xs text-primary-500 font-medium">{{ statusConfig.label }}</p>
          <p class="text-sm font-bold text-primary">{{ statusConfig.value }}</p>
        </div>
      </div>
    </component>
  </UTooltip>

  <!-- Mobile version (inline) -->
  <UTooltip :text="tooltipText" class="lg:hidden">
    <component
      :is="showActionButton ? NuxtLink : 'div'"
      :to="showActionButton ? '/mj/campaigns/import' : undefined"
      class="flex items-center gap-3"
    >
      <div
        :class="[
          'size-10 rounded-lg flex items-center justify-center shrink-0',
          statusConfig.bgClass,
        ]"
      >
        <UIcon :name="statusConfig.icon" :class="['size-5', statusConfig.iconClass]" />
      </div>
      <div class="flex-1">
        <p class="text-xs text-primary-500 font-medium">{{ statusConfig.label }}</p>
        <p class="text-lg font-bold text-primary">{{ statusConfig.value }}</p>
      </div>
      <!-- Clickable indicator for mobile -->
      <UIcon
        v-if="showActionButton"
        name="i-lucide-arrow-up-right"
        class="size-5 text-primary-400 shrink-0"
      />
    </component>
  </UTooltip>
</template>
