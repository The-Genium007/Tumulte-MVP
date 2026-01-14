<template>
  <div
    v-if="isLive"
    class="absolute -top-1 -right-1 flex items-center justify-center"
    :title="tooltipText"
  >
    <span class="inline-flex rounded-full size-3 bg-live"></span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { LiveStatus } from "@/types";

const props = defineProps<{
  liveStatus?: LiveStatus | null;
}>();

const isLive = computed(() => props.liveStatus?.is_live === true);

const tooltipText = computed(() => {
  if (!props.liveStatus?.is_live) return "";
  const parts: string[] = ["En live"];
  if (props.liveStatus.game_name) {
    parts.push(`sur ${props.liveStatus.game_name}`);
  }
  if (props.liveStatus.viewer_count !== undefined) {
    parts.push(`(${props.liveStatus.viewer_count} viewers)`);
  }
  return parts.join(" ");
});
</script>
