<template>
  
    <div class="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950/10 to-gray-950 py-6">
      <div class="space-y-6">
        <!-- Alert pour invitations en attente -->
        <UCard v-if="invitationCount > 0">
          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-mail"
            :title="`Vous avez ${invitationCount} invitation${invitationCount > 1 ? 's' : ''} en attente`"
          >
            <template #description>
              <div class="flex items-center justify-between mt-2">
                <p>Consultez vos invitations pour rejoindre de nouvelles campagnes</p>
                <UButton
                  color="warning"
                  size="sm"
                  label="Voir les invitations"
                  to="/streamer/campaigns"
                />
              </div>
            </template>
          </UAlert>
        </UCard>

        <!-- Informations du streamer -->
        <UCard v-if="user && user.streamer">
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-user-circle" class="size-6 text-primary-500" />
              <h2 class="text-xl font-semibold text-white">Vos informations</h2>
            </div>
          </template>

          <div class="space-y-4">
            <!-- Alerte de compatibilité -->
            <UAlert
              v-if="!user.streamer.broadcaster_type || (user.streamer.broadcaster_type !== 'partner' && user.streamer.broadcaster_type !== 'affiliate')"
              color="warning"
              variant="soft"
              icon="i-lucide-alert-triangle"
              title="Compte non-affilié"
            >
              <template #description>
                <p class="mb-2">
                  Votre compte Twitch doit être <strong>Affilié</strong> ou <strong>Partenaire</strong> pour utiliser le système de sondages.
                  Le système dépend entièrement de l'API Twitch Polls, qui est uniquement disponible pour les comptes affiliés et partenaires.
                </p>
                <p class="text-sm">
                  Pour devenir Affilié Twitch, consultez :
                  <a
                    href="https://www.twitch.tv/creatorcamp/fr-fr/paths/getting-started-on-twitch/affiliate/"
                    target="_blank"
                    class="text-yellow-400 hover:text-yellow-300 underline"
                  >
                    Programme d'Affiliation Twitch
                  </a>
                </p>
              </template>
            </UAlert>

            <UAlert
              v-else
              color="success"
              variant="soft"
              icon="i-lucide-check-circle"
              title="Compte affilié"
            >
              <template #description>
                <p>
                  Votre compte {{ user.streamer.broadcaster_type === 'partner' ? 'Partenaire' : 'Affilié' }} Twitch est compatible avec le système de sondages !
                </p>
              </template>
            </UAlert>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p class="text-sm text-gray-400 mb-1">Nom Twitch</p>
                <p class="text-lg font-semibold text-white">{{ user.streamer.twitch_display_name }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-400 mb-1">Login Twitch</p>
                <p class="text-lg font-semibold text-white">{{ user.streamer.twitch_login }}</p>
              </div>
              <div>
                <p class="text-sm text-gray-400 mb-1">Statut du compte</p>
                <UBadge
                  v-if="user.streamer.broadcaster_type === 'partner'"
                  label="Partenaire"
                  color="primary"
                  variant="soft"
                  size="md"
                />
                <UBadge
                  v-else-if="user.streamer.broadcaster_type === 'affiliate'"
                  label="Affilié"
                  color="info"
                  variant="soft"
                  size="md"
                />
                <UBadge
                  v-else
                  label="Standard"
                  color="warning"
                  variant="soft"
                  size="md"
                />
              </div>
              <div>
                <p class="text-sm text-gray-400 mb-1">Statut de connexion</p>
                <UBadge
                  :color="user.streamer.is_active ? 'success' : 'error'"
                  variant="soft"
                  size="md"
                >
                  {{ user.streamer.is_active ? 'Actif' : 'Inactif' }}
                </UBadge>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Autorisations de campagnes -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="bg-blue-500/10 p-2 rounded-lg">
                <UIcon name="i-lucide-shield" class="size-6 text-blue-500" />
              </div>
              <h2 class="text-xl font-semibold text-white">Autorisations de sondages</h2>
              <UBadge v-if="authorizationStatuses.length > 0" color="info" variant="soft">
                {{ authorizationStatuses.length }}
              </UBadge>
            </div>
          </template>

          <div v-if="loadingAuth" class="text-center py-12">
            <UIcon name="i-lucide-loader" class="size-10 text-primary-500 animate-spin mx-auto" />
          </div>

          <div v-else-if="authorizationStatuses.length === 0" class="text-center py-12">
            <div class="bg-gray-800/50 p-4 rounded-2xl mb-4 inline-block">
              <UIcon name="i-lucide-shield-off" class="size-12 text-gray-600" />
            </div>
            <p class="text-gray-400 mb-2">Aucune campagne active</p>
            <p class="text-sm text-gray-500">
              Acceptez une invitation pour gérer vos autorisations de sondages
            </p>
          </div>

          <div v-else class="space-y-4">
            <!-- Info text above list -->
            <UAlert
              color="info"
              variant="soft"
              icon="i-lucide-info"
            >
              <template #description>
                Autorisez Tumulte à lancer des sondages sur votre chaîne pour ces campagnes pendant 12 heures.
              </template>
            </UAlert>

            <!-- Campaign list -->
            <div class="space-y-3">
              <div
                v-for="status in authorizationStatuses"
                :key="status.campaign_id"
                class="flex items-center justify-between p-4 rounded-lg border"
                :class="status.is_authorized ? 'border-green-500/50 bg-green-500/5' : 'border-gray-700 bg-gray-800/30'"
              >
                <!-- Campaign name -->
                <div class="flex-1">
                  <h3 class="text-lg font-semibold text-white">{{ status.campaign_name }}</h3>
                </div>

                <!-- Authorization button/status -->
                <div class="flex items-center gap-3">
                  <UButton
                    v-if="!status.is_authorized"
                    color="primary"
                    size="lg"
                    icon="i-lucide-shield-check"
                    label="Autoriser pour 12 heures"
                    @click="handleAuthorize(status.campaign_id)"
                  />
                  <template v-else>
                    <UBadge color="success" variant="soft" size="lg" class="px-4 py-2">
                      <div class="flex items-center gap-2">
                        <UIcon name="i-lucide-clock" class="size-4" />
                        <span class="font-mono text-base">{{ formatTime(status.remaining_seconds || 0) }}</span>
                      </div>
                    </UBadge>
                    <UButton
                      color="error"
                      variant="soft"
                      size="lg"
                      icon="i-lucide-shield-off"
                      label="Révoquer"
                      @click="handleRevokeAuth(status.campaign_id)"
                    />
                  </template>
                </div>
              </div>
            </div>
          </div>
        </UCard>

        <!-- URL de l'overlay -->
        <UCard class="opacity-60 pointer-events-none relative">
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-link" class="size-6 text-primary-500" />
              <h2 class="text-xl font-semibold text-white">URL de l'overlay OBS</h2>
            </div>
          </template>

          <div class="space-y-4">
            <UAlert
              color="warning"
              variant="soft"
              icon="i-lucide-construction"
              title="Fonctionnalité en cours de développement"
            >
              <template #description>
                <p>Cette fonctionnalité est actuellement en développement et sera bientôt disponible.</p>
              </template>
            </UAlert>

            <UAlert
              color="info"
              variant="soft"
              icon="i-lucide-info"
              title="Comment utiliser l'overlay"
            >
              <template #description>
                <p>Copiez cette URL et ajoutez-la comme source 'Navigateur' dans OBS Studio. N'oubliez pas de cocher 'Arrière-plan transparent'.</p>
                <UBadge v-if="isDev" color="warning" variant="soft" size="sm" class="mt-2">
                  <UIcon name="i-lucide-eye" class="size-3 mr-1" />
                  En dev : utilisez le bouton "Prévisualiser" pour tester
                </UBadge>
              </template>
            </UAlert>

            <div v-if="overlayUrl" class="space-y-3">
              <div class="flex gap-2">
                <div class="flex-1 relative">
                  <div class="flex items-center gap-2 px-3.5 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-sm overflow-x-auto">
                    <UIcon name="i-lucide-link" class="size-4 text-gray-400 shrink-0" />
                    <span class="select-all">{{ overlayUrl }}</span>
                  </div>
                </div>
                <UButton
                  v-if="isDev"
                  color="info"
                  size="lg"
                  icon="i-lucide-external-link"
                  label="Prévisualiser"
                  @click="previewOverlay"
                />
                <UButton
                  color="primary"
                  size="lg"
                  icon="i-lucide-clipboard"
                  label="Copier"
                  @click="copyOverlayUrl"
                />
              </div>

              <UAlert
                v-if="copySuccess"
                color="success"
                variant="soft"
                icon="i-lucide-check-circle"
                title="URL copiée dans le presse-papier!"
              />
            </div>

            <div v-else class="text-center py-8">
              <UButton
                color="primary"
                size="xl"
                icon="i-lucide-sparkles"
                label="Générer l'URL de l'overlay"
                :loading="loadingOverlay"
                @click="fetchOverlayUrl"
              />
            </div>
          </div>
        </UCard>

        <!-- Instructions OBS -->
        <UCard class="opacity-60 pointer-events-none relative">
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-tv" class="size-6 text-primary-500" />
              <h2 class="text-xl font-semibold text-white">Comment ajouter l'overlay dans OBS</h2>
            </div>
          </template>

          <div class="space-y-4">
            <UAlert
              color="warning"
              variant="soft"
              icon="i-lucide-construction"
              title="Fonctionnalité en cours de développement"
            >
              <template #description>
                <p>Cette fonctionnalité est actuellement en développement et sera bientôt disponible.</p>
              </template>
            </UAlert>

            <ol class="list-decimal list-inside space-y-2 text-gray-300">
              <li>Cliquez sur "Générer l'URL de l'overlay" ci-dessus</li>
              <li>Copiez l'URL générée</li>
              <li>Dans OBS Studio, ajoutez une nouvelle source → "Navigateur"</li>
              <li>Collez l'URL dans le champ "URL"</li>
              <li>Définissez la largeur à <strong>1920</strong> et la hauteur à <strong>1080</strong></li>
              <li>⚠️ <strong>Important:</strong> Cochez "Arrière-plan transparent"</li>
              <li>Cliquez sur "OK"</li>
              <li>L'overlay apparaîtra automatiquement quand le MJ lancera un sondage!</li>
            </ol>
          </div>
        </UCard>

        <!-- Révocation d'accès -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <UIcon name="i-lucide-alert-triangle" class="size-6 text-error-500" />
              <h2 class="text-xl font-semibold text-error-400">Zone de danger</h2>
            </div>
          </template>

          <div class="space-y-4">
            <UAlert
              color="error"
              variant="soft"
              icon="i-lucide-shield-alert"
              title="Action irréversible"
              description="Si vous révoquez l'accès, vous devrez vous reconnecter pour réutiliser l'application."
            />

            <UButton
              color="error"
              variant="solid"
              icon="i-lucide-ban"
              label="Révoquer l'accès à Twitch"
              @click="handleRevokeAccess"
            />
          </div>
        </UCard>
      </div>
    </div>
  
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useAuth } from "@/composables/useAuth";
import { useCampaigns } from "@/composables/useCampaigns";
import type { AuthorizationStatus } from "@/types/api";

