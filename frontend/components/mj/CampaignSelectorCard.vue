<script setup lang="ts">
import type { Campaign } from '~/types'

defineProps<{
  campaigns: readonly Campaign[]
}>()

const modelValue = defineModel<string | null>({ required: true })
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-primary">Ma campagne</h2>
        <UButton
          color="primary"
          icon="i-lucide-plus"
          label="Connecter un VTT"
          to="/mj/vtt-connections/create"
        />
      </div>
    </template>

    <MjCampaignDropdown v-model="modelValue" :campaigns="campaigns" height="75px" />
  </UCard>
</template>
