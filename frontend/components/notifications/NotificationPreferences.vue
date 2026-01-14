<template>
  <UCard>
    <template #header>
      <div class="flex items-center gap-3">
        <div>
          <h2 class="text-xl font-semibold text-primary">Notifications push</h2>
        </div>
      </div>
    </template>

    <div class="space-y-6">
      <!-- Message si non supporté -->
      <UAlert
        v-if="!isSupported"
        color="warning"
        variant="soft"
        icon="i-lucide-alert-triangle"
        title="Non disponible"
        description="Les notifications push ne sont pas supportées par votre navigateur."
      />

      <!-- Message si permission refusée -->
      <UAlert
        v-else-if="isPermissionDenied"
        color="error"
        variant="soft"
        icon="i-lucide-bell-off"
        title="Notifications bloquées"
        description="Vous avez bloqué les notifications. Pour les réactiver, modifiez les paramètres de votre navigateur pour ce site."
      />

      <template v-else>
        <!-- Toggle global -->
        <div class="flex items-center justify-between">
          <div>
            <p class="font-medium text-primary">Notifications push</p>
            <p class="text-sm text-muted">
              {{
                isCurrentBrowserSubscribed
                  ? "Actif sur cet appareil"
                  : "Non actif sur cet appareil"
              }}
            </p>
          </div>
          <USwitch
            :model-value="localPreferences.pushEnabled"
            @update:model-value="handleGlobalToggle"
          />
        </div>

        <USeparator />

        <!-- Toggles par type -->
        <div class="space-y-4">
          <h3 class="text-lg font-medium text-primary">Types de notifications</h3>

          <div class="grid grid-cols-2 gap-4">
            <div
              v-for="pref in notificationTypes"
              :key="pref.key"
              class="flex items-center justify-between p-3 bg-neutral-100 rounded-lg"
            >
              <div>
                <p class="font-medium text-primary">{{ pref.label }}</p>
                <p class="text-sm text-muted">{{ pref.description }}</p>
              </div>
              <USwitch
                :model-value="localPreferences[pref.key]"
                :disabled="!localPreferences.pushEnabled"
                @update:model-value="(value: boolean) => handleUpdate(pref.key, value)"
              />
            </div>
          </div>
        </div>

        <USeparator />

        <!-- Liste des appareils -->
        <div v-if="subscriptions.length > 0" class="space-y-4">
          <h3 class="text-lg font-medium text-primary">Appareils enregistrés</h3>

          <div
            v-for="sub in subscriptions"
            :key="sub.id"
            class="flex items-center justify-between p-3 bg-neutral-100 rounded-lg"
          >
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-smartphone" class="size-5 text-muted" />
              <div>
                <p class="font-medium text-primary">
                  {{ getDeviceName(sub) }}
                </p>
                <p class="text-xs text-muted">
                  Dernière utilisation : {{ formatDate(sub.lastUsedAt) }}
                </p>
              </div>
            </div>
            <UButton
              color="error"
              variant="ghost"
              size="sm"
              icon="i-lucide-trash-2"
              @click="handleDeleteDevice(sub.id)"
            />
          </div>
        </div>

        <!-- Bouton pour activer sur cet appareil -->
        <div
          v-if="isSupported && !isCurrentBrowserSubscribed && localPreferences.pushEnabled"
        >
          <UButton color="primary" :loading="loading" @click="handleSubscribe">
            <UIcon name="i-lucide-bell-plus" class="mr-2" />
            Activer sur cet appareil
          </UButton>
        </div>

        <!-- Bouton de test (dev uniquement) -->
        <div v-if="isCurrentBrowserSubscribed && isDev" class="pt-4">
          <UButton
            color="neutral"
            variant="outline"
            :loading="testLoading"
            @click="handleSendTestNotification"
          >
            <UIcon name="i-lucide-send" class="mr-2" />
            Envoyer une notification de test
          </UButton>
        </div>
      </template>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, watch } from "vue";
import { usePushNotifications } from "@/composables/usePushNotifications";
import type { NotificationPreferences, PushSubscription } from "@/types";

const config = useRuntimeConfig();
const toast = useToast();
const isDev = import.meta.env.DEV;

const {
  subscriptions,
  preferences,
  loading,
  isSupported,
  isCurrentBrowserSubscribed,
  isPermissionDenied,
  initialize,
  updatePreferences,
  subscribe,
  deleteSubscription,
} = usePushNotifications();

const testLoading = ref(false);

const localPreferences = reactive<NotificationPreferences>({
  pushEnabled: true,
  campaignInvitations: true,
  criticalAlerts: true,
  pollStarted: true,
  pollEnded: true,
  campaignMemberJoined: false,
  sessionReminder: false,
});

const notificationTypes: Array<{
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}> = [
  {
    key: "campaignInvitations",
    label: "Invitations aux campagnes",
    description: "Quand un MJ vous invite à rejoindre une campagne",
  },
  {
    key: "criticalAlerts",
    label: "Alertes critiques",
    description: "Token expiré, problèmes de connexion",
  },
  {
    key: "pollStarted",
    label: "Début de sondage",
    description: "Quand un sondage commence sur vos campagnes",
  },
  {
    key: "pollEnded",
    label: "Fin de sondage",
    description: "Quand un sondage se termine",
  },
];

// Sync local state with store
watch(
  preferences,
  (newPrefs) => {
    if (newPrefs) {
      Object.assign(localPreferences, newPrefs);
    }
  },
  { immediate: true }
);

onMounted(async () => {
  // initialize() charge tout en parallèle : subscriptions, preferences, et browserEndpoint
  await initialize();
});

const handleGlobalToggle = async (value: boolean) => {
  localPreferences.pushEnabled = value;
  await updatePreferences({ pushEnabled: value });

  if (value && !isCurrentBrowserSubscribed.value) {
    await subscribe();
  }
};

const handleUpdate = async (
  key: keyof NotificationPreferences,
  value: boolean
) => {
  localPreferences[key] = value;
  await updatePreferences({ [key]: value });
};

const handleSubscribe = async () => {
  await subscribe();
};

const handleDeleteDevice = async (id: string) => {
  await deleteSubscription(id);
};

const handleSendTestNotification = async () => {
  testLoading.value = true;
  try {
    const response = await fetch(`${config.public.apiBase}/notifications/test`, {
      method: "POST",
      credentials: "include",
    });

    const data = await response.json();

    if (data.success) {
      toast.add({
        title: "Notification envoyée",
        description: data.message,
        color: "success",
      });
    } else {
      toast.add({
        title: "Échec",
        description: data.message,
        color: "warning",
      });
    }
  } catch {
    toast.add({
      title: "Erreur",
      description: "Impossible d'envoyer la notification de test",
      color: "error",
    });
  } finally {
    testLoading.value = false;
  }
};

const getDeviceName = (sub: PushSubscription): string => {
  if (sub.deviceName) return sub.deviceName;

  // Essayer de déduire le type d'appareil depuis le userAgent
  if (sub.userAgent) {
    if (sub.userAgent.includes("Mobile")) return "Appareil mobile";
    if (sub.userAgent.includes("Firefox")) return "Firefox";
    if (sub.userAgent.includes("Chrome")) return "Chrome";
    if (sub.userAgent.includes("Safari")) return "Safari";
  }

  return "Appareil inconnu";
};

const formatDate = (date: string | null): string => {
  if (!date) return "Jamais";

  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};
</script>
