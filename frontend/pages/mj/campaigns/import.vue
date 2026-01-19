<template>
  <div class="min-h-screen">
    <div class="max-w-300 mx-auto space-y-6">
      <!-- Header -->
      <UCard>
        <div class="flex items-center gap-4">
          <div>
            <UButton
              color="neutral"
              variant="soft"
              size="xl"
              square
              class="group"
              @click="router.push('/mj')"
            >
              <template #leading>
                <UIcon
                  name="i-lucide-arrow-left"
                  class="size-12 transition-transform duration-200 group-hover:-translate-x-1"
                />
              </template>
            </UButton>
          </div>
          <div>
            <h1 class="text-3xl font-bold text-primary">
              Ajouter une campagne
            </h1>
            <p class="text-muted mt-1">
              Importez une campagne depuis votre VTT
            </p>
          </div>
        </div>
      </UCard>

      <!-- Loading State -->
      <UCard v-if="loading">
        <div class="flex items-center justify-center py-12">
          <div class="text-center space-y-4">
            <UIcon
              name="i-lucide-loader-circle"
              class="size-12 text-primary animate-spin mx-auto"
            />
            <p class="text-muted">Synchronisation en cours...</p>
          </div>
        </div>
      </UCard>

      <!-- No VTT Configured -->
      <UCard v-else-if="connections.length === 0">
        <div class="py-12 px-6 text-center space-y-6">
          <div class="space-y-3">
            <UIcon
              name="i-lucide-plug"
              class="size-12 text-neutral-400 mx-auto mb-4"
            />
            <h2 class="text-neutral-400">
              Aucun VTT configuré
            </h2>
            <p class="text-neutral-400 max-w-md mx-auto">
              Pour importer une campagne, vous devez d'abord configurer une
              connexion avec votre Virtual Tabletop (Foundry VTT, Owlbear Rodeo, ou
              TaleSpire).
            </p>
          </div>

          <div class="flex flex-col items-center gap-4 pt-4">
            <h3 class="text-lg font-semibold text-primary">
              Choisissez votre VTT
            </h3>
            <div class="flex flex-wrap gap-3 justify-center">
              <UButton
                label="Foundry VTT"
                icon="i-lucide-dice-6"
                size="lg"
                color="primary"
                @click="handleProviderSelect('foundry')"
              />
              <UButton
                label="Owlbear Rodeo"
                icon="i-lucide-dice-5"
                size="lg"
                color="primary"
                variant="soft"
                disabled
              />
              <UButton
                label="TaleSpire"
                icon="i-lucide-flask-conical"
                size="lg"
                color="primary"
                variant="soft"
                disabled
              />
            </div>
          </div>
        </div>
      </UCard>

      <!-- VTT Configured - Show Available Campaigns -->
      <template v-else>
        <UCard>
          <template #header>
            <div class="flex justify-between items-center">
              <h2 class="text-xl font-semibold text-primary">
                Campagnes disponibles
              </h2>
              <UButton
                label="Ajouter un autre VTT"
                icon="i-lucide-plus"
                color="primary"
                variant="soft"
                @click="showAddVttModal = true"
              />
            </div>
          </template>

          <!-- Campaign List grouped by VTT -->
          <div v-if="availableCampaigns.length > 0" class="space-y-8">
            <div
              v-for="(vttGroup, index) in availableCampaigns"
              :key="vttGroup.connectionId"
            >
              <!-- Separator between VTT groups (not before first one) -->
              <div
                v-if="index > 0"
                class="h-px bg-primary-500 my-8"
              />

              <div class="space-y-4">
                <div class="flex items-center gap-3">
                  <UIcon name="i-lucide-plug" class="size-5 text-primary" />
                  <h3 class="text-lg font-semibold text-secondary">
                    {{ vttGroup.connectionName }}
                  </h3>
                  <UBadge
                    :label="`${vttGroup.campaigns.length} campagne${vttGroup.campaigns.length > 1 ? 's' : ''}`"
                    color="primary"
                    variant="subtle"
                  />
                </div>

                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <UCard
                    v-for="campaign in vttGroup.campaigns"
                    :key="campaign.id"
                    class="hover:ring-2 hover:ring-primary-500 transition-all cursor-pointer"
                    :class="{
                      'opacity-50 pointer-events-none':
                        importing === campaign.id,
                    }"
                  >
                    <div class="space-y-4">
                      <div>
                        <h4 class="text-lg font-semibold text-primary">
                          {{ campaign.name }}
                        </h4>
                        <p
                          v-if="campaign.description"
                          class="text-sm text-muted mt-1"
                        >
                          {{ campaign.description }}
                        </p>
                      </div>

                      <div v-if="campaign.characterCount" class="flex items-center gap-2">
                        <UIcon name="i-lucide-users" class="size-4 text-muted" />
                        <span class="text-sm text-muted">
                          {{ campaign.characterCount }} personnage{{
                            campaign.characterCount > 1 ? "s" : ""
                          }}
                        </span>
                      </div>

                      <UButton
                        label="Importer cette campagne"
                        icon="i-lucide-download"
                        color="primary"
                        block
                        :loading="importing === campaign.id"
                        @click="handleImport(vttGroup.connectionId, campaign)"
                      />
                    </div>
                  </UCard>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State if no campaigns available -->
          <div v-else class="py-12 text-center space-y-4">
            <UIcon
              name="i-lucide-folder-open"
              class="size-16 text-muted mx-auto"
            />
            <div class="space-y-2">
              <h3 class="text-xl font-semibold text-primary">
                Aucune nouvelle campagne disponible
              </h3>
              <p class="text-muted max-w-md mx-auto">
                Toutes vos campagnes VTT ont déjà été importées. Créez une
                nouvelle campagne dans votre VTT ou ajoutez une autre connexion
                VTT.
              </p>
            </div>
          </div>
        </UCard>
      </template>
    </div>

    <!-- Modal: Add VTT Connection -->
    <UModal v-model:open="showAddVttModal">
      <template #header>
        <h3 class="text-xl font-bold text-primary">
          Ajouter une connexion VTT
        </h3>
      </template>

      <template #body>
        <div class="space-y-6">
          <p class="text-secondary">
            Sélectionnez votre Virtual Tabletop pour configurer une nouvelle
            connexion.
          </p>

          <div class="flex flex-col gap-3">
            <UButton
              label="Foundry VTT"
              icon="i-lucide-dice-6"
              size="lg"
              color="primary"
              block
              @click="handleProviderSelectFromModal('foundry')"
            />
            <UButton
              label="Owlbear Rodeo"
              icon="i-lucide-dice-5"
              size="lg"
              color="primary"
              variant="soft"
              block
              disabled
            />
            <UButton
              label="TaleSpire"
              icon="i-lucide-flask-conical"
              size="lg"
              color="primary"
              variant="soft"
              block
              disabled
            />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end">
          <UButton
            color="primary"
            variant="solid"
            label="Annuler"
            @click="showAddVttModal = false"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useVttConnections } from "@/composables/useVttConnections";

