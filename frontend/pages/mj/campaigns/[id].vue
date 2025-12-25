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
              Créée le {{ formatDate(campaign.created_at) }}
            </p>
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              v-for="member in members"
              :key="member.id"
              class="flex items-center justify-between p-4 bg-gray-800/30 rounded-lg hover:bg-gray-700/30 transition-colors"
            >
              <div class="flex items-center gap-4">
                <img
                  v-if="member.streamer.profile_image_url"
                  :src="member.streamer.profile_image_url"
                  :alt="member.streamer.twitch_display_name"
                  class="size-12 rounded-full ring-2 ring-purple-500/20"
                />
                <div
                  v-else
                  class="size-12 rounded-full ring-2 ring-purple-500/20 bg-purple-500/20 flex items-center justify-center"
                >
                  <UIcon name="i-lucide-user" class="size-6 text-purple-500" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <p class="font-semibold text-white">
                      {{ member.streamer.twitch_display_name }}
                    </p>
                    <UBadge
                      :label="member.status === 'ACTIVE' ? 'Actif' : 'En attente'"
                      :color="member.status === 'ACTIVE' ? 'green' : 'amber'"
                      variant="soft"
                      size="sm"
                    />
                  </div>
                  <a
                    :href="`https://twitch.tv/${member.streamer.twitch_login}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="text-sm text-primary-400 hover:text-primary-300 transition-colors inline-flex items-center gap-1"
                  >
                    @{{ member.streamer.twitch_login }}
                    <UIcon name="i-lucide-external-link" class="size-3" />
                  </a>
                </div>
              </div>

              <div class="flex gap-2">
                <!-- Dev only: Activate pending member -->
                <UButton
                  v-if="isDev && member.status === 'PENDING'"
                  icon="i-lucide-check"
                  color="green"
                  variant="soft"
                  size="sm"
                  label="Activer"
                  @click="handleActivateMember(member.id)"
                />

                <UButton
                  icon="i-lucide-x"
                  label="Révoquer"
                  color="error"
                  variant="ghost"
                  size="sm"
                  @click="handleRemoveMember(member.id)"
                />
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <UModal v-model:open="showDeleteModal" :ui="{ width: 'sm:max-w-md' }">
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

    <!-- Modal d'invitation -->
    <UModal v-model:open="showInviteModal" :ui="{ width: 'sm:max-w-2xl' }">
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
              :key="streamer.twitch_user_id"
              class="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-700/50 transition-colors"
            >
              <div class="flex items-center gap-3">
                <img
                  v-if="streamer.profile_image_url"
                  :src="streamer.profile_image_url"
                  :alt="streamer.twitch_display_name"
                  class="size-10 rounded-full ring-2 ring-purple-500/20"
                />
                <div
                  v-else
                  class="size-10 rounded-full ring-2 ring-purple-500/20 bg-purple-500/20 flex items-center justify-center"
                >
                  <UIcon name="i-lucide-user" class="size-5 text-purple-500" />
                </div>
                <div>
                  <p class="font-semibold text-white">{{ streamer.twitch_display_name }}</p>
                  <p class="text-sm text-gray-400">@{{ streamer.twitch_login }}</p>
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
            color="gray"
            variant="soft"
            label="Fermer"
            @click="showInviteModal = false"
          />
        </div>
      </template>
    </UModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useCampaigns } from "@/composables/useCampaigns";
import type { Campaign, CampaignMembership } from "@/types";

const router = useRouter();
const route = useRoute();
const campaignId = route.params.id as string;

const { getCampaignDetails, inviteStreamer, removeMember, searchTwitchStreamers, deleteCampaign } = useCampaigns();
const toast = useToast();

// Dev mode detection
const isDev = import.meta.env.DEV;

const campaign = ref<Campaign | null>(null);

definePageMeta({
  layout: "authenticated" as const,
});
const members = ref<CampaignMembership[]>([]);
const loadingMembers = ref(false);
const showInviteModal = ref(false);
const showDeleteModal = ref(false);
const searchQuery = ref("");
const searchResults = ref<any[]>([]);
const searching = ref(false);

// Computed properties
const activeMembersCount = computed(() => members.value.filter((m) => m.status === "ACTIVE").length);
const pendingMembersCount = computed(() => members.value.filter((m) => m.status === "PENDING").length);

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
});

const loadMembers = async () => {
  loadingMembers.value = true;
  try {
    const data = await getCampaignDetails(campaignId);
    campaign.value = data.campaign;
    members.value = data.members;
    console.log('Campaign loaded:', campaign.value);
    console.log('Members loaded:', members.value);
    if (members.value.length > 0) {
      console.log('First member:', members.value[0]);
      console.log('First member joined_at:', members.value[0].joined_at);
    }
  } catch (error) {
    console.error("Error loading campaign:", error);
    toast.add({
      title: "Erreur",
      description: "Impossible de charger la campagne",
      color: "red",
    });
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
      toast.add({
        title: "Erreur",
        description: "Impossible de rechercher les streamers",
        color: "red",
      });
    } finally {
      searching.value = false;
    }
  }, 500);
});

// Handle invite
const handleInvite = async (streamer: any) => {
  try {
    const payload = streamer.id !== null && streamer.id !== undefined
      ? { streamer_id: streamer.id }
      : {
          twitch_user_id: streamer.twitch_user_id,
          twitch_login: streamer.twitch_login,
          twitch_display_name: streamer.twitch_display_name,
          profile_image_url: streamer.profile_image_url,
        };

    await inviteStreamer(campaignId, payload);
    toast.add({
      title: "Succès",
      description: `${streamer.twitch_display_name} a été invité`,
      color: "green",
    });
    showInviteModal.value = false;
    searchQuery.value = "";
    searchResults.value = [];
    await loadMembers();
  } catch (error: any) {
    const message = error?.data?.error || "Impossible d'inviter le streamer";
    toast.add({
      title: "Erreur",
      description: message,
      color: "red",
    });
  }
};

// Handle remove member
const handleRemoveMember = async (memberId: string) => {
  if (!confirm("Êtes-vous sûr de vouloir retirer ce membre ? Il sera retiré immédiatement des sondages en cours.")) {
    return;
  }

  try {
    await removeMember(campaignId, memberId);
    toast.add({
      title: "Succès",
      description: "Membre retiré de la campagne",
      color: "green",
    });
    await loadMembers();
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible de retirer le membre",
      color: "red",
    });
  }
};

// Handle activate member (dev only)
const handleActivateMember = async (memberId: string) => {
  try {
    const API_URL = import.meta.env.VITE_API_URL;
    const response = await fetch(`${API_URL}/mj/campaigns/${campaignId}/members/${memberId}/activate`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to activate member");

    toast.add({
      title: "Succès",
      description: "Membre activé",
      color: "green",
    });
    await loadMembers();
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible d'activer le membre",
      color: "red",
    });
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
    toast.add({
      title: "Succès",
      description: "Campagne supprimée avec succès",
      color: "green",
    });
    router.push({ path: "/mj/campaigns" });
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible de supprimer la campagne",
      color: "red",
    });
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
