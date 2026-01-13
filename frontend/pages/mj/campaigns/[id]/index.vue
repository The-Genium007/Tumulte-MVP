<template>
    <div class="min-h-screen">
      <div class="max-w-7xl mx-auto">
        <!-- Header avec retour et actions -->
        <UCard class="mb-8">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex items-center gap-3 sm:gap-4">
              <!-- Bouton retour -->
              <UButton
                color="neutral"
                variant="soft"
                size="lg"
                square
                class="group shrink-0"
                to="/mj"
              >
                <template #leading>
                  <UIcon name="i-lucide-arrow-left" class="size-6 sm:size-8 transition-transform duration-200 group-hover:-translate-x-1" />
                </template>
              </UButton>

              <!-- Titre et date -->
              <div class="min-w-0">
                <h1 class="text-xl sm:text-3xl font-bold text-primary truncate">
                  {{ campaign?.name || 'Chargement...' }}
                </h1>
                <p v-if="campaign?.description" class="text-muted text-sm sm:text-base line-clamp-1">
                  {{ campaign.description }}
                </p>
                <p v-if="campaign" class="text-xs sm:text-sm text-muted mt-1">
                  Créée le {{ formatDate(campaign.createdAt) }}
                </p>
              </div>
            </div>

            <!-- Bouton supprimer à droite -->
            <UButton
              icon="i-lucide-trash-2"
              color="error"
              variant="solid"
              class="w-full sm:w-auto"
              @click="handleDeleteCampaign"
            >
              <span class="sm:hidden">Supprimer la campagne</span>
              <span class="hidden sm:inline">Supprimer</span>
            </UButton>
          </div>
        </UCard>

        <!-- Stats Cards - Mobile/Tablet: single card with list -->
        <div class="lg:hidden mb-8">
          <UCard>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <!-- Total Membres -->
              <div class="flex items-center gap-3">
                <div class="bg-primary-light size-10 rounded-lg flex items-center justify-center shrink-0">
                  <UIcon name="i-lucide-users" class="size-5 text-primary-500" />
                </div>
                <div>
                  <p class="text-xs text-muted">Total</p>
                  <p class="text-lg font-bold text-primary">{{ members.length }}</p>
                </div>
              </div>

              <!-- En Live -->
              <div class="flex items-center gap-3">
                <div class="bg-error-light size-10 rounded-lg flex items-center justify-center shrink-0">
                  <UIcon name="i-lucide-radio" class="size-5 text-error-500" />
                </div>
                <div>
                  <p class="text-xs text-muted">En Live</p>
                  <p class="text-lg font-bold text-primary">{{ liveMembersCount }}</p>
                </div>
              </div>

              <!-- Actifs -->
              <div class="flex items-center gap-3">
                <div class="bg-success-light size-10 rounded-lg flex items-center justify-center shrink-0">
                  <UIcon name="i-lucide-user-check" class="size-5 text-success-500" />
                </div>
                <div>
                  <p class="text-xs text-muted">Actifs</p>
                  <p class="text-lg font-bold text-primary">{{ activeMembersCount }}</p>
                </div>
              </div>

              <!-- Autorisés -->
              <div class="flex items-center gap-3">
                <div class="bg-info-light size-10 rounded-lg flex items-center justify-center shrink-0">
                  <UIcon name="i-lucide-shield-check" class="size-5 text-info-500" />
                </div>
                <div>
                  <p class="text-xs text-muted">Autorisés</p>
                  <p class="text-lg font-bold text-primary">{{ authorizedMembersCount }}</p>
                </div>
              </div>

              <!-- En Attente -->
              <div class="flex items-center gap-3">
                <div class="bg-warning-light size-10 rounded-lg flex items-center justify-center shrink-0">
                  <UIcon name="i-lucide-user-plus" class="size-5 text-warning-500" />
                </div>
                <div>
                  <p class="text-xs text-muted">En Attente</p>
                  <p class="text-lg font-bold text-primary">{{ pendingMembersCount }}</p>
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Stats Cards - Desktop: grid of 5 square cards -->
        <div class="hidden lg:grid grid-cols-5 gap-16 mb-8">
          <div class="aspect-square bg-white rounded-4xl flex flex-col items-center justify-center text-center gap-3">
            <div class="bg-primary-light size-14 rounded-xl flex items-center justify-center">
              <UIcon name="i-lucide-users" class="size-8 text-primary-500" />
            </div>
            <div>
              <p class="text-sm text-muted">Total Membres</p>
              <p class="text-2xl font-bold text-primary">{{ members.length }}</p>
            </div>
          </div>

          <div class="aspect-square bg-white rounded-4xl flex flex-col items-center justify-center text-center gap-3">
            <div class="bg-error-light size-14 rounded-xl flex items-center justify-center">
              <UIcon name="i-lucide-radio" class="size-8 text-error-500" />
            </div>
            <div>
              <p class="text-sm text-muted">En Live</p>
              <p class="text-2xl font-bold text-primary">{{ liveMembersCount }}</p>
            </div>
          </div>

          <div class="aspect-square bg-white rounded-4xl flex flex-col items-center justify-center text-center gap-3">
            <div class="bg-success-light size-14 rounded-xl flex items-center justify-center">
              <UIcon name="i-lucide-user-check" class="size-8 text-success-500" />
            </div>
            <div>
              <p class="text-sm text-muted">Actifs</p>
              <p class="text-2xl font-bold text-primary">{{ activeMembersCount }}</p>
            </div>
          </div>

          <div class="aspect-square bg-white rounded-4xl flex flex-col items-center justify-center text-center gap-3">
            <div class="bg-info-light size-14 rounded-xl flex items-center justify-center">
              <UIcon name="i-lucide-shield-check" class="size-8 text-info-500" />
            </div>
            <div>
              <p class="text-sm text-muted">Autorisés</p>
              <p class="text-2xl font-bold text-primary">{{ authorizedMembersCount }}</p>
            </div>
          </div>

          <div class="aspect-square bg-white rounded-4xl flex flex-col items-center justify-center text-center gap-3">
            <div class="bg-warning-light size-14 rounded-xl flex items-center justify-center">
              <UIcon name="i-lucide-user-plus" class="size-8 text-warning-500" />
            </div>
            <div>
              <p class="text-sm text-muted">En Attente</p>
              <p class="text-2xl font-bold text-primary">{{ pendingMembersCount }}</p>
            </div>
          </div>
        </div>

        <!-- Liste des membres -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-bold text-primary">Membres de la campagne</h2>
              <UButton
                icon="i-lucide-user-plus"
                label="Inviter un streamer"
                color="primary"
                variant="solid"
                size="lg"
                @click="showInviteModal = true"
              />
            </div>
          </template>

          <div v-if="loadingMembers" class="flex items-center justify-center py-12">
            <UIcon name="i-game-icons-dice-twenty-faces-twenty" class="size-12 text-primary animate-spin-slow" />
          </div>

          <div v-else-if="members.length === 0" class="text-center py-12">
            <UIcon name="i-lucide-users" class="size-16 mx-auto mb-4 text-muted" />
            <h3 class="text-xl font-semibold text-primary mb-2">Aucun membre</h3>
            <p class="text-muted mb-6">
              Commencez par inviter des streamers à rejoindre cette campagne
            </p>
            <UButton
              icon="i-lucide-user-plus"
              label="Inviter un streamer"
              color="primary"
              variant="solid"
              size="lg"
              @click="showInviteModal = true"
            />
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="member in sortedMembers"
              :key="member.id"
              class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              <div class="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                <!-- Avatar with Live Badge -->
                <div class="relative shrink-0">
                  <img
                    v-if="member.streamer.profileImageUrl"
                    :src="member.streamer.profileImageUrl"
                    :alt="member.streamer.twitchDisplayName"
                    class="size-10 sm:size-12 rounded-full ring-2"
                    :class="liveStatus[member.streamer.twitchUserId]?.is_live ? 'ring-error-500' : 'ring-brand-light'"
                  />
                  <div
                    v-else
                    class="size-10 sm:size-12 rounded-full ring-2 ring-brand-light bg-brand-light flex items-center justify-center"
                  >
                    <UIcon name="i-lucide-user" class="size-5 sm:size-6 text-brand-500" />
                  </div>
                  <LiveBadge :live-status="liveStatus[member.streamer.twitchUserId]" />
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="font-semibold text-primary text-sm sm:text-base truncate">
                      {{ member.streamer.twitchDisplayName }}
                    </p>
                    <UBadge
                      :label="member.status === 'ACTIVE' ? 'Actif' : 'En attente'"
                      :color="member.status === 'ACTIVE' ? 'success' : 'warning'"
                      variant="soft"
                      size="sm"
                    />
                    <!-- Broadcaster type badge -->
                    <UBadge
                      v-if="member.streamer.broadcasterType === 'partner'"
                      label="Partner"
                      color="primary"
                      variant="soft"
                      size="sm"
                    />
                    <UBadge
                      v-else-if="member.streamer.broadcasterType === 'affiliate'"
                      label="Affiliate"
                      color="info"
                      variant="soft"
                      size="sm"
                    />
                  </div>
                  <a
                    :href="`https://twitch.tv/${member.streamer.twitchLogin}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-xs sm:text-sm text-primary-400 hover:text-primary-300 transition-colors inline-flex items-center gap-1"
                  >
                    @{{ member.streamer.twitchLogin }}
                    <UIcon name="i-lucide-external-link" class="size-3" />
                  </a>
                  <!-- Live info -->
                  <p
                    v-if="liveStatus[member.streamer.twitchUserId]?.is_live"
                    class="text-xs text-error-500 mt-1 line-clamp-1"
                  >
                    🔴 En live{{ liveStatus[member.streamer.twitchUserId]?.game_name ? ` sur ${liveStatus[member.streamer.twitchUserId].game_name}` : '' }}
                    {{ liveStatus[member.streamer.twitchUserId]?.viewer_count !== undefined ? `(${liveStatus[member.streamer.twitchUserId].viewer_count} viewers)` : '' }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
                <!-- Authorization status badge with countdown -->
                <MemberAuthorizationBadge
                  v-if="member.status === 'ACTIVE'"
                  :is-poll-authorized="member.isPollAuthorized"
                  :remaining-seconds="member.authorizationRemainingSeconds"
                  :is-owner="member.isOwner"
                  @expired="handleAuthorizationExpired"
                />

                <UButton
                  v-if="!member.isOwner"
                  icon="i-lucide-x"
                  color="error"
                  variant="solid"
                  size="sm"
                  @click="handleRemoveMember(member.id, member.streamer.twitchDisplayName)"
                >
                  <span class="hidden sm:inline">Révoquer</span>
                </UButton>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="bg-error-light p-2 rounded-lg">
            <UIcon name="i-lucide-alert-triangle" class="size-6 text-error-500" />
          </div>
          <h3 class="text-xl font-bold text-primary">Supprimer la campagne</h3>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <p class="text-secondary">
            Êtes-vous sûr de vouloir supprimer la campagne
            <strong class="text-primary">{{ campaign?.name }}</strong> ?
          </p>
          <div class="bg-error-light border border-error-light rounded-lg p-4">
            <p class="text-sm text-error-500">
              ⚠️ Cette action est irréversible. Tous les templates, sondages et membres seront supprimés définitivement.
            </p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <UButton
            color="neutral"
            variant="soft"
            label="Annuler"
            @click="showDeleteModal = false"
          />
          <UButton
            color="error"
            icon="i-lucide-trash-2"
            label="Supprimer définitivement"
            @click="confirmDeleteCampaign"
          />
        </div>
      </template>
    </UModal>

    <!-- Modal de confirmation de révocation -->
    <UModal v-model:open="showRemoveMemberModal">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="bg-error-light p-2 rounded-lg">
            <UIcon name="i-lucide-user-x" class="size-6 text-error-500" />
          </div>
          <h3 class="text-xl font-bold text-primary">Révoquer l'accès</h3>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <p class="text-secondary">
            Êtes-vous sûr de vouloir révoquer l'accès de
            <strong class="text-primary">{{ memberToRemove?.name }}</strong> ?
          </p>
          <div class="bg-error-light border border-error-light rounded-lg p-4">
            <p class="text-sm text-error-500">
              ⚠️ Cette action retirera immédiatement ce membre de la campagne et de tous les sondages en cours.
            </p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex gap-3 justify-end">
          <UButton
            color="neutral"
            variant="soft"
            label="Annuler"
            @click="showRemoveMemberModal = false"
          />
          <UButton
            color="error"
            icon="i-lucide-user-x"
            label="Révoquer l'accès"
            @click="confirmRemoveMember"
          />
        </div>
      </template>
    </UModal>

    <!-- Modal d'invitation -->
    <UModal v-model:open="showInviteModal">
      <template #header>
        <h3 class="text-xl font-bold text-primary">Inviter un streamer</h3>
      </template>

      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-secondary mb-2">
              Rechercher un streamer
            </label>
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="Nom ou login Twitch..."
              size="lg"
              :ui="{
                root: 'ring-0 border-0 rounded-lg overflow-hidden',
                base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg',
              }"
            />
            <p class="text-xs text-muted mt-1">Tapez au moins 2 caractères</p>
          </div>

          <!-- Loading -->
          <div v-if="searching" class="flex items-center justify-center py-8">
            <UIcon name="i-game-icons-dice-twenty-faces-twenty" class="size-8 text-primary animate-spin-slow" />
          </div>

          <!-- Search Results -->
          <div v-else-if="filteredSearchResults.length > 0" class="space-y-2 max-h-96 overflow-y-auto">
            <div
              v-for="streamer in filteredSearchResults"
              :key="streamer.id"
              class="flex items-center justify-between p-3 bg-neutral-100 rounded-lg hover:bg-neutral-200 transition-colors"
            >
              <div class="flex items-center gap-3">
                <img
                  v-if="streamer.profileImageUrl"
                  :src="streamer.profileImageUrl"
                  :alt="streamer.displayName"
                  class="size-10 rounded-full ring-2 ring-brand-light"
                />
                <div
                  v-else
                  class="size-10 rounded-full ring-2 ring-brand-light bg-brand-light flex items-center justify-center"
                >
                  <UIcon name="i-lucide-user" class="size-5 text-brand-500" />
                </div>
                <div>
                  <p class="font-semibold text-primary">{{ streamer.displayName }}</p>
                  <p class="text-sm text-muted">@{{ streamer.login }}</p>
                </div>
              </div>
              <UButton
                color="primary"
                size="sm"
                label="Inviter"
                icon="i-lucide-user-plus"
                @click="handleInvite(streamer)"
              />
            </div>
          </div>

          <!-- No Results -->
          <div v-else-if="searchQuery.length >= 2" class="text-center py-8">
            <UIcon name="i-lucide-search-x" class="size-12 mx-auto mb-3 text-primary-500" />
            <p class="text-muted">
              {{ searchResults.length > 0 ? 'Tous les streamers trouvés sont déjà invités' : 'Aucun streamer trouvé' }}
            </p>
          </div>

          <!-- Initial State -->
          <div v-else class="text-center py-8">
            <UIcon name="i-lucide-search" class="size-12 mx-auto mb-3 text-muted" />
            <p class="text-sm text-muted">Tapez au moins 2 caractères pour rechercher</p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end">
          <UButton
            color="neutral"
            variant="solid"
            label="Fermer"
            @click="showInviteModal = false"
          />
        </div>
      </template>
    </UModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useCampaigns } from "@/composables/useCampaigns";
