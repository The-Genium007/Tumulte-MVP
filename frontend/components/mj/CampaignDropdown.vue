<script setup lang="ts">
import type { Campaign, VttConnectionStatus } from '~/types'

const props = defineProps<{
  campaigns: readonly Campaign[]
  height?: string
}>()

const modelValue = defineModel<string | null>({ required: true })

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLElement | null>(null)

// Position du dropdown (calculée pour le Teleport)
const dropdownStyle = ref<{ top: string; left: string; width: string }>({
  top: '0px',
  left: '0px',
  width: '0px',
})

const selectedCampaign = computed(() => props.campaigns.find((c) => c.id === modelValue.value))

// VTT Status helpers
const getVttStatusColor = (vttConnection: VttConnectionStatus | null | undefined) => {
  if (!vttConnection) return ''
  if (vttConnection.status === 'revoked') return 'bg-error-500'
  switch (vttConnection.tunnelStatus) {
    case 'connected':
      return 'bg-success-500'
    case 'connecting':
      return 'bg-warning-500'
    case 'error':
      return 'bg-error-500'
    default:
      return 'bg-neutral-400'
  }
}

const getVttStatusLabel = (vttConnection: VttConnectionStatus | null | undefined) => {
  if (!vttConnection) return ''
  if (vttConnection.status === 'revoked') return 'Révoqué'
  switch (vttConnection.tunnelStatus) {
    case 'connected':
      return 'Connecté'
    case 'connecting':
      return 'Connexion...'
    case 'error':
      return 'Erreur'
    default:
      return 'Déconnecté'
  }
}

const updateDropdownPosition = () => {
  if (!triggerRef.value) return
  const rect = triggerRef.value.getBoundingClientRect()
  // getBoundingClientRect() retourne des coordonnées viewport, parfait pour position: fixed
  dropdownStyle.value = {
    top: `${rect.bottom}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }
}

const toggleDropdown = () => {
  if (!isOpen.value) {
    updateDropdownPosition()
  }
  isOpen.value = !isOpen.value
}

const selectCampaign = (campaignId: string) => {
  modelValue.value = campaignId
  isOpen.value = false
}

// Fermer le dropdown au clic extérieur
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Node
  const isInsideTrigger = triggerRef.value?.contains(target)
  const isInsideDropdown = dropdownRef.value?.contains(target)

  if (!isInsideTrigger && !isInsideDropdown) {
    isOpen.value = false
  }
}

// Mettre à jour la position lors du scroll/resize
const handleScrollOrResize = () => {
  if (isOpen.value) {
    updateDropdownPosition()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', handleScrollOrResize, true)
  window.addEventListener('resize', handleScrollOrResize)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', handleScrollOrResize, true)
  window.removeEventListener('resize', handleScrollOrResize)
})
</script>

<template>
  <div
    ref="triggerRef"
    class="relative w-full bg-neutral-100 rounded-lg cursor-pointer transition-all"
    :class="{ 'rounded-b-none': isOpen }"
    :style="{ minHeight: height || '70px' }"
  >
    <!-- Zone cliquable principale -->
    <div
      class="flex items-center justify-between px-5 h-full"
      :style="{ minHeight: height || '70px' }"
      @click="toggleDropdown"
    >
      <!-- Campagne sélectionnée -->
      <div v-if="selectedCampaign" class="flex items-center gap-4">
        <div class="w-3 h-3 rounded-full bg-brand-500 shrink-0" />
        <div>
          <h3 class="font-semibold text-primary text-lg">
            {{ selectedCampaign.name }}
          </h3>
          <!-- VTT info if connected, otherwise player count -->
          <p
            v-if="selectedCampaign.vttConnection"
            class="text-sm text-muted flex items-center gap-2"
          >
            <span>Foundry VTT</span>
            <span class="text-neutral-300">•</span>
            <span class="flex items-center gap-1.5">
              <span
                class="w-2 h-2 rounded-full"
                :class="getVttStatusColor(selectedCampaign.vttConnection)"
              />
              {{ getVttStatusLabel(selectedCampaign.vttConnection) }}
            </span>
          </p>
          <p v-else class="text-sm text-muted">
            {{ selectedCampaign.activeMemberCount }} joueur(s) actif(s)
          </p>
        </div>
      </div>

      <!-- Placeholder -->
      <div v-else class="text-muted text-lg">Sélectionnez une campagne</div>

      <!-- Chevron avec rotation -->
      <UIcon
        name="i-lucide-chevron-down"
        class="size-6 text-muted transition-transform duration-200 shrink-0"
        :class="{ 'rotate-180': isOpen }"
      />
    </div>
  </div>

  <!-- Liste déroulante (Teleport pour éviter overflow:hidden de UCard) -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="isOpen"
        ref="dropdownRef"
        class="fixed bg-white border border-neutral-200 border-t-0 rounded-b-lg shadow-lg z-50 max-h-64 overflow-y-auto"
        :style="{
          top: dropdownStyle.top,
          left: dropdownStyle.left,
          width: dropdownStyle.width,
        }"
      >
        <!-- État vide -->
        <div v-if="campaigns.length === 0" class="p-4 text-center text-muted text-sm">
          Aucune campagne créée
        </div>

        <!-- Liste des campagnes -->
        <div
          v-for="campaign in campaigns"
          v-else
          :key="campaign.id"
          class="flex items-center gap-4 px-5 py-4 hover:bg-neutral-50 cursor-pointer transition-colors border-t border-neutral-100 first:border-t-0"
          :class="{
            'bg-brand-50': campaign.id === modelValue,
          }"
          @click.stop="selectCampaign(campaign.id)"
        >
          <div
            class="w-2 h-2 rounded-full shrink-0"
            :class="campaign.id === modelValue ? 'bg-brand-500' : 'bg-neutral-300'"
          />
          <div class="flex-1 min-w-0">
            <h4 class="font-medium text-primary truncate">
              {{ campaign.name }}
            </h4>
            <!-- VTT info if connected, otherwise player count -->
            <p v-if="campaign.vttConnection" class="text-xs text-muted flex items-center gap-1.5">
              <span>Foundry VTT</span>
              <span class="text-neutral-300">•</span>
              <span class="flex items-center gap-1">
                <span
                  class="w-1.5 h-1.5 rounded-full"
                  :class="getVttStatusColor(campaign.vttConnection)"
                />
                {{ getVttStatusLabel(campaign.vttConnection) }}
              </span>
            </p>
            <p v-else class="text-xs text-muted">
              {{ campaign.activeMemberCount }} joueur(s) actif(s)
            </p>
          </div>
          <UIcon
            v-if="campaign.id === modelValue"
            name="i-lucide-check"
            class="size-5 text-brand-500 shrink-0"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
