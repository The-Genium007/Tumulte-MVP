<template>
  <div class="min-h-screen">
    <div class="w-full max-w-300 mx-auto space-y-6">
      <!-- Header -->
      <UCard>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <UButton
              color="neutral"
              variant="soft"
              size="xl"
              square
              class="group"
              @click="router.push('/mj')"
            >
              <template #leading>
                <UIcon
                  name="i-lucide-arrow-left"
                  class="size-6 sm:size-12 transition-transform duration-200 group-hover:-translate-x-1"
                />
              </template>
            </UButton>
            <div>
              <h1 class="text-xl sm:text-3xl font-bold text-primary">Gestion des campagnes</h1>
              <p class="text-sm sm:text-base text-muted mt-1">
                Connexions VTT et import de campagnes
              </p>
            </div>
          </div>
          <UButton
            v-if="connections.length > 0"
            color="primary"
            icon="i-lucide-plus"
            label="Nouvelle connexion"
            @click="router.push('/mj/vtt-connections/create')"
          />
        </div>
      </UCard>

      <!-- Loading State -->
      <UCard v-if="loading">
        <div class="flex items-center justify-center py-12">
          <div class="text-center space-y-4">
            <UIcon
              name="i-lucide-loader-circle"
              class="size-12 text-primary animate-spin mx-auto"
            />
            <p class="text-muted">Chargement...</p>
          </div>
        </div>
      </UCard>

      <!-- No VTT Configured -->
      <UCard v-else-if="connections.length === 0">
        <div class="flex flex-col items-center justify-center py-12 px-6 text-center">
          <UIcon name="i-lucide-plug" class="size-12 text-neutral-400 mb-4" />
          <p class="text-base font-normal text-neutral-400">Aucun VTT configuré</p>
          <p class="text-sm text-neutral-400 mt-1 max-w-md mx-auto mb-6">
            Pour importer une campagne, vous devez d'abord configurer une connexion avec votre
            Virtual Tabletop (Foundry VTT, Owlbear Rodeo, ou TaleSpire).
          </p>

          <div class="flex flex-col items-center gap-4">
            <h3 class="text-lg font-semibold text-primary">Connecter votre VTT</h3>
            <div class="flex flex-wrap gap-3 justify-center">
              <UButton
                label="Foundry VTT"
                icon="i-lucide-dice-6"
                size="lg"
                color="primary"
                @click="router.push('/mj/vtt-connections/create')"
              />
              <UButton
                label="Owlbear Rodeo"
                icon="i-lucide-dice-5"
                size="lg"
                color="primary"
                variant="soft"
                disabled
              />
              <UButton
                label="TaleSpire"
                icon="i-lucide-flask-conical"
                size="lg"
                color="primary"
                variant="soft"
                disabled
              />
            </div>
          </div>
        </div>
      </UCard>

      <!-- VTT Configured -->
      <template v-else>
        <!-- Connections List -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold text-primary">Connexions VTT</h2>
          </template>

          <div class="space-y-3">
            <div
              v-for="connection in connections"
              :key="connection.id"
              class="flex items-center justify-between p-4 rounded-lg bg-primary-50"
            >
              <div class="flex items-center gap-4">
                <!-- Status Indicator -->
                <div
                  class="size-3 rounded-full"
                  :class="{
                    'bg-success-500': connection.tunnelStatus === 'connected',
                    'bg-warning-500 animate-pulse': connection.tunnelStatus === 'connecting',
                    'bg-neutral-300': connection.tunnelStatus === 'disconnected',
                    'bg-error-500': connection.tunnelStatus === 'error',
                  }"
                />

                <div>
                  <h3 class="font-semibold text-primary">{{ connection.name }}</h3>
                  <div class="flex items-center gap-3 text-sm text-muted">
                    <span class="flex items-center gap-1">
                      <UIcon name="i-lucide-globe" class="size-4" />
                      {{ connection.worldName || 'Monde inconnu' }}
                    </span>
                    <span v-if="connection.moduleVersion" class="flex items-center gap-1">
                      <UIcon name="i-lucide-tag" class="size-4" />
                      v{{ connection.moduleVersion }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <!-- Status Badge -->
                <UBadge :color="getStatusColor(connection.tunnelStatus)" variant="soft">
                  {{ getStatusLabel(connection.tunnelStatus) }}
                </UBadge>

                <!-- Actions -->
                <UDropdownMenu :items="getConnectionActions(connection)">
                  <UButton color="neutral" variant="ghost" icon="i-lucide-more-vertical" square />
                </UDropdownMenu>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Available Campaigns -->
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <h2 class="text-xl font-semibold text-primary">Campagnes disponibles</h2>
              <UButton
                icon="i-lucide-refresh-cw"
                color="neutral"
                variant="soft"
                label="Actualiser"
                :loading="syncing"
                @click="syncAndFetchCampaigns"
              />
            </div>
          </template>

          <!-- Campaign List grouped by VTT -->
          <div v-if="availableCampaigns.length > 0" class="space-y-8">
            <div v-for="(vttGroup, index) in availableCampaigns" :key="vttGroup.connectionId">
              <!-- Separator between VTT groups (not before first one) -->
              <div v-if="index > 0" class="h-px bg-primary-200 my-8" />

              <div class="space-y-4">
                <div class="flex items-center gap-3">
                  <UIcon name="i-lucide-plug" class="size-5 text-primary" />
                  <h3 class="text-lg font-semibold text-secondary">
                    {{ vttGroup.connectionName }}
                  </h3>
                  <UBadge
                    :label="`${vttGroup.campaigns.length} campagne${vttGroup.campaigns.length > 1 ? 's' : ''}`"
                    color="primary"
                    variant="subtle"
                  />
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <UCard
                    v-for="campaign in vttGroup.campaigns"
                    :key="campaign.id"
                    class="hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer"
                    :class="{
                      'opacity-50 pointer-events-none': importing === campaign.id,
                    }"
                  >
                    <div class="space-y-4">
                      <div>
                        <h4 class="text-lg font-semibold text-primary">
                          {{ campaign.name }}
                        </h4>
                        <p v-if="campaign.description" class="text-sm text-muted mt-1">
                          {{ campaign.description }}
                        </p>
                      </div>

                      <div v-if="campaign.characterCount" class="flex items-center gap-2">
                        <UIcon name="i-lucide-users" class="size-4 text-muted" />
                        <span class="text-sm text-muted">
                          {{ campaign.characterCount }} personnage{{
                            campaign.characterCount > 1 ? 's' : ''
                          }}
                        </span>
                      </div>

                      <UButton
                        label="Importer cette campagne"
                        icon="i-lucide-download"
                        color="primary"
                        block
                        :loading="importing === campaign.id"
                        @click="handleImport(vttGroup.connectionId, campaign)"
                      />
                    </div>
                  </UCard>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State if no campaigns available -->
          <div v-else class="flex flex-col items-center justify-center py-12 text-center">
            <UIcon name="i-lucide-folder-open" class="size-12 text-neutral-400 mb-4" />
            <p class="text-base font-normal text-neutral-400">
              Aucune nouvelle campagne disponible
            </p>
            <p class="text-sm text-neutral-400 mt-1 max-w-md mx-auto">
              Toutes vos campagnes VTT ont déjà été importées. Créez une nouvelle campagne dans
              votre VTT ou ajoutez une autre connexion VTT.
            </p>
          </div>
        </UCard>
      </template>
    </div>

    <!-- Revoke Confirmation Modal -->
    <UModal v-model:open="revokeModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold text-error">Révoquer la connexion</h2>
          </template>
          <p class="text-muted">
            Êtes-vous sûr de vouloir révoquer la connexion
            <strong>{{ connectionToRevoke?.name }}</strong> ?
          </p>
          <p class="text-sm text-muted mt-2">
            Cette action déconnectera immédiatement le VTT et invalidera tous les tokens.
          </p>
          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                color="neutral"
                variant="soft"
                label="Annuler"
                @click="revokeModalOpen = false"
              />
              <UButton
                color="error"
                label="Révoquer"
                icon="i-lucide-trash-2"
                :loading="revoking"
                @click="confirmRevoke"
              />
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useVttConnections, type VttConnection } from '@/composables/useVttConnections'
import { useToast } from '#ui/composables/useToast'

