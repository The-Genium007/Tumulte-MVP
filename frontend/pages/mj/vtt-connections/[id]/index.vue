<template>
  <div class="min-h-screen">
    <div class="max-w-300 mx-auto space-y-6">
      <!-- Header -->
      <UCard>
        <div class="flex items-center gap-4">
          <div>
            <!-- Bouton retour -->
            <UButton
              color="neutral"
              variant="soft"
              size="xl"
              square
              class="group"
              @click="_router.push('/mj/vtt-connections')"
            >
              <template #leading>
                <UIcon
                  name="i-lucide-arrow-left"
                  class="size-12 transition-transform duration-200 group-hover:-translate-x-1"
                />
              </template>
            </UButton>
          </div>
          <div class="flex-1">
            <h1 class="text-3xl font-bold text-primary">
              {{ connection?.name || "Chargement..." }}
            </h1>
            <p class="text-muted mt-1">
              {{
                connection?.provider?.displayName || "Provider VTT"
              }}
            </p>
          </div>
          <UBadge
            v-if="connection"
            :color="getStatusColor(connection.status)"
            size="lg"
          >
            {{ getStatusLabel(connection.status) }}
          </UBadge>
        </div>
      </UCard>

      <!-- Loading State -->
      <div v-if="loading" class="flex justify-center py-12">
        <UIcon
          name="i-lucide-loader-circle"
          class="size-8 animate-spin text-primary"
        />
      </div>

      <template v-else-if="connection">
        <!-- Authentication Token Card -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-primary">Clé d'authentification</h2>
              <UButton
                color="neutral"
                variant="soft"
                icon="i-lucide-refresh-cw"
                label="Régénérer"
                :loading="regenerating"
                @click="handleRegenerateKey"
              />
            </div>
          </template>

          <div class="space-y-4">
            <!-- Token Display -->
            <div>
              <label
                class="block text-sm font-bold text-secondary ml-4 uppercase mb-2"
              >
                Token d'accès
              </label>
              <div class="flex gap-2">
                <UInput
                  :model-value="
                    showToken ? getConnectionToken(connection) : '••••••••••••••••'
                  "
                  readonly
                  size="lg"
                  class="flex-1"
                  :ui="{
                    root: 'ring-0 border-0 rounded-lg overflow-hidden',
                    base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 rounded-lg font-mono',
                  }"
                />
                <UButton
                  :icon="showToken ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  color="neutral"
                  variant="soft"
                  size="lg"
                  square
                  @click="showToken = !showToken"
                />
                <UButton
                  icon="i-lucide-copy"
                  color="neutral"
                  variant="soft"
                  size="lg"
                  square
                  @click="copyToken"
                />
              </div>
            </div>

            <!-- Webhook URL -->
            <div>
              <label
                class="block text-sm font-bold text-secondary ml-4 uppercase mb-2"
              >
                URL du Webhook
              </label>
              <UInput
                :model-value="connection.webhookUrl"
                readonly
                size="lg"
                :ui="{
                  root: 'ring-0 border-0 rounded-lg overflow-hidden',
                  base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 rounded-lg',
                }"
              />
            </div>

            <!-- Last Webhook -->
            <div v-if="connection.lastWebhookAt">
              <label
                class="block text-sm font-bold text-secondary ml-4 uppercase mb-2"
              >
                Dernier webhook reçu
              </label>
              <p class="text-muted ml-4">
                {{ new Date(connection.lastWebhookAt).toLocaleString() }}
              </p>
            </div>
          </div>

          <!-- Instructions Alert -->
          <UAlert
            color="primary"
            variant="soft"
            title="Configuration du module"
            icon="i-lucide-info"
            class="mt-6"
          >
            <template #description>
              <div class="space-y-2 text-sm">
                <p>
                  Copiez le token ci-dessus et configurez-le dans votre
                  module VTT :
                </p>
                <ul class="list-disc list-inside space-y-1 ml-2">
                  <li>
                    <strong>Foundry VTT</strong> : Game Settings → Tumulte
                    Integration
                  </li>
                  <li>
                    <strong>Owlbear Rodeo</strong> : Extensions → Tumulte Settings
                  </li>
                  <li>
                    <strong>TaleSpire</strong> : Symbiotes → Tumulte
                    Configuration
                  </li>
                </ul>
              </div>
            </template>
          </UAlert>
        </UCard>

        <!-- Tunnel Status Card -->
        <UCard v-if="connection.worldId">
          <template #header>
            <div class="flex items-center justify-between">
              <h2 class="text-xl font-semibold text-primary">Tunnel sécurisé</h2>
              <UBadge
                :color="getTunnelStatusColor(connection.tunnelStatus)"
                size="lg"
              >
                {{ getTunnelStatusLabel(connection.tunnelStatus) }}
              </UBadge>
            </div>
          </template>

          <div class="space-y-4">
            <!-- World Information -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-bold text-secondary ml-4 uppercase mb-2">
                  Monde VTT
                </label>
                <p class="text-primary ml-4">{{ connection.worldName }}</p>
              </div>
              <div>
                <label class="block text-sm font-bold text-secondary ml-4 uppercase mb-2">
                  ID du Monde
                </label>
                <p class="text-muted ml-4 font-mono text-sm">{{ connection.worldId }}</p>
              </div>
              <div v-if="connection.moduleVersion">
                <label class="block text-sm font-bold text-secondary ml-4 uppercase mb-2">
                  Version du Module
                </label>
                <p class="text-muted ml-4">{{ connection.moduleVersion }}</p>
              </div>
              <div v-if="connection.lastHeartbeatAt">
                <label class="block text-sm font-bold text-secondary ml-4 uppercase mb-2">
                  Dernier Heartbeat
                </label>
                <p class="text-muted ml-4">
                  {{ new Date(connection.lastHeartbeatAt).toLocaleString() }}
                </p>
              </div>
            </div>

            <!-- Connection Status Alert -->
            <UAlert
              v-if="connection.tunnelStatus === 'connected'"
              color="success"
              variant="soft"
              icon="i-lucide-check-circle"
              title="Tunnel actif"
              description="La connexion sécurisée avec votre VTT est établie et fonctionnelle."
            />
            <UAlert
              v-else-if="connection.tunnelStatus === 'connecting'"
              color="warning"
              variant="soft"
              icon="i-lucide-loader-circle"
              title="Connexion en cours"
              description="Le tunnel est en cours d'établissement avec votre VTT."
            />
            <UAlert
              v-else-if="connection.tunnelStatus === 'error'"
              color="error"
              variant="soft"
              icon="i-lucide-alert-circle"
              title="Erreur de connexion"
              description="Le tunnel a rencontré une erreur. Vérifiez que votre VTT est bien en ligne."
            />
            <UAlert
              v-else
              color="neutral"
              variant="soft"
              icon="i-lucide-unplug"
              title="Déconnecté"
              description="Le tunnel n'est pas actuellement actif. Lancez votre VTT pour établir la connexion."
            />

            <!-- Revoke Connection -->
            <div v-if="connection.status !== 'revoked'" class="pt-4 border-t border-gray-200">
              <h3 class="font-semibold text-primary mb-2">
                Révoquer la connexion
              </h3>
              <p class="text-sm text-muted mb-4">
                Cela mettra fin au tunnel sécurisé et notifiera votre VTT. La connexion ne pourra plus être utilisée.
              </p>
              <UButton
                color="warning"
                label="Révoquer la connexion"
                icon="i-lucide-shield-off"
                :loading="revoking"
                @click="handleRevoke"
              />
            </div>
          </div>
        </UCard>

        <!-- Campaigns Card -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold text-primary">
              Campagnes liées ({{ campaigns.length }})
            </h2>
          </template>

          <!-- Empty State -->
          <div v-if="campaigns.length === 0" class="text-center py-8">
            <UIcon
              name="i-lucide-folder"
              class="size-12 text-muted mx-auto mb-3"
            />
            <p class="text-muted">
              Aucune campagne n'utilise encore cette connexion VTT
            </p>
          </div>

          <!-- Campaigns List -->
          <div v-else class="space-y-3">
            <div
              v-for="campaign in campaigns"
              :key="campaign.id"
              class="p-4 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors cursor-pointer"
              @click="_router.push(`/mj/campaigns/${campaign.id}`)"
            >
              <div class="flex items-center justify-between">
                <div>
                  <h3 class="font-semibold text-primary">
                    {{ campaign.name }}
                  </h3>
                  <p class="text-xs text-muted mt-1">
                    Créée le
                    {{ new Date(campaign.createdAt).toLocaleDateString() }}
                  </p>
                </div>
                <UIcon
                  name="i-lucide-chevron-right"
                  class="size-5 text-muted"
                />
              </div>
            </div>
          </div>
        </UCard>

        <!-- Danger Zone -->
        <UCard>
          <template #header>
            <h2 class="text-xl font-semibold text-error-500">Zone de danger</h2>
          </template>

          <div class="space-y-4">
            <div>
              <h3 class="font-semibold text-primary mb-2">
                Supprimer la connexion
              </h3>
              <p class="text-sm text-muted mb-4">
                Cette action est irréversible. La connexion sera supprimée
                définitivement.
              </p>
              <UButton
                color="error"
                label="Supprimer la connexion"
                icon="i-lucide-trash-2"
                :loading="deleting"
                :disabled="campaigns.length > 0"
                @click="handleDelete"
              />
              <p v-if="campaigns.length > 0" class="text-xs text-error-500 mt-2">
                Impossible de supprimer : {{ campaigns.length }} campagne(s)
                liée(s)
              </p>
            </div>
          </div>
        </UCard>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useVttConnections, type VttConnection } from "@/composables/useVttConnections";
