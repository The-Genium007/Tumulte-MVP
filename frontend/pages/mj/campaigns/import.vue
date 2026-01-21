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
                  class="size-12 transition-transform duration-200 group-hover:-translate-x-1"
                />
              </template>
            </UButton>
            <div>
              <h1 class="text-3xl font-bold text-primary">Gestion des campagnes</h1>
              <p class="text-muted mt-1">Connexions VTT et import de campagnes</p>
            </div>
          </div>
          <UButton
            v-if="connections.length > 0"
            color="primary"
            icon="i-lucide-plus"
            label="Nouvelle connexion"
            @click="openPairingModal"
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
                @click="openPairingModal"
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

    <!-- Pairing Modal -->
    <UModal v-model:open="pairingModalOpen">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-primary">Connecter Foundry VTT</h2>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-lucide-x"
                square
                @click="closePairingModal"
              />
            </div>
          </template>

          <div class="space-y-6">
            <!-- Step 1: Choose method -->
            <div v-if="pairingStep === 'choose'" class="space-y-4">
              <p class="text-muted">Choisissez comment connecter votre Foundry VTT :</p>

              <div class="grid gap-4">
                <!-- Code Method -->
                <button
                  class="p-4 rounded-lg border-2 border-neutral-200 hover:border-primary-500 transition-colors text-left"
                  @click="startCodePairing"
                >
                  <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-primary-100">
                      <UIcon name="i-lucide-keyboard" class="size-6 text-primary" />
                    </div>
                    <div>
                      <h4 class="font-semibold text-primary">Entrer un code</h4>
                      <p class="text-sm text-muted">Entrez le code affiché dans Foundry VTT</p>
                    </div>
                  </div>
                </button>

                <!-- URL Method -->
                <button
                  class="p-4 rounded-lg border-2 border-neutral-200 hover:border-primary-500 transition-colors text-left"
                  @click="router.push('/mj/vtt-connections/create')"
                >
                  <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-neutral-100">
                      <UIcon name="i-lucide-link" class="size-6 text-neutral-600" />
                    </div>
                    <div>
                      <h4 class="font-semibold text-primary">Coller une URL</h4>
                      <p class="text-sm text-muted">
                        Collez l'URL de connexion générée par le module
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <!-- Step 2: Enter code -->
            <div v-if="pairingStep === 'code'" class="space-y-6">
              <UAlert color="primary" variant="soft" icon="i-lucide-info">
                <template #description>
                  <ol class="list-decimal list-inside space-y-2 mt-2">
                    <li>Ouvrez Foundry VTT</li>
                    <li>Allez dans les paramètres du module Tumulte</li>
                    <li>Cliquez sur "Connecter à Tumulte"</li>
                    <li>Entrez le code affiché ci-dessous</li>
                  </ol>
                </template>
              </UAlert>

              <!-- Code Input -->
              <div>
                <label class="block text-sm font-bold text-secondary ml-4 uppercase mb-2">
                  Code de connexion
                </label>
                <UInput
                  v-model="pairingCode"
                  type="text"
                  placeholder="ABC-123"
                  size="xl"
                  :disabled="pairingInProgress"
                  :ui="{
                    root: 'ring-0 border-0 rounded-lg overflow-hidden',
                    base: 'px-6 py-4 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg font-mono text-2xl text-center tracking-widest uppercase',
                  }"
                  @input="formatPairingCode"
                />
                <p v-if="pairingError" class="text-xs text-error-500 mt-2 ml-4">
                  {{ pairingError }}
                </p>
              </div>

              <!-- Submit Button -->
              <div class="flex gap-3">
                <UButton
                  color="neutral"
                  variant="soft"
                  label="Retour"
                  :disabled="pairingInProgress"
                  @click="pairingStep = 'choose'"
                />
                <UButton
                  color="primary"
                  label="Connecter"
                  icon="i-lucide-check"
                  :loading="pairingInProgress"
                  :disabled="!isCodeValid"
                  class="flex-1"
                  @click="submitPairingCode"
                />
              </div>
            </div>

            <!-- Step 3: Success -->
            <div v-if="pairingStep === 'success'" class="text-center py-6">
              <div
                class="size-16 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4"
              >
                <UIcon name="i-lucide-check" class="size-8 text-success-500" />
              </div>
              <h3 class="text-xl font-semibold text-primary mb-2">Connexion établie !</h3>
              <p class="text-muted mb-6">
                {{ pairingResult?.connection?.name || 'Votre VTT' }} est maintenant connecté.
              </p>
              <UButton color="primary" label="Fermer" @click="closePairingModal" />
            </div>
          </div>
        </UCard>
      </template>
    </UModal>

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
import { ref, computed, onMounted } from 'vue'
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
const { connections, fetchConnections } = useVttConnections()

// Loading states
const loading = ref(true)
const syncing = ref(false)
const importing = ref<string | null>(null)

// Campaign data
const availableCampaigns = ref<VttCampaignGroup[]>([])

// Pairing modal state
const pairingModalOpen = ref(false)
const pairingStep = ref<'choose' | 'code' | 'success'>('choose')
const pairingCode = ref('')
const pairingInProgress = ref(false)
const pairingError = ref('')
const pairingResult = ref<{ connection?: VttConnection } | null>(null)

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

// Computed
const isCodeValid = computed(() => {
  const code = pairingCode.value.replace(/[^A-Z0-9]/gi, '')
  return code.length === 6
})

onMounted(async () => {
  await loadData()
})

const loadData = async () => {
  loading.value = true
  try {
    await fetchConnections()

    if (connections.value.length > 0) {
      await syncAndFetchCampaigns()
    }
  } finally {
    loading.value = false
  }
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

// Pairing methods
const openPairingModal = () => {
  pairingStep.value = 'choose'
  pairingCode.value = ''
  pairingError.value = ''
  pairingResult.value = null
  pairingModalOpen.value = true
}

const closePairingModal = () => {
  pairingModalOpen.value = false
  if (pairingStep.value === 'success') {
    loadData()
  }
}

const startCodePairing = () => {
  pairingStep.value = 'code'
}

const formatPairingCode = () => {
  let value = pairingCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (value.length > 3) {
    value = value.slice(0, 3) + '-' + value.slice(3, 6)
  }
  pairingCode.value = value
}

const submitPairingCode = async () => {
  if (!isCodeValid.value) return

  pairingInProgress.value = true
  pairingError.value = ''

  try {
    const response = await fetch(`${config.public.apiBase}/mj/vtt-connections/pair-with-code`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: pairingCode.value,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Échec de la connexion')
    }

    const data = await response.json()
    pairingResult.value = data
    pairingStep.value = 'success'

    toast.add({
      title: 'Connexion établie',
      description: data.message || 'Le VTT est maintenant connecté',
      color: 'success',
    })
  } catch (error: unknown) {
    console.error('Failed to pair:', error)
    pairingError.value = error instanceof Error ? error.message : 'Erreur inconnue'
    toast.add({
      title: 'Erreur',
      description: pairingError.value,
      color: 'error',
    })
  } finally {
    pairingInProgress.value = false
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
const getConnectionActions = (connection: VttConnection) => [
  [
    {
      label: 'Voir les détails',
      icon: 'i-lucide-eye',
      onSelect: () => router.push(`/mj/vtt-connections/${connection.id}`),
    },
    {
      label: 'Synchroniser',
      icon: 'i-lucide-refresh-cw',
      onSelect: () => syncConnection(connection.id),
    },
  ],
  [
    {
      label: 'Révoquer',
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect: () => openRevokeModal(connection),
    },
  ],
]

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