import { useMockData } from "@/composables/useMockData";
import type { Campaign, CampaignMembership, StreamerSearchResult, LiveStatusMap } from "@/types";
import type { MockDataModule } from "@/composables/useMockData";

const _router = useRouter();
const route = useRoute();
const campaignId = route.params.id as string;

const { getCampaignDetails, inviteStreamer, removeMember, searchTwitchStreamers, deleteCampaign, getLiveStatus } = useCampaigns();
const { enabled: mockEnabled, loadMockData, withMockFallback } = useMockData();

const campaign = ref<Campaign | null>(null);
const liveStatus = ref<LiveStatusMap>({});
const mockData = ref<MockDataModule | null>(null);

definePageMeta({
  layout: "authenticated" as const,
  middleware: ["auth"],
});
const members = ref<CampaignMembership[]>([]);
const loadingMembers = ref(false);
const showInviteModal = ref(false);
const showDeleteModal = ref(false);
const showRemoveMemberModal = ref(false);
const memberToRemove = ref<{ id: string; name: string } | null>(null);
const searchQuery = ref("");
const searchResults = ref<StreamerSearchResult[]>([]);
const searching = ref(false);

// Auto-refresh intervals
let refreshInterval: ReturnType<typeof setInterval> | null = null;
let liveStatusInterval: ReturnType<typeof setInterval> | null = null;
const REFRESH_INTERVAL_MS = 60000; // Refresh members every 60 seconds
const LIVE_STATUS_INTERVAL_MS = 30000; // Refresh live status every 30 seconds