import { useToast } from "#ui/composables/useToast";

definePageMeta({
  layout: "authenticated" as const,
  middleware: ["auth"],
});

const _router = useRouter();
const route = useRoute();
const { getConnectionDetails, deleteConnection, regenerateApiKey } =
  useVttConnections();
const toast = useToast();

const connection = ref<VttConnection | null>(null);
const campaigns = ref<Array<{ id: string; name: string; createdAt: string }>>([]);
const loading = ref(false);
const showToken = ref(false);
const regenerating = ref(false);
const deleting = ref(false);
const revoking = ref(false);

const config = useRuntimeConfig();

const getConnectionToken = (conn: VttConnection) => conn.apiKey;

onMounted(async () => {
  loading.value = true;
  try {
    const data = await getConnectionDetails(route.params.id as string);
    connection.value = data.connection;
    campaigns.value = data.campaigns;
  } catch (error) {
    console.error("Failed to fetch VTT connection:", error);
    toast.add({
      title: "Erreur",
      description: "Impossible de charger la connexion VTT",
      color: "error",
    });
    _router.push("/mj/vtt-connections");
  } finally {
    loading.value = false;
  }
});

const getStatusColor = (
  status: string,
): "success" | "warning" | "error" | "neutral" => {
  switch (status) {
    case "active":
      return "success";
    case "pending":
      return "warning";
    case "expired":
    case "revoked":
      return "error";
    default:
      return "neutral";
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case "active":
      return "Active";
    case "pending":
      return "En attente";
    case "expired":
      return "Expirée";
    case "revoked":
      return "Révoquée";
    default:
      return status;
  }
};

