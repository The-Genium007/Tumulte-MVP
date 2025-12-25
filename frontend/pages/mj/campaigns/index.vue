<template>
    <div class="min-h-screen py-6">
      <div class="space-y-6">
        <!-- Header with back button -->
        <div class="flex items-center gap-4">
          <UButton
            variant="soft"
            color="neutral"
            icon="i-lucide-arrow-left"
            label="Retour au dashboard"
            @click="router.push('/mj')"
          />
        </div>

        <!-- Loading State -->
        <div
          v-if="loading"
          class="flex flex-col items-center justify-center py-16"
        >
          <UIcon
            name="i-lucide-loader"
            class="size-12 text-primary-500 animate-spin mb-4"
          />
          <p class="text-gray-400">Chargement des campagnes...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="campaigns.length === 0" class="text-center py-16">
          <div class="bg-primary-500/10 p-6 rounded-2xl mb-6 inline-block">
            <UIcon name="i-lucide-folder-plus" class="size-16 text-primary-500" />
          </div>
          <h2 class="text-2xl font-bold text-white mb-2">Aucune campagne créée</h2>
          <p class="text-gray-400 mb-6 max-w-md mx-auto">
            Créez votre première campagne pour commencer à gérer vos sondages
            multi-streams
          </p>
          <UButton
            color="primary"
            size="lg"
            icon="i-lucide-plus"
            label="Créer ma première campagne"
            @click="router.push('/mj/campaigns/create')"
          />
        </div>

        <!-- Campaigns Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <UCard
            v-for="campaign in campaigns"
            :key="campaign.id"
            class="group hover:ring-2 hover:ring-primary-500 transition-all"
          >
            <template #header>
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h3
                    class="text-xl font-bold text-white group-hover:text-primary-400 transition-colors"
                  >
                    {{ campaign.name }}
                  </h3>
                  <p
                    v-if="campaign.description"
                    class="text-sm text-gray-400 mt-1 line-clamp-2"
                  >
                    {{ campaign.description }}
                  </p>
                </div>
                <div class="bg-primary-500/10 p-2 rounded-lg">
                  <UIcon
                    name="i-lucide-folder-kanban"
                    class="size-5 text-primary-500"
                  />
                </div>
              </div>
            </template>

            <!-- Stats -->
            <div class="grid grid-cols-2 gap-4 my-4">
              <div class="text-center p-3 bg-green-500/10 rounded-lg">
                <p class="text-2xl font-bold text-green-400">
                  {{ campaign.active_member_count || 0 }}
                </p>
                <p class="text-xs text-gray-400 mt-1">Membres actifs</p>
              </div>
              <div class="text-center p-3 bg-blue-500/10 rounded-lg">
                <p class="text-2xl font-bold text-blue-400">
                  {{ campaign.member_count || 0 }}
                </p>
                <p class="text-xs text-gray-400 mt-1">Total invités</p>
              </div>
            </div>

            <template #footer>
              <div class="flex gap-2" @click.stop>
                <UButton
                  color="primary"
                  size="sm"
                  icon="i-lucide-users"
                  label="Voir les membres"
                  block
                  @click="router.push(`/mj/campaigns/${campaign.id}`)"
                />
                <UButton
                  color="red"
                  variant="soft"
                  size="sm"
                  icon="i-lucide-trash-2"
                  square
                  @click="handleDelete(campaign.id)"
                />
              </div>
            </template>
          </UCard>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "authenticated" as const,
});
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useCampaigns } from "@/composables/useCampaigns";

const router = useRouter();
const toast = useToast();
const { campaigns, loading, fetchCampaigns, deleteCampaign } = useCampaigns();

onMounted(async () => {
  await fetchCampaigns();
});

const handleDelete = async (id: string) => {
  if (
    !confirm(
      "Êtes-vous sûr de vouloir supprimer cette campagne ? Tous les templates et sondages seront supprimés.",
    )
  ) {
    return;
  }

  try {
    await deleteCampaign(id);
    toast.add({
      title: "Succès",
      description: "Campagne supprimée avec succès",
      color: "green",
    });
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible de supprimer la campagne",
      color: "red",
    });
  }
};
</script>
