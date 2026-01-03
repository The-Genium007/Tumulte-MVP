<template>
  <div class="min-h-screen py-6">
    <div class="space-y-6">
        <!-- Campaigns and Streamers Grid -->
        <div v-if="campaignsLoaded && campaigns.length > 0" class="grid grid-cols-2 gap-6">
          <!-- Campaign List (1/2) -->
          <UCard class="flex flex-col">
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="bg-purple-500/10 p-3 rounded-xl">
                    <UIcon name="i-lucide-folder-kanban" class="size-6 text-purple-500" />
                  </div>
                  <div>
                    <h2 class="text-xl font-semibold text-white">Campagnes actives</h2>
                    <p class="text-sm text-gray-400">Sélectionnez une campagne pour gérer vos sondages</p>
                  </div>
                </div>
                <UButton
                  color="neutral"
                  variant="soft"
                  icon="i-lucide-folders"
                  label="Toutes les campagnes"
                  @click="router.push('/mj/campaigns')"
                />
              </div>
            </template>

            <div class="space-y-2 overflow-y-auto max-h-[calc(3*5.5rem+1rem)]">
              <div
                v-for="campaign in sortedCampaigns"
                :key="campaign.id"
                class="flex items-center justify-between p-4 rounded-lg cursor-pointer transition-all"
                :class="
                  selectedCampaignId === campaign.id
                    ? 'bg-purple-500/20 border border-purple-500/50'
                    : 'bg-gray-800/30 hover:bg-gray-800/50 border border-transparent'
                "
                @click="selectCampaign(campaign.id)"
              >
                <div class="flex items-center gap-3">
                  <div
                    class="w-2 h-2 rounded-full"
                    :class="
                      selectedCampaignId === campaign.id
                        ? 'bg-purple-500'
                        : 'bg-gray-600'
                    "
                  ></div>
                  <div>
                    <h3 class="font-semibold text-white">{{ campaign.name }}</h3>
                    <p class="text-sm text-gray-400">
                      {{ campaign.activeMemberCount || 0 }} streamer(s)
                    </p>
                  </div>
                </div>
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-settings"
                  square
                  @click.stop="router.push(`/mj/campaigns/${campaign.id}`)"
                />
              </div>
            </div>
          </UCard>

          <!-- Streamers List (1/2) -->
          <UCard class="flex flex-col">
            <template #header>
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-users" class="size-6 text-primary-500" />
                <div>
                  <h2 class="text-xl font-semibold text-white">Streamers connectés</h2>
                  <p v-if="selectedCampaignId" class="text-xs text-gray-400">
                    {{ selectedCampaignStreamers.length }} membre(s)
                  </p>
                </div>
              </div>
            </template>

            <!-- Loading -->
            <div
              v-if="streamersLoading"
              class="flex flex-col items-center justify-center py-12"
            >
              <UIcon
                name="i-lucide-loader"
                class="size-10 text-primary-500 animate-spin mb-4"
              />
              <p class="text-gray-400 text-sm">Chargement...</p>
            </div>

            <!-- No Campaign Selected -->
            <div
              v-else-if="!selectedCampaignId"
              class="text-center py-12"
            >
              <div class="bg-purple-500/10 p-4 rounded-2xl mb-4 inline-block">
                <UIcon name="i-lucide-arrow-left" class="size-12 text-purple-500" />
              </div>
              <p class="text-gray-400 text-sm">
                Sélectionnez une campagne pour voir les streamers
              </p>
            </div>

            <!-- Empty State -->
            <div
              v-else-if="selectedCampaignStreamers.length === 0"
              class="text-center py-12"
            >
              <div class="bg-purple-500/10 p-4 rounded-2xl mb-4 inline-block">
                <UIcon name="i-lucide-user-plus" class="size-12 text-purple-500" />
              </div>
              <p class="text-gray-400 text-sm">Aucun streamer dans cette campagne</p>
            </div>

            <!-- Streamers List -->
            <div v-else class="space-y-3 overflow-y-auto max-h-[calc(3*5.5rem+1rem)]">
              <div
                v-for="streamer in selectedCampaignStreamers"
                :key="streamer.id"
                class="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
              >
                <div class="flex items-center gap-2">
                  <div class="relative">
                    <TwitchAvatar
                      :image-url="streamer.profileImageUrl"
                      :display-name="streamer.twitchDisplayName"
                      size="sm"
                    />
                    <LiveBadge :live-status="liveStatus[streamer.twitchUserId]" />
                  </div>
                  <div>
                    <p class="font-semibold text-white text-sm">
                      {{ streamer.twitchDisplayName }}
                    </p>
                    <a
                      :href="`https://www.twitch.tv/${streamer.twitchLogin}`"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-xs text-gray-400 hover:text-purple-400 transition-colors"
                    >
                      @{{ streamer.twitchLogin }}
                    </a>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <UBadge
                    v-if="streamer.broadcasterType === 'partner'"
                    label="Partenaire"
                    color="primary"
                    variant="soft"
                    size="xs"
                  />
                  <UBadge
                    v-else-if="streamer.broadcasterType === 'affiliate'"
                    label="Affilié"
                    color="info"
                    variant="soft"
                    size="xs"
                  />
                  <UBadge
                    v-else
                    label="Non-affilié"
                    color="warning"
                    variant="soft"
                    size="xs"
                  />
                  <UBadge
                    :label="streamer.isActive ? 'Actif' : 'Inactif'"
                    :color="streamer.isActive ? 'success' : 'neutral'"
                    variant="soft"
                    size="xs"
                  />
                  <!-- Badge d'autorisation -->
                  <UBadge
                    v-if="streamer.isPollAuthorized"
                    color="success"
                    variant="soft"
                    size="xs"
                  >
                    <div class="flex items-center gap-1">
                      <UIcon name="i-lucide-shield-check" class="size-3" />
                      <span>{{ formatAuthTime(streamer.authorizationRemainingSeconds) }}</span>
                    </div>
                  </UBadge>
                  <UBadge
                    v-else
                    label="Non autorisé"
                    color="neutral"
                    variant="soft"
                    size="xs"
                  />
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- No Campaign Message -->
        <UCard v-else-if="campaignsLoaded && campaigns.length === 0">
          <div class="text-center py-12">
            <div class="bg-yellow-500/10 p-6 rounded-2xl mb-6 inline-block">
              <UIcon name="i-lucide-alert-circle" class="size-16 text-yellow-500" />
            </div>
            <h2 class="text-2xl font-bold text-white mb-2">
              Aucune campagne disponible
            </h2>
            <p class="text-gray-400 mb-6 max-w-md mx-auto">
              Créez une campagne pour commencer à gérer vos sondages multi-streams
            </p>
            <UButton
              color="primary"
              size="lg"
              icon="i-lucide-plus"
              label="Créer ma première campagne"
              @click="router.push('/mj/campaigns')"
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
          @send="sendPoll"
          @previous="goToPreviousPoll"
          @next="goToNextPoll"
          @close="handleCloseOrCancel"
        />

        <!-- Poll Sessions -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-list-checks" class="size-6 text-primary-500" />
                <h2 class="text-xl font-semibold text-white">Sessions de sondages</h2>
              </div>
              <UButton
                color="primary"
                icon="i-lucide-plus"
                label="Créer une session"
                @click="showCreateSessionModal = true"
              />
            </div>
          </template>

          <!-- No Campaign Selected -->
          <div
            v-if="!selectedCampaignId"
            class="text-center py-16"
          >
            <div class="bg-purple-500/10 p-6 rounded-2xl mb-4 inline-block">
              <UIcon name="i-lucide-arrow-left" class="size-16 text-purple-500" />
            </div>
            <p class="text-gray-400">Sélectionnez une campagne pour gérer vos sessions</p>
          </div>

          <!-- Loading -->
          <div
            v-else-if="sessionsLoading"
            class="flex flex-col items-center justify-center py-16"
          >
            <UIcon
              name="i-lucide-loader"
              class="size-12 text-primary-500 animate-spin mb-4"
            />
            <p class="text-gray-400">Chargement des sessions...</p>
          </div>

          <!-- Empty State -->
          <div
            v-else-if="sessions.length === 0"
            class="text-center py-16"
          >
            <div class="bg-primary-500/10 p-6 rounded-2xl mb-6 inline-block">
              <UIcon name="i-lucide-list-plus" class="size-16 text-primary-500" />
            </div>
            <h3 class="text-xl font-bold text-white mb-2">Aucune session créée</h3>
            <p class="text-gray-400 mb-6">
              Créez votre première session pour commencer
            </p>
            <UButton
              color="primary"
              icon="i-lucide-plus"
              label="Créer une session"
              @click="showCreateSessionModal = true"
            />
          </div>

          <!-- Sessions List -->
          <div v-else class="space-y-3">
            <div
              v-for="session in sessions"
              :key="session.id"
              class="flex items-center justify-between p-4 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
            >
              <div class="flex items-center gap-4">
                <div class="bg-purple-500/10 p-3 rounded-lg">
                  <UIcon name="i-lucide-list-checks" class="size-6 text-purple-500" />
                </div>
                <div>
                  <h3 class="font-semibold text-white">{{ session.name }}</h3>
                  <p class="text-sm text-gray-400">
                    {{ session.pollsCount }} sondage(s) · {{ session.defaultDurationSeconds }}s par défaut
                  </p>
                </div>
              </div>
              <div class="flex gap-2">
                <UButton
                  variant="soft"
                  color="neutral"
                  icon="i-lucide-plus"
                  label="Sondage"
                  size="sm"
                  @click="navigateToSessionPolls(session)"
                />
                <UButton
                  color="primary"
                  variant="soft"
                  icon="i-lucide-rocket"
                  label="Lancer"
                  size="sm"
                  @click="launchSession(session)"
                />
              </div>
            </div>
          </div>
        </UCard>

      </div>

      <!-- Create Session Modal -->
      <UModal v-model:open="showCreateSessionModal">
        <template #header>
          <h3 class="text-xl font-bold text-white">Créer une session</h3>
        </template>

        <template #body>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Nom de la session</label>
              <UInput
                v-model="newSession.name"
                type="text"
                placeholder="Ex: Session d'exploration"
                size="lg"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Durée par défaut des sondages (secondes)
              </label>
              <UInput
                v-model.number="newSession.defaultDurationSeconds"
                type="number"
                :min="15"
                :max="1800"
                size="lg"
              />
              <p class="text-xs text-gray-400 mt-2">
                {{ Math.floor(newSession.defaultDurationSeconds / 60) }}m
                {{ newSession.defaultDurationSeconds % 60 }}s
              </p>
            </div>
          </div>
        </template>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="neutral" variant="soft" label="Annuler" @click="showCreateSessionModal = false" />
            <UButton
              color="primary"
              icon="i-lucide-check"
              label="Créer"
              :loading="creating"
              @click="handleCreateSession"
            />
          </div>
        </template>
      </UModal>

      <!-- Delete Session Confirmation Modal -->
      <UModal v-model:open="showDeleteSessionConfirm">
        <template #header>
          <h3 class="text-xl font-bold text-white">Confirmer la suppression</h3>
        </template>

        <template #body>
          <div class="space-y-4">
            <div class="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <UIcon name="i-lucide-alert-triangle" class="size-8 text-red-500" />
              <div>
                <p class="text-white font-semibold">Attention !</p>
                <p class="text-gray-300 text-sm">
                  Êtes-vous sûr de vouloir supprimer la session "{{ currentSession?.name }}" ?
                </p>
              </div>
            </div>
            <p class="text-gray-400 text-sm">
              Tous les sondages associés à cette session seront également supprimés. Cette action est irréversible.
            </p>
          </div>
        </template>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="soft"
              label="Annuler"
              @click="showDeleteSessionConfirm = false"
            />
            <UButton
              color="error"
              icon="i-lucide-trash-2"
              label="Supprimer définitivement"
              :loading="deleting"
              @click="confirmDeleteSession"
            />
          </div>
        </template>
      </UModal>

      <!-- Close Active Session Confirmation Modal -->
      <UModal v-model:open="showCloseSessionConfirm">
        <template #header>
          <h3 class="text-xl font-bold text-white">Fermer la session active</h3>
        </template>

        <template #body>
          <div class="space-y-4">
            <div class="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <UIcon name="i-lucide-alert-triangle" class="size-8 text-yellow-500" />
              <div>
                <p class="text-white font-semibold">Attention !</p>
                <p class="text-gray-300 text-sm">
                  Êtes-vous sûr de vouloir fermer la session de sondage en cours ?
                </p>
              </div>
            </div>
            <p class="text-gray-400 text-sm">
              La progression actuelle (sondages lancés, résultats) sera perdue. Vous pourrez relancer la session plus tard.
            </p>
          </div>
        </template>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              color="neutral"
              variant="soft"
              label="Annuler"
              @click="showCloseSessionConfirm = false"
            />
            <UButton
              color="error"
              icon="i-lucide-x"
              label="Fermer la session"
              @click="confirmCloseSession"
            />
          </div>
        </template>
      </UModal>

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
                    <div class="p-2 rounded-lg bg-error-500/10">
                      <UIcon name="i-lucide-alert-triangle" class="size-6 text-error-500" />
                    </div>
                    <div>
                      <h3 class="text-lg font-semibold text-white">Tokens expirés</h3>
                      <p class="text-sm text-gray-400 mt-0.5">Reconnexion requise</p>
                    </div>
                  </div>
                </template>

                <div class="space-y-4">
                  <div class="p-4 rounded-lg bg-error-500/10 border border-error-500/30">
                    <p class="text-sm text-gray-300 mb-2">
                      Les streamers suivants doivent se reconnecter pour rafraîchir leur token Twitch :
                    </p>
                    <ul class="list-disc list-inside text-sm text-white space-y-1 ml-2">
                      <li v-for="streamerName in expiredStreamersNames" :key="streamerName">
                        {{ streamerName }}
                      </li>
                    </ul>
                  </div>

                  <div class="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <div class="flex items-start gap-2">
                      <UIcon name="i-lucide-info" class="size-4 text-blue-400 mt-0.5 shrink-0" />
                      <p class="text-xs text-gray-300">
                        Les streamers concernés doivent se déconnecter puis se reconnecter à Tumulte pour renouveler leur autorisation Twitch.
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import { usePollTemplates } from "@/composables/usePollTemplates";
import { useCampaigns, type CampaignMember } from "@/composables/useCampaigns";
import { usePollControlStore } from "@/stores/pollControl";
import { useWebSocket } from "@/composables/useWebSocket";