// Computed properties
const activeMembersCount = computed(() => members.value.filter((m) => m.status === "ACTIVE").length);
const pendingMembersCount = computed(() => members.value.filter((m) => m.status === "PENDING").length);
const authorizedMembersCount = computed(() => members.value.filter((m) => m.status === "ACTIVE" && m.isPollAuthorized).length);
const liveMembersCount = computed(() => {
  return members.value.filter((m) => {
    const twitchUserId = m.streamer?.twitchUserId;
    return twitchUserId && liveStatus.value[twitchUserId]?.is_live;
  }).length;
});

// Helper to get broadcaster type priority (lower = higher priority)
const getBroadcasterTypePriority = (broadcasterType?: string): number => {
  switch (broadcasterType) {
    case "partner":
      return 0;
    case "affiliate":
      return 1;
    default:
      return 2; // Non-affiliated
  }
};

// Sorted members by priority: Live > Authorized > Partner > Affiliate > Non-affiliated > Not authorized
const sortedMembers = computed(() => {
  return [...members.value].sort((a, b) => {
    const aLive = liveStatus.value[a.streamer?.twitchUserId]?.is_live ?? false;
    const bLive = liveStatus.value[b.streamer?.twitchUserId]?.is_live ?? false;

    // 1. Live status (live first)
    if (aLive !== bLive) return aLive ? -1 : 1;

    // 2. Authorization status (authorized first, but only for ACTIVE members)
    const aAuthorized = a.status === "ACTIVE" && a.isPollAuthorized;
    const bAuthorized = b.status === "ACTIVE" && b.isPollAuthorized;
    if (aAuthorized !== bAuthorized) return aAuthorized ? -1 : 1;

    // 3. Member status (ACTIVE before PENDING)
    if (a.status !== b.status) return a.status === "ACTIVE" ? -1 : 1;

    // 4. Broadcaster type (partner > affiliate > non-affiliated)
    const aPriority = getBroadcasterTypePriority(a.streamer?.broadcasterType);
    const bPriority = getBroadcasterTypePriority(b.streamer?.broadcasterType);
    if (aPriority !== bPriority) return aPriority - bPriority;

    // 5. Alphabetical by display name
    return (a.streamer?.twitchDisplayName || "").localeCompare(b.streamer?.twitchDisplayName || "");
  });
});

