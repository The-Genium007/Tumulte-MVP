<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  pollId: string;
  campaignId: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  delete: [];
}>();

// Use computed to make items reactive to prop changes
const items = computed(() => [
  [
    {
      label: "Modifier",
      icon: "i-lucide-pencil",
      to: `/mj/campaigns/${props.campaignId}/polls/${props.pollId}/edit`,
    },
  ],
  [
    {
      label: "Supprimer",
      icon: "i-lucide-trash-2",
      color: "error" as const,
      onSelect: () => emit("delete"),
    },
  ],
]);
</script>

<template>
  <UDropdownMenu :items="items" :disabled="disabled" :ui="{ content: 'border border-neutral-200 shadow-lg' }">
    <UButton
      color="neutral"
      variant="ghost"
      icon="i-lucide-settings"
      size="sm"
      :disabled="disabled"
      class="hover:bg-transparent!"
    />
  </UDropdownMenu>
</template>