definePageMeta({
  layout: "authenticated" as const,
});

const API_URL = import.meta.env.VITE_API_URL;
const { user, logout } = useAuth();
const { fetchInvitations, getAuthorizationStatus, grantAuthorization, revokeAuthorization } = useCampaigns();
const toast = useToast();

// Dev mode
const isDev = import.meta.env.MODE === "development";

const overlayUrl = ref<string | null>(null);
const loadingOverlay = ref(false);
const copySuccess = ref(false);
const invitationCount = ref(0);
const authorizationStatuses = ref<AuthorizationStatus[]>([]);
const loadingAuth = ref(false);

// Intervalles pour les compteurs
let countdownInterval: ReturnType<typeof setInterval> | null = null;
let refreshInterval: ReturnType<typeof setInterval> | null = null;

const fetchOverlayUrl = async () => {
  loadingOverlay.value = true;
  try {
    const response = await fetch(`${API_URL}/streamer/overlay-url`, {
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to fetch overlay URL");
    const data = await response.json();
    overlayUrl.value = data.data.overlay_url;
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible de générer l'URL de l'overlay",
      color: "error",
    });
  } finally {
    loadingOverlay.value = false;
  }
};

const copyOverlayUrl = async () => {
  if (overlayUrl.value) {
    try {
      await navigator.clipboard.writeText(overlayUrl.value);
      copySuccess.value = true;
      setTimeout(() => {
        copySuccess.value = false;
      }, 3000);
    } catch (error) {
      toast.add({
        title: "Erreur",
        description: "Impossible de copier l'URL",
        color: "error",
      });
    }
  }
};