// Check if streamer is already invited
const isStreamerAlreadyInvited = (streamerId: string | null) => {
  if (!streamerId) return false;
  return members.value.some((m) => m.streamer.id === streamerId);
};

// Filter search results to exclude already invited streamers
const filteredSearchResults = computed(() => {
  return searchResults.value.filter((streamer) => !isStreamerAlreadyInvited(streamer.id));
});

// Load campaign and members
onMounted(async () => {
  // Charger les mock data si disponibles
  mockData.value = await loadMockData();

  await loadMembers();
  startAutoRefresh();
});

onUnmounted(() => {
  stopAutoRefresh();
  if (searchTimeout) {
    clearTimeout(searchTimeout);
    searchTimeout = null;
  }
});

const startAutoRefresh = () => {
  if (!refreshInterval) {
    refreshInterval = setInterval(async () => {
      await refreshMembersQuietly();
    }, REFRESH_INTERVAL_MS);
  }

  // Auto-refresh live status every 30 seconds
  if (!liveStatusInterval) {
    liveStatusInterval = setInterval(async () => {
      await fetchLiveStatus();
    }, LIVE_STATUS_INTERVAL_MS);
  }
};

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  if (liveStatusInterval) {
    clearInterval(liveStatusInterval);
    liveStatusInterval = null;
  }
};