const copyToken = async () => {
  if (!connection.value) return;

  try {
    await navigator.clipboard.writeText(getConnectionToken(connection.value));
    toast.add({
      title: "Copié",
      description: "Token copié dans le presse-papiers",
      color: "success",
    });
  } catch (error) {
    console.error("Failed to copy token:", error);
    toast.add({
      title: "Erreur",
      description: "Impossible de copier le token",
      color: "error",
    });
  }
};

const handleRegenerateKey = async () => {
  if (!connection.value) return;

  regenerating.value = true;
  try {
    const updated = await regenerateApiKey(connection.value.id);
    connection.value = updated;
    toast.add({
      title: "Token régénéré",
      description: "Le nouveau token a été généré avec succès",
      color: "success",
    });
  } catch (error) {
    console.error("Failed to regenerate token:", error);
    toast.add({
      title: "Erreur",
      description: "Impossible de régénérer le token",
      color: "error",
    });
  } finally {
    regenerating.value = false;
  }
};

const handleDelete = async () => {
  if (!connection.value) return;

  deleting.value = true;
  try {
    await deleteConnection(connection.value.id);
    toast.add({
      title: "Connexion supprimée",
      description: "La connexion VTT a été supprimée avec succès",
      color: "success",
    });
    _router.push("/mj/vtt-connections");
  } catch (error: unknown) {
    console.error("Failed to delete connection:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Erreur inconnue";
    toast.add({
      title: "Erreur",
      description: errorMessage,
      color: "error",
    });
  } finally {
    deleting.value = false;
  }
};

const getTunnelStatusColor = (
  status?: string,
): "success" | "warning" | "error" | "neutral" => {
  switch (status) {
    case "connected":
      return "success";
    case "connecting":
      return "warning";
    case "error":
      return "error";
    case "disconnected":
    default:
      return "neutral";
  }
};

const getTunnelStatusLabel = (status?: string): string => {
  switch (status) {
    case "connected":
      return "Connecté";
    case "connecting":
      return "Connexion...";
    case "error":
      return "Erreur";
    case "disconnected":
      return "Déconnecté";
    default:
      return status || "Inconnu";
  }
};

const handleRevoke = async () => {
  if (!connection.value) return;

  revoking.value = true;
  try {
    const response = await fetch(
      `${config.public.apiBase}/mj/vtt-connections/${connection.value.id}/revoke`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: "Révoqué par l'utilisateur depuis l'interface Tumulte",
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Échec de la révocation");
    }

    toast.add({
      title: "Connexion révoquée",
      description: "La connexion a été révoquée avec succès",
      color: "success",
    });

    // Recharger les données de la connexion
    const data = await getConnectionDetails(route.params.id as string);
    connection.value = data.connection;
    campaigns.value = data.campaigns;
  } catch (error: unknown) {
    console.error("Failed to revoke connection:", error);
    toast.add({
      title: "Erreur",
      description:
        error instanceof Error ? error.message : "Impossible de révoquer la connexion",
      color: "error",
    });
  } finally {
    revoking.value = false;
  }
};
</script>