definePageMeta({
  layout: "authenticated" as const,
  middleware: ["auth"],
});

const config = useRuntimeConfig();
const API_URL = config.public.apiBase;
const route = useRoute();
const router = useRouter();
const toast = useToast();
const {
  createTemplate,
  deleteTemplate,
  launchPoll,
} = usePollTemplates();
const { campaigns, fetchCampaigns, selectedCampaign, getCampaignMembers, getLiveStatus } = useCampaigns();

// WebSocket setup
const { subscribeToPoll } = useWebSocket();
// Note: currentPollInstanceId est maintenant dans le store Pinia
const pollSubscriptionCleanup = ref<(() => void) | null>(null);

// Interfaces
interface Poll {
  id: string;
  question: string;
  options: string[];
  type?: "UNIQUE" | "STANDARD";
  channelPointsEnabled?: boolean;
  channelPointsAmount?: number;
}

interface Session {
  id: string;
  name: string;
  pollsCount: number;
  defaultDurationSeconds: number;
}

interface ActiveSession {
  id: string;
  name: string;
  defaultDurationSeconds: number;
}

interface StreamerDisplay {
  id: string;
  twitchUserId: string;
  twitchDisplayName: string;
  twitchLogin: string;
  profileImageUrl: string;
  broadcasterType: string;
  isActive: boolean;
  isPollAuthorized: boolean;
  authorizationRemainingSeconds: number | null;
}

