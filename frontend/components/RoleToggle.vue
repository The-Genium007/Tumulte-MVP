<template>
  <div class="flex items-center gap-3">
    <div class="flex items-center gap-2">
      <UIcon
        name="i-lucide-shield"
        class="size-5"
        :class="!isStreamerMode ? 'text-purple-500' : 'text-gray-500'"
      />
      <USwitch
        v-model="isStreamerMode"
        :disabled="switching"
        size="lg"
        @update:model-value="handleToggle"
      />
      <UIcon
        name="i-lucide-video"
        class="size-5"
        :class="isStreamerMode ? 'text-blue-500' : 'text-gray-500'"
      />
    </div>
    <div class="flex flex-col">
      <span class="text-xs font-medium text-gray-400">Mode</span>
      <span class="text-sm font-semibold" :class="isStreamerMode ? 'text-blue-400' : 'text-purple-400'">
        {{ isStreamerMode ? 'Streamer' : 'MJ' }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoleSwitch } from "@/composables/useRoleSwitch";

// Utiliser le composable pour gérer le switch de rôle
const { switching, isStreamerMode, handleToggle } = useRoleSwitch();
</script>
