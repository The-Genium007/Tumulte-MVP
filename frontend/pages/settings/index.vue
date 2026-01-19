<template>
    <div class="min-h-screen">
      <div class="mx-auto space-y-6">
        <!-- Header avec retour -->
        <UCard>
          <div class="flex items-center gap-4">
            <UButton
              color="neutral"
              variant="soft"
              size="xl"
              square
              class="group shrink-0"
              @click="goBackToDashboard"
            >
              <template #leading>
                <UIcon name="i-lucide-arrow-left" class="size-6 sm:size-12 transition-transform duration-200 group-hover:-translate-x-1" />
              </template>
            </UButton>
            <h1 class="text-xl sm:text-3xl font-bold text-primary">Réglages</h1>
          </div>
        </UCard>

        <!-- Informations de base -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div>
                <h2 class="text-xl font-semibold text-primary">Informations du compte</h2>
              </div>
            </div>
          </template>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p class="text-sm text-muted mb-1">Nom du compte</p>
              <p class="text-lg font-semibold text-primary">{{ user?.displayName }}</p>
            </div>
            <div>
              <p class="text-sm text-muted mb-1">Email</p>
              <p class="text-lg font-semibold text-primary">{{ user?.email || 'Non renseigné' }}</p>
            </div>
          </div>
        </UCard>

        <!-- Services connectés -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div>
                <h2 class="text-xl font-semibold text-primary">Services connectés</h2>
              </div>
            </div>
          </template>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Twitch -->
            <button
              class="p-4 rounded-lg bg-neutral-100 border border-default text-left transition-all duration-200 hover:ring-2 hover:ring-primary-500 hover:shadow-md cursor-pointer"
              @click="showTwitchModal = true"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="p-2">
                    <UIcon name="i-lucide-twitch" class="size-6 text-brand-500" />
                  </div>
                  <div>
                    <h3 class="font-semibold text-primary">Twitch</h3>
                    <p class="text-sm text-muted">Streaming et chat en direct</p>
                  </div>
                </div>
                <div class="flex items-center gap-2">
                  <UBadge v-if="user?.streamer" label="Connecté" color="success" variant="solid" />
                  <UIcon name="i-lucide-chevron-right" class="size-5 text-muted" />
                </div>
              </div>
            </button>

            <!-- Services futurs -->
            <div class="p-4 rounded-lg bg-neutral-100 border border-default opacity-60">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="p-2">
                    <UIcon name="i-lucide-video" class="size-6 text-neutral-500" />
                  </div>
                  <div>
                    <h3 class="font-semibold text-primary">OBS Studio</h3>
                    <p class="text-sm text-muted">Contrôle OBS Studio</p>
                  </div>
                </div>
                <UBadge label="Bientôt" color="info" variant="solid" />
              </div>
            </div>

            <div class="p-4 rounded-lg bg-neutral-100 border border-default opacity-60">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="p-2">
                    <UIcon name="i-lucide-castle" class="size-6 text-neutral-500" />
                  </div>
                  <div>
                    <h3 class="font-semibold text-primary">Foundry VTT</h3>
                    <p class="text-sm text-muted">Synchronisation Foundry</p>
                  </div>
                </div>
                <UBadge label="Bientôt" color="info" variant="solid" />
              </div>
            </div>

            <div class="p-4 rounded-lg bg-neutral-100 border border-default opacity-60">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="p-2">
                    <UIcon name="i-lucide-flask-conical" class="size-6 text-neutral-500" />
                  </div>
                  <div>
                    <h3 class="font-semibold text-primary">TaleSpire</h3>
                    <p class="text-sm text-muted">Intégration TaleSpire</p>
                  </div>
                </div>
                <UBadge label="Bientôt" color="info" variant="solid" />
              </div>
            </div>

            <div class="p-4 rounded-lg bg-neutral-100 border border-default opacity-60">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="p-2">
                    <UIcon name="i-lucide-dice-6" class="size-6 text-neutral-500" />
                  </div>
                  <div>
                    <h3 class="font-semibold text-primary">Owlbear Rodeo</h3>
                    <p class="text-sm text-muted">Intégration Owlbear Rodeo</p>
                  </div>
                </div>
                <UBadge label="Bientôt" color="info" variant="solid" />
              </div>
            </div>
          </div>
        </UCard>

        <!-- Notifications push -->
        <NotificationsNotificationPreferences />

        <!-- Zone de danger -->
        <UCard class="border-error-light">
          <template #header>
            <div class="flex items-center gap-3">
              <div>
                <h2 class="text-xl font-semibold text-primary">Zone de danger</h2>
              </div>
            </div>
          </template>

          <div class="p-4 rounded-lg bg-error-light border-error-light">
            <div class="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div class="flex-1">
                <h3 class="font-semibold text-primary mb-1">Supprimer mon compte et mes données</h3>
                <p class="text-sm text-muted">
                  Cette action anonymisera toutes vos données personnelles de manière irréversible.
                </p>
              </div>
              <UButton
                color="error"
                variant="solid"
                label="Supprimer le compte"
                class="w-full sm:w-auto shrink-0"
                @click="showDeleteModal = true"
              />
            </div>
          </div>
        </UCard>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <UModal v-model:open="showDeleteModal" class="w-full max-w-lg mx-4">
      <template #header>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-alert-triangle" class="size-6 text-error-500" />
          <h3 class="text-xl font-semibold text-primary">Confirmer la suppression</h3>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-alert-octagon"
            title="Attention : Action irréversible"
            description="Cette action anonymisera définitivement toutes vos données personnelles. Vous pourrez vous reconnecter, mais un nouveau compte sera créé."
          />

          <div>
            <p class="text-sm text-muted mb-2">
              Pour confirmer, veuillez saisir <span class="font-mono font-bold text-primary">SUPPRIMER</span> ci-dessous :
            </p>
            <UInput
              v-model="deleteConfirmation"
              placeholder="Tapez SUPPRIMER"
              size="lg"
              :ui="{
                root: 'ring-0 border-0 rounded-lg overflow-hidden',
                base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg',
              }"
            />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex flex-col sm:flex-row justify-end gap-3 w-full">
          <UButton
            color="primary"
            variant="solid"
            label="Annuler"
            class="w-full sm:w-auto"
            @click="showDeleteModal = false"
          />
          <UButton
            color="error"
            variant="solid"
            label="Confirmer la suppression"
            class="w-full sm:w-auto"
            :disabled="deleteConfirmation !== 'SUPPRIMER'"
            :loading="deleteLoading"
            @click="handleDeleteAccount"
          />
        </div>
      </template>
    </UModal>

    <!-- Modal de confirmation de révocation Twitch -->
    <UModal v-model:open="showRevokeModal" class="w-full max-w-lg mx-4">
      <template #header>
        <div class="flex items-center gap-3">
          <h3 class="text-xl font-semibold text-primary">Confirmer la révocation</h3>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-alert-circle"
            title="Attention"
            description="Cette action révoquera l'accès de Tumulte à votre compte Twitch et désactivera votre compte streamer. Vous devrez vous reconnecter pour réactiver votre compte."
          />

          <p class="text-secondary">
            Êtes-vous sûr de vouloir révoquer l'accès Twitch ?
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex flex-col sm:flex-row justify-end gap-3 w-full">
          <UButton
            color="neutral"
            variant="outline"
            label="Annuler"
            class="w-full sm:w-auto"
            @click="showRevokeModal = false"
          />
          <UButton
            color="error"
            variant="solid"
            label="Confirmer la révocation"
            class="w-full sm:w-auto"
            :loading="revokeLoading"
            @click="confirmRevokeTwitch"
          />
        </div>
      </template>
    </UModal>

    <!-- Modal Twitch -->
    <UModal v-model:open="showTwitchModal" class="w-full max-w-lg mx-4">
      <template #header>
        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-twitch" class="size-6 text-brand-500" />
          <div>
            <h3 class="text-xl font-semibold text-primary">Twitch</h3>
            <p class="text-sm text-muted">Streaming et chat en direct</p>
          </div>
        </div>
      </template>

      <template #body>
        <div class="space-y-4">
          <!-- État connecté -->
          <template v-if="user?.streamer">
            <div class="p-4 rounded-lg bg-success-50 border border-success-200">
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-check-circle" class="size-5 text-success-500" />
                <div>
                  <p class="font-semibold text-success-700">Compte connecté</p>
                  <p class="text-sm text-success-600">{{ user.streamer.twitchDisplayName }}</p>
                </div>
              </div>
            </div>

            <p class="text-sm text-muted">
              Votre compte Twitch est lié à Tumulte. Vous pouvez lancer des sondages sur votre chaîne et participer aux campagnes en tant que streamer.
            </p>

            <UAlert
              color="warning"
              variant="soft"
              icon="i-lucide-alert-circle"
              title="Révoquer l'accès"
              description="Révoquer l'accès désactivera votre compte streamer et bloquera toutes vos actions sur Twitch via Tumulte."
            />
          </template>

          <!-- État non connecté -->
          <template v-else>
            <div class="p-4 rounded-lg bg-neutral-100 border border-default">
              <div class="flex items-center gap-3">
                <UIcon name="i-lucide-unplug" class="size-5 text-muted" />
                <div>
                  <p class="font-semibold text-primary">Non connecté</p>
                  <p class="text-sm text-muted">Aucun compte Twitch lié</p>
                </div>
              </div>
            </div>

            <p class="text-sm text-muted">
              Connectez votre compte Twitch pour lancer des sondages sur votre chaîne et participer aux campagnes en tant que streamer.
            </p>
          </template>
        </div>
      </template>

      <template #footer>
        <div class="flex flex-col sm:flex-row justify-end gap-3 w-full">
          <UButton
            color="primary"
            variant="solid"
            label="Fermer"
            class="w-full sm:w-auto"
            @click="showTwitchModal = false"
          />
          <UButton
            v-if="user?.streamer"
            color="error"
            variant="solid"
            label="Révoquer l'accès"
            icon="i-lucide-unplug"
            class="w-full sm:w-auto"
            @click="showTwitchModal = false; showRevokeModal = true"
          />
          <UButton
            v-else
            color="primary"
            variant="solid"
            label="Connecter Twitch"
            icon="i-lucide-twitch"
            class="w-full sm:w-auto"
            @click="connectTwitch"
          />
        </div>
      </template>
    </UModal>