// Fetch live status for all members
const fetchLiveStatus = async () => {
  try {
    console.log("[LiveStatus] Fetching live status for campaign:", campaignId);
    const status = await getLiveStatus(campaignId);
    console.log("[LiveStatus] Response:", JSON.stringify(status));
    // Utiliser mock data si vide et mock activé
    if (mockEnabled.value && Object.keys(status).length === 0 && mockData.value) {
      liveStatus.value = mockData.value.mockLiveStatus;
    } else {
      liveStatus.value = status;
    }
  } catch (error) {
    console.error("[LiveStatus] Error fetching live status:", error);
    // Fallback sur mock data en cas d'erreur
    if (mockEnabled.value && mockData.value) {
      liveStatus.value = mockData.value.mockLiveStatus;
    }
  }
};

// Refresh members without showing loading state (background refresh)
const refreshMembersQuietly = async () => {
  try {
    const [data] = await Promise.all([
      getCampaignDetails(campaignId),
      fetchLiveStatus(),
    ]);
    campaign.value = data.campaign;
    members.value = data.members;
  } catch (error) {
    console.error("Error refreshing members:", error);
  }
};

// Handle authorization expiry - trigger a refresh
const handleAuthorizationExpired = () => {
  refreshMembersQuietly();
};

const loadMembers = async () => {
  loadingMembers.value = true;
  try {
    const [data] = await Promise.all([
      getCampaignDetails(campaignId),
      fetchLiveStatus(),
    ]);
    campaign.value = data.campaign;
    // Utiliser mock data si vide
    members.value = withMockFallback(data.members, mockData.value?.mockMembers ?? []);
  } catch (error) {
    console.error("Error loading campaign:", error);
    // Fallback sur mock data en cas d'erreur
    if (mockEnabled.value && mockData.value) {
      campaign.value = mockData.value.mockCampaigns[0] ?? null;
      members.value = mockData.value.mockMembers;
    }
  } finally {
    loadingMembers.value = false;
  }
};