const previewOverlay = () => {
  if (overlayUrl.value) {
    window.open(overlayUrl.value, "_blank", "width=1920,height=1080");
  }
};

const handleRevokeAccess = async () => {
  if (!confirm("Êtes-vous sûr de vouloir révoquer l'accès ? Vous devrez vous reconnecter.")) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/streamer/revoke`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) throw new Error("Failed to revoke access");
    toast.add({
      title: "Accès révoqué",
      description: "Vous allez être déconnecté",
      color: "success",
    });
    setTimeout(() => {
      logout();
    }, 1500);
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: "Impossible de révoquer l'accès",
      color: "error",
    });
  }
};


// Charger le nombre d'invitations
const loadInvitationCount = async () => {
  try {
    const invitations = await fetchInvitations();
    invitationCount.value = invitations.length;
  } catch (error) {
    // Fail silencieusement - pas critique
    console.error("Failed to load invitations:", error);
  }
};

// Charger les autorisations
const loadAuthorizationStatus = async () => {
  loadingAuth.value = true;
  try {
    const data = await getAuthorizationStatus();
    authorizationStatuses.value = data;
    // Démarrer le compteur après avoir chargé les données
    startCountdown();
  } catch (error) {
    // Fail silencieusement - pas critique
    console.error("Failed to load authorization status:", error);
  } finally {
    loadingAuth.value = false;
  }
};

// Démarrer le compteur qui décrémente chaque seconde
const startCountdown = () => {
  // Nettoyer l'intervalle existant
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  countdownInterval = setInterval(() => {
    authorizationStatuses.value = authorizationStatuses.value.map(status => {
      if (status.is_authorized && status.remaining_seconds !== null && status.remaining_seconds > 0) {
        return {
          ...status,
          remaining_seconds: status.remaining_seconds - 1
        };
      }
      return status;
    });

    // Vérifier si des autorisations ont expiré
    const hasExpired = authorizationStatuses.value.some(
      status => status.is_authorized && status.remaining_seconds === 0
    );

    if (hasExpired) {
      // Recharger depuis le serveur si une autorisation a expiré
      loadAuthorizationStatus();
    }
  }, 1000);
};

// Rafraîchir depuis le serveur toutes les 60 secondes pour éviter la dérive
const startRefreshInterval = () => {
  refreshInterval = setInterval(() => {
    loadAuthorizationStatus();
  }, 60000); // 60 secondes
};

// Handlers d'autorisation
const handleAuthorize = async (campaignId: string) => {
  try {
    await grantAuthorization(campaignId);
    toast.add({
      title: "Autorisation accordée",
      description: "Les sondages peuvent maintenant être lancés sur votre chaîne pour les 12 prochaines heures",
      color: "success",
    });
    await loadAuthorizationStatus();
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: error instanceof Error ? error.message : "Impossible d'accorder l'autorisation",
      color: "error",
    });
  }
};

const handleRevokeAuth = async (campaignId: string) => {
  try {
    await revokeAuthorization(campaignId);
    toast.add({
      title: "Autorisation révoquée",
      description: "Les sondages ne pourront plus être lancés sur votre chaîne",
      color: "success",
    });
    await loadAuthorizationStatus();
  } catch (error) {
    toast.add({
      title: "Erreur",
      description: error instanceof Error ? error.message : "Impossible de révoquer l'autorisation",
      color: "error",
    });
  }
};

// Format time helper avec heures, minutes, secondes
const formatTime = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

// Charger automatiquement l'URL de l'overlay, les invitations et les autorisations au montage
onMounted(async () => {
  fetchOverlayUrl();
  await loadInvitationCount();
  await loadAuthorizationStatus();
  startRefreshInterval();
});

// Nettoyer les intervalles au démontage
onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
</script>
