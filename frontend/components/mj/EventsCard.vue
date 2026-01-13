<script setup lang="ts">
import type { Poll } from "~/types";
import { storeToRefs } from "pinia";
import { usePollsStore } from "~/stores/polls";
import { usePollControlStore } from "~/stores/pollControl";
import { useMockData } from "@/composables/useMockData";
import { useWebSocket } from "@/composables/useWebSocket";

const props = defineProps<{
  campaignId: string;
  maxHeight?: string;
}>();

const toast = useToast();
const pollsStore = usePollsStore();
const pollControlStore = usePollControlStore();
const { pollStatus: _pollStatus } = storeToRefs(pollControlStore);
const { enabled: mockEnabled, loadMockData } = useMockData();
const { subscribeToPoll } = useWebSocket();

// State
const showDeleteModal = ref(false);
const pollToDelete = ref<Poll | null>(null);
const launchingPollId = ref<string | null>(null);
const cancelling = ref(false);

// WebSocket subscription cleanup function
let wsUnsubscribe: (() => Promise<void>) | null = null;

// Computed - use mock data as fallback when enabled and store is empty
const polls = computed(() => {
  const storePolls = pollsStore.sortedPolls;
  if (mockEnabled.value && storePolls.length === 0) {
    // Filter mock polls by campaign ID
    return mockPolls.value.filter((p) => p.campaignId === props.campaignId);
  }
  return storePolls;
});
const loading = computed(() => pollsStore.loading);
const activePollInstance = computed(() => pollsStore.activePollInstance);
const lastLaunchedPollId = computed(() => pollsStore.lastLaunchedPollId);

// Mock polls data
const mockPolls = ref<Poll[]>([]);

/**
 * Check if a poll is the active one
 */
const isActivePoll = (pollId: string): boolean => {
  return activePollInstance.value?.pollId === pollId;
};

/**
 * Check if a poll is the last launched one (but not active)
 */
const isLastLaunchedPoll = (pollId: string): boolean => {
  return lastLaunchedPollId.value === pollId && !isActivePoll(pollId);
};

/**
 * Subscribe to WebSocket events for an active poll
 */
const subscribeToActivePoll = async (pollInstanceId: string) => {
  // Cleanup previous subscription
  if (wsUnsubscribe) {
    await wsUnsubscribe();
    wsUnsubscribe = null;
  }

  // Subscribe to poll events
  wsUnsubscribe = subscribeToPoll(pollInstanceId, {
    onStart: (data) => {
      console.debug("[EventsCard] poll:start received", data);
      pollControlStore.pollStatus = "sending";
    },
    onUpdate: (data) => {
      console.debug("[EventsCard] poll:update received", data);
      // Real-time vote updates could be handled here if needed
    },
    onEnd: (data) => {
      console.debug("[EventsCard] poll:end received", data);
      // Update pollControlStore status
      pollControlStore.pollStatus = "sent";
      // Clear active poll in pollsStore
      pollsStore.clearActivePoll();
      // Signal that poll ended (for RecentEventsColumn refresh)
      pollsStore.markPollEnded();
    },
  });
};

/**
 * Handle poll launch
 */
