<template>
  <div class="min-h-screen">
    <div class="max-w-300 mx-auto space-y-6">
      <!-- Header -->
      <UCard>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <UButton
              color="neutral"
              variant="soft"
              size="xl"
              square
              class="group"
              @click="_router.push('/mj')"
            >
              <template #leading>
                <UIcon
                  name="i-lucide-arrow-left"
                  class="size-12 transition-transform duration-200 group-hover:-translate-x-1"
                />
              </template>
            </UButton>
            <div>
              <h1 class="text-3xl font-bold text-primary">
                Connexions VTT
              </h1>
              <p class="text-muted mt-1">
                Gérez vos connexions avec Foundry VTT
              </p>
            </div>
          </div>
          <UButton
            color="primary"
            icon="i-lucide-plus"
            label="Nouvelle connexion"
            @click="openPairingModal"
          />
        </div>
      </UCard>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary" />
      </div>

      <!-- Connections List -->
      <div v-else-if="connections.length > 0" class="space-y-4">
        <UCard
          v-for="connection in connections"
          :key="connection.id"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <!-- Status Indicator -->
              <div
                class="size-3 rounded-full"
                :class="{
                  'bg-success-500': connection.tunnelStatus === 'connected',
                  'bg-warning-500 animate-pulse': connection.tunnelStatus === 'connecting',
                  'bg-neutral-300': connection.tunnelStatus === 'disconnected',
                  'bg-error-500': connection.tunnelStatus === 'error',
                }"
              />

              <div>
                <h3 class="font-semibold text-primary">{{ connection.name }}</h3>
                <div class="flex items-center gap-3 text-sm text-muted">
                  <span class="flex items-center gap-1">
                    <UIcon name="i-lucide-globe" class="size-4" />
                    {{ connection.worldName || 'Unknown World' }}
                  </span>
                  <span v-if="connection.moduleVersion" class="flex items-center gap-1">
                    <UIcon name="i-lucide-tag" class="size-4" />
                    v{{ connection.moduleVersion }}
                  </span>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <!-- Status Badge -->
              <UBadge
                :color="getStatusColor(connection.tunnelStatus)"
                variant="soft"
              >
                {{ getStatusLabel(connection.tunnelStatus) }}
              </UBadge>

              <!-- Actions -->
              <UDropdown :items="getConnectionActions(connection)">
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-more-vertical"
                  square
                />
              </UDropdown>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Empty State -->
      <UCard v-else>
        <div class="text-center py-12">
          <UIcon name="i-lucide-plug-2" class="size-16 text-neutral-300 mx-auto mb-4" />
          <h3 class="text-xl font-semibold text-primary mb-2">Aucune connexion VTT</h3>
          <p class="text-muted mb-6">
            Connectez votre Foundry VTT pour synchroniser vos campagnes et lancés de dés.
          </p>
          <UButton
            color="primary"
            icon="i-lucide-plus"
            label="Connecter un VTT"
            @click="openPairingModal"
          />
        </div>
      </UCard>

      <!-- Pairing Modal -->
      <UModal v-model:open="pairingModalOpen">
        <template #content>
          <UCard>
            <template #header>
              <div class="flex items-center justify-between">
                <h2 class="text-xl font-semibold text-primary">Connecter Foundry VTT</h2>
                <UButton
                  color="neutral"
                  variant="ghost"
                  icon="i-lucide-x"
                  square
                  @click="closePairingModal"
                />
              </div>
            </template>

            <div class="space-y-6">
              <!-- Step 1: Choose method -->
              <div v-if="pairingStep === 'choose'" class="space-y-4">
                <p class="text-muted">
                  Choisissez comment connecter votre Foundry VTT :
                </p>

                <div class="grid gap-4">
                  <!-- Code Method -->
                  <button
                    class="p-4 rounded-lg border-2 border-neutral-200 hover:border-primary-500 transition-colors text-left"
                    @click="startCodePairing"
                  >
                    <div class="flex items-center gap-3">
                      <div class="p-2 rounded-lg bg-primary-100">
                        <UIcon name="i-lucide-keyboard" class="size-6 text-primary" />
                      </div>
                      <div>
                        <h4 class="font-semibold text-primary">Entrer un code</h4>
                        <p class="text-sm text-muted">
                          Entrez le code affiché dans Foundry VTT
                        </p>
                      </div>
                    </div>
                  </button>

                  <!-- URL Method -->
                  <button
                    class="p-4 rounded-lg border-2 border-neutral-200 hover:border-primary-500 transition-colors text-left"
                    @click="_router.push('/mj/vtt-connections/create')"
                  >
                    <div class="flex items-center gap-3">
                      <div class="p-2 rounded-lg bg-neutral-100">
                        <UIcon name="i-lucide-link" class="size-6 text-neutral-600" />
                      </div>
                      <div>
                        <h4 class="font-semibold text-primary">Coller une URL</h4>
                        <p class="text-sm text-muted">
                          Collez l'URL de connexion générée par le module
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <!-- Step 2: Enter code -->
              <div v-if="pairingStep === 'code'" class="space-y-6">
                <UAlert
                  color="primary"
                  variant="soft"
                  icon="i-lucide-info"
                >
                  <template #description>
                    <ol class="list-decimal list-inside space-y-2 mt-2">
                      <li>Ouvrez Foundry VTT</li>
                      <li>Allez dans les paramètres du module Tumulte</li>
                      <li>Cliquez sur "Connecter à Tumulte"</li>
                      <li>Entrez le code affiché ci-dessous</li>
                    </ol>
                  </template>
                </UAlert>

                <!-- Code Input -->
                <div>
                  <label class="block text-sm font-bold text-secondary ml-4 uppercase mb-2">
                    Code de connexion
                  </label>
                  <UInput
                    v-model="pairingCode"
                    type="text"
                    placeholder="ABC-123"
                    size="xl"
                    :disabled="pairingInProgress"
                    :ui="{
                      root: 'ring-0 border-0 rounded-lg overflow-hidden',
                      base: 'px-6 py-4 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg font-mono text-2xl text-center tracking-widest uppercase',
                    }"
                    @input="formatPairingCode"
                  />
                  <p v-if="pairingError" class="text-xs text-error-500 mt-2 ml-4">
                    {{ pairingError }}
                  </p>
                </div>

                <!-- Submit Button -->
                <div class="flex gap-3">
                  <UButton
                    color="neutral"
                    variant="soft"
                    label="Retour"
                    :disabled="pairingInProgress"
                    @click="pairingStep = 'choose'"
                  />
                  <UButton
                    color="primary"
                    label="Connecter"
                    icon="i-lucide-check"
                    :loading="pairingInProgress"
                    :disabled="!isCodeValid"
                    class="flex-1"
                    @click="submitPairingCode"
                  />
                </div>
              </div>

              <!-- Step 3: Success -->
              <div v-if="pairingStep === 'success'" class="text-center py-6">
                <div class="size-16 rounded-full bg-success-100 flex items-center justify-center mx-auto mb-4">
                  <UIcon name="i-lucide-check" class="size-8 text-success-500" />
                </div>
                <h3 class="text-xl font-semibold text-primary mb-2">Connexion établie !</h3>
                <p class="text-muted mb-6">
                  {{ pairingResult?.connection?.name || 'Votre VTT' }} est maintenant connecté.
                </p>
                <UButton
                  color="primary"
                  label="Fermer"
                  @click="closePairingModal"
                />
              </div>
            </div>
          </UCard>
        </template>
      </UModal>

      <!-- Revoke Confirmation Modal -->
      <UModal v-model:open="revokeModalOpen">
        <template #content>
          <UCard>
            <template #header>
              <h2 class="text-xl font-semibold text-error">Révoquer la connexion</h2>
            </template>
            <p class="text-muted">
              Êtes-vous sûr de vouloir révoquer la connexion
              <strong>{{ connectionToRevoke?.name }}</strong> ?
            </p>
            <p class="text-sm text-muted mt-2">
              Cette action déconnectera immédiatement le VTT et invalidera tous les tokens.
            </p>
            <template #footer>
              <div class="flex justify-end gap-3">
                <UButton
                  color="neutral"
                  variant="soft"
                  label="Annuler"
                  @click="revokeModalOpen = false"
                />
                <UButton
                  color="error"
                  label="Révoquer"
                  icon="i-lucide-trash-2"
                  :loading="revoking"
                  @click="confirmRevoke"
                />
              </div>
            </template>
          </UCard>
        </template>
      </UModal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "#ui/composables/useToast";

