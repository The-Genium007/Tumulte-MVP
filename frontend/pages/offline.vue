<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <div
    class="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-950 via-purple-950/20 to-gray-950"
  >
    <div class="text-center space-y-8 px-4 max-w-lg">
      <!-- Icon -->
      <div class="flex justify-center">
        <div class="bg-warning-light p-6 rounded-full">
          <UIcon name="i-lucide-cloud-off" class="size-16 text-warning-500" />
        </div>
      </div>

      <!-- Title & Description -->
      <div class="space-y-3">
        <h1 class="text-3xl font-bold text-primary">Vous êtes hors-ligne</h1>
        <p class="text-muted">
          Impossible de charger cette page sans connexion internet.
          Vos données précédemment consultées restent disponibles.
        </p>
      </div>

      <!-- Cached Data Info -->
      <UCard v-if="hasOfflineData" class="text-left">
        <template #header>
          <div class="flex items-center gap-2">
            <UIcon name="i-lucide-database" class="size-5 text-primary-500" />
            <span class="font-medium">Données disponibles hors-ligne</span>
          </div>
        </template>
        <ul class="space-y-2 text-sm text-secondary">
          <li v-if="hasCampaigns" class="flex items-center gap-2">
            <UIcon name="i-lucide-check" class="size-4 text-success-500" />
            Vos campagnes
          </li>
          <li v-if="hasUser" class="flex items-center gap-2">
            <UIcon name="i-lucide-check" class="size-4 text-success-500" />
            Votre profil
          </li>
          <li class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-info" class="size-4" />
            Mode lecture seule
          </li>
        </ul>
      </UCard>

      <!-- Actions -->
      <div class="flex flex-col gap-3">
        <UButton
          size="lg"
          color="primary"
          icon="i-lucide-refresh-cw"
          @click="handleRetry"
        >
          Réessayer
        </UButton>

        <UButton
          v-if="hasOfflineData"
          size="lg"
          variant="outline"
          color="neutral"
          icon="i-lucide-home"
          @click="goToCampaigns"
        >
          Voir mes campagnes (hors-ligne)
        </UButton>
      </div>

      <!-- Last sync info -->
      <p v-if="lastSyncText" class="text-xs text-muted">
        Dernière synchronisation : {{ lastSyncText }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { offlineStorage } from "@/utils/offline-storage";

definePageMeta({
  layout: "default" as const,
});

const router = useRouter();

const hasUser = ref(false);
const hasCampaigns = ref(false);
const lastSync = ref<number | null>(null);

const hasOfflineData = computed(() => hasUser.value || hasCampaigns.value);

const lastSyncText = computed(() => {
  if (!lastSync.value) return null;

  const diff = Date.now() - lastSync.value;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `il y a ${days} jour${days > 1 ? "s" : ""}`;
  if (hours > 0) return `il y a ${hours} heure${hours > 1 ? "s" : ""}`;
  if (minutes > 0) return `il y a ${minutes} minute${minutes > 1 ? "s" : ""}`;
  return "à l'instant";
});

onMounted(async () => {
  // Check what's available offline
  hasUser.value = await offlineStorage.has("user", "current");
  hasCampaigns.value = await offlineStorage.has("campaigns", "list");
  lastSync.value = await offlineStorage.getLastSync();
});

const handleRetry = () => {
  window.location.reload();
};

const goToCampaigns = () => {
  router.push("/mj/campaigns");
};
</script>
