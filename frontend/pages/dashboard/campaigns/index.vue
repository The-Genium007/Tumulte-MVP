<template>
  <div class="min-h-screen">
    <div class="space-y-6">
      <!-- Header avec retour -->
      <UCard>
        <div class="flex items-center gap-4">
          <UButton
            color="neutral"
            variant="soft"
            size="xl"
            square
            class="group shrink-0"
            to="/dashboard"
          >
            <template #leading>
              <UIcon
                name="i-lucide-arrow-left"
                class="size-6 sm:size-12 transition-transform duration-200 group-hover:-translate-x-1"
              />
            </template>
          </UButton>
          <h1 class="text-xl sm:text-3xl font-bold text-primary">Mes campagnes</h1>
        </div>
      </UCard>

      <!-- Invitations en attente -->
      <UCard v-if="loading">
        <div class="text-center py-12">
          <UIcon
            name="i-game-icons-dice-twenty-faces-twenty"
            class="size-12 text-primary animate-spin-slow mx-auto"
          />
          <p class="text-muted mt-4">Chargement...</p>
        </div>
      </UCard>

      <UCard v-else-if="invitations.length > 0">
        <template #header>
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-semibold text-primary">Invitations en attente</h2>
            <UBadge color="primary" variant="soft">{{ invitations.length }}</UBadge>
          </div>
        </template>

        <div class="space-y-4">
          <div
            v-for="invitation in invitations"
            :key="invitation.id"
            class="flex flex-col sm:flex-row rounded-lg overflow-hidden bg-neutral-100"
          >
            <!-- Contenu de la carte -->
            <div class="flex-1 p-4 sm:p-6">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="font-semibold text-base sm:text-lg text-primary">
                  {{ invitation.campaign.name }}
                </h3>
              </div>
              <p v-if="invitation.campaign.description" class="text-muted text-sm mb-3">
                {{ invitation.campaign.description }}
              </p>
              <div class="flex items-center gap-2 text-sm text-muted">
                <UIcon name="i-lucide-user" class="size-4 shrink-0" />
                <span class="truncate"
                  >Invité par
                  <strong class="text-secondary">{{ invitation.campaign.ownerName }}</strong></span
                >
              </div>
              <div class="flex items-center gap-2 text-xs text-muted mt-1">
                <UIcon name="i-lucide-calendar" class="size-3 shrink-0" />
                <span>{{ formatDate(invitation.invitedAt) }}</span>
              </div>
            </div>

            <!-- Boutons d'action (colonne droite sur desktop, ligne en bas sur mobile) -->
            <div class="flex sm:flex-col shrink-0">
              <button
                class="flex-1 px-4 sm:px-6 py-3 sm:py-0 flex items-center justify-center gap-2 bg-success-100 hover:bg-success-200 text-success-600 font-medium transition-colors rounded-bl-lg sm:rounded-bl-none sm:rounded-tr-lg"
                @click="handleAccept(invitation)"
              >
                <UIcon name="i-lucide-check" class="size-5" />
                <span>Accepter</span>
              </button>
              <button
                class="flex-1 px-4 sm:px-6 py-3 sm:py-0 flex items-center justify-center gap-2 bg-error-100 hover:bg-error-200 text-error-600 font-medium transition-colors rounded-br-lg"
                @click="handleDecline(invitation.id)"
              >
                <UIcon name="i-lucide-x" class="size-5" />
                <span>Refuser</span>
              </button>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Modal de sélection de personnage -->
      <CharacterSelectionModal
        v-model="showCharacterModal"
        :characters="characters"
        :loading="acceptLoading"
        title="Choisir votre personnage"
        description="Sélectionnez le personnage que vous allez jouer dans cette campagne."
        confirm-label="Accepter et rejoindre"
        @confirm="handleConfirmAccept"
        @cancel="showCharacterModal = false"
      />

      <!-- Autorisations de sondages -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-semibold text-primary">Autorisations</h2>
            <UBadge v-if="authorizationStatuses.length > 0" color="primary" variant="soft">
              {{ authorizationStatuses.length }}
            </UBadge>
          </div>
        </template>

        <div v-if="loadingAuth" class="text-center py-12">
          <UIcon
            name="i-game-icons-dice-twenty-faces-twenty"
            class="size-10 text-primary animate-spin-slow mx-auto"
          />
        </div>

        <div
          v-else-if="authorizationStatuses.length === 0"
          class="flex flex-col items-center justify-center text-center py-12"
        >
          <UIcon name="i-lucide-shield-off" class="size-12 text-neutral-400 mb-4" />
          <p class="text-base font-normal text-neutral-400">Aucune campagne active</p>
          <p class="text-sm text-neutral-400 mt-1">
            Acceptez une invitation pour gérer vos autorisations de sondages
          </p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="status in authorizationStatuses"
            :key="status.campaignId"
            class="rounded-lg overflow-hidden bg-primary-50"
          >
            <!-- Header -->
            <div class="flex justify-between items-center p-4">
              <h3 class="text-lg font-semibold text-primary">{{ status.campaignName }}</h3>
              <UBadge
                :color="status.isAuthorized ? 'success' : 'warning'"
                :label="status.isAuthorized ? 'Autorisé' : 'Non autorisé'"
                size="lg"
              />
            </div>

            <!-- Content -->
            <div class="px-4 pb-4">
              <AuthorizationCard
                :campaign-id="status.campaignId"
                :is-owner="status.isOwner"
                :is-authorized="status.isAuthorized"
                :expires-at="status.expiresAt"
                :remaining-seconds="status.remainingSeconds"
                @authorize="handleAuthorize"
                @revoke="handleRevokeAuth"
              />
            </div>
          </div>
        </div>
      </UCard>

      <!-- Campagnes actives -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <h2 class="text-xl font-semibold text-primary">Campagnes actives</h2>
            <UBadge v-if="activeCampaigns.length > 0" color="primary" variant="soft">
              {{ activeCampaigns.length }}
            </UBadge>
          </div>
        </template>

        <div v-if="loading" class="text-center py-12">
          <UIcon
            name="i-game-icons-dice-twenty-faces-twenty"
            class="size-10 text-primary animate-spin-slow mx-auto"
          />
        </div>

        <div
          v-else-if="activeCampaigns.length === 0"
          class="flex flex-col items-center justify-center text-center py-12"
        >
          <UIcon name="i-lucide-folder-x" class="size-12 text-neutral-400 mb-4" />
          <p class="text-base font-normal text-neutral-400">Aucune campagne active</p>
          <p class="text-sm text-neutral-400 mt-1">
            Vous apparaîtrez ici une fois que vous aurez accepté une invitation
          </p>
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="campaign in activeCampaigns"
            :key="campaign.id"
            class="flex flex-col sm:flex-row rounded-lg overflow-hidden bg-neutral-100"
          >
            <!-- Contenu de la carte -->
            <div class="flex-1 p-4 sm:p-6">
              <div class="flex items-center gap-2 mb-2">
                <h3 class="font-semibold text-base sm:text-lg text-primary">{{ campaign.name }}</h3>
                <UBadge v-if="campaign.isOwner" color="primary" variant="solid" size="xs"
                  >Propriétaire</UBadge
                >
                <UBadge v-else color="success" variant="solid" size="xs">Actif</UBadge>
              </div>
              <p v-if="campaign.description" class="text-muted text-sm mb-3">
                {{ campaign.description }}
              </p>
              <div class="space-y-1">
                <!-- Afficher "Maître du jeu" seulement si on n'est pas le propriétaire -->
                <div v-if="!campaign.isOwner" class="flex items-center gap-2 text-sm text-muted">
                  <UIcon name="i-lucide-crown" class="size-4 shrink-0" />
                  <span class="truncate"
                    >Maître du jeu :
                    <strong class="text-secondary">{{ campaign.ownerName }}</strong></span
                  >
                </div>
                <div class="flex items-center gap-2 text-xs text-muted">
                  <UIcon
                    :name="campaign.isOwner ? 'i-lucide-calendar-plus' : 'i-lucide-calendar-check'"
                    class="size-3 shrink-0"
                  />
                  <span
                    >{{ campaign.isOwner ? 'Créée le' : 'Rejoint le' }}
                    {{
                      formatDate(campaign.isOwner ? campaign.createdAt : campaign.joinedAt)
                    }}</span
                  >
                </div>
              </div>
              <!-- Bouton Paramètres -->
              <div class="mt-4">
                <UButton
                  color="neutral"
                  variant="soft"
                  size="sm"
                  icon="i-lucide-settings"
                  label="Paramètres"
                  :to="`/dashboard/campaigns/${campaign.id}/settings`"
                />
              </div>
            </div>

            <!-- Bouton quitter (seulement si on n'est pas propriétaire) -->
            <button
              v-if="!campaign.isOwner"
              class="w-full sm:w-24 py-4 sm:py-0 self-stretch flex items-center justify-center gap-2 bg-error-100 hover:bg-error-200 text-error-600 transition-colors rounded-b-lg sm:rounded-b-none sm:rounded-r-lg"
              @click="handleLeave(campaign.id, campaign.name)"
            >
              <UIcon name="i-lucide-log-out" class="size-6" />
              <span class="sm:hidden font-medium">Quitter</span>
            </button>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AuthorizationCard from '@/components/AuthorizationCard.vue'
import CharacterSelectionModal from '@/components/dashboard/CharacterSelectionModal.vue'
import { useCampaigns } from '@/composables/useCampaigns'
import { useCampaignCharacters } from '@/composables/useCampaignCharacters'
import type { Campaign, CampaignInvitation, AuthorizationStatus } from '@/types'

definePageMeta({
  layout: 'authenticated' as const,
  middleware: ['auth'],
})

const toast = useToast()

const {
  fetchInvitations,
  declineInvitation,
  fetchActiveCampaigns,
  leaveCampaign,
  getAuthorizationStatus,
  grantAuthorization,
  revokeAuthorization,
} = useCampaigns()

const { characters, fetchCharacters, acceptInvitationWithCharacter } = useCampaignCharacters()

const invitations = ref<CampaignInvitation[]>([])
const activeCampaigns = ref<Campaign[]>([])
const authorizationStatuses = ref<AuthorizationStatus[]>([])
const loading = ref(false)
const loadingAuth = ref(false)

// Character selection modal state
const showCharacterModal = ref(false)
const selectedInvitation = ref<CampaignInvitation | null>(null)
const acceptLoading = ref(false)

onMounted(async () => {
  await loadData()
  await loadAuthorizationStatus()
})

const loadData = async () => {
  loading.value = true
  try {
    const [invitationsData, campaignsData] = await Promise.all([
      fetchInvitations(),
      fetchActiveCampaigns(),
    ])
    invitations.value = invitationsData
    activeCampaigns.value = campaignsData
  } catch {
    invitations.value = []
    activeCampaigns.value = []
  } finally {
    loading.value = false
  }
}

const loadAuthorizationStatus = async () => {
  loadingAuth.value = true
  try {
    const data = await getAuthorizationStatus()
    // Transform snake_case API response to camelCase
    authorizationStatuses.value = data.map(
      (item): AuthorizationStatus => ({
        campaignId: item.campaign_id,
        campaignName: item.campaign_name,
        isAuthorized: item.is_authorized,
        expiresAt: item.expires_at,
        remainingSeconds: item.remaining_seconds,
      })
    )
  } catch {
    authorizationStatuses.value = []
  } finally {
    loadingAuth.value = false
  }
}

const handleAuthorize = async (campaignId: string) => {
  try {
    await grantAuthorization(campaignId)
    await loadAuthorizationStatus()
  } catch {
    // Error handled silently
  }
}

const handleRevokeAuth = async (campaignId: string) => {
  try {
    await revokeAuthorization(campaignId)
    await loadAuthorizationStatus()
  } catch {
    // Error handled silently
  }
}

const handleAccept = async (invitation: CampaignInvitation) => {
  selectedInvitation.value = invitation
  try {
    await fetchCharacters(invitation.campaign.id)
    showCharacterModal.value = true
  } catch {
    toast.add({
      title: 'Erreur',
      description: 'Impossible de charger les personnages',
      color: 'error',
    })
  }
}

const handleConfirmAccept = async (characterId: string) => {
  if (!selectedInvitation.value) return

  acceptLoading.value = true
  try {
    await acceptInvitationWithCharacter(selectedInvitation.value.id, characterId)

    toast.add({
      title: 'Invitation acceptée',
      description: 'Vous avez rejoint la campagne avec succès',
      color: 'success',
    })

    showCharacterModal.value = false
    selectedInvitation.value = null
    await loadData()
    await loadAuthorizationStatus()
  } catch (error) {
    toast.add({
      title: 'Erreur',
      description: error instanceof Error ? error.message : "Impossible d'accepter l'invitation",
      color: 'error',
    })
  } finally {
    acceptLoading.value = false
  }
}

const handleDecline = async (id: string) => {
  if (!confirm('Êtes-vous sûr de vouloir refuser cette invitation ?')) {
    return
  }

  try {
    await declineInvitation(id)
    await loadData()
  } catch {
    // Error handled silently
  }
}

const handleLeave = async (id: string, name: string) => {
  if (
    !confirm(
      `Êtes-vous sûr de vouloir quitter la campagne "${name}" ?\n\nVous serez immédiatement retiré de tous les sondages en cours de cette campagne.`
    )
  ) {
    return
  }

  try {
    await leaveCampaign(id)
    await loadData()
  } catch {
    // Error handled silently
  }
}

const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return 'Date inconnue'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'Date invalide'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date)
}
</script>
