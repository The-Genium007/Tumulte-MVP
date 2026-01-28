<template>
  <USlideover v-model:open="model" side="right" class="max-w-md w-full">
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-castle" class="size-6 text-primary" />
          <h3 class="text-xl font-semibold text-primary">Connexions Foundry VTT</h3>
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-x"
          size="sm"
          square
          @click="model = false"
        />
      </div>
    </template>

    <template #body>
      <!-- Loading state -->
      <div v-if="loading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="size-8 text-primary animate-spin" />
      </div>

      <!-- Error state -->
      <UAlert v-else-if="error" color="error" variant="soft" icon="i-lucide-alert-circle">
        <template #title>Erreur de chargement</template>
        <template #description>
          <p class="mb-2">{{ error }}</p>
          <UButton size="xs" variant="outline" @click="fetchConnections"> Réessayer </UButton>
        </template>
      </UAlert>

      <!-- Empty state -->
      <div
        v-else-if="connections.length === 0"
        class="flex flex-col items-center justify-center py-12 text-center"
      >
        <UIcon name="i-lucide-unplug" class="size-12 text-muted mb-4" />
        <p class="text-muted">Aucune connexion Foundry VTT</p>
      </div>

      <!-- Connections list -->
      <div v-else class="space-y-4">
        <div
          v-for="connection in connections"
          :key="connection.id"
          class="p-4 rounded-lg border border-default bg-elevated"
        >
          <!-- Header with name and status badge -->
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex items-center gap-2 min-w-0">
              <h4 class="font-semibold text-primary truncate">
                {{ connection.worldName || connection.name }}
              </h4>
            </div>
            <UBadge
              :color="getStatusColor(connection)"
              :variant="getStatusVariant(connection)"
              class="shrink-0"
            >
              {{ getStatusLabel(connection) }}
            </UBadge>
          </div>

          <!-- Connection details -->
          <div class="space-y-1.5 text-sm">
            <div class="flex items-center gap-2 text-muted">
              <UIcon name="i-lucide-hash" class="size-4 shrink-0" />
              <code class="text-xs bg-muted/50 px-1.5 py-0.5 rounded truncate">
                {{ connection.worldId || 'N/A' }}
              </code>
            </div>

            <div v-if="connection.moduleVersion" class="flex items-center gap-2 text-muted">
              <UIcon name="i-lucide-package" class="size-4 shrink-0" />
              <span>Version {{ connection.moduleVersion }}</span>
            </div>

            <div class="flex items-center gap-2 text-muted">
              <UIcon name="i-lucide-clock" class="size-4 shrink-0" />
              <span>{{ getLastActivityText(connection) }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col sm:flex-row gap-2 mt-4">
            <!-- Settings button - always shown if campaign exists -->
            <UButton
              v-if="connection.campaign"
              :to="`/mj/campaigns/${connection.campaign.id}`"
              variant="soft"
              color="primary"
              size="sm"
              icon="i-lucide-settings"
              class="w-full sm:w-auto"
              @click="model = false"
            >
              Réglages
            </UButton>

            <!-- Revoke button - only for active connections -->
            <UButton
              v-if="connection.status === 'active'"
              variant="soft"
              color="error"
              size="sm"
              icon="i-lucide-unplug"
              class="w-full sm:w-auto"
              :loading="revokingId === connection.id"
              @click="handleRevoke(connection)"
            >
              Révoquer
            </UButton>

            <!-- Reconnect button - only for revoked connections -->
            <UButton
              v-if="connection.status === 'revoked'"
              variant="soft"
              color="success"
              size="sm"
              icon="i-lucide-plug"
              class="w-full sm:w-auto"
              :loading="reconnectingId === connection.id"
              @click="handleReconnect(connection)"
            >
              Reconnecter
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface VttProvider {
  id: string
  name: string
  displayName: string
}

interface Campaign {
  id: string
  name: string
}

interface VttConnectionFull {
  id: string
  name: string
  status: 'pending' | 'active' | 'expired' | 'revoked'
  tunnelStatus: 'connected' | 'connecting' | 'disconnected' | 'error'
  lastHeartbeatAt: string | null
  worldId: string | null
  worldName: string | null
  moduleVersion: string | null
  provider: VttProvider
  campaign?: Campaign | null
}

const model = defineModel<boolean>({ required: true })

const config = useRuntimeConfig()
const toast = useToast()

const connections = ref<VttConnectionFull[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const revokingId = ref<string | null>(null)
const reconnectingId = ref<string | null>(null)

// Fetch connections when slideover opens
watch(model, (isOpen) => {
  if (isOpen) {
    fetchConnections()
  }
})

async function fetchConnections() {
  loading.value = true
  error.value = null

  try {
    // Fetch all VTT connections
    const response = await fetch(`${config.public.apiBase}/mj/vtt-connections`, {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Impossible de charger les connexions')
    }

    const allConnections: VttConnectionFull[] = await response.json()

    // Filter only Foundry connections
    const foundryConnections = allConnections.filter((c) => c.provider?.name === 'foundry')

    // For each connection, fetch the associated campaign
    const connectionsWithCampaigns = await Promise.all(
      foundryConnections.map(async (connection) => {
        try {
          const detailResponse = await fetch(
            `${config.public.apiBase}/mj/vtt-connections/${connection.id}`,
            { credentials: 'include' }
          )

          if (detailResponse.ok) {
            const detail = await detailResponse.json()
            return {
              ...connection,
              campaign: detail.campaigns?.[0] || null,
            }
          }
        } catch {
          // Ignore errors for individual connections
        }
        return { ...connection, campaign: null }
      })
    )

    connections.value = connectionsWithCampaigns
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}

function getStatusColor(
  connection: VttConnectionFull
): 'success' | 'warning' | 'error' | 'neutral' {
  if (connection.status === 'revoked') return 'error'
  if (connection.status === 'expired') return 'error'
  if (connection.tunnelStatus === 'error') return 'error'
  if (connection.tunnelStatus === 'connecting') return 'warning'
  if (connection.tunnelStatus === 'connected') {
    // Check if heartbeat is recent (< 2 minutes)
    if (connection.lastHeartbeatAt) {
      const lastHeartbeat = new Date(connection.lastHeartbeatAt)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
      if (lastHeartbeat > twoMinutesAgo) {
        return 'success'
      }
    }
    return 'neutral'
  }
  return 'neutral'
}

function getStatusVariant(connection: VttConnectionFull): 'solid' | 'soft' {
  const color = getStatusColor(connection)
  return color === 'success' ? 'solid' : 'soft'
}

function getStatusLabel(connection: VttConnectionFull): string {
  if (connection.status === 'revoked') return 'Révoqué'
  if (connection.status === 'expired') return 'Expiré'
  if (connection.tunnelStatus === 'error') return 'Erreur'
  if (connection.tunnelStatus === 'connecting') return 'Connexion...'
  if (connection.tunnelStatus === 'connected') {
    if (connection.lastHeartbeatAt) {
      const lastHeartbeat = new Date(connection.lastHeartbeatAt)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)
      if (lastHeartbeat > twoMinutesAgo) {
        return 'Connecté'
      }
    }
    return 'Déconnecté'
  }
  return 'Déconnecté'
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) {
    return "à l'instant"
  } else if (diffMinutes < 60) {
    return `il y a ${diffMinutes} min`
  } else if (diffHours < 24) {
    return `il y a ${diffHours}h`
  } else if (diffDays < 7) {
    return `il y a ${diffDays}j`
  } else {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }
}

function getLastActivityText(connection: VttConnectionFull): string {
  if (!connection.lastHeartbeatAt) {
    return 'Aucune activité'
  }

  try {
    return formatRelativeTime(connection.lastHeartbeatAt)
  } catch {
    return 'Date inconnue'
  }
}

async function handleRevoke(connection: VttConnectionFull) {
  revokingId.value = connection.id

  try {
    const response = await fetch(
      `${config.public.apiBase}/mj/vtt-connections/${connection.id}/revoke`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Revoked from settings' }),
      }
    )

    if (!response.ok) {
      throw new Error('Impossible de révoquer la connexion')
    }

    toast.add({
      title: 'Connexion révoquée',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })

    // Refresh the list
    await fetchConnections()
  } catch (err) {
    toast.add({
      title: err instanceof Error ? err.message : 'Une erreur est survenue',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    revokingId.value = null
  }
}

async function handleReconnect(connection: VttConnectionFull) {
  reconnectingId.value = connection.id

  try {
    const response = await fetch(
      `${config.public.apiBase}/mj/vtt-connections/${connection.id}/reauthorize`,
      {
        method: 'POST',
        credentials: 'include',
      }
    )

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Impossible de reconnecter')
    }

    toast.add({
      title: 'Connexion réactivée',
      description: 'Relancez le module Foundry pour finaliser la connexion',
      color: 'success',
      icon: 'i-lucide-check-circle',
    })

    // Refresh the list
    await fetchConnections()
  } catch (err) {
    toast.add({
      title: err instanceof Error ? err.message : 'Une erreur est survenue',
      color: 'error',
      icon: 'i-lucide-alert-circle',
    })
  } finally {
    reconnectingId.value = null
  }
}
</script>
