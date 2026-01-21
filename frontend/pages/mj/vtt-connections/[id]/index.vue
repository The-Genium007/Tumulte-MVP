<template>
  <div class="min-h-screen">
    <div class="w-full max-w-300 mx-auto space-y-6">
      <!-- Header -->
      <UCard>
        <div class="flex items-center gap-4">
          <div>
            <!-- Bouton retour -->
            <UButton
              color="neutral"
              variant="soft"
              size="xl"
              square
              class="group"
              @click="_router.push('/mj/campaigns/import')"
            >
              <template #leading>
                <UIcon
                  name="i-lucide-arrow-left"
                  class="size-12 transition-transform duration-200 group-hover:-translate-x-1"
                />
              </template>
            </UButton>
          </div>
          <div class="flex-1">
            <h1 class="text-3xl font-bold text-primary">
              {{ connection?.name || 'Chargement...' }}
            </h1>
            <p class="text-muted mt-1">
              {{ connection?.provider?.displayName || 'Connexion VTT' }}
            </p>
          </div>
          <UBadge v-if="connection" :color="getStatusColor(connection.status)" size="lg">
            {{ getStatusLabel(connection.status) }}
          </UBadge>
        </div>
      </UCard>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-primary" />
      </div>

      <template v-else-if="connection">
        <!-- Connection Status Card -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-primary">État de la connexion</h2>
              <UBadge :color="getTunnelStatusColor(connection.tunnelStatus)" size="lg">
                {{ getTunnelStatusLabel(connection.tunnelStatus) }}
              </UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <!-- World Information -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-bold text-secondary ml-4 uppercase mb-2">
                  Monde VTT
                </label>
                <p class="text-primary ml-4">{{ connection.worldName || 'Non configuré' }}</p>
              </div>
              <div v-if="connection.moduleVersion">
                <label class="block text-sm font-bold text-secondary ml-4 uppercase mb-2">
                  Version du Module
                </label>
                <p class="text-muted ml-4">v{{ connection.moduleVersion }}</p>
              </div>
              <div v-if="connection.lastHeartbeatAt">
                <label class="block text-sm font-bold text-secondary ml-4 uppercase mb-2">
                  Dernière activité
                </label>
                <p class="text-muted ml-4">
                  {{ formatRelativeTime(connection.lastHeartbeatAt) }}
                </p>
              </div>
            </div>

            <!-- Connection Status Alert -->
            <UAlert
              v-if="connection.tunnelStatus === 'connected'"
              color="success"
              variant="soft"
              icon="i-lucide-check-circle"
              title="Connexion active"
              description="La connexion avec votre VTT est établie et fonctionnelle."
            />
            <UAlert
              v-else-if="connection.tunnelStatus === 'connecting'"
              color="warning"
              variant="soft"
              icon="i-lucide-loader-circle"
              title="Connexion en cours"
              description="Le tunnel est en cours d'établissement avec votre VTT."
            />
            <UAlert
              v-else-if="connection.tunnelStatus === 'error'"
              color="error"
              variant="soft"
              icon="i-lucide-alert-circle"
              title="Erreur de connexion"
              description="Le tunnel a rencontré une erreur. Vérifiez que votre VTT est bien en ligne."
            />
            <UAlert
              v-else
              color="neutral"
              variant="soft"
              icon="i-lucide-unplug"
              title="Déconnecté"
              description="Le tunnel n'est pas actif. Lancez votre VTT pour établir la connexion."
            />

            <!-- Revoke Connection -->
            <div
              v-if="connection.status !== 'revoked'"
              class="pt-4 border-t border-neutral-200 flex items-center justify-between"
            >
              <div>
                <h3 class="font-semibold text-primary">Révoquer la connexion</h3>
                <p class="text-sm text-muted">
                  Déconnecte le VTT et invalide les tokens d'authentification.
                </p>
              </div>
              <UButton
                color="warning"
                variant="soft"
                label="Révoquer"
                icon="i-lucide-shield-off"
                :loading="revoking"
                @click="handleRevoke"
              />
            </div>
          </div>
        </UCard>

        <!-- Campaign Card -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold text-primary">Campagne liée</h2>
          </template>

          <!-- Empty State -->
          <div v-if="campaigns.length === 0" class="text-center py-8">
            <UIcon name="i-lucide-folder" class="size-12 text-muted mx-auto mb-3" />
            <p class="text-muted">Aucune campagne n'utilise cette connexion</p>
          </div>

          <!-- Campaign (single) -->
          <div
            v-else-if="linkedCampaign"
            class="p-4 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors cursor-pointer"
            @click="_router.push(`/mj/campaigns/${linkedCampaign.id}`)"
          >
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-semibold text-primary">
                  {{ linkedCampaign.name }}
                </h3>
                <p class="text-xs text-muted mt-1">
                  Créée le {{ new Date(linkedCampaign.createdAt).toLocaleDateString() }}
                </p>
              </div>
              <UIcon name="i-lucide-chevron-right" class="size-5 text-muted" />
            </div>
          </div>
        </UCard>

        <!-- Danger Zone -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold text-error-500">Zone de danger</h2>
          </template>

          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-primary">Supprimer la connexion</h3>
              <p class="text-sm text-muted">
                {{
                  campaigns.length > 0
                    ? 'Impossible : une campagne est liée à cette connexion.'
                    : 'Cette action est irréversible.'
                }}
              </p>
            </div>
            <UButton
              color="error"
              variant="soft"
              label="Supprimer"
              icon="i-lucide-trash-2"
              :loading="deleting"
              :disabled="campaigns.length > 0"
              @click="handleDelete"
            />
          </div>
        </UCard>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useVttConnections, type VttConnection } from '@/composables/useVttConnections'
