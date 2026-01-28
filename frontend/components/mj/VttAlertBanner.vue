<script setup lang="ts">
import type { VttHealthStatus } from '~/types'

const props = defineProps<{
  status: VttHealthStatus
  campaignId: string
  campaignName?: string
}>()

// Only show banner for critical issues
const shouldShow = computed(() => {
  return ['error', 'revoked', 'campaign_deleted', 'server_unavailable'].includes(props.status)
})

// Banner configuration based on status
const bannerConfig = computed(() => {
  switch (props.status) {
    case 'revoked':
      return {
        icon: 'i-lucide-unplug',
        color: 'error' as const,
        title: 'Connexion Foundry révoquée',
        message: 'La connexion avec Foundry VTT a été révoquée. Veuillez reconnecter votre module.',
        actionLabel: 'Reconnecter',
        actionTo: `/mj/campaigns/${props.campaignId}`,
      }
    case 'error':
      return {
        icon: 'i-lucide-alert-triangle',
        color: 'error' as const,
        title: 'Erreur de connexion Foundry',
        message:
          "Une erreur s'est produite avec la connexion Foundry. Vérifiez votre configuration.",
        actionLabel: 'Voir la campagne',
        actionTo: `/mj/campaigns/${props.campaignId}`,
      }
    case 'campaign_deleted':
      return {
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        title: 'Campagne supprimée',
        message: "La campagne liée à cette connexion n'existe plus.",
        actionLabel: 'Voir les campagnes',
        actionTo: '/mj/campaigns',
      }
    case 'server_unavailable':
      return {
        icon: 'i-lucide-cloud-off',
        color: 'warning' as const,
        title: 'Serveur Tumulte indisponible',
        message:
          'Le serveur est temporairement indisponible. Vos données seront synchronisées automatiquement.',
        actionLabel: null,
        actionTo: null,
      }
    default:
      return {
        icon: 'i-lucide-info',
        color: 'info' as const,
        title: 'Information',
        message: '',
        actionLabel: null,
        actionTo: null,
      }
  }
})
</script>

<template>
  <UAlert
    v-if="shouldShow"
    :icon="bannerConfig.icon"
    :color="bannerConfig.color"
    :title="bannerConfig.title"
    :description="bannerConfig.message"
    variant="subtle"
    class="mb-4"
  >
    <template v-if="bannerConfig.actionLabel && bannerConfig.actionTo" #actions>
      <UButton
        :to="bannerConfig.actionTo"
        :label="bannerConfig.actionLabel"
        :color="bannerConfig.color"
        variant="solid"
        size="xs"
      />
    </template>
  </UAlert>
</template>