const handleLaunch = async (pollId: string) => {
  launchingPollId.value = pollId;
  try {
    const result = await pollsStore.launchPoll(pollId);

    // Subscribe to WebSocket events for this poll instance
    if (result.pollInstance) {
      await subscribeToActivePoll(result.pollInstance.id);
    }

    toast.add({
      title: "Sondage lancé",
      description: "Le sondage a été lancé sur toutes les chaînes.",
      color: "success",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    toast.add({
      title: "Erreur",
      description: message,
      color: "error",
    });
  } finally {
    launchingPollId.value = null;
  }
};

/**
 * Handle poll cancellation
 */
const handleCancel = async () => {
  if (!activePollInstance.value || cancelling.value) return;

  cancelling.value = true;
  try {
    await pollsStore.cancelPoll(activePollInstance.value.id);
    toast.add({
      title: "Sondage annulé",
      description: "Le sondage a été annulé.",
      color: "warning",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    toast.add({
      title: "Erreur",
      description: message,
      color: "error",
    });
  } finally {
    cancelling.value = false;
  }
};

/**
 * Open delete modal
 */
const handleDeleteRequest = (pollId: string) => {
  const poll = polls.value.find((p) => p.id === pollId);
  if (poll) {
    pollToDelete.value = poll;
    showDeleteModal.value = true;
  }
};

/**
 * Confirm deletion
 */
const handleDeleteConfirm = async (pollId: string) => {
  try {
    await pollsStore.deletePoll(pollId);
    showDeleteModal.value = false;
    pollToDelete.value = null;
    toast.add({
      title: "Sondage supprimé",
      description: "Le sondage a été supprimé définitivement.",
      color: "success",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    toast.add({
      title: "Erreur",
      description: message,
      color: "error",
    });
  }
};

// Fetch polls on mount
onMounted(async () => {
  // Load mock data first
  const mockData = await loadMockData();
  if (mockData?.mockPolls) {
    mockPolls.value = mockData.mockPolls as Poll[];
  }

  // Then fetch from API
  await pollsStore.fetchPolls(props.campaignId);

  // If there's an active poll from backend, subscribe to its WebSocket events
  // This handles the case where user returns to the page with an active poll
  if (activePollInstance.value?.id) {
    console.debug("[EventsCard] Reconnecting to active poll:", activePollInstance.value.id);
    await subscribeToActivePoll(activePollInstance.value.id);
  }
});

// Watch for campaign changes
watch(
  () => props.campaignId,
  async (newId) => {
    if (newId) {
      await pollsStore.fetchPolls(newId);
      // Reconnect to active poll if exists after fetching
      if (activePollInstance.value?.id) {
        await subscribeToActivePoll(activePollInstance.value.id);
      }
    }
  },
);

// Watch for activePollInstance changes (e.g., when poll ends or is restored)
// This ensures WebSocket subscription is always in sync with the active poll
watch(
  activePollInstance,
  async (newInstance, oldInstance) => {
    // Only subscribe if we have a new active poll that's different from the old one
    if (newInstance?.id && newInstance.id !== oldInstance?.id) {
      console.debug("[EventsCard] Active poll changed, subscribing to:", newInstance.id);
      await subscribeToActivePoll(newInstance.id);
    }
    // If poll was cleared, cleanup subscription
    if (!newInstance && wsUnsubscribe) {
      console.debug("[EventsCard] Active poll cleared, cleaning up subscription");
      await wsUnsubscribe();
      wsUnsubscribe = null;
    }
  },
);

// Cleanup WebSocket subscription on unmount
onUnmounted(async () => {
  if (wsUnsubscribe) {
    await wsUnsubscribe();
    wsUnsubscribe = null;
  }
});
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-primary">Mes événements</h2>
        <MjAddEventDropdown :campaign-id="campaignId" />
      </div>
    </template>

    <!-- Loading state -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-12">
      <UIcon
        name="i-game-icons-dice-twenty-faces-twenty"
        class="size-8 text-primary animate-spin-slow mb-3"
      />
      <p class="text-muted text-sm">Chargement des sondages...</p>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="polls.length === 0"
      class="flex flex-col items-center justify-center py-12"
    >
      <UIcon name="i-lucide-list" class="size-10 text-muted mb-3" />
      <p class="text-muted text-sm mb-4">Aucun événement créé</p>
      <MjAddEventDropdown :campaign-id="campaignId" />
    </div>

    <!-- Poll list -->
    <div
      v-else
      class="space-y-2 overflow-y-auto"
      :style="{ maxHeight: maxHeight || '1000px' }"
    >
      <MjEventRow
        v-for="poll in polls"
        :key="poll.id"
        :poll="poll"
        :is-active="isActivePoll(poll.id)"
        :is-last-launched="isLastLaunchedPoll(poll.id)"
        :launching="launchingPollId === poll.id"
        :cancelling="cancelling && isActivePoll(poll.id)"
        @launch="handleLaunch"
        @cancel="handleCancel"
        @delete="handleDeleteRequest"
      />
    </div>

    <!-- Delete modal -->
    <MjDeletePollModal
      v-model="showDeleteModal"
      :poll="pollToDelete"
      @confirm="handleDeleteConfirm"
    />
  </UCard>
</template>
