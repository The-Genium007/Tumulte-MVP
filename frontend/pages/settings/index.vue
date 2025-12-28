<template>

    <div class="min-h-screen py-6">
      <div class="max-w-5xl mx-auto space-y-6">
        <!-- Bouton retour -->
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-arrow-left"
          label="Retour au dashboard"
          @click="goBackToDashboard"
        />

        <!-- Informations de base -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="bg-blue-500/10 p-3 rounded-xl">
                <UIcon name="i-lucide-user" class="size-6 text-blue-500" />
              </div>
              <div>
                <h2 class="text-xl font-semibold text-white">Informations du compte</h2>
                <p class="text-sm text-gray-400">Vos informations personnelles</p>
              </div>
            </div>
          </template>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p class="text-sm text-gray-400 mb-1">Nom du compte</p>
              <p class="text-lg font-semibold text-white">{{ user?.display_name }}</p>
            </div>
            <div>
              <p class="text-sm text-gray-400 mb-1">Rôle</p>
              <UBadge
                :label="user?.role === 'MJ' ? 'Maître du Jeu' : 'Streamer'"
                :color="user?.role === 'MJ' ? 'primary' : 'info'"
                variant="soft"
              />
            </div>
            <div>
              <p class="text-sm text-gray-400 mb-1">Email</p>
              <p class="text-lg font-semibold text-white">{{ user?.email || 'Non renseigné' }}</p>
            </div>
          </div>

          <!-- Informations Twitch pour les streamers -->
          <div v-if="user?.role === 'STREAMER' && user?.streamer" class="mt-6 pt-6 border-t border-gray-700">
            <h3 class="text-lg font-semibold text-white mb-4">Informations Twitch</h3>
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
                  :label="user.streamer.is_active ? 'Actif' : 'Inactif'"
                  :color="user.streamer.is_active ? 'success' : 'error'"
                  variant="soft"
                />
              </div>
              <div>
                <p class="text-sm text-gray-400 mb-1">Statut de connexion</p>
                <UBadge
                  label="Connecté"
                  color="success"
                  variant="soft"
                />
              </div>
            </div>
          </div>
        </UCard>

        <!-- Services connectés -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="bg-green-500/10 p-3 rounded-xl">
                <UIcon name="i-lucide-plug" class="size-6 text-green-500" />
              </div>
              <div>
                <h2 class="text-xl font-semibold text-white">Services connectés</h2>
                <p class="text-sm text-gray-400">Gérez vos intégrations et services</p>
              </div>
            </div>
          </template>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Twitch (si streamer) -->
            <div v-if="user?.role === 'STREAMER'" class="p-4 rounded-lg bg-gray-800/30 border border-gray-700">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="bg-purple-500/10 p-2 rounded-lg">
                    <UIcon name="i-lucide-twitch" class="size-6 text-purple-500" />
                  </div>
                  <div>
                    <h3 class="font-semibold text-white">Twitch</h3>
                    <p class="text-sm text-gray-400">Streaming et chat en direct</p>
                  </div>
                </div>
                <UBadge label="Connecté" color="success" variant="soft" />
              </div>
            </div>

            <!-- Services futurs -->
            <div class="p-4 rounded-lg bg-gray-800/30 border border-gray-700 opacity-60">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="bg-gray-500/10 p-2 rounded-lg">
                    <UIcon name="i-lucide-dice-6" class="size-6 text-gray-500" />
                  </div>
                  <div>
                    <h3 class="font-semibold text-white">Roll20</h3>
                    <p class="text-sm text-gray-400">Intégration parties Roll20</p>
                  </div>
                </div>
                <UBadge label="Bientôt" color="info" variant="soft" />
              </div>
            </div>

            <div class="p-4 rounded-lg bg-gray-800/30 border border-gray-700 opacity-60">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="bg-gray-500/10 p-2 rounded-lg">
                    <UIcon name="i-lucide-castle" class="size-6 text-gray-500" />
                  </div>
                  <div>
                    <h3 class="font-semibold text-white">Foundry VTT</h3>
                    <p class="text-sm text-gray-400">Synchronisation Foundry</p>
                  </div>
                </div>
                <UBadge label="Bientôt" color="info" variant="soft" />
              </div>
            </div>

            <div class="p-4 rounded-lg bg-gray-800/30 border border-gray-700 opacity-60">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="bg-gray-500/10 p-2 rounded-lg">
                    <UIcon name="i-lucide-flask-conical" class="size-6 text-gray-500" />
                  </div>
                  <div>
                    <h3 class="font-semibold text-white">Alchimie RPG</h3>
                    <p class="text-sm text-gray-400">Compte Alchimie RPG</p>
                  </div>
                </div>
                <UBadge label="Bientôt" color="info" variant="soft" />
              </div>
            </div>

            <div class="p-4 rounded-lg bg-gray-800/30 border border-gray-700 opacity-60">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="bg-gray-500/10 p-2 rounded-lg">
                    <UIcon name="i-lucide-video" class="size-6 text-gray-500" />
                  </div>
                  <div>
                    <h3 class="font-semibold text-white">OBS Studio</h3>
                    <p class="text-sm text-gray-400">Contrôle OBS Studio</p>
                  </div>
                </div>
                <UBadge label="Bientôt" color="info" variant="soft" />
              </div>
            </div>
          </div>
        </UCard>

        <!-- Grille des zones de danger -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Révocation Twitch (si streamer) -->
          <UCard v-if="user?.role === 'STREAMER'" class="border-error-500/50">
            <template #header>
              <div class="flex items-center gap-3">
                <div class="bg-error-500/10 p-3 rounded-xl">
                  <UIcon name="i-lucide-twitch" class="size-6 text-error-500" />
                </div>
                <div>
                  <h2 class="text-xl font-semibold text-white">Révocation Twitch</h2>
                  <p class="text-sm text-gray-400">Gérer votre connexion Twitch</p>
                </div>
              </div>
            </template>

            <div class="space-y-4">
              <div class="p-4 rounded-lg bg-error-500/5 border border-error-500/20">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h3 class="font-semibold text-white mb-1">Révoquer l'accès Twitch</h3>
                    <p class="text-sm text-gray-400">
                      Révoque l'accès de Tumulte à votre compte Twitch et désactive votre compte streamer.
                    </p>
                  </div>
                  <UButton
                    color="error"
                    variant="solid"
                    label="Révoquer l'accès"
                    :loading="revokeLoading"
                    @click="handleRevokeTwitch"
                  />
                </div>
              </div>
            </div>
          </UCard>

          <!-- Révocation de compte -->
          <UCard class="border-error-500/50" :class="{ 'md:col-span-2': user?.role !== 'STREAMER' }">
          <template #header>
            <div class="flex items-center gap-3">
              <div class="bg-error-500/10 p-3 rounded-xl">
                <UIcon name="i-lucide-shield-alert" class="size-6 text-error-500" />
              </div>
              <div>
                <h2 class="text-xl font-semibold text-white">Révoquer l'acces Twitch</h2>
                <p class="text-sm text-gray-400">Gestion de vos données personnelles</p>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <div class="p-4 rounded-lg bg-error-500/5 border border-error-500/20">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h3 class="font-semibold text-white mb-1">Bloque mon compte </h3>
                  <p class="text-sm text-gray-400">
                    Cette action bloquera toutes vos actions sur la platforme twitch.
                  </p>
                </div>
                <UButton
                  color="error"
                  variant="solid"
                  label="Révoquer l'acces"
                  @click="showRevokeModal = true"
                />
              </div>
            </div>
          </div>
        </UCard>

          <!-- Suppression de compte -->
          <UCard class="border-error-500/50" :class="{ 'md:col-span-2': user?.role !== 'STREAMER' }">
          <template #header>
            <div class="flex items-center gap-3">
              <div class="bg-error-500/10 p-3 rounded-xl">
                <UIcon name="i-lucide-shield-alert" class="size-6 text-error-500" />
              </div>
              <div>
                <h2 class="text-xl font-semibold text-white">Suppression de compte</h2>
                <p class="text-sm text-gray-400">Gestion de vos données personnelles</p>
              </div>
            </div>
          </template>

          <div class="space-y-4">
            <div class="p-4 rounded-lg bg-error-500/5 border border-error-500/20">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h3 class="font-semibold text-white mb-1">Supprimer mon compte et mes données</h3>
                  <p class="text-sm text-gray-400">
                    Cette action anonymisera toutes vos données personnelles de manière irréversible.
                  </p>
                </div>
                <UButton
                  color="error"
                  variant="solid"
                  label="Supprimer le compte"
                  @click="showDeleteModal = true"
                />
              </div>
            </div>
          </div>
        </UCard>
        </div>
      </div>
    </div>

    <!-- Modal de confirmation de suppression -->
    <UModal v-model:open="showDeleteModal">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="bg-error-500/10 p-2 rounded-lg">
            <UIcon name="i-lucide-alert-triangle" class="size-6 text-error-500" />
          </div>
          <h3 class="text-xl font-semibold text-white">Confirmer la suppression</h3>
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
            <p class="text-sm text-gray-400 mb-2">
              Pour confirmer, veuillez saisir <span class="font-mono font-bold text-white">SUPPRIMER</span> ci-dessous :
            </p>
            <UInput
              v-model="deleteConfirmation"
              placeholder="Tapez SUPPRIMER"
              size="lg"
            />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="soft"
            label="Annuler"
            @click="showDeleteModal = false"
          />
          <UButton
            color="error"
            variant="solid"
            label="Confirmer la suppression"
            :disabled="deleteConfirmation !== 'SUPPRIMER'"
            :loading="deleteLoading"
            @click="handleDeleteAccount"
          />
        </div>
      </template>
    </UModal>

    <!-- Modal de confirmation de révocation Twitch -->
    <UModal v-model:open="showRevokeModal">
      <template #header>
        <div class="flex items-center gap-3">
          <div class="bg-error-500/10 p-2 rounded-lg">
            <UIcon name="i-lucide-alert-triangle" class="size-6 text-error-500" />
          </div>
          <h3 class="text-xl font-semibold text-white">Confirmer la révocation</h3>
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

          <p class="text-gray-300">
            Êtes-vous sûr de vouloir révoquer l'accès Twitch ?
          </p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="soft"
            label="Annuler"
            @click="showRevokeModal = false"
          />
          <UButton
            color="error"
            variant="solid"
            label="Confirmer la révocation"
            :loading="revokeLoading"
            @click="confirmRevokeTwitch"
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
});