definePageMeta({
  layout: "authenticated" as const,
  middleware: ["auth"],
});

const router = useRouter();
const config = useRuntimeConfig();
const { connections, fetchConnections } = useVttConnections();

const loading = ref(true);
const showAddVttModal = ref(false);
const availableCampaigns = ref<VttCampaignGroup[]>([]);
const importing = ref<string | null>(null);

interface VttCampaignGroup {
  connectionId: string;
  connectionName: string;
  campaigns: VttCampaign[];
}

interface VttCampaign {
  id: string;
  name: string;
  description?: string;
  characterCount?: number;
  characters?: Array<{
    id: string;
    name: string;
    type: "pc" | "npc";
    avatarUrl: string | null;
  }>;
}

onMounted(async () => {
  await loadData();
});

const loadData = async () => {
  loading.value = true;
  try {
    // 1. Charger les connexions VTT
    await fetchConnections();

    // 2. Si aucune connexion, stop ici
    if (connections.value.length === 0) {
      loading.value = false;
      return;
    }

    // 3. Sync et récupérer les campagnes disponibles
    await syncAndFetchCampaigns();
  } finally {
    loading.value = false;
  }
};

const syncAndFetchCampaigns = async () => {
  // Fetch available campaigns for each connection
  const promises = connections.value.map(async (conn) => {
    try {
      const response = await fetch(
        `${config.public.apiBase}/mj/vtt-connections/${conn.id}/sync-campaigns`,
        { credentials: "include" },
      );

      if (!response.ok) return null;

      const data = await response.json();
      return {
        connectionId: conn.id,
        connectionName: conn.name,
        campaigns: data.campaigns || [],
      };
    } catch (error) {
      console.error(
        `Failed to sync campaigns for connection ${conn.id}:`,
        error,
      );
      return null;
    }
  });

  const results = await Promise.all(promises);
  availableCampaigns.value = results.filter(
    (r): r is VttCampaignGroup => r !== null,
  );
};

const handleProviderSelect = (providerId: string) => {
  router.push(`/mj/vtt-connections/create?provider=${providerId}`);
};

const handleProviderSelectFromModal = (providerId: string) => {
  showAddVttModal.value = false;
  router.push(`/mj/vtt-connections/create?provider=${providerId}`);
};

const handleImport = async (connectionId: string, campaign: VttCampaign) => {
  importing.value = campaign.id;

  try {
    const response = await fetch(`${config.public.apiBase}/mj/campaigns/import`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vttConnectionId: connectionId,
        vttCampaignId: campaign.id,
        name: campaign.name,
        description: campaign.description,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Import failed");
    }

    // Navigation vers /mj
    router.push("/mj");
  } catch (error) {
    console.error("Failed to import campaign:", error);
    // TODO: Afficher un toast d'erreur
  } finally {
    importing.value = null;
  }
};
</script>