import { useToast } from '#ui/composables/useToast'

definePageMeta({
  layout: 'authenticated' as const,
  middleware: ['auth'],
})

const _router = useRouter()
const route = useRoute()
const { getConnectionDetails, deleteConnection } = useVttConnections()
const toast = useToast()

const connection = ref<VttConnection | null>(null)
const campaigns = ref<Array<{ id: string; name: string; createdAt: string }>>([])
const loading = ref(false)
const deleting = ref(false)
const revoking = ref(false)

const config = useRuntimeConfig()

// Computed for the first campaign (TypeScript safety)
const linkedCampaign = computed(() => campaigns.value[0] || null)

onMounted(async () => {
  loading.value = true
  try {
    const data = await getConnectionDetails(route.params.id as string)
    connection.value = data.connection
    campaigns.value = data.campaigns
  } catch (error) {
    console.error('Failed to fetch VTT connection:', error)
    toast.add({
      title: 'Erreur',
      description: 'Impossible de charger la connexion VTT',
      color: 'error',
    })
    _router.push('/mj/campaigns/import')
  } finally {
    loading.value = false
  }
})

const formatRelativeTime = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSeconds < 60) return "À l'instant"
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`
  return date.toLocaleDateString()
}

const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'neutral' => {
  switch (status) {
    case 'active':
      return 'success'
    case 'pending':
      return 'warning'
    case 'expired':
    case 'revoked':
      return 'error'
    default:
      return 'neutral'
  }
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'active':
      return 'Active'
    case 'pending':
      return 'En attente'
    case 'expired':
      return 'Expirée'
    case 'revoked':
      return 'Révoquée'
    default:
      return status
  }
}

const getTunnelStatusColor = (status?: string): 'success' | 'warning' | 'error' | 'neutral' => {
  switch (status) {
    case 'connected':
      return 'success'
    case 'connecting':
      return 'warning'
    case 'error':
      return 'error'
    case 'disconnected':
    default:
      return 'neutral'
  }
}

const getTunnelStatusLabel = (status?: string): string => {
  switch (status) {
    case 'connected':
      return 'Connecté'
    case 'connecting':
      return 'Connexion...'
    case 'error':
      return 'Erreur'
    case 'disconnected':
      return 'Déconnecté'
    default:
      return status || 'Inconnu'
  }
}

const handleDelete = async () => {
  if (!connection.value) return

  deleting.value = true
  try {
    await deleteConnection(connection.value.id)
    toast.add({
      title: 'Connexion supprimée',
      description: 'La connexion VTT a été supprimée avec succès',
      color: 'success',
    })
    _router.push('/mj/campaigns/import')
  } catch (error: unknown) {
    console.error('Failed to delete connection:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
    toast.add({
      title: 'Erreur',
      description: errorMessage,
      color: 'error',
    })
  } finally {
    deleting.value = false
  }
}

const handleRevoke = async () => {
  if (!connection.value) return

  revoking.value = true
  try {
    const response = await fetch(
      `${config.public.apiBase}/mj/vtt-connections/${connection.value.id}/revoke`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: "Révoqué par l'utilisateur depuis l'interface Tumulte",
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Échec de la révocation')
    }

    toast.add({
      title: 'Connexion révoquée',
      description: 'La connexion a été révoquée avec succès',
      color: 'success',
    })

    // Recharger les données de la connexion
    const data = await getConnectionDetails(route.params.id as string)
    connection.value = data.connection
    campaigns.value = data.campaigns
  } catch (error: unknown) {
    console.error('Failed to revoke connection:', error)
    toast.add({
      title: 'Erreur',
      description: error instanceof Error ? error.message : 'Impossible de révoquer la connexion',
      color: 'error',
    })
  } finally {
    revoking.value = false
  }
}
</script>