definePageMeta({
  layout: 'authenticated' as const,
  middleware: ['auth'],
})

const router = useRouter()
const config = useRuntimeConfig()
const toast = useToast()
const { connections, fetchConnections, getConnectionDetails } = useVttConnections()

// Map to store linked campaign IDs for each connection
const connectionCampaigns = ref<Map<string, string | null>>(new Map())

// Loading states
const loading = ref(true)
const syncing = ref(false)
const importing = ref<string | null>(null)

// Campaign data
const availableCampaigns = ref<VttCampaignGroup[]>([])

// Revoke modal state
const revokeModalOpen = ref(false)
const connectionToRevoke = ref<VttConnection | null>(null)
const revoking = ref(false)

interface VttCampaignGroup {
  connectionId: string
  connectionName: string
  campaigns: VttCampaign[]
}

interface VttCampaign {
  id: string
  name: string
  description?: string
  characterCount?: number
  characters?: Array<{
    id: string
    name: string
    type: 'pc' | 'npc'
    avatarUrl: string | null
  }>
}

onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  loading.value = true
  try {
    await fetchConnections()

    if (connections.value.length > 0) {
      // Load linked campaigns for each connection (for navigation)
      await loadLinkedCampaigns()
      await syncAndFetchCampaigns()
    }
  } finally {
    loading.value = false
  }
}

