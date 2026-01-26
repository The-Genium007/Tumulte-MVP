<template>
  <div class="min-h-screen">
    <div class="space-y-6">
      <!-- Carte 1: Sélecteur de campagne -->
      <MjCampaignSelectorCard
        v-if="campaignsLoaded && campaigns.length > 0"
        v-model="selectedCampaignId"
        :campaigns="campaigns"
      />

      <!-- VTT Connection Alert Banner -->
      <MjVttAlertBanner
        v-if="selectedCampaignId && vttHasIssue"
        :status="vttHealthStatus"
        :campaign-id="selectedCampaignId"
        :campaign-name="currentCampaign?.name"
      />

      <!-- Carte 2: Dashboard de la campagne sélectionnée -->
      <MjCampaignDashboard
        v-if="campaignsLoaded && selectedCampaignId && currentCampaign"
        :campaign="currentCampaign"
        :members="campaignMembers"
        :live-status="liveStatus"
        :members-loading="streamersLoading"
      />

      <!-- No Campaign Message -->
      <UCard v-else-if="campaignsLoaded && campaigns.length === 0">
        <div class="text-center py-12">
          <UIcon name="i-lucide-folder-x" class="size-12 text-neutral-400 mb-4" />
          <h2 class="heading-section text-neutral-400 mb-2">Aucune campagne disponible</h2>
          <p class="text-body-sm text-neutral-400 mb-6 max-w-md mx-auto">
            Créez votre premiere campagne pour commencer à configurer vos sondages
          </p>
          <UButton
            color="primary"
            size="lg"
            icon="i-lucide-plus"
            label="Connecter un VTT"
            @click="router.push('/mj/vtt-connections/create')"
          />
        </div>
      </UCard>

      <!-- Active Poll Control Card -->
      <PollControlCard
        v-if="activeSession && activeSessionPolls.length > 0"
        :poll="currentPoll"
        :current-index="currentPollIndex"
        :total-polls="activeSessionPolls.length"
        :status="pollStatus"
        :countdown="countdown"
        :results="pollResults"
        :send-loading="sendPollButton.isLoading.value"
        :close-loading="closeButton.isLoading.value"
        @send="sendPoll"
        @previous="goToPreviousPoll"
        @next="goToNextPoll"
        @close="handleCloseOrCancel"
      />

      <!-- Mes événements (sondages) -->
      <MjEventsCard
        v-if="selectedCampaignId"
        :campaign-id="selectedCampaignId"
        max-height="500px"
      />
    </div>

    <!-- Modal d'erreur Health Check avec Teleport -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="showHealthCheckError"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          @click.self="showHealthCheckError = false"
        >
          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <UCard v-if="showHealthCheckError" class="max-w-lg mx-4">
              <template #header>
                <div class="flex items-center gap-3">
                  <div class="p-2 rounded-lg bg-error-light">
                    <UIcon name="i-lucide-alert-triangle" class="size-6 text-error-500" />
                  </div>
                  <div>
                    <h3 class="heading-card">Tokens expirés</h3>
                    <p class="text-caption mt-0.5">Reconnexion requise</p>
                  </div>
                </div>
              </template>

              <div class="content-spacing">
                <div class="p-4 rounded-lg bg-error-light border border-error-light">
                  <p class="text-body-sm mb-2">
                    Les streamers suivants doivent se reconnecter pour rafraîchir leur token Twitch
                    :
                  </p>
                  <ul class="list-disc list-inside text-sm text-primary space-y-1 ml-2">
                    <li v-for="streamerName in expiredStreamersNames" :key="streamerName">
                      {{ streamerName }}
                    </li>
                  </ul>
                </div>

                <div class="p-3 rounded-lg bg-info-light border border-info-light">
                  <div class="flex items-start gap-2">
                    <UIcon name="i-lucide-info" class="size-4 text-info-500 mt-0.5 shrink-0" />
                    <p class="text-caption">
                      Les streamers concernés doivent se déconnecter puis se reconnecter à Tumulte
                      pour renouveler leur autorisation Twitch.
                    </p>
                  </div>
                </div>
              </div>

              <template #footer>
                <div class="flex items-center justify-end gap-3">
                  <UButton
                    variant="soft"
                    color="neutral"
                    label="Fermer"
                    @click="showHealthCheckError = false"
                  />
                </div>
              </template>
            </UCard>
          </Transition>
        </div>
      </Transition>
    </Teleport>

    <!-- Waiting List Modal (streamers not ready) - handled by EventsCard now -->
    <WaitingListModal :live-statuses="liveStatus" @launched="() => {}" @cancelled="() => {}" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { usePollTemplates } from '@/composables/usePollTemplates'
