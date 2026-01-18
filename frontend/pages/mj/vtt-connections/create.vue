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
              @click="_router.push('/mj/campaigns/import')"
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
              Connecter un VTT
            </h1>
            <p class="text-muted mt-1">
              Établissez une connexion sécurisée avec votre Virtual Tabletop
            </p>
          </div>
        </div>
      </UCard>

      <!-- Form Card -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-primary">
              URL de connexion
            </h2>
            <button
              class="flex items-center justify-center size-8 rounded-full bg-primary-100 hover:bg-primary-200 transition-colors"
              title="Informations de sécurité"
              @click="showSecurityModal = true"
            >
              <UIcon name="i-lucide-info" class="size-5 text-primary-400"/>
            </button>
          </div>
        </template>

        <div class="space-y-6">
          <!-- Instructions -->
          <UAlert
            color="primary"
            variant="soft"
            icon="i-lucide-info"
            title="Comment obtenir l'URL de connexion ?"
          >
            <template #description>
              <ol class="list-decimal list-inside space-y-2 mt-2">
                <li>Installez le module Tumulte dans votre VTT (Foundry, Roll20, ou Alchemy RPG)</li>
                <li>Ouvrez les paramètres du module</li>
                <li>Cliquez sur "Générer URL de connexion"</li>
                <li>Copiez l'URL et collez-la ci-dessous</li>
              </ol>
            </template>
          </UAlert>

          <!-- Dev Mode Helper -->
          <UAlert
            v-if="isDev"
            color="primary"
            variant="soft"
            icon="i-lucide-code"
            title="Mode Développement"
          >
            <template #description>
              <p class="text-xs mb-2">
                URL de test à copier-coller pour simuler une connexion VTT :
              </p>
              <div class="flex items-center gap-2">
                <code class="text-xs bg-primary-200 px-2 py-1 rounded font-mono break-all flex-1">
                  {{ mockPairingUrl }}
                </code>
                <UButton
                  icon="i-lucide-copy"
                  color="primary"
                  variant="soft"
                  size="xs"
                  @click="copyMockUrl"
                />
              </div>
            </template>
          </UAlert>

          <!-- URL Input -->
          <div class="w-full lg:w-2/3">
            <label class="block text-sm font-bold text-secondary ml-4 uppercase mb-2">
              URL de connexion <span class="text-error-500">*</span>
            </label>
            <UInput
              v-model="pairingUrl"
              type="text"
              placeholder="foundry://connect?token=..."
              size="lg"
              :disabled="testing || pairing"
              :ui="{
                root: 'ring-0 border-0 rounded-lg overflow-hidden',
                base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg font-mono text-sm',
              }"
            />
            <p v-if="urlError" class="text-xs text-error-500 mt-2 ml-4">
              {{ urlError }}
            </p>
          </div>

          <!-- Test Connection Button -->
          <div v-if="!testResult && !pairingSuccess" class="flex gap-3">
            <UButton
              color="primary"
              variant="soft"
              label="Tester la connexion"
              icon="i-lucide-plug-zap"
              size="lg"
              :loading="testing"
              :disabled="!isUrlValid || pairing"
              @click="handleTestConnection"
            />
          </div>

          <!-- Test Result - Success -->
          <UAlert
            v-if="testResult?.success"
            color="success"
            variant="soft"
            icon="i-lucide-check-circle"
            title="Connexion réussie !"
          >
            <template #description>
              <div class="space-y-2 mt-2">
                <div class="flex items-center gap-2">
                  <span class="font-semibold">Monde :</span>
                  <span>{{ testResult.worldInfo?.name }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-semibold">ID :</span>
                  <span class="font-mono text-xs">{{ testResult.worldInfo?.id }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-semibold">Version :</span>
                  <span>{{ testResult.worldInfo?.version }}</span>
                </div>
              </div>
            </template>
          </UAlert>

          <!-- Test Result - Error -->
          <UAlert
            v-if="testResult?.success === false"
            color="error"
            variant="soft"
            icon="i-lucide-alert-circle"
            title="Échec de la connexion"
          >
            <template #description>
              <p class="mt-2">{{ testResult.error }}</p>
            </template>
          </UAlert>

          <!-- Pairing Success -->
          <UAlert
            v-if="pairingSuccess"
            color="success"
            variant="soft"
            icon="i-lucide-check-circle-2"
            title="Connexion établie avec succès !"
          >
            <template #description>
              <p class="mt-2">
                Votre VTT <strong>{{ pairingSuccess.connection.name }}</strong> est maintenant connecté à Tumulte.
              </p>
            </template>
          </UAlert>

          <!-- Establish Connection Button -->
          <div v-if="testResult?.success && !pairingSuccess" class="flex gap-3">
            <UButton
              color="primary"
              label="Établir la connexion sécurisée"
              icon="i-lucide-shield-check"
              size="lg"
              :loading="pairing"
              @click="handlePairing"
            />
            <UButton
              color="neutral"
              variant="soft"
              label="Annuler"
              :disabled="pairing"
              @click="resetForm"
            />
          </div>
        </div>

        <template #footer>
          <div class="flex justify-between items-center">
            <UButton
              v-if="!pairingSuccess"
              color="neutral"
              variant="soft"
              label="Retour"
              @click="_router.push('/mj/campaigns/import')"
            />
            <UButton
              v-else
              color="primary"
              label="Continuer vers l'import de campagne"
              icon="i-lucide-arrow-right"
              trailing
              @click="_router.push('/mj/campaigns/import')"
            />
          </div>
        </template>
      </UCard>

      <!-- Security Info Modal -->
      <UModal v-model:open="showSecurityModal">
        <template #content>
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-3 min-w-0">
                  <UIcon name="i-lucide-shield" class="size-5 text-primary shrink-0" />
                  <h3 class="text-lg sm:text-xl font-semibold text-primary truncate">Sécurité de la connexion</h3>
                </div>
                <button
                  class="flex items-center justify-center size-8 rounded-full hover:bg-neutral-200 transition-colors shrink-0"
                  @click="showSecurityModal = false"
                >
                  <UIcon name="i-lucide-x" class="size-5 text-muted" />
                </button>
              </div>
            </template>

          <div class="space-y-4">
            <p class="text-sm text-muted">
              La connexion entre Tumulte et votre VTT est sécurisée par plusieurs couches de protection :
            </p>

            <div class="space-y-3">
              <div class="flex gap-3">
                <UIcon name="i-lucide-key" class="size-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 class="font-semibold text-primary text-sm">Authentification JWT</h4>
                  <p class="text-xs text-muted mt-1">
                    Chaque connexion utilise des tokens JWT signés avec une clé secrète unique. La signature est vérifiée à chaque requête.
                  </p>
                </div>
              </div>

              <div class="flex gap-3">
                <UIcon name="i-lucide-socket" class="size-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 class="font-semibold text-primary text-sm">Tunnel WebSocket chiffré</h4>
                  <p class="text-xs text-muted mt-1">
                    Les données transitent via un tunnel WebSocket sécurisé (WSS) avec chiffrement TLS end-to-end.
                  </p>
                </div>
              </div>

              <div class="flex gap-3">
                <UIcon name="i-lucide-heart-pulse" class="size-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 class="font-semibold text-primary text-sm">Heartbeat automatique</h4>
                  <p class="text-xs text-muted mt-1">
                    Un ping toutes les 30 secondes vérifie que la connexion est active. Détection de déconnexion en moins de 60 secondes.
                  </p>
                </div>
              </div>

              <div class="flex gap-3">
                <UIcon name="i-lucide-shield-off" class="size-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <h4 class="font-semibold text-primary text-sm">Révocation instantanée</h4>
                  <p class="text-xs text-muted mt-1">
                    Vous ou votre module VTT pouvez révoquer la connexion à tout moment. La révocation est immédiate et bidirectionnelle.
                  </p>
                </div>
              </div>
            </div>

            <UAlert
              color="primary"
              variant="soft"
              icon="i-lucide-info"
              class="mt-4"
            >
              <template #description>
                <p class="text-xs">
                  Aucune donnée sensible de votre VTT n'est stockée sur nos serveurs. Seuls les identifiants de synchronisation sont conservés de manière chiffrée.
                </p>
              </template>
            </UAlert>
          </div>

            <template #footer>
              <div class="flex justify-end">
                <UButton
                  color="primary"
                  label="Compris"
                  class="w-full sm:w-auto"
                  @click="showSecurityModal = false"
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
import { ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useToast } from "#ui/composables/useToast";

definePageMeta({
  layout: "authenticated" as const,
  middleware: ["auth"],
});

const _router = useRouter();
const toast = useToast();
const config = useRuntimeConfig();

const pairingUrl = ref("");
const testing = ref(false);
const pairing = ref(false);
const showSecurityModal = ref(false);
const testResult = ref<{
  success: boolean;
  worldInfo?: { id: string; name: string; version: string };
  error?: string;
} | null>(null);
const pairingSuccess = ref<{
  connection: {
    id: string;
    name: string;
    worldId: string;
    worldName: string;
    moduleVersion: string;
  };
} | null>(null);
const urlError = ref("");

// Dev mode detection
const isDev = import.meta.dev;

// Mock JWT token for development testing
const mockPairingUrl = computed(() => {
  // Mock JWT payload (header.payload.signature format)
  // This is a simplified mock - in reality, the backend generates this with proper signing
  /* eslint-disable camelcase -- JWT standard claims use snake_case */
  const mockPayload = {
    sub: "vtt:foundry",
    aud: "tumulte:api",
    iss: "foundry-module:tumulte",
    pairing_code: "DEV-TEST-123",
    world_id: "mock-world-dev-123",
    world_name: "Monde de Test DEV",
    gm_user_id: "mock-gm-456",
    module_version: "2.0.0-dev",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
    nonce: "mock-nonce-789",
    jti: "mock-jti-abc",
  };
  /* eslint-enable camelcase */

  // Base64 encode (simplified for mock purposes)
  const mockToken = btoa(JSON.stringify(mockPayload));
  const mockState = "mock-csrf-state-xyz";

  return `foundry://connect?token=${mockToken}&state=${mockState}`;
});

const isUrlValid = computed(() => {
  const url = pairingUrl.value.trim();
  return url.startsWith("foundry://connect?") && url.includes("token=");
});

const handleTestConnection = async () => {
  if (!isUrlValid.value) {
    urlError.value = "URL invalide. Format attendu : foundry://connect?token=...";
    return;
  }

  urlError.value = "";
  testing.value = true;
  testResult.value = null;

  try {
    const response = await fetch(`${config.public.apiBase}/mj/vtt-connections/test-pairing`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pairingUrl: pairingUrl.value.trim(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Test de connexion échoué");
    }

    const data = await response.json();
    testResult.value = data;

    if (data.success) {
      toast.add({
        title: "Test réussi",
        description: "La connexion au VTT fonctionne correctement",
        color: "success",
      });
    } else {
      toast.add({
        title: "Test échoué",
        description: data.error || "Impossible de contacter le VTT",
        color: "error",
      });
    }
  } catch (error: unknown) {
    console.error("Failed to test connection:", error);
    testResult.value = {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
    toast.add({
      title: "Erreur",
      description: "Impossible de tester la connexion",
      color: "error",
    });
  } finally {
    testing.value = false;
  }
};

const handlePairing = async () => {
  pairing.value = true;

  try {
    const response = await fetch(`${config.public.apiBase}/mj/vtt-connections/pair`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pairingUrl: pairingUrl.value.trim(),
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Échec de l'établissement de la connexion");
    }

    const data = await response.json();
    pairingSuccess.value = data;

    toast.add({
      title: "Connexion établie",
      description: `Le VTT "${data.connection.name}" est maintenant connecté`,
      color: "success",
    });

    // Store tokens (optional - could be stored in localStorage for future use)
    // localStorage.setItem(`vtt_session_${data.connection.id}`, data.tokens.sessionToken);
    // localStorage.setItem(`vtt_refresh_${data.connection.id}`, data.tokens.refreshToken);
  } catch (error: unknown) {
    console.error("Failed to establish pairing:", error);
    toast.add({
      title: "Erreur",
      description: error instanceof Error ? error.message : "Impossible d'établir la connexion",
      color: "error",
    });
  } finally {
    pairing.value = false;
  }
};

const resetForm = () => {
  testResult.value = null;
  urlError.value = "";
};

const copyMockUrl = async () => {
  try {
    await navigator.clipboard.writeText(mockPairingUrl.value);
    toast.add({
      title: "URL copiée",
      description: "L'URL de test a été copiée dans le presse-papier",
      color: "success",
    });
  } catch (error) {
    console.error("Failed to copy URL:", error);
    toast.add({
      title: "Erreur",
      description: "Impossible de copier l'URL",
      color: "error",
    });
  }
};
</script>