// Load the linked campaign ID for each connection
const loadLinkedCampaigns = async () => {
  const promises = connections.value.map(async (conn) => {
    try {
      const data = await getConnectionDetails(conn.id)
      const linkedCampaignId = data.campaigns?.length > 0 ? (data.campaigns[0]?.id ?? null) : null
      connectionCampaigns.value.set(conn.id, linkedCampaignId)
    } catch (error) {
      console.error(`Failed to get linked campaign for connection ${conn.id}:`, error)
      connectionCampaigns.value.set(conn.id, null)
    }
  })
  await Promise.all(promises)
}

const syncAndFetchCampaigns = async () => {
  syncing.value = true
  try {
    const promises = connections.value.map(async (conn) => {
      try {
        const response = await fetch(
          `${config.public.apiBase}/mj/vtt-connections/${conn.id}/sync-campaigns`,
          { method: 'POST', credentials: 'include' }
        )

        if (!response.ok) return null

        const data = await response.json()
        return {
          connectionId: conn.id,
          connectionName: conn.name,
          campaigns: data.campaigns || [],
        }
      } catch (error) {
        console.error(`Failed to sync campaigns for connection ${conn.id}:`, error)
        return null
      }
    })

    const results = await Promise.all(promises)
    availableCampaigns.value = results.filter((r): r is VttCampaignGroup => r !== null)
  } finally {
    syncing.value = false
  }
}

// Status helpers
const getStatusColor = (status?: string) => {
  switch (status) {
    case 'connected':
      return 'success'
    case 'connecting':
      return 'warning'
    case 'error':
      return 'error'
    default:
      return 'neutral'
  }
}

const getStatusLabel = (status?: string) => {
  switch (status) {
    case 'connected':
      return 'Connecté'
    case 'connecting':
      return 'Connexion...'
    case 'error':
      return 'Erreur'
    default:
      return 'Déconnecté'
  }
}

// Connection actions
const getConnectionActions = (connection: VttConnection) => {
  const linkedCampaignId = connectionCampaigns.value.get(connection.id)

  // Build actions array dynamically
  const primaryActions = []

  // Only show "Voir les détails" if a campaign is linked
  if (linkedCampaignId) {
    primaryActions.push({
      label: 'Voir les détails',
      icon: 'i-lucide-eye',
      onSelect: () => router.push(`/mj/campaigns/${linkedCampaignId}`),
    })
  }

  primaryActions.push({
    label: 'Synchroniser',
    icon: 'i-lucide-refresh-cw',
    onSelect: () => syncConnection(connection.id),
  })

  return [
    primaryActions,
    [
      {
        label: 'Révoquer',
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect: () => openRevokeModal(connection),
      },
    ],
  ]
}

const syncConnection = async (connectionId: string) => {
  try {
    const response = await fetch(
      `${config.public.apiBase}/mj/vtt-connections/${connectionId}/sync-campaigns`,
      {
        method: 'POST',
        credentials: 'include',
      }
    )

    if (!response.ok) {
      throw new Error('Sync failed')
    }

    toast.add({
      title: 'Synchronisation',
      description: 'Synchronisation lancée',
      color: 'success',
    })

    await syncAndFetchCampaigns()
  } catch (error) {
    console.error('Failed to sync:', error)
    toast.add({
      title: 'Erreur',
      description: 'Impossible de synchroniser',
      color: 'error',
    })
  }
}

// Revoke methods
const openRevokeModal = (connection: VttConnection) => {
  connectionToRevoke.value = connection
  revokeModalOpen.value = true
}

const confirmRevoke = async () => {
  if (!connectionToRevoke.value) return

  revoking.value = true

  try {
    const response = await fetch(
      `${config.public.apiBase}/mj/vtt-connections/${connectionToRevoke.value.id}/revoke`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: 'Revoked by user from dashboard',
        }),
      }
    )

    if (!response.ok) {
      throw new Error('Revoke failed')
    }

    toast.add({
      title: 'Connexion révoquée',
      description: 'La connexion a été révoquée avec succès',
      color: 'success',
    })

    revokeModalOpen.value = false
    await loadData()
  } catch (error) {
    console.error('Failed to revoke:', error)
    toast.add({
      title: 'Erreur',
      description: 'Impossible de révoquer la connexion',
      color: 'error',
    })
  } finally {
    revoking.value = false
  }
}

// Import campaign
const handleImport = async (connectionId: string, campaign: VttCampaign) => {
  importing.value = campaign.id

  try {
    const response = await fetch(`${config.public.apiBase}/mj/campaigns/import`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vttConnectionId: connectionId,
        vttCampaignId: campaign.id,
        name: campaign.name,
        description: campaign.description,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Import failed')
    }

    toast.add({
      title: 'Campagne importée',
      description: `${campaign.name} a été importée avec succès`,
      color: 'success',
    })

    router.push('/mj')
  } catch (error) {
    console.error('Failed to import campaign:', error)
    toast.add({
      title: 'Erreur',
      description: "Impossible d'importer la campagne",
      color: 'error',
    })
  } finally {
    importing.value = null
  }
}
</script>
