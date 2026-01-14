<template>
  <div
    class="flex items-center justify-between p-3 rounded-lg transition-colors"
    :class="streamer.isReady ? 'bg-success-light' : 'bg-error-light'"
  >
    <div class="flex items-center gap-3">
      <!-- Avatar avec indicateur de statut -->
      <div class="relative">
        <img
          v-if="streamer.streamerAvatar"
          :src="streamer.streamerAvatar"
          :alt="streamer.streamerName"
          class="size-10 rounded-full ring-2"
          :class="streamer.isReady ? 'ring-success-500' : 'ring-error-500'"
        />
        <div
          v-else
          class="size-10 rounded-full flex items-center justify-center ring-2"
          :class="
            streamer.isReady
              ? 'bg-success-medium ring-success-500'
              : 'bg-error-medium ring-error-500'
          "
        >
          <UIcon name="i-lucide-user" class="size-5 text-muted" />
        </div>

        <!-- Badge live -->
        <div
          v-if="liveStatus?.is_live"
          class="absolute -bottom-1 -right-1 bg-error-500 text-primary text-xs px-1 rounded font-bold"
        >
          LIVE
        </div>
      </div>

      <div>
        <p class="font-medium text-primary">{{ streamer.streamerName }}</p>
        <p v-if="!streamer.isReady" class="text-xs text-error-400">
          {{ issueText }}
        </p>
        <p v-else class="text-xs text-success-400">Pret</p>
      </div>
    </div>

    <!-- Icone de statut -->
    <div class="flex items-center">
      <UIcon
        :name="streamer.isReady ? 'i-lucide-check-circle' : 'i-lucide-x-circle'"
        class="size-6"
        :class="streamer.isReady ? 'text-success-500' : 'text-error-500'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { StreamerReadiness, LiveStatus } from "@/types";

const props = defineProps<{
  streamer: StreamerReadiness;
  liveStatus?: LiveStatus;
}>();

const issueText = computed(() => {
  const issues = props.streamer.issues;

  if (
    issues.includes("token_expired") ||
    issues.includes("token_refresh_failed")
  ) {
    return "Token Twitch expire - reconnexion necessaire";
  }
  if (issues.includes("authorization_expired")) {
    return "Autorisation expiree";
  }
  if (issues.includes("authorization_missing")) {
    return "Autorisation requise";
  }
  if (issues.includes("streamer_inactive")) {
    return "Compte inactif";
  }
  return "Non disponible";
});
</script>
