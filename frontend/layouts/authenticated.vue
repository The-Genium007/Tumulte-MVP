<template>
  <div class="min-h-screen bg-page flex flex-col">
    <!-- PWA Install Prompt - DISABLED for Safari debugging -->
    <!-- <PwaInstallPrompt /> -->

    <!-- Header -->
    <AppHeader />

    <!-- Main Content -->
    <main class="flex-1 flex flex-col pb-20 lg:pb-0">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl flex-1">
        <!-- Indicateur hors-ligne -->
        <OfflineIndicator />

        <!-- Email verification banner for unverified users -->
        <div v-if="showEmailVerificationBanner" class="pb-4">
          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-mail-warning"
            title="Email non vérifié"
            :actions="[
              {
                label: 'Vérifier maintenant',
                color: 'warning',
                variant: 'solid',
                to: '/verify-email',
              },
            ]"
          >
            <template #description>
              Veuillez vérifier votre adresse email pour accéder à toutes les fonctionnalités.
            </template>
          </UAlert>
        </div>

        <!-- Banner de permission notifications push (persistant jusqu'à activation) -->
        <NotificationsPushPermissionBanner class="mb-2" />

        <!-- Page Content -->
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <AppFooter />

    <!-- Bottom Navigation (mobile only) -->
    <BottomNavigation />

    <!-- Widgets globaux -->
    <SupportWidget />

    <!-- Modal d'onboarding Twitch (bloquant si non lié) -->
    <OnboardingTwitchModal :open="showTwitchOnboarding" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import SupportWidget from '@/components/SupportWidget.vue'
import { useAuth } from '@/composables/useAuth'
import { usePushNotifications } from '@/composables/usePushNotifications'
import { useVttAutoSync } from '@/composables/useVttAutoSync'
// PWA disabled for Safari debugging
// import { usePwaInstall } from '@/composables/usePwaInstall'

const router = useRouter()
const route = useRoute()
const { fetchMe, user, loading, hasFetchedUser, isEmailVerified } = useAuth()
// const { shouldShowInstallUI } = usePwaInstall()
const { initialize: initializePushNotifications } = usePushNotifications()
const { initialize: initializeVttSync } = useVttAutoSync()

// Show email verification banner if user is logged in but email not verified
const showEmailVerificationBanner = computed(() => {
  if (!hasFetchedUser.value || loading.value) return false
  return user.value !== null && !isEmailVerified.value
})

// Affiche le modal d'onboarding si l'utilisateur est connecté mais n'a pas lié Twitch
// On attend que le fetch initial soit terminé pour éviter les flash
// hasFetchedUser persiste dans le store Pinia, donc reste true entre les navigations
const showTwitchOnboarding = computed(() => {
  if (!hasFetchedUser.value || loading.value) return false
  // Ne pas afficher l'onboarding Twitch si l'email n'est pas vérifié
  if (!isEmailVerified.value) return false
  return user.value !== null && user.value.streamer === null
})

/**
 * Rediriger vers /verify-email si l'utilisateur n'a pas vérifié son email
 * Cela force l'utilisateur à vérifier son email avant d'accéder aux pages protégées
 */
function redirectIfEmailNotVerified() {
  // Ne pas rediriger pendant le chargement
  if (loading.value || !hasFetchedUser.value) return

  // Ne pas rediriger si pas d'utilisateur (sera géré par middleware auth)
  if (!user.value) return

  // Ne pas rediriger si déjà sur une page autorisée pour les non-vérifiés
  const allowedPaths = ['/verify-email', '/verify-email-callback', '/settings']
  if (allowedPaths.some((path) => route.path.startsWith(path))) return

  // Rediriger si email non vérifié
  if (!isEmailVerified.value) {
    router.push({
      path: '/verify-email',
      query: { redirect: route.fullPath },
    })
  }
}

// Observer les changements pour rediriger si nécessaire
watch(
  () => [hasFetchedUser.value, isEmailVerified.value, route.path],
  () => {
    redirectIfEmailNotVerified()
  }
)

// Charger l'utilisateur au montage initial du layout
// Nécessaire car la page /mj ou /dashboard est la première chargée après login
onMounted(async () => {
  try {
    await fetchMe()

    // Vérifier l'email après le fetch
    redirectIfEmailNotVerified()

    // Ne pas initialiser les services si l'email n'est pas vérifié
    if (!isEmailVerified.value) return

    // Initialiser les notifications push après l'authentification
    // Cela charge : subscriptions backend, preferences, et browserEndpoint
    await initializePushNotifications()

    // Synchroniser les connexions VTT et récupérer les campagnes disponibles
    await initializeVttSync()
  } catch (error) {
    console.error('[AuthenticatedLayout] Failed to load user:', error)
  }
})
</script>