import { useCampaigns } from '@/composables/useCampaigns'
import type { CampaignMembership } from '@/types'
import { usePollControlStore } from '@/stores/pollControl'
import { useWebSocket } from '@/composables/useWebSocket'
import { useActionButton } from '@/composables/useActionButton'
import { useVttHealth } from '@/composables/useVttHealth'
import { loggers } from '@/utils/logger'

definePageMeta({
  layout: 'authenticated' as const,
  middleware: ['auth'],
})

useHead({
  title: 'Mes Campagnes - Tumulte',
})

const config = useRuntimeConfig()
const API_URL = config.public.apiBase
const route = useRoute()
const router = useRouter()
const { createTemplate, deleteTemplate, launchPoll } = usePollTemplates()
const { campaigns, fetchCampaigns, getCampaignMembers, getLiveStatus } = useCampaigns()

// WebSocket setup
const { subscribeToPoll } = useWebSocket()
// Note: currentPollInstanceId est maintenant dans le store Pinia
const pollSubscriptionCleanup = ref<(() => void) | null>(null)

// NOTE: Session launch with readiness check is now handled by MjEventsCard

// Interfaces
interface Poll {
  id: string
  question: string
  options: string[]
  type?: 'UNIQUE' | 'STANDARD'
  channelPointsPerVote?: number | null
}

// Interface pour l'état de session active (contrôle du poll)
// Note: "Session" ici fait référence à l'état de contrôle actif, pas à l'ancienne entité PollSession
interface ActivePollSession {
  id: string
  defaultDurationSeconds: number
}

interface StreamerDisplay {
  id: string
  twitchUserId: string
  twitchDisplayName: string
  twitchLogin: string
  profileImageUrl: string
  broadcasterType: string
  isActive: boolean
  isPollAuthorized: boolean
  authorizationRemainingSeconds: number | null
  isOwner: boolean
}

// Campaign management
const campaignsLoaded = ref(false)

// Utiliser le composable pour la persistance localStorage
const { selectedCampaignId, loadFromStorage } = useSelectedCampaign()

// Computed pour la campagne actuellement sélectionnée
const currentCampaign = computed(
  () => campaigns.value.find((c) => c.id === selectedCampaignId.value) || null
)

// VTT Health monitoring for selected campaign
const {
  healthStatus: vttHealthStatus,
  hasIssue: vttHasIssue,
  startPolling: startVttPolling,
  stopPolling: _stopVttPolling,
} = useVttHealth(selectedCampaignId)

// Streamers data
const streamersLoading = ref(false)
const campaignMembers = ref<CampaignMembership[]>([])

// Live status
import type { LiveStatusMap } from '@/types'
const liveStatus = ref<LiveStatusMap>({})

// Filtrer les streamers par campagne sélectionnée
const selectedCampaignStreamers = computed<StreamerDisplay[]>(() => {
  // Retourner uniquement les membres actifs de la campagne
  return campaignMembers.value
    .filter((member) => member.status === 'ACTIVE')
    .map(
      (member): StreamerDisplay => ({
        id: member.streamer.id,
        twitchUserId: member.streamer.twitchUserId,
        twitchDisplayName: member.streamer.twitchDisplayName,
        twitchLogin: member.streamer.twitchLogin,
        profileImageUrl: member.streamer.profileImageUrl || '',
        broadcasterType: member.streamer.broadcasterType || '',
        isActive: true,
        isPollAuthorized: member.isPollAuthorized,
        authorizationRemainingSeconds: member.authorizationRemainingSeconds,
        isOwner: member.isOwner,
      })
    )
})