// Campaign management
const campaignsLoaded = ref(false);
const selectedCampaignId = ref<string | null>(null);

// Trier les campagnes : la campagne sélectionnée en premier
const sortedCampaigns = computed(() => {
  if (!selectedCampaignId.value) {
    return campaigns.value;
  }

  const selected = campaigns.value.find(c => c.id === selectedCampaignId.value);
  const others = campaigns.value.filter(c => c.id !== selectedCampaignId.value);

  return selected ? [selected, ...others] : campaigns.value;
});

// Fonction de sélection de campagne
const selectCampaign = (campaignId: string) => {
  selectedCampaignId.value = campaignId;
};


// Streamers data
const streamersLoading = ref(false);
const campaignMembers = ref<CampaignMember[]>([]);

// Live status
import type { LiveStatusMap } from "@/types";
const liveStatus = ref<LiveStatusMap>({});

// Filtrer les streamers par campagne sélectionnée
const selectedCampaignStreamers = computed<StreamerDisplay[]>(() => {
  // Retourner uniquement les membres actifs de la campagne
  return campaignMembers.value
    .filter((member) => member.status === 'ACTIVE')
    .map((member): StreamerDisplay => ({
      id: member.streamer.id,
      twitchUserId: member.streamer.twitchUserId,
      twitchDisplayName: member.streamer.twitchDisplayName,
      twitchLogin: member.streamer.twitchLogin,
      profileImageUrl: member.streamer.profileImageUrl || '',
      broadcasterType: member.streamer.broadcasterType || '',
      isActive: true,
      isPollAuthorized: member.isPollAuthorized,
      authorizationRemainingSeconds: member.authorizationRemainingSeconds,
    }));
});