definePageMeta({
  layout: "authenticated" as const,
  middleware: ["auth"],
});

interface VttConnection {
  id: string;
  name: string;
  worldId: string | null;
  worldName: string | null;
  moduleVersion: string | null;
  status: "pending" | "active" | "expired" | "revoked";
  tunnelStatus: "disconnected" | "connecting" | "connected" | "error";
  provider?: {
    id: string;
    name: string;
  };
}

const _router = useRouter();
const toast = useToast();
const config = useRuntimeConfig();

// State
const loading = ref(true);
const connections = ref<VttConnection[]>([]);

// Pairing modal state
const pairingModalOpen = ref(false);
const pairingStep = ref<"choose" | "code" | "success">("choose");
const pairingCode = ref("");
const pairingInProgress = ref(false);
const pairingError = ref("");
const pairingResult = ref<{ connection?: VttConnection } | null>(null);

// Revoke modal state
const revokeModalOpen = ref(false);
const connectionToRevoke = ref<VttConnection | null>(null);
const revoking = ref(false);

// Computed
const isCodeValid = computed(() => {
  const code = pairingCode.value.replace(/[^A-Z0-9]/gi, "");
  return code.length === 6;
});

// Methods
const fetchConnections = async () => {
  loading.value = true;
  try {
    const response = await fetch(`${config.public.apiBase}/mj/vtt-connections`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch connections");
    }

    connections.value = await response.json();
  } catch (error) {
    console.error("Failed to fetch connections:", error);
    toast.add({
      title: "Erreur",
      description: "Impossible de charger les connexions",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
};

const openPairingModal = () => {
  pairingStep.value = "choose";
  pairingCode.value = "";
  pairingError.value = "";
  pairingResult.value = null;
  pairingModalOpen.value = true;
};

const closePairingModal = () => {
  pairingModalOpen.value = false;
  if (pairingStep.value === "success") {
    fetchConnections();
  }
};

const startCodePairing = () => {
  pairingStep.value = "code";
};

const formatPairingCode = () => {
  // Auto-format as ABC-123
  let value = pairingCode.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (value.length > 3) {
    value = value.slice(0, 3) + "-" + value.slice(3, 6);
  }
  pairingCode.value = value;
};

const submitPairingCode = async () => {
  if (!isCodeValid.value) return;

  pairingInProgress.value = true;
  pairingError.value = "";

  try {
    const response = await fetch(`${config.public.apiBase}/mj/vtt-connections/pair-with-code`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: pairingCode.value,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Échec de la connexion");
    }

    const data = await response.json();
    pairingResult.value = data;
    pairingStep.value = "success";

    toast.add({
      title: "Connexion établie",
      description: data.message || "Le VTT est maintenant connecté",
      color: "success",
    });
  } catch (error: unknown) {
    console.error("Failed to pair:", error);
    pairingError.value = error instanceof Error ? error.message : "Erreur inconnue";
    toast.add({
      title: "Erreur",
      description: pairingError.value,
      color: "error",
    });
  } finally {
    pairingInProgress.value = false;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "connected":
      return "success";
    case "connecting":
      return "warning";
    case "error":
      return "error";
    default:
      return "neutral";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "connected":
      return "Connecté";
    case "connecting":
      return "Connexion...";
    case "error":
      return "Erreur";
    default:
      return "Déconnecté";
  }
};

const getConnectionActions = (connection: VttConnection) => [
  [
    {
      label: "Voir les détails",
      icon: "i-lucide-eye",
      click: () => _router.push(`/mj/vtt-connections/${connection.id}`),
    },
    {
      label: "Synchroniser",
      icon: "i-lucide-refresh-cw",
      click: () => syncConnection(connection.id),
    },
  ],
  [
    {
      label: "Révoquer",
      icon: "i-lucide-trash-2",
      color: "error" as const,
      click: () => openRevokeModal(connection),
    },
  ],
];

const syncConnection = async (connectionId: string) => {
  try {
    const response = await fetch(
      `${config.public.apiBase}/mj/vtt-connections/${connectionId}/sync-campaigns`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error("Sync failed");
    }

    toast.add({
      title: "Synchronisation",
      description: "Synchronisation lancée",
      color: "success",
    });
  } catch (error) {
    console.error("Failed to sync:", error);
    toast.add({
      title: "Erreur",
      description: "Impossible de synchroniser",
      color: "error",
    });
  }
};

const openRevokeModal = (connection: VttConnection) => {
  connectionToRevoke.value = connection;
  revokeModalOpen.value = true;
};

const confirmRevoke = async () => {
  if (!connectionToRevoke.value) return;

  revoking.value = true;

  try {
    const response = await fetch(
      `${config.public.apiBase}/mj/vtt-connections/${connectionToRevoke.value.id}/revoke`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Revoked by user from dashboard",
        }),
      }
    );

    if (!response.ok) {
      throw new Error("Revoke failed");
    }

    toast.add({
      title: "Connexion révoquée",
      description: "La connexion a été révoquée avec succès",
      color: "success",
    });

    revokeModalOpen.value = false;
    fetchConnections();
  } catch (error) {
    console.error("Failed to revoke:", error);
    toast.add({
      title: "Erreur",
      description: "Impossible de révoquer la connexion",
      color: "error",
    });
  } finally {
    revoking.value = false;
  }
};

// Lifecycle
onMounted(() => {
  fetchConnections();
});
</script>