const _router = useRouter()
const toast = useToast()
const { user, logout } = useAuth()
const { revokeTwitchAccess, deleteAccount } = useSettings()

const showDeleteModal = ref(false)
const deleteConfirmation = ref('')
const deleteLoading = ref(false)

const showRevokeModal = ref(false)
const revokeLoading = ref(false)

const goBackToDashboard = () => {
  // Rediriger vers le dashboard approprié selon le rôle
  if (user.value?.role === 'MJ') {
    _router.push('/mj')
  } else if (user.value?.role === 'STREAMER') {
    _router.push('/streamer')
  } else {
    _router.push('/')
  }
}

const handleRevokeTwitch = () => {
  showRevokeModal.value = true
}

const confirmRevokeTwitch = async () => {
  revokeLoading.value = true
  try {
    await revokeTwitchAccess()
    toast.add({
      title: 'Accès révoqué',
      description: 'Votre accès Twitch a été révoqué avec succès',
      color: 'success',
    })
    showRevokeModal.value = false
  } catch (error: unknown) {
    toast.add({
      title: 'Erreur',
      description: (error as Error).message,
      color: 'error',
    })
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
    toast.add({
      title: 'Compte supprimé',
      description: 'Votre compte et vos données ont été anonymisés avec succès',
      color: 'success',
    })
    showDeleteModal.value = false
    // Déconnecter et rediriger
    await logout()
    _router.push('/')
  } catch (error: unknown) {
    toast.add({
      title: 'Erreur',
      description: (error as Error).message,
      color: 'error',
    })
  } finally {
    deleteLoading.value = false
  }
}
</script>