// Search with debounce
let searchTimeout: ReturnType<typeof setTimeout> | null = null;

watch(searchQuery, () => {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (searchQuery.value.length < 2) {
    searchResults.value = [];
    return;
  }

  searchTimeout = setTimeout(async () => {
    searching.value = true;
    try {
      const results = await searchTwitchStreamers(searchQuery.value);
      searchResults.value = results;
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      searching.value = false;
    }
  }, 500);
});

// Handle invite
const handleInvite = async (streamer: StreamerSearchResult) => {
  try {
    const payload = {
       
      twitch_user_id: streamer.id,
       
      twitch_login: streamer.login,
       
      twitch_display_name: streamer.displayName,
       
      profile_image_url: streamer.profileImageUrl,
    };

    await inviteStreamer(campaignId, payload);
    showInviteModal.value = false;
    searchQuery.value = "";
    searchResults.value = [];
    await loadMembers();
  } catch (error) {
    console.error("Error inviting streamer:", error);
  }
};

// Handle remove member - open modal
const handleRemoveMember = (memberId: string, memberName: string) => {
  memberToRemove.value = { id: memberId, name: memberName };
  showRemoveMemberModal.value = true;
};

// Confirm remove member - execute removal
const confirmRemoveMember = async () => {
  if (!memberToRemove.value) return;

  try {
    await removeMember(campaignId, memberToRemove.value.id);
    showRemoveMemberModal.value = false;
    memberToRemove.value = null;
    await loadMembers();
  } catch (error) {
    console.error("Error removing member:", error);
  }
};

// Handle delete campaign - open modal
const handleDeleteCampaign = () => {
  showDeleteModal.value = true;
};

// Confirm delete campaign - execute deletion
const confirmDeleteCampaign = async () => {
  try {
    await deleteCampaign(campaignId);
    showDeleteModal.value = false;
    _router.push({ path: "/mj" });
  } catch (error) {
    console.error("Error deleting campaign:", error);
  }
};

// Format date
const formatDate = (dateString: string | null) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Date invalide";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

// Reset modal when it closes
watch(showInviteModal, (isOpen) => {
  if (!isOpen) {
    searchQuery.value = "";
    searchResults.value = [];
  }
});
</script>
