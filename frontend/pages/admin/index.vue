<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Dashboard Admin</h1>
      <UBadge color="error" variant="subtle">Admin</UBadge>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon
        name="i-game-icons-dice-twenty-faces-twenty"
        class="size-8 animate-spin-slow text-primary"
      />
    </div>

    <!-- Error state -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      :title="error"
      icon="i-lucide-alert-circle"
    />

    <!-- Metrics -->
    <template v-else-if="metrics">
      <!-- Stats Overview -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <UCard>
          <div class="flex items-center gap-4">
            <div class="size-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <UIcon name="i-lucide-users" class="size-6 text-primary" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ metrics.users.total }}</p>
              <p class="text-sm text-muted">Utilisateurs</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-4">
            <div class="size-12 rounded-xl bg-brand/10 flex items-center justify-center">
              <UIcon name="i-lucide-folder" class="size-6 text-brand" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ metrics.campaigns.total }}</p>
              <p class="text-sm text-muted">Campagnes</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-4">
            <div class="size-12 rounded-xl bg-success/10 flex items-center justify-center">
              <UIcon name="i-lucide-bar-chart-3" class="size-6 text-success" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ metrics.pollInstances.total }}</p>
              <p class="text-sm text-muted">Sondages lancés</p>
            </div>
          </div>
        </UCard>

        <UCard>
          <div class="flex items-center gap-4">
            <div class="size-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <UIcon name="i-simple-icons-twitch" class="size-6 text-warning" />
            </div>
            <div>
              <p class="text-2xl font-bold">{{ metrics.streamers.total }}</p>
              <p class="text-sm text-muted">Streamers</p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Detailed Stats -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Users breakdown -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Utilisateurs</h2>
          </template>

          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-muted">Total</span>
              <span class="font-medium">{{ metrics.users.total }}</span>
            </div>
            <USeparator />
            <div class="space-y-2">
              <p class="text-sm text-muted font-medium">Par tier</p>
              <div
                v-for="(count, tier) in metrics.users.byTier"
                :key="tier"
                class="flex justify-between items-center"
              >
                <span class="capitalize">{{ tier }}</span>
                <UBadge
                  :color="tier === 'admin' ? 'error' : tier === 'premium' ? 'primary' : 'neutral'"
                  variant="subtle"
                >
                  {{ count }}
                </UBadge>
              </div>
            </div>
            <USeparator />
            <div class="flex justify-between items-center">
              <span class="text-muted">Email vérifié</span>
              <span class="font-medium">{{ metrics.users.verified }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-muted">Avec mot de passe</span>
              <span class="font-medium">{{ metrics.users.withPassword }}</span>
            </div>
            <USeparator />
            <div class="flex justify-between items-center">
              <span class="text-muted">Nouveaux (7j)</span>
              <span class="font-medium text-success">+{{ metrics.users.newLast7Days }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-muted">Nouveaux (30j)</span>
              <span class="font-medium text-success">+{{ metrics.users.newLast30Days }}</span>
            </div>
          </div>
        </UCard>

        <!-- Campaigns & Polls -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Campagnes & Sondages</h2>
          </template>

          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-muted">Campagnes totales</span>
              <span class="font-medium">{{ metrics.campaigns.total }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-muted">Campagnes actives</span>
              <span class="font-medium">{{ metrics.campaigns.active }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-muted">Avec VTT</span>
              <span class="font-medium">{{ metrics.campaigns.withVtt }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-muted">Membres/campagne (moy.)</span>
              <span class="font-medium">{{ metrics.campaigns.avgMembersPerCampaign }}</span>
            </div>
            <USeparator />
            <div class="flex justify-between items-center">
              <span class="text-muted">Templates de sondages</span>
              <span class="font-medium">{{ metrics.polls.total }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-muted">Sondages lancés</span>
              <span class="font-medium">{{ metrics.pollInstances.total }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-muted">Sondages (7j)</span>
              <span class="font-medium text-success">+{{ metrics.pollInstances.last7Days }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-muted">Sondages (30j)</span>
              <span class="font-medium text-success">+{{ metrics.pollInstances.last30Days }}</span>
            </div>
          </div>
        </UCard>

        <!-- Streamers -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Streamers</h2>
          </template>

          <div class="space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-muted">Total</span>
              <span class="font-medium">{{ metrics.streamers.total }}</span>
            </div>
            <div class="flex justify-between items-center">
              <span class="text-muted">Actifs</span>
              <span class="font-medium">{{ metrics.streamers.active }}</span>
            </div>
            <USeparator />
            <div class="space-y-2">
              <p class="text-sm text-muted font-medium">Par type</p>
              <div
                v-for="(count, type) in metrics.streamers.byBroadcasterType"
                :key="type"
                class="flex justify-between items-center"
              >
                <span class="capitalize">{{ type || 'Standard' }}</span>
                <UBadge
                  :color="
                    type === 'partner' ? 'primary' : type === 'affiliate' ? 'success' : 'neutral'
                  "
                  variant="subtle"
                >
                  {{ count }}
                </UBadge>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Poll Instance Status -->
        <UCard>
          <template #header>
            <h2 class="text-lg font-semibold">Status des sondages</h2>
          </template>

          <div class="space-y-4">
            <div
              v-for="(count, status) in metrics.pollInstances.byStatus"
              :key="status"
              class="flex justify-between items-center"
            >
              <span class="capitalize">{{ statusLabels[status] || status }}</span>
              <UBadge :color="statusColors[status] || 'neutral'" variant="subtle">
                {{ count }}
              </UBadge>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Generated timestamp -->
      <p class="text-sm text-muted text-center">Généré le {{ formatDate(metrics.generatedAt) }}</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuth } from '@/composables/useAuth'

definePageMeta({
  layout: 'authenticated' as const,
  middleware: 'auth',
})

useHead({
  title: 'Admin - Tumulte',
})

useSeoMeta({
  robots: 'noindex, nofollow',
})

interface AdminMetrics {
  users: {
    total: number
    byTier: Record<string, number>
    verified: number
    withPassword: number
    newLast7Days: number
    newLast30Days: number
  }
  campaigns: {
    total: number
    active: number
    withVtt: number
    avgMembersPerCampaign: string
  }
  polls: {
    total: number
  }
  pollInstances: {
    total: number
    byStatus: Record<string, number>
    last7Days: number
    last30Days: number
  }
  streamers: {
    total: number
    active: number
    byBroadcasterType: Record<string, number>
  }
  generatedAt: string
}

const { isAdmin } = useAuth()
const config = useRuntimeConfig()

const loading = ref(true)
const error = ref<string | null>(null)
const metrics = ref<AdminMetrics | null>(null)

const statusLabels: Record<string, string> = {
  PENDING: 'En attente',
  RUNNING: 'En cours',
  ENDED: 'Terminé',
  CANCELLED: 'Annulé',
}

const statusColors: Record<string, 'warning' | 'success' | 'neutral' | 'error'> = {
  PENDING: 'warning',
  RUNNING: 'success',
  ENDED: 'neutral',
  CANCELLED: 'error',
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

async function fetchMetrics() {
  loading.value = true
  error.value = null

  try {
    const response = await fetch(`${config.public.apiBase}/admin/metrics`, {
      credentials: 'include',
    })

    if (!response.ok) {
      if (response.status === 403) {
        error.value = "Accès refusé. Vous n'êtes pas administrateur."
      } else {
        error.value = 'Erreur lors du chargement des métriques'
      }
      return
    }

    metrics.value = await response.json()
  } catch {
    error.value = 'Impossible de charger les métriques'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (!isAdmin.value) {
    error.value = "Accès refusé. Vous n'êtes pas administrateur."
    loading.value = false
    return
  }
  fetchMetrics()
})
</script>
