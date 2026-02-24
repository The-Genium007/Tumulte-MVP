<script setup lang="ts">
import type { Campaign } from '~/types'

defineProps<{
  campaigns: readonly Campaign[]
}>()

const modelValue = defineModel<string | null>({ required: true })

const emit = defineEmits<{
  created: [campaign: Campaign]
}>()

const router = useRouter()
const showCreateModal = ref(false)

const items = [
  [
    {
      label: 'Créer sans VTT',
      icon: 'i-lucide-file-plus',
      onSelect: () => {
        showCreateModal.value = true
      },
    },
    {
      label: 'Connecter un VTT',
      icon: 'i-lucide-plug-zap',
      onSelect: () => {
        router.push('/mj/vtt-connections/create')
      },
    },
  ],
]
</script>

<template>
  <UCard>
    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-primary">Ma campagne</h2>
        <UDropdownMenu
          :items="items"
          :ui="{ content: 'bg-elevated shadow-lg border border-default' }"
        >
          <UButton color="primary" icon="i-lucide-plus" trailing-icon="i-lucide-chevron-down">
            Nouvelle campagne
          </UButton>
        </UDropdownMenu>
      </div>
    </template>

    <MjCampaignDropdown v-model="modelValue" :campaigns="campaigns" height="75px" />
  </UCard>

  <MjCampaignCreateModal v-model="showCreateModal" @created="(c) => emit('created', c)" />
</template>