const _formatAuthTime = (seconds: number | null): string => {
  if (!seconds) return 'Non autorisé'

  // Si l'autorisation est > 1 an (31536000 secondes), c'est "permanent"
  if (seconds > 31536000) return 'Permanent'

  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  // Format H:M:S
  return `${hours}h${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// Fetch live status for streamers
const fetchLiveStatus = async (campaignId: string) => {
  try {
    const status = await getLiveStatus(campaignId)
    liveStatus.value = status
  } catch (error) {
    loggers.campaign.error('Error fetching live status:', error)
    liveStatus.value = {}
  }
}

// Charger les membres de la campagne sélectionnée
const loadCampaignMembers = async (campaignId: string) => {
  streamersLoading.value = true
  try {
    const [members] = await Promise.all([
      getCampaignMembers(campaignId),
      fetchLiveStatus(campaignId),
    ])
    // Cast nécessaire car getCampaignMembers retourne un type légèrement différent de CampaignMembership
    campaignMembers.value = members as unknown as CampaignMembership[]
    loggers.campaign.debug('Campaign members loaded:', campaignMembers.value)
    loggers.campaign.debug('Streamers with images:', selectedCampaignStreamers.value)
  } catch (error) {
    loggers.campaign.error('Failed to load campaign members:', error)
    campaignMembers.value = []
  } finally {
    streamersLoading.value = false
  }
}

// Health Check error modal
const showHealthCheckError = ref(false)
const expiredStreamersNames = ref<string[]>([])

// Template creation modal
const showCreateModal = ref(false)
const creating = ref(false)
const newTemplate = reactive({
  label: '',
  title: '',
  durationSeconds: 60,
})
const optionsText = ref('')

// Load data on mount
// MOVED TO SINGLE onMounted BELOW - See line ~1370

const _handleCreateTemplate = async () => {
  const options = optionsText.value.split('\n').filter((o) => o.trim())

  if (options.length < 2 || options.length > 5) {
    return
  }

  if (!selectedCampaignId.value) {
    return
  }

  creating.value = true
  try {
    await createTemplate(
      {
        label: newTemplate.label,
        title: newTemplate.title,
        // eslint-disable-next-line camelcase
        duration_seconds: newTemplate.durationSeconds,
        options,
      },
      selectedCampaignId.value
    )
    showCreateModal.value = false
    newTemplate.label = ''
    newTemplate.title = ''
    newTemplate.durationSeconds = 60
    optionsText.value = ''
  } catch {
    // Error handled silently
  } finally {
    creating.value = false
  }
}

const _handleLaunchPoll = async (templateId: string) => {
  if (!selectedCampaignId.value) {
    return
  }

  try {
    await launchPoll(templateId, selectedCampaignId.value)
  } catch {
    // Error handled silently
  }
}

const _handleDeleteTemplate = async (templateId: string) => {
  if (!confirm('Êtes-vous sûr de vouloir supprimer ce template ?')) {
    return
  }

  if (!selectedCampaignId.value) {
    return
  }

  try {
    await deleteTemplate(templateId, selectedCampaignId.value)
  } catch {
    // Error handled silently
  }
}

// ==========================================
// POLL CONTROL (Active Poll State)
// ==========================================

// UI state for modals
const showCloseSessionConfirm = ref(false)

// ==========================================
// POLL CONTROL CARD (Live Session)
// ==========================================

// Utilisation du store Pinia pour la persistance
const pollControlStore = usePollControlStore()
const {
  activeSession,
  activeSessionPolls,
  currentPollIndex,
  pollStatus,
  countdown,
  pollResults,
  launchedPolls,
  pollStartTime,
  pollDuration,
  currentPollInstanceId,
} = storeToRefs(pollControlStore)

// Actions du store
const {
  saveCurrentPollState,
  restorePollState,
  validateWithBackend,
  startHeartbeat,
  stopHeartbeat,
} = pollControlStore

// ==========================================
// ACTION BUTTONS WITH DEBOUNCING (Phase 1)
// ==========================================

// Wrapper pour sendPoll avec debouncing
const sendPollButton = useActionButton({
  action: async () => {
    await sendPollInternal()
  },
  cooldownMs: 1000,
  onError: (error) => {
    loggers.poll.error('[sendPoll] Action failed:', error)
  },
})

// Wrapper pour cancelPoll/close avec debouncing
const closeButton = useActionButton({
  action: async () => {
    await handleCloseOrCancelInternal()
  },
  cooldownMs: 1000,
  onError: (error) => {
    loggers.poll.error('[close] Action failed:', error)
  },
})

// Computed pour la question actuelle
const currentPoll = computed<Poll | null>(() => {
  if (!activeSessionPolls.value.length) return null
  return activeSessionPolls.value[currentPollIndex.value] as Poll
})

// Gestion intelligente du bouton fermer/annuler (interne)
const handleCloseOrCancelInternal = async () => {
  if (pollStatus.value === 'sending') {
    // Si un sondage est en cours, annuler directement (sans popup)
    await cancelPoll()
  } else {
    // Sinon, demander confirmation pour fermer la session
    showCloseSessionConfirm.value = true
  }
}

// Handler public avec debouncing
const handleCloseOrCancel = () => {
  closeButton.execute()
}

// Confirmer la fermeture de la session active
const _confirmCloseSession = () => {
  // Nettoyer la souscription WebSocket
  if (pollSubscriptionCleanup.value) {
    pollSubscriptionCleanup.value()
    pollSubscriptionCleanup.value = null
  }
  currentPollInstanceId.value = null

  // Phase 3/5: Arrêter le heartbeat
  stopHeartbeat()

  pollControlStore.clearState()
  showCloseSessionConfirm.value = false
}

// Navigation entre questions
const goToPreviousPoll = () => {
  if (currentPollIndex.value > 0) {
    // Sauvegarder l'état du poll actuel avant de changer
    saveCurrentPollState()

    // Changer d'index
    currentPollIndex.value--

    // Restaurer l'état du poll précédent
    restorePollState(currentPollIndex.value)
  }
}

const goToNextPoll = () => {
  if (currentPollIndex.value < activeSessionPolls.value.length - 1) {
    // Sauvegarder l'état du poll actuel avant de changer
    saveCurrentPollState()

    // Changer d'index
    currentPollIndex.value++

    // Restaurer l'état du poll suivant
    restorePollState(currentPollIndex.value)
  }
}

// Réinitialiser l'état du sondage
const resetPollState = () => {
  pollStatus.value = 'idle'
  countdown.value = 0
  pollResults.value = null
  pollStartTime.value = null
  pollDuration.value = null
}

// Annuler le sondage en cours
const cancelPoll = async () => {
  if (!currentPoll.value || !selectedCampaignId.value) {
    resetPollState()
    return
  }

  // Arrêter le countdown immédiatement pour éviter fetchPollResults()
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }

  // Si le sondage est en cours d'envoi, appeler l'API pour annuler
  if (pollStatus.value === 'sending' && currentPollInstanceId.value) {
    try {
      const response = await fetch(`${API_URL}/mj/polls/${currentPollInstanceId.value}/cancel`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to cancel poll')
      }
    } catch (error) {
      loggers.poll.error('Failed to cancel poll:', error)
    }
  }

  // Marquer comme annulé et sauvegarder l'état
  pollStatus.value = 'cancelled'
  pollResults.value = null
  countdown.value = 0
  pollStartTime.value = null
  pollDuration.value = null

  // Sauvegarder l'état annulé
  saveCurrentPollState()
}

// Envoyer le sondage (interne - appelé via useActionButton)
const sendPollInternal = async () => {
  if (!currentPoll.value || !activeSession.value || !selectedCampaignId.value) return

  pollStatus.value = 'sending'
  pollStartTime.value = Date.now()
  pollDuration.value = (activeSession.value as ActivePollSession).defaultDurationSeconds
  if (!launchedPolls.value.includes(currentPollIndex.value)) {
    launchedPolls.value.push(currentPollIndex.value)
  }

  try {
    // Appeler l'API pour lancer le sondage
    const response = await fetch(
      `${API_URL}/mj/campaigns/${selectedCampaignId.value}/polls/launch`,
      {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: currentPoll.value.question,
          options: currentPoll.value.options,
          durationSeconds: pollDuration.value,
          type: currentPoll.value.type || 'STANDARD',
          // Le backend déduit channelPointsEnabled depuis channelPointsAmount
          // On envoie uniquement le montant (source de vérité)
          channelPointsAmount: currentPoll.value.channelPointsPerVote ?? null,
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to launch poll')
    }

    const result = await response.json()

    loggers.poll.debug('========== POLL LAUNCH RESPONSE ==========')
    loggers.poll.debug('Response data:', result)
    loggers.poll.debug('Poll instance ID:', result.data.id)

    // S'abonner immédiatement aux événements WebSocket du poll
    currentPollInstanceId.value = result.data.id

    loggers.poll.debug('currentPollInstanceId set to:', currentPollInstanceId.value)
    loggers.poll.debug('pollStatus before subscription:', pollStatus.value)

    if (currentPollInstanceId.value) {
      loggers.poll.debug('========== STARTING WEBSOCKET SUBSCRIPTION ==========')
      loggers.ws.debug('Subscribing to poll:', currentPollInstanceId.value)

      // Nettoyer l'ancienne souscription si elle existe
      if (pollSubscriptionCleanup.value) {
        loggers.poll.debug('Cleaning up old subscription')
        pollSubscriptionCleanup.value()
      }

      loggers.poll.debug('Creating new subscription with callbacks')

      // Créer une nouvelle souscription
      pollSubscriptionCleanup.value = subscribeToPoll(currentPollInstanceId.value, {
        onStart: (data) => {
          loggers.ws.debug('poll:start received:', data)
          if (pollStatus.value === 'sending') {
            loggers.ws.debug('Poll confirmed as started, switching to running state')
            pollStatus.value = 'running'

            // S'assurer que le countdown est bien démarré avec la bonne durée
            if (data.durationSeconds) {
              countdown.value = data.durationSeconds
              pollDuration.value = data.durationSeconds

              // Démarrer le countdown
              loggers.ws.debug('Starting countdown with', data.durationSeconds, 'seconds')
              startCountdown()
            }
          }
        },
        onUpdate: (data) => {
          loggers.ws.debug('poll:update received:', data)
          // Mettre à jour les résultats en temps réel
          if (
            data.votesByOption &&
            (pollStatus.value === 'sending' || pollStatus.value === 'running')
          ) {
            const results = Object.entries(data.votesByOption).map(([index, votes]) => ({
              option:
                currentPoll.value?.options?.[parseInt(index)] || `Option ${parseInt(index) + 1}`,
              votes: votes as number,
            }))

            pollResults.value = {
              results,
              totalVotes: data.totalVotes,
            }
          }
        },
        onEnd: (data) => {
          loggers.ws.debug('========== POLL:END RECEIVED ==========')
          loggers.ws.debug('Full data:', JSON.stringify(data, null, 2))
          loggers.ws.debug('Current pollStatus before:', pollStatus.value)
          loggers.ws.debug('Current countdown before:', countdown.value)

          pollStatus.value = 'sent'
          loggers.ws.debug('pollStatus set to:', pollStatus.value)

          // Utiliser votesByOption pour poll:end
          const votesData = data.votesByOption
          loggers.ws.debug('votesData:', votesData)

          if (votesData) {
            const results = Object.entries(votesData).map(([index, votes]) => ({
              option:
                currentPoll.value?.options?.[parseInt(index)] || `Option ${parseInt(index) + 1}`,
              votes: votes as number,
            }))

            loggers.ws.debug('Mapped results:', results)

            pollResults.value = {
              results,
              totalVotes: data.totalVotes,
            }

            loggers.ws.debug('pollResults updated:', pollResults.value)
          } else {
            loggers.ws.warn('No votesData found in poll:end event')
          }

          // Arrêter le countdown
          if (countdownInterval) {
            loggers.ws.debug('Clearing countdown interval')
            clearInterval(countdownInterval)
            countdownInterval = null
          }

          // Sauvegarder l'état du poll terminé avec résultats
          saveCurrentPollState()

          loggers.ws.debug('========== POLL:END PROCESSING COMPLETE ==========')
        },
      })
    }

    // Vérifier s'il y a des streamers en échec (log uniquement)
    if (result.data.failed_streamers && result.data.failed_streamers.length > 0) {
      const failedCount = result.data.failed_streamers.length
      const successCount = result.data.streamers_count - failedCount
      loggers.poll.debug(
        `${successCount} streamer(s) OK, ${failedCount} streamer(s) incompatible(s)`
      )
    }

    // Démarrer le compte à rebours
    countdown.value = (activeSession.value as ActivePollSession).defaultDurationSeconds
    startCountdown()

    // Sauvegarder l'état initial du poll lancé
    saveCurrentPollState()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Impossible d'envoyer le sondage"
    loggers.poll.error('Error:', errorMessage)
    pollStatus.value = 'idle'
    pollStartTime.value = null
    pollDuration.value = null
  }
}

// Handler public avec debouncing
const sendPoll = () => {
  sendPollButton.execute()
}

// Compte à rebours
let countdownInterval: ReturnType<typeof setInterval> | null = null

const startCountdown = () => {
  if (countdownInterval) clearInterval(countdownInterval)

  // Fonction pour calculer et mettre à jour le countdown basé sur timestamp
  const updateCountdown = () => {
    if (!pollStartTime.value || !pollDuration.value) {
      loggers.poll.warn('Missing pollStartTime or pollDuration')
      return
    }

    const endsAt = pollStartTime.value + pollDuration.value * 1000
    const now = Date.now()
    const remaining = Math.max(0, Math.floor((endsAt - now) / 1000))

    countdown.value = remaining

    if (remaining <= 0) {
      clearInterval(countdownInterval!)
      countdownInterval = null
      pollStatus.value = 'sent'
      pollStartTime.value = null
      pollDuration.value = null
      // Les résultats seront reçus via WebSocket (événement poll:end)
      // Plus besoin de fetchPollResults() ici

      // Sauvegarder l'état (les résultats seront mis à jour par le WebSocket)
      saveCurrentPollState()
    }
  }

  // Calculer immédiatement puis toutes les secondes
  updateCountdown()
  countdownInterval = setInterval(updateCountdown, 1000)
}

// Reprendre le countdown si un sondage était en cours lors du chargement
onMounted(async () => {
  // 1. Charger les campagnes d'abord
  await fetchCampaigns()
  campaignsLoaded.value = true

  // Charger la campagne depuis localStorage d'abord
  loadFromStorage()

  // Check if campaign is specified in URL (priorité sur localStorage)
  const campaignFromUrl = route.query.campaign as string | undefined
  if (campaignFromUrl && campaigns.value.some((c) => c.id === campaignFromUrl)) {
    selectedCampaignId.value = campaignFromUrl
  } else if (
    !selectedCampaignId.value ||
    !campaigns.value.some((c) => c.id === selectedCampaignId.value)
  ) {
    // Si pas de campagne valide dans localStorage, sélectionner la première
    selectedCampaignId.value = campaigns.value[0]?.id ?? null
  }

  // Start VTT health polling if a campaign is selected
  if (selectedCampaignId.value) {
    startVttPolling()
  }

  // 2. Forcer le rechargement de l'état depuis localStorage côté client
  pollControlStore.loadState()

  loggers.poll.debug('Poll Control - onMounted (après loadState):', {
    activeSession: activeSession.value,
    pollStatus: pollStatus.value,
    countdown: countdown.value,
    activeSessionPolls: activeSessionPolls.value.length,
    currentPollInstanceId: currentPollInstanceId.value,
  })

  // 3. Si une session était active, restaurer l'état du poll actuel
  if (activeSession.value && activeSessionPolls.value.length > 0) {
    loggers.poll.debug('Restoring poll state for index:', currentPollIndex.value)
    restorePollState(currentPollIndex.value)

    // Phase 3: Valider l'état local avec le backend
    const sessionData = activeSession.value as ActivePollSession
    if (selectedCampaignId.value && sessionData.id) {
      loggers.poll.debug('Validating state with backend...')
      const wasSync = await validateWithBackend(selectedCampaignId.value, sessionData.id)
      loggers.poll.debug('Backend validation result:', { wasSync })

      // Démarrer le heartbeat pour synchronisation continue
      startHeartbeat(selectedCampaignId.value, sessionData.id)
    }
  }

  // 4. Si un poll était actif, synchroniser avec le backend pour obtenir l'état réel
  if (currentPollInstanceId.value) {
    loggers.poll.debug('Syncing with backend for poll:', currentPollInstanceId.value)
    await pollControlStore.syncWithBackend()
    loggers.poll.debug('After sync - countdown:', countdown.value, 'status:', pollStatus.value)
  }

  // Reconnecter le WebSocket si un poll est en cours
  if (
    currentPollInstanceId.value &&
    (pollStatus.value === 'sending' || pollStatus.value === 'running')
  ) {
    loggers.ws.debug('Reconnecting to poll:', currentPollInstanceId.value)
    loggers.ws.debug('Current poll status:', pollStatus.value)

    // Nettoyer l'ancienne souscription si elle existe
    if (pollSubscriptionCleanup.value) {
      loggers.ws.debug('Cleaning up old subscription')
      pollSubscriptionCleanup.value()
    }

    // Recréer la souscription WebSocket
    pollSubscriptionCleanup.value = subscribeToPoll(currentPollInstanceId.value, {
      onStart: (data) => {
        loggers.ws.debug('poll:start received:', data)
        if (pollStatus.value === 'sending') {
          loggers.ws.debug('Poll confirmed as started, switching to running state')
          pollStatus.value = 'running'

          if (data.durationSeconds) {
            countdown.value = data.durationSeconds
            pollDuration.value = data.durationSeconds
            loggers.ws.debug('Starting countdown with', data.durationSeconds, 'seconds')
            startCountdown()
          }
        }
      },
      onUpdate: (data) => {
        loggers.ws.debug('poll:update received:', data)
        if (
          data.votesByOption &&
          (pollStatus.value === 'sending' || pollStatus.value === 'running')
        ) {
          const results = Object.entries(data.votesByOption).map(([index, votes]) => ({
            option:
              currentPoll.value?.options?.[parseInt(index)] || `Option ${parseInt(index) + 1}`,
            votes: votes as number,
          }))

          pollResults.value = {
            results,
            totalVotes: data.totalVotes,
          }
        }
      },
      onEnd: (data) => {
        loggers.ws.debug('========== POLL:END RECEIVED ==========')
        loggers.ws.debug('Full data:', JSON.stringify(data, null, 2))
        loggers.ws.debug('Current pollStatus before:', pollStatus.value)
        loggers.ws.debug('Current countdown before:', countdown.value)

        pollStatus.value = 'sent'
        loggers.ws.debug('pollStatus set to:', pollStatus.value)

        const votesData = data.votesByOption
        loggers.ws.debug('votesData:', votesData)

        if (votesData) {
          const results = Object.entries(votesData).map(([index, votes]) => ({
            option:
              currentPoll.value?.options?.[parseInt(index)] || `Option ${parseInt(index) + 1}`,
            votes: votes as number,
          }))

          loggers.ws.debug('Mapped results:', results)

          pollResults.value = {
            results,
            totalVotes: data.totalVotes,
          }

          loggers.ws.debug('pollResults updated:', pollResults.value)
        } else {
          loggers.ws.warn('No votesData found in poll:end event')
        }

        if (countdownInterval) {
          loggers.ws.debug('Clearing countdown interval')
          clearInterval(countdownInterval)
          countdownInterval = null
        }

        loggers.ws.debug('========== POLL:END PROCESSING COMPLETE ==========')
      },
    })

    loggers.ws.debug('Subscription recreated')
  }

  // Reprendre le countdown si un sondage était en cours
  if (pollStatus.value === 'sending' && countdown.value > 0) {
    loggers.poll.debug('Reprendre le countdown avec', countdown.value, 'secondes restantes')
    startCountdown()
  }
})

// NOTE: Les résultats sont maintenant reçus en temps réel via WebSocket (événements poll:update et poll:end)
// Plus besoin de polling HTTP pour récupérer les résultats

// Charger les membres quand la campagne change
watch(selectedCampaignId, async (newId) => {
  if (newId) {
    await loadCampaignMembers(newId)
  } else {
    campaignMembers.value = []
  }
})

// NOTE: Session management has been removed - polls are now directly linked to campaigns
// Poll creation/editing is handled by MjEventsCard component

// Reset modal on close
watch(showCreateModal, (isOpen) => {
  if (!isOpen) {
    newTemplate.label = ''
    newTemplate.title = ''
    newTemplate.durationSeconds = 60
    optionsText.value = ''
  }
})
</script>