</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useSettings } from '@/composables/useSettings'

definePageMeta({
  layout: "authenticated" as const,
  middleware: ["auth"],
});

const _router = useRouter()
const { user, logout } = useAuth()
const { revokeTwitchAccess, deleteAccount } = useSettings()

const showDeleteModal = ref(false)
const deleteConfirmation = ref('')
const deleteLoading = ref(false)

const showRevokeModal = ref(false)
const revokeLoading = ref(false)
const showTwitchModal = ref(false)

const goBackToDashboard = () => {
  // Tous les utilisateurs vont vers /streamer
  _router.push('/streamer')
}

const confirmRevokeTwitch = async () => {
  revokeLoading.value = true
  try {
    await revokeTwitchAccess()
    showRevokeModal.value = false
  } catch (error) {
    console.error('[Settings] Failed to revoke Twitch access:', error)
  } finally {
    revokeLoading.value = false
  }
}

const handleDeleteAccount = async () => {
  if (deleteConfirmation.value !== 'SUPPRIMER') {
    return
  }

  deleteLoading.value = true
  try {
    await deleteAccount()
    showDeleteModal.value = false
    // Déconnecter et rediriger
    await logout()
    _router.push('/')
  } catch (error) {
    console.error('[Settings] Failed to delete account:', error)
  } finally {
    deleteLoading.value = false
  }
}

const connectTwitch = () => {
  const config = useRuntimeConfig()
  window.location.href = `${config.public.apiBase}/auth/twitch/redirect`
}
</script>