const formatAuthTime = (seconds: number | null): string => {
  if (!seconds) return 'Non autorisé';

  // Si l'autorisation est > 1 an (31536000 secondes), c'est "permanent"
  if (seconds > 31536000) return 'Permanent';

  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  // Format H:M:S
  return `${hours}h${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Fetch live status for streamers
const fetchLiveStatus = async (campaignId: string) => {
  try {
    const status = await getLiveStatus(campaignId);
    liveStatus.value = status;
  } catch (error) {
    console.error("Error fetching live status:", error);
  }
};

// Charger les membres de la campagne sélectionnée
const loadCampaignMembers = async (campaignId: string) => {
  streamersLoading.value = true;
  try {
    const [members] = await Promise.all([
      getCampaignMembers(campaignId),
      fetchLiveStatus(campaignId),
    ]);
    campaignMembers.value = members;
    console.log('🎯 Campaign members loaded:', campaignMembers.value);
    console.log('🖼️ Streamers with images:', selectedCampaignStreamers.value);
  } catch (error) {
    console.error('Failed to load campaign members:', error);
    campaignMembers.value = [];
  } finally {
    streamersLoading.value = false;
  }
};

// Health Check error modal
const showHealthCheckError = ref(false);
const expiredStreamersNames = ref<string[]>([]);

// Template creation modal
const showCreateModal = ref(false);
const creating = ref(false);
const newTemplate = reactive({
  label: "",
  title: "",
  durationSeconds: 60,
});
const optionsText = ref("");

// Load data on mount
// MOVED TO SINGLE onMounted BELOW - See line ~1370

const _handleCreateTemplate = async () => {
  const options = optionsText.value.split("\n").filter((o) => o.trim());

  if (options.length < 2 || options.length > 5) {
    toast.add({
      title: "Erreur",
      description: "Vous devez fournir entre 2 et 5 options",
      color: "error",
    });
    return;
  }

  if (!selectedCampaignId.value) {
    toast.add({
      title: "Erreur",
      description: "Veuillez sélectionner une campagne",
      color: "error",
    });
    return;
  }

  creating.value = true;
  try {
    await createTemplate(
      {
        label: newTemplate.label,
        title: newTemplate.title,
        // eslint-disable-next-line camelcase
        duration_seconds: newTemplate.durationSeconds,
        options,
      },
      selectedCampaignId.value,
    );
    toast.add({
      title: "Succès",
      description: "Template créé avec succès",
      color: "success",
    });
    showCreateModal.value = false;
    newTemplate.label = "";
    newTemplate.title = "";
    newTemplate.durationSeconds = 60;
    optionsText.value = "";
  } catch {
    toast.add({
      title: "Erreur",
      description: "Impossible de créer le template",
      color: "error",
    });
  } finally {
    creating.value = false;
  }
};

const _handleLaunchPoll = async (templateId: string) => {
  if (!selectedCampaignId.value) {
    toast.add({
      title: "Erreur",
      description: "Veuillez sélectionner une campagne",
      color: "error",
    });
    return;
  }

  try {
    await launchPoll(templateId, selectedCampaignId.value);
    toast.add({
      title: "Succès",
      description: "Sondage lancé sur tous les streamers actifs",
      color: "success",
    });
  } catch {
    toast.add({
      title: "Erreur",
      description: "Impossible de lancer le sondage",
      color: "error",
    });
  }
};

const _handleDeleteTemplate = async (templateId: string) => {
  if (!confirm("Êtes-vous sûr de vouloir supprimer ce template ?")) {
    return;
  }

  if (!selectedCampaignId.value) {
    toast.add({
      title: "Erreur",
      description: "Veuillez sélectionner une campagne",
      color: "error",
    });
    return;
  }

  try {
    await deleteTemplate(templateId, selectedCampaignId.value);
    toast.add({
      title: "Succès",
      description: "Template supprimé",
      color: "success",
    });
  } catch {
    toast.add({
      title: "Erreur",
      description: "Impossible de supprimer le template",
      color: "error",
    });
  }
};

// ==========================================
// POLL SESSIONS MANAGEMENT
// ==========================================

// Sessions data
const sessions = ref<Session[]>([]);
const sessionsLoading = ref(false);
const showCreateSessionModal = ref(false);
const showDeleteSessionConfirm = ref(false);
const showCloseSessionConfirm = ref(false);
const currentSession = ref<Session | null>(null);
const deleting = ref(false);

const newSession = reactive({
  name: "",
  defaultDurationSeconds: 60,
});

// ==========================================
// POLL CONTROL CARD (Live Session)
// ==========================================

// Utilisation du store Pinia pour la persistance
const pollControlStore = usePollControlStore();
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
} = storeToRefs(pollControlStore);

// Actions du store
const { saveCurrentPollState, restorePollState } = pollControlStore;

// Computed pour la question actuelle
const currentPoll = computed<Poll | null>(() => {
  if (!activeSessionPolls.value.length) return null;
  return activeSessionPolls.value[currentPollIndex.value] as Poll;
});

// Fonction pour lancer une session
const launchSession = async (session: Session) => {
  if (!selectedCampaignId.value) return;

  // Vérifier si une session est déjà active
  if (activeSession.value) {
    toast.add({
      title: "Session déjà active",
      description: "Une session de sondage est déjà en cours. Veuillez l'annuler avant de lancer une nouvelle session.",
      color: "warning",
    });
    return;
  }

  try {
    // Lancer la session avec Health Check
    const response = await fetch(
      `${API_URL}/mj/campaigns/${selectedCampaignId.value}/sessions/${session.id}/launch`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    // Si le health check échoue (503), afficher la modal d'erreur
    if (response.status === 503) {
      const errorData = await response.json();
      const healthCheck = errorData.healthCheck;

      // Récupérer les noms des streamers avec tokens expirés
      const invalidStreamers = healthCheck?.services?.tokens?.invalidStreamers || [];
      const streamerNames = invalidStreamers.map((s: { displayName: string }) => s.displayName);

      if (streamerNames.length > 0) {
        showHealthCheckError.value = true;
        expiredStreamersNames.value = streamerNames;
      } else {
        toast.add({
          title: "Erreur système",
          description: errorData.error || "Le système n'est pas prêt pour lancer la session.",
          color: "error",
        });
      }
      return;
    }

    if (!response.ok) throw new Error("Failed to launch session");
    const data = await response.json();

    const polls = data.data.polls || [];

    // Vérifier s'il y a au moins un sondage (normalement géré côté backend)
    if (polls.length === 0) {
      toast.add({
        title: "Session vide",
        description: "Cette session ne contient aucun sondage. Veuillez ajouter au moins un sondage avant de lancer la session.",
        color: "warning",
      });
      return;
    }

    activeSession.value = session;
    activeSessionPolls.value = polls;
    currentPollIndex.value = 0;
    pollStatus.value = 'idle';
    countdown.value = 0;
    pollResults.value = null;
    launchedPolls.value = [];
    pollStartTime.value = null;
    pollDuration.value = null;

    // Sauvegarder explicitement l'état immédiatement
    pollControlStore.saveState();

    toast.add({
      title: "Session prête",
      description: `${polls.length} sondage(s) chargé(s) - Système vérifié`,
      color: "success",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    console.error('[Session Launch] Error:', errorMessage);
    toast.add({
      title: "Erreur",
      description: "Impossible de charger la session",
      color: "error",
    });
  }
};

// Gestion intelligente du bouton fermer/annuler
const handleCloseOrCancel = () => {
  if (pollStatus.value === 'sending') {
    // Si un sondage est en cours, annuler directement (sans popup)
    cancelPoll();
  } else {
    // Sinon, demander confirmation pour fermer la session
    showCloseSessionConfirm.value = true;
  }
};

// Confirmer la fermeture de la session active
const confirmCloseSession = () => {
  // Nettoyer la souscription WebSocket
  if (pollSubscriptionCleanup.value) {
    pollSubscriptionCleanup.value();
    pollSubscriptionCleanup.value = null;
  }
  currentPollInstanceId.value = null;

  pollControlStore.clearState();
  showCloseSessionConfirm.value = false;
};

// Navigation entre questions
const goToPreviousPoll = () => {
  if (currentPollIndex.value > 0) {
    // Sauvegarder l'état du poll actuel avant de changer
    saveCurrentPollState();

    // Changer d'index
    currentPollIndex.value--;

    // Restaurer l'état du poll précédent
    restorePollState(currentPollIndex.value);
  }
};

const goToNextPoll = () => {
  if (currentPollIndex.value < activeSessionPolls.value.length - 1) {
    // Sauvegarder l'état du poll actuel avant de changer
    saveCurrentPollState();

    // Changer d'index
    currentPollIndex.value++;

    // Restaurer l'état du poll suivant
    restorePollState(currentPollIndex.value);
  }
};

// Réinitialiser l'état du sondage
const resetPollState = () => {
  pollStatus.value = 'idle';
  countdown.value = 0;
  pollResults.value = null;
  pollStartTime.value = null;
  pollDuration.value = null;
};

// Annuler le sondage en cours
const cancelPoll = async () => {
  if (!currentPoll.value || !selectedCampaignId.value) {
    resetPollState();
    return;
  }

  // Arrêter le countdown immédiatement pour éviter fetchPollResults()
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  // Si le sondage est en cours d'envoi, appeler l'API pour annuler
  if (pollStatus.value === 'sending' && currentPollInstanceId.value) {
    try {
      const response = await fetch(`${API_URL}/mj/polls/${currentPollInstanceId.value}/cancel`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel poll');
      }

      toast.add({
        title: "Sondage annulé",
        description: "Le sondage a été annulé sur tous les streamers",
        color: "warning",
      });
    } catch (error) {
      console.error('Failed to cancel poll:', error);
      toast.add({
        title: "Erreur",
        description: "Impossible d'annuler le sondage",
        color: "error",
      });
    }
  }

  // Marquer comme annulé et sauvegarder l'état
  pollStatus.value = 'cancelled';
  pollResults.value = null;
  countdown.value = 0;
  pollStartTime.value = null;
  pollDuration.value = null;

  // Sauvegarder l'état annulé
  saveCurrentPollState();
};

// Envoyer le sondage
const sendPoll = async () => {
  if (!currentPoll.value || !activeSession.value || !selectedCampaignId.value) return;

  pollStatus.value = 'sending';
  pollStartTime.value = Date.now();
  pollDuration.value = (activeSession.value as ActiveSession).defaultDurationSeconds;
  if (!launchedPolls.value.includes(currentPollIndex.value)) {
    launchedPolls.value.push(currentPollIndex.value);
  }

  try {
    // Appeler l'API pour lancer le sondage
    const response = await fetch(`${API_URL}/mj/campaigns/${selectedCampaignId.value}/polls/launch`, {
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
        // Channel points from poll configuration (set in session poll creation)
        channelPointsEnabled: currentPoll.value.channelPointsEnabled ?? false,
        channelPointsAmount: currentPoll.value.channelPointsAmount ?? null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to launch poll');
    }

    const result = await response.json();

    console.log('[DEBUG sendPoll] ========== POLL LAUNCH RESPONSE ==========');
    console.log('[DEBUG sendPoll] Response data:', result);
    console.log('[DEBUG sendPoll] Poll instance ID:', result.data.id);

    // S'abonner immédiatement aux événements WebSocket du poll
    currentPollInstanceId.value = result.data.id;

    console.log('[DEBUG sendPoll] currentPollInstanceId set to:', currentPollInstanceId.value);
    console.log('[DEBUG sendPoll] pollStatus before subscription:', pollStatus.value);

    if (currentPollInstanceId.value) {
      console.log('[DEBUG sendPoll] ========== STARTING WEBSOCKET SUBSCRIPTION ==========');
      console.log('[WebSocket] Subscribing to poll:', currentPollInstanceId.value);

      // Nettoyer l'ancienne souscription si elle existe
      if (pollSubscriptionCleanup.value) {
        console.log('[DEBUG sendPoll] Cleaning up old subscription');
        pollSubscriptionCleanup.value();
      }

      console.log('[DEBUG sendPoll] Creating new subscription with callbacks:');
      console.log('[DEBUG sendPoll] - onStart: defined');
      console.log('[DEBUG sendPoll] - onUpdate: defined');
      console.log('[DEBUG sendPoll] - onEnd: defined');

      // Créer une nouvelle souscription
      pollSubscriptionCleanup.value = subscribeToPoll(currentPollInstanceId.value, {
        onStart: (data) => {
          console.log('[WebSocket] poll:start received:', data);
          if (pollStatus.value === 'sending') {
            console.log('[WebSocket] Poll confirmed as started, switching to running state');
            pollStatus.value = 'running';

            // S'assurer que le countdown est bien démarré avec la bonne durée
            if (data.durationSeconds) {
              countdown.value = data.durationSeconds;
              pollDuration.value = data.durationSeconds;

              // Démarrer le countdown
              console.log('[WebSocket] Starting countdown with', data.durationSeconds, 'seconds');
              startCountdown();
            }
          }
        },
        onUpdate: (data) => {
          console.log('[WebSocket] poll:update received:', data);
          // Mettre à jour les résultats en temps réel
          if (data.votesByOption && (pollStatus.value === 'sending' || pollStatus.value === 'running')) {
            const results = Object.entries(data.votesByOption).map(([index, votes]) => ({
              option: currentPoll.value?.options?.[parseInt(index)] || `Option ${parseInt(index) + 1}`,
              votes: votes as number,
            }));

            pollResults.value = {
              results,
              totalVotes: data.totalVotes,
            };
          }
        },
        onEnd: (data) => {
          console.log('[WebSocket] ========== POLL:END RECEIVED ==========');
          console.log('[WebSocket] Full data:', JSON.stringify(data, null, 2));
          console.log('[WebSocket] Current pollStatus before:', pollStatus.value);
          console.log('[WebSocket] Current countdown before:', countdown.value);

          pollStatus.value = 'sent';
          console.log('[WebSocket] pollStatus set to:', pollStatus.value);

          // Utiliser votesByOption pour poll:end
          const votesData = data.votesByOption;
          console.log('[WebSocket] votesData:', votesData);

          if (votesData) {
            const results = Object.entries(votesData).map(([index, votes]) => ({
              option: currentPoll.value?.options?.[parseInt(index)] || `Option ${parseInt(index) + 1}`,
              votes: votes as number,
            }));

            console.log('[WebSocket] Mapped results:', results);

            pollResults.value = {
              results,
              totalVotes: data.totalVotes,
            };

            console.log('[WebSocket] pollResults updated:', pollResults.value);
          } else {
            console.warn('[WebSocket] No votesData found in poll:end event');
          }

          // Arrêter le countdown
          if (countdownInterval) {
            console.log('[WebSocket] Clearing countdown interval');
            clearInterval(countdownInterval);
            countdownInterval = null;
          }

          // Sauvegarder l'état du poll terminé avec résultats
          saveCurrentPollState();

          console.log('[WebSocket] ========== POLL:END PROCESSING COMPLETE ==========');
        },
      });
    }

    // Vérifier s'il y a des streamers en échec
    if (result.data.failed_streamers && result.data.failed_streamers.length > 0) {
      const failedCount = result.data.failed_streamers.length;
      const successCount = result.data.streamers_count - failedCount;

      toast.add({
        title: "Sondage partiellement lancé",
        description: `${successCount} streamer(s) OK, ${failedCount} streamer(s) incompatible(s) (non Affilié/Partenaire)`,
        color: "warning",
      });
    } else {
      toast.add({
        title: "Sondage lancé",
        description: "Le sondage a été envoyé à tous les streamers actifs",
        color: "success",
      });
    }

    // Démarrer le compte à rebours
    countdown.value = (activeSession.value as ActiveSession).defaultDurationSeconds;
    startCountdown();

    // Sauvegarder l'état initial du poll lancé
    saveCurrentPollState();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Impossible d'envoyer le sondage";

    // Détecter les erreurs spécifiques
    if (errorMessage.includes('No active streamers')) {
      toast.add({
        title: "Aucun streamer actif",
        description: "Aucun streamer n'est connecté dans cette campagne",
        color: "error",
      });
    } else if (errorMessage.includes('not a partner or affiliate')) {
      toast.add({
        title: "Streamers incompatibles",
        description: "Les streamers doivent être Affiliés ou Partenaires Twitch pour utiliser les sondages",
        color: "error",
      });
    } else {
      toast.add({
        title: "Erreur",
        description: errorMessage,
        color: "error",
      });
    }
    pollStatus.value = 'idle';
    pollStartTime.value = null;
    pollDuration.value = null;
  }
};

// Compte à rebours
let countdownInterval: ReturnType<typeof setInterval> | null = null;

const startCountdown = () => {
  if (countdownInterval) clearInterval(countdownInterval);

  // Fonction pour calculer et mettre à jour le countdown basé sur timestamp
  const updateCountdown = () => {
    if (!pollStartTime.value || !pollDuration.value) {
      console.warn('[Countdown] Missing pollStartTime or pollDuration');
      return;
    }

    const endsAt = pollStartTime.value + (pollDuration.value * 1000);
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((endsAt - now) / 1000));

    countdown.value = remaining;

    if (remaining <= 0) {
      clearInterval(countdownInterval!);
      countdownInterval = null;
      pollStatus.value = 'sent';
      pollStartTime.value = null;
      pollDuration.value = null;
      // Les résultats seront reçus via WebSocket (événement poll:end)
      // Plus besoin de fetchPollResults() ici

      // Sauvegarder l'état (les résultats seront mis à jour par le WebSocket)
      saveCurrentPollState();
    }
  };

  // Calculer immédiatement puis toutes les secondes
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
};

// Reprendre le countdown si un sondage était en cours lors du chargement
onMounted(async () => {
  // 1. Charger les campagnes d'abord
  await fetchCampaigns();
  campaignsLoaded.value = true;

  // Check if campaign is specified in URL
  const campaignFromUrl = route.query.campaign as string | undefined;
  if (campaignFromUrl && campaigns.value.some((c) => c.id === campaignFromUrl)) {
    selectedCampaignId.value = campaignFromUrl;
  } else if (campaigns.value.length > 0) {
    selectedCampaignId.value = campaigns.value[0]?.id ?? null;
  }

  // 2. Forcer le rechargement de l'état depuis localStorage côté client
  pollControlStore.loadState();

  console.log('Poll Control - onMounted (après loadState):', {
    activeSession: activeSession.value,
    pollStatus: pollStatus.value,
    countdown: countdown.value,
    activeSessionPolls: activeSessionPolls.value.length,
    currentPollInstanceId: currentPollInstanceId.value,
  });

  // 3. Si une session était active, restaurer l'état du poll actuel
  if (activeSession.value && activeSessionPolls.value.length > 0) {
    console.log('[Restore] Restoring poll state for index:', currentPollIndex.value);
    restorePollState(currentPollIndex.value);
  }

  // 4. Si un poll était actif, synchroniser avec le backend pour obtenir l'état réel
  if (currentPollInstanceId.value) {
    console.log('[Sync] Syncing with backend for poll:', currentPollInstanceId.value);
    await pollControlStore.syncWithBackend();
    console.log('[Sync] After sync - countdown:', countdown.value, 'status:', pollStatus.value);
  }

  // Reconnecter le WebSocket si un poll est en cours
  if (currentPollInstanceId.value && (pollStatus.value === 'sending' || pollStatus.value === 'running')) {
    console.log('[WebSocket RESTORE] Reconnecting to poll:', currentPollInstanceId.value);
    console.log('[WebSocket RESTORE] Current poll status:', pollStatus.value);

    // Nettoyer l'ancienne souscription si elle existe
    if (pollSubscriptionCleanup.value) {
      console.log('[WebSocket RESTORE] Cleaning up old subscription');
      pollSubscriptionCleanup.value();
    }

    // Recréer la souscription WebSocket
    pollSubscriptionCleanup.value = subscribeToPoll(currentPollInstanceId.value, {
      onStart: (data) => {
        console.log('[WebSocket] poll:start received:', data);
        if (pollStatus.value === 'sending') {
          console.log('[WebSocket] Poll confirmed as started, switching to running state');
          pollStatus.value = 'running';

          if (data.durationSeconds) {
            countdown.value = data.durationSeconds;
            pollDuration.value = data.durationSeconds;
            console.log('[WebSocket] Starting countdown with', data.durationSeconds, 'seconds');
            startCountdown();
          }
        }
      },
      onUpdate: (data) => {
        console.log('[WebSocket] poll:update received:', data);
        if (data.votesByOption && (pollStatus.value === 'sending' || pollStatus.value === 'running')) {
          const results = Object.entries(data.votesByOption).map(([index, votes]) => ({
            option: currentPoll.value?.options?.[parseInt(index)] || `Option ${parseInt(index) + 1}`,
            votes: votes as number,
          }));

          pollResults.value = {
            results,
            totalVotes: data.totalVotes,
          };
        }
      },
      onEnd: (data) => {
        console.log('[WebSocket] ========== POLL:END RECEIVED ==========');
        console.log('[WebSocket] Full data:', JSON.stringify(data, null, 2));
        console.log('[WebSocket] Current pollStatus before:', pollStatus.value);
        console.log('[WebSocket] Current countdown before:', countdown.value);

        pollStatus.value = 'sent';
        console.log('[WebSocket] pollStatus set to:', pollStatus.value);

        const votesData = data.votesByOption;
        console.log('[WebSocket] votesData:', votesData);

        if (votesData) {
          const results = Object.entries(votesData).map(([index, votes]) => ({
            option: currentPoll.value?.options?.[parseInt(index)] || `Option ${parseInt(index) + 1}`,
            votes: votes as number,
          }));

          console.log('[WebSocket] Mapped results:', results);

          pollResults.value = {
            results,
            totalVotes: data.totalVotes,
          };

          console.log('[WebSocket] pollResults updated:', pollResults.value);
        } else {
          console.warn('[WebSocket] No votesData found in poll:end event');
        }

        if (countdownInterval) {
          console.log('[WebSocket] Clearing countdown interval');
          clearInterval(countdownInterval);
          countdownInterval = null;
        }

        console.log('[WebSocket] ========== POLL:END PROCESSING COMPLETE ==========');
      },
    });

    console.log('[WebSocket RESTORE] Subscription recreated');
  }

  // Reprendre le countdown si un sondage était en cours
  if (pollStatus.value === 'sending' && countdown.value > 0) {
    console.log('Reprendre le countdown avec', countdown.value, 'secondes restantes');
    startCountdown();
  }
});

// NOTE: Les résultats sont maintenant reçus en temps réel via WebSocket (événements poll:update et poll:end)
// Plus besoin de polling HTTP pour récupérer les résultats

// Charger les sessions quand la campagne change
watch(selectedCampaignId, async (newId) => {
  if (newId) {
    selectedCampaign.value = campaigns.value.find((c) => c.id === newId) || null;
    await loadCampaignMembers(newId);
    await fetchSessions(newId);
  } else {
    campaignMembers.value = [];
    sessions.value = [];
  }
});

const fetchSessions = async (campaignId: string) => {
  sessionsLoading.value = true;
  try {
    const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/sessions`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch sessions");
    const data = await response.json();
    sessions.value = data.data;
  } catch {
    toast.add({
      title: "Erreur",
      description: "Impossible de charger les sessions",
      color: "error",
    });
  } finally {
    sessionsLoading.value = false;
  }
};

