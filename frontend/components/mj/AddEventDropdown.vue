<script setup lang="ts">
const props = defineProps<{
  campaignId: string;
}>();

// Use computed to make items reactive to campaignId changes
const items = computed(() => [
  [
    {
      label: "Sondage",
      icon: "i-lucide-bar-chart-2",
      to: `/mj/campaigns/${props.campaignId}/polls/create`,
    },
  ],
]);
</script>

<template>
  <UDropdownMenu :items="items" :ui="{ content: 'bg-white shadow-lg border border-neutral-200' }">
    <UButton
      color="primary"
      variant="solid"
      icon="i-lucide-plus"
    >
      <span class="hidden sm:inline">Ajouter</span>
    </UButton>
  </UDropdownMenu>
</template>
