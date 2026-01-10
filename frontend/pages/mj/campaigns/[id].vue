<template>
    <div class="min-h-screen py-8 px-4">
      <div class="max-w-7xl mx-auto">
        <!-- Header avec retour et actions -->
        <div class="mb-8">
          <UButton
            icon="i-lucide-arrow-left"
            label="Retour aux campagnes"
            variant="soft"
            color="neutral"
            to="/mj/campaigns"
            class="mb-4"
          />

          <div>
            <div class="flex items-center gap-3 mb-2">
              <h1 class="text-3xl font-bold text-white">
                {{ campaign?.name || 'Chargement...' }}
              </h1>
              <UButton
                icon="i-lucide-trash-2"
                label="Supprimer"
                color="error"
                variant="soft"
                size="sm"
                @click="handleDeleteCampaign"
              />
            </div>
            <p v-if="campaign?.description" class="text-gray-400">
              {{ campaign.description }}
            </p>
            <p v-if="campaign" class="text-sm text-gray-500 mt-1">
              Créée le {{ formatDate(campaign.createdAt) }}
            </p>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <UCard>
            <div class="flex items-center gap-4">
              <div class="bg-primary-500/10 p-3 rounded-xl">
                <UIcon name="i-lucide-users" class="size-8 text-primary-500" />
              </div>
              <div>
                <p class="text-sm text-gray-400">Total Membres</p>
                <p class="text-2xl font-bold text-white">{{ members.length }}</p>
              </div>
            </div>
          </UCard>

          <UCard class="cursor-pointer hover:bg-gray-800/50 transition-colors" @click="fetchLiveStatus">
            <div class="flex items-center gap-4">
              <div class="bg-red-500/10 p-3 rounded-xl">
                <UIcon name="i-lucide-radio" class="size-8 text-red-500" />
              </div>
              <div>
                <p class="text-sm text-gray-400">En Live <span class="text-xs">(clic pour refresh)</span></p>
                <p class="text-2xl font-bold text-white">{{ liveMembersCount }}</p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-4">
              <div class="bg-green-500/10 p-3 rounded-xl">
                <UIcon name="i-lucide-user-check" class="size-8 text-green-500" />
              </div>
              <div>
                <p class="text-sm text-gray-400">Actifs</p>
                <p class="text-2xl font-bold text-white">{{ activeMembersCount }}</p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-4">
              <div class="bg-blue-500/10 p-3 rounded-xl">
                <UIcon name="i-lucide-shield-check" class="size-8 text-blue-500" />
              </div>
              <div>
                <p class="text-sm text-gray-400">Autorisés</p>
                <p class="text-2xl font-bold text-white">{{ authorizedMembersCount }}</p>
              </div>
            </div>
          </UCard>

          <UCard>
            <div class="flex items-center gap-4">
              <div class="bg-amber-500/10 p-3 rounded-xl">
                <UIcon name="i-lucide-user-plus" class="size-8 text-amber-500" />
              </div>
              <div>
                <p class="text-sm text-gray-400">En Attente</p>
                <p class="text-2xl font-bold text-white">{{ pendingMembersCount }}</p>
              </div>
            </div>
          </UCard>
        </div>

        <!-- Liste des membres -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-bold text-white">Membres de la campagne</h2>
              <UButton
                icon="i-lucide-user-plus"
                label="Inviter un streamer"
                color="primary"
                @click="showInviteModal = true"
              />
            </div>
          </template>

          <div v-if="loadingMembers" class="flex items-center justify-center py-12">
            <UIcon name="i-lucide-loader" class="size-12 text-primary-500 animate-spin" />
          </div>

          <div v-else-if="members.length === 0" class="text-center py-12">
            <UIcon name="i-lucide-users" class="size-16 mx-auto mb-4 text-gray-600" />
            <h3 class="text-xl font-semibold text-white mb-2">Aucun membre</h3>
            <p class="text-gray-400 mb-6">
              Commencez par inviter des streamers à rejoindre cette campagne
            </p>
            <UButton
              icon="i-lucide-user-plus"
              label="Inviter un streamer"
              color="primary"
              @click="showInviteModal = true"
            />
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="member in sortedMembers"
              :key="member.id"
              class="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg hover:bg-gray-700/30 transition-colors"
            >
              <div class="flex items-center gap-4">
                <!-- Avatar with Live Badge -->
                <div class="relative">
                  <img
                    v-if="member.streamer.profileImageUrl"
                    :src="member.streamer.profileImageUrl"
                    :alt="member.streamer.twitchDisplayName"
                    class="size-12 rounded-full ring-2"
                    :class="liveStatus[member.streamer.twitchUserId]?.is_live ? 'ring-red-500' : 'ring-purple-500/20'"
                  />
                  <div
                    v-else
                    class="size-12 rounded-full ring-2 ring-purple-500/20 bg-purple-500/20 flex items-center justify-center"
                  >
                    <UIcon name="i-lucide-user" class="size-6 text-purple-500" />
                  </div>
                  <LiveBadge :live-status="liveStatus[member.streamer.twitchUserId]" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <p class="font-semibold text-white">
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
                    class="text-sm text-primary-400 hover:text-primary-300 transition-colors inline-flex items-center gap-1"
                  >
                    @{{ member.streamer.twitchLogin }}
                    <UIcon name="i-lucide-external-link" class="size-3" />
                  </a>
                  <!-- Live info -->
                  <p
                    v-if="liveStatus[member.streamer.twitchUserId]?.is_live"
                    class="text-xs text-red-400 mt-1"
                  >
                    🔴 En live{{ liveStatus[member.streamer.twitchUserId]?.game_name ? ` sur ${liveStatus[member.streamer.twitchUserId].game_name}` : '' }}
                    {{ liveStatus[member.streamer.twitchUserId]?.viewer_count !== undefined ? `(${liveStatus[member.streamer.twitchUserId].viewer_count} viewers)` : '' }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-4">
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
                  label="Révoquer"
                  color="error"
                  variant="ghost"
                  size="sm"
                  @click="handleRemoveMember(member.id, member.streamer.twitchDisplayName)"
                />
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
          <div class="bg-error-500/10 p-2 rounded-lg">
            <UIcon name="i-lucide-alert-triangle" class="size-6 text-error-500" />
          </div>
          <h3 class="text-xl font-bold text-white">Supprimer la campagne</h3>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <p class="text-gray-300">
            Êtes-vous sûr de vouloir supprimer la campagne
            <strong class="text-white">{{ campaign?.name }}</strong> ?
          </p>
          <div class="bg-error-500/10 border border-error-500/20 rounded-lg p-4">
            <p class="text-sm text-error-300">
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
          <div class="bg-error-500/10 p-2 rounded-lg">
            <UIcon name="i-lucide-user-x" class="size-6 text-error-500" />
          </div>
          <h3 class="text-xl font-bold text-white">Révoquer l'accès</h3>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <p class="text-gray-300">
            Êtes-vous sûr de vouloir révoquer l'accès de
            <strong class="text-white">{{ memberToRemove?.name }}</strong> ?
          </p>
          <div class="bg-error-500/10 border border-error-500/20 rounded-lg p-4">
            <p class="text-sm text-error-300">
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
        <h3 class="text-xl font-bold text-white">Inviter un streamer</h3>
      </template>

      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">
              Rechercher un streamer
            </label>
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              placeholder="Nom ou login Twitch..."
              size="lg"
            />
            <p class="text-xs text-gray-400 mt-1">Tapez au moins 2 caractères</p>
          </div>

          <!-- Loading -->
          <div v-if="searching" class="flex items-center justify-center py-8">
            <UIcon name="i-lucide-loader" class="size-8 text-primary-500 animate-spin" />
          </div>

          <!-- Search Results -->
          <div v-else-if="filteredSearchResults.length > 0" class="space-y-2 max-h-96 overflow-y-auto">
            <div
              v-for="streamer in filteredSearchResults"
              :key="streamer.id"
              class="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <img
                  v-if="streamer.profileImageUrl"
                  :src="streamer.profileImageUrl"
                  :alt="streamer.displayName"
                  class="size-10 rounded-full ring-2 ring-purple-500/20"
                />
                <div
                  v-else
                  class="size-10 rounded-full ring-2 ring-purple-500/20 bg-purple-500/20 flex items-center justify-center"
                >
                  <UIcon name="i-lucide-user" class="size-5 text-purple-500" />
                </div>
                <div>
                  <p class="font-semibold text-white">{{ streamer.displayName }}</p>
                  <p class="text-sm text-gray-400">@{{ streamer.login }}</p>
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
            <UIcon name="i-lucide-search-x" class="size-12 mx-auto mb-3 text-gray-500" />
            <p class="text-gray-400">
              {{ searchResults.length > 0 ? 'Tous les streamers trouvés sont déjà invités' : 'Aucun streamer trouvé' }}
            </p>
          </div>

          <!-- Initial State -->
          <div v-else class="text-center py-8">
            <UIcon name="i-lucide-search" class="size-12 mx-auto mb-3 text-gray-600" />
            <p class="text-sm text-gray-500">Tapez au moins 2 caractères pour rechercher</p>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end">
          <UButton
            color="neutral"
            variant="soft"
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
import type { Campaign, CampaignMembership, StreamerSearchResult, LiveStatusMap } from "@/types";

const _router = useRouter();
const route = useRoute();
const campaignId = route.params.id as string;

const { getCampaignDetails, inviteStreamer, removeMember, searchTwitchStreamers, deleteCampaign, getLiveStatus } = useCampaigns();

const campaign = ref<Campaign | null>(null);
const liveStatus = ref<LiveStatusMap>({});

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

// Auto-refresh interval for authorization status
let refreshInterval: ReturnType<typeof setInterval> | null = null;
const REFRESH_INTERVAL_MS = 60000; // Refresh every 60 seconds

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
  if (refreshInterval) return;
  refreshInterval = setInterval(async () => {
    await refreshMembersQuietly();
  }, REFRESH_INTERVAL_MS);
};

const stopAutoRefresh = () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
};

// Fetch live status for all members
const fetchLiveStatus = async () => {
  try {
    console.log("[LiveStatus] Fetching live status for campaign:", campaignId);
    const status = await getLiveStatus(campaignId);
    console.log("[LiveStatus] Response:", JSON.stringify(status));
    liveStatus.value = status;
  } catch (error) {
    console.error("[LiveStatus] Error fetching live status:", error);
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
    members.value = data.members;
  } catch (error) {
    console.error("Error loading campaign:", error);
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
    _router.push({ path: "/mj/campaigns" });
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