const handleCreateSession = async () => {
  if (!newSession.name || !newSession.defaultDurationSeconds) {
    toast.add({
      title: "Erreur",
      description: "Veuillez remplir tous les champs",
      color: "error",
    });
    return;
  }

  if (!selectedCampaignId.value) {
    toast.add({
      title: "Erreur",
      description: "Veuillez sélectionner une campagne",
      color: "error",
    });
    return;
  }

  creating.value = true;
  try {
    const response = await fetch(
      `${API_URL}/mj/campaigns/${selectedCampaignId.value}/sessions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newSession),
      }
    );

    if (!response.ok) throw new Error("Failed to create session");

    toast.add({
      title: "Succès",
      description: "Session créée avec succès",
      color: "success",
    });

    showCreateSessionModal.value = false;
    newSession.name = "";
    newSession.defaultDurationSeconds = 60;

    await fetchSessions(selectedCampaignId.value);
  } catch {
    toast.add({
      title: "Erreur",
      description: "Impossible de créer la session",
      color: "error",
    });
  } finally {
    creating.value = false;
  }
};

const _handleDeleteSession = () => {
  showDeleteSessionConfirm.value = true;
};

const confirmDeleteSession = async () => {
  if (!selectedCampaignId.value || !currentSession.value) return;

  deleting.value = true;
  try {
    const response = await fetch(
      `${API_URL}/mj/campaigns/${selectedCampaignId.value}/sessions/${currentSession.value.id}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    if (!response.ok) throw new Error("Failed to delete session");

    toast.add({
      title: "Succès",
      description: "Session supprimée avec succès",
      color: "success",
    });

    showDeleteSessionConfirm.value = false;
    currentSession.value = null;

    await fetchSessions(selectedCampaignId.value);
  } catch {
    toast.add({
      title: "Erreur",
      description: "Impossible de supprimer la session",
      color: "error",
    });
  } finally {
    deleting.value = false;
  }
};

// Navigation vers la page d'ajout de sondage depuis une session
const navigateToSessionPolls = (session: Session) => {
  if (!selectedCampaignId.value) return;

  router.push({
    path: `/mj/sessions/${session.id}/polls/create`,
    query: { campaignId: selectedCampaignId.value }
  });
};

// Reset modal on close
watch(showCreateModal, (isOpen) => {
  if (!isOpen) {
    newTemplate.label = "";
    newTemplate.title = "";
    newTemplate.durationSeconds = 60;
    optionsText.value = "";
  }
});
</script>
