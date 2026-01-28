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
              <UIcon
                name="i-lucide-arrow-left"
                class="size-6 sm:size-12 transition-transform duration-200 group-hover:-translate-x-1"
              />
            </template>
          </UButton>
          <h1 class="text-xl sm:text-3xl font-bold text-primary">Mon compte</h1>
        </div>
      </UCard>

      <!-- Informations du compte (enrichi avec avatar + tier) -->
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div>
              <h2 class="text-xl font-semibold text-primary">Profil</h2>
            </div>
          </div>
        </template>

        <div class="space-y-4">
          <!-- Avatar et infos -->
          <div class="flex items-center gap-4">
            <TwitchAvatar
              :image-url="user?.streamer?.profileImageUrl"
              :display-name="user?.streamer?.twitchDisplayName || user?.displayName || 'User'"
              size="xl"
              class="ring-2 ring-primary/20"
            />
            <div>
              <p class="font-heading text-lg text-primary uppercase">
                {{ user?.streamer?.twitchDisplayName || user?.displayName }}
              </p>
              <p class="text-sm text-muted">{{ user?.email || 'Non renseigné' }}</p>
              <UBadge
                v-if="user?.tier"
                :color="tierColors[user.tier]"
                variant="subtle"
                class="mt-1"
              >
                {{ tierLabels[user.tier] }}
              </UBadge>
            </div>
          </div>

          <!-- Email verification status -->
          <UAlert
            v-if="user?.email && !user.emailVerifiedAt"
            color="warning"
            variant="soft"
            icon="i-lucide-alert-triangle"
          >
            <template #title>Email non vérifié</template>
            <template #description>
              <p class="mb-2">
                Veuillez vérifier votre adresse email pour accéder à toutes les fonctionnalités.
              </p>
              <UButton
                size="xs"
                variant="outline"
                @click="handleResendVerification"
                :loading="resending"
              >
                Renvoyer l'email
              </UButton>
            </template>
          </UAlert>
        </div>
      </UCard>

      <!-- Méthodes de connexion -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold text-primary">Méthodes de connexion</h2>
        </template>

        <div class="space-y-4">
          <!-- Email/Password -->
          <div class="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-lg bg-default flex items-center justify-center">
                <UIcon name="i-lucide-mail" class="size-5" />
              </div>
              <div>
                <p class="font-medium">Email & mot de passe</p>
                <p class="text-sm text-muted">
                  {{ user?.email || 'Non configuré' }}
                </p>
              </div>
            </div>
            <UButton
              v-if="user?.hasPassword || user?.email"
              color="primary"
              variant="soft"
              size="sm"
              trailing-icon="i-lucide-chevron-right"
              @click="openPasswordModal"
            >
              Modifier
            </UButton>
            <UButton
              v-else
              color="primary"
              variant="solid"
              size="sm"
              trailing-icon="i-lucide-plus"
              @click="openPasswordModal"
            >
              Configurer
            </UButton>
          </div>

          <!-- OAuth Providers -->
          <div
            v-for="provider in oauthProviders"
            :key="provider.id"
            class="flex items-center justify-between p-3 rounded-lg bg-muted/50"
          >
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-lg bg-default flex items-center justify-center">
                <UIcon :name="provider.icon" :class="['size-5', provider.iconColor]" />
              </div>
              <div>
                <p class="font-medium">{{ provider.label }}</p>
                <p class="text-sm text-muted">
                  {{ getProviderStatus(provider.id) }}
                </p>
              </div>
            </div>
            <UButton
              v-if="isProviderLinked(provider.id)"
              variant="soft"
              size="sm"
              color="error"
              :disabled="!canUnlinkProvider"
              trailing-icon="i-lucide-unlink"
              @click="handleUnlinkProvider(provider.id)"
            >
              Délier
            </UButton>
            <UButton
              v-else
              color="primary"
              variant="solid"
              size="sm"
              trailing-icon="i-lucide-link"
              @click="handleLinkProvider(provider.id)"
            >
              Lier
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Services connectés (Twitch streaming uniquement maintenant) -->
      <UCard ref="twitchCardRef">
        <template #header>
          <div class="flex items-center gap-3">
            <div>
              <h2 class="text-xl font-semibold text-primary">Services connectés</h2>
            </div>
          </div>
        </template>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Services futurs VTT -->
          <div class="p-4 rounded-lg bg-elevated border border-default opacity-60">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="p-2">
                  <UIcon name="i-lucide-video" class="size-6 text-muted" />
                </div>
                <div>
                  <h3 class="font-semibold text-primary">OBS Studio</h3>
                  <p class="text-sm text-muted">Contrôle OBS Studio</p>
                </div>
              </div>
              <UBadge label="Bientôt" color="info" variant="solid" />
            </div>
          </div>

          <button
            class="w-full p-4 rounded-lg bg-elevated border border-default hover:border-primary hover:bg-muted transition-colors cursor-pointer text-left"
            @click="showFoundrySlideover = true"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="p-2">
                  <UIcon name="i-lucide-castle" class="size-6 text-primary" />
                </div>
                <div>
                  <h3 class="font-semibold text-primary">Foundry VTT</h3>
                  <p class="text-sm text-muted">Gérer les connexions</p>
                </div>
              </div>
              <UIcon name="i-lucide-chevron-right" class="size-5 text-muted" />
            </div>
          </button>

          <div class="p-4 rounded-lg bg-elevated border border-default opacity-60">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="p-2">
                  <UIcon name="i-lucide-flask-conical" class="size-6 text-muted" />
                </div>
                <div>
                  <h3 class="font-semibold text-primary">TaleSpire</h3>
                  <p class="text-sm text-muted">Intégration TaleSpire</p>
                </div>
              </div>
              <UBadge label="Bientôt" color="info" variant="solid" />
            </div>
          </div>

          <div class="p-4 rounded-lg bg-elevated border border-default opacity-60">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="p-2">
                  <UIcon name="i-lucide-dice-6" class="size-6 text-muted" />
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

      <!-- Abonnement -->
      <UCard>
        <template #header>
          <h2 class="text-xl font-semibold text-primary">Abonnement</h2>
        </template>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium">Plan actuel</p>
              <p class="text-sm text-muted">{{ tierLabels[user?.tier ?? 'free'] }}</p>
            </div>
            <UBadge :color="tierColors[user?.tier ?? 'free']" variant="subtle" size="lg">
              {{ tierLabels[user?.tier ?? 'free'] }}
            </UBadge>
          </div>

          <UButton v-if="user?.tier === 'free'" block variant="outline" disabled>
            Passer à Premium (bientôt disponible)
          </UButton>
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

  <!-- Slideover Foundry VTT -->
  <SettingsFoundryConnectionsSlideover v-model="showFoundrySlideover" />

  <!-- Modal de mot de passe -->
  <UModal v-model:open="showPasswordModal" class="w-full max-w-2xl mx-4">
    <template #header>
      <div class="flex items-center gap-3">
        <UIcon name="i-lucide-lock" class="size-6 text-primary" />
        <h3 class="text-xl font-semibold text-primary">
          {{ user?.hasPassword ? 'Modifier le mot de passe' : 'Créer un mot de passe' }}
        </h3>
      </div>
    </template>

    <template #body>
      <form @submit.prevent="handlePasswordSubmit" class="space-y-6">
        <!-- Current password (only if has password) -->
        <UFormField
          v-if="user?.hasPassword"
          label="Mot de passe actuel"
          name="currentPassword"
          :error="passwordFieldErrors.currentPassword"
          required
        >
          <UInput
            v-model="passwordForm.currentPassword"
            type="password"
            placeholder="Votre mot de passe actuel"
            leading-icon="i-lucide-lock"
            size="xl"
            :ui="{
              root: 'relative',
              base: 'bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) focus:border-primary focus:ring-primary',
            }"
            required
          />
        </UFormField>

        <UFormField
          label="Nouveau mot de passe"
          name="password"
          :error="passwordFieldErrors.password"
          required
          hint="Minimum 8 caractères"
        >
          <UInput
            v-model="passwordForm.password"
            type="password"
            placeholder="Votre nouveau mot de passe"
            leading-icon="i-lucide-lock"
            size="xl"
            :ui="{
              root: 'relative',
              base: 'bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) focus:border-primary focus:ring-primary',
            }"
            required
          />
        </UFormField>

        <UFormField
          label="Confirmer le mot de passe"
          name="passwordConfirmation"
          :error="passwordFieldErrors.passwordConfirmation"
          required
        >
          <UInput
            v-model="passwordForm.passwordConfirmation"
            type="password"
            placeholder="Confirmez votre nouveau mot de passe"
            leading-icon="i-lucide-lock"
            size="xl"
            :ui="{
              root: 'relative',
              base: 'bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) focus:border-primary focus:ring-primary',
            }"
            required
          />
        </UFormField>

        <UAlert
          v-if="passwordErrorMessage"
          color="error"
          variant="subtle"
          icon="i-lucide-alert-circle"
        >
          <template #title>
            <span class="font-semibold">{{ passwordErrorMessage }}</span>
          </template>
        </UAlert>

        <UAlert
          v-if="passwordSuccessMessage"
          color="success"
          variant="subtle"
          icon="i-lucide-check-circle-2"
        >
          <template #title>
            <span class="font-semibold">{{ passwordSuccessMessage }}</span>
          </template>
        </UAlert>
      </form>
    </template>

    <template #footer>
      <div class="flex flex-col sm:flex-row justify-end gap-3 w-full">
        <UButton
          variant="outline"
          size="xl"
          class="w-full sm:w-auto"
          trailing-icon="i-lucide-x"
          @click="closePasswordModal"
        >
          Annuler
        </UButton>
        <UButton
          color="primary"
          variant="solid"
          size="xl"
          class="w-full sm:w-auto"
          :loading="passwordLoading"
          :disabled="!isPasswordFormValid"
          trailing-icon="i-lucide-check"
          @click="handlePasswordSubmit"
        >
          {{ user?.hasPassword ? 'Modifier le mot de passe' : 'Créer le mot de passe' }}
        </UButton>
      </div>
    </template>
  </UModal>

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
            Pour confirmer, veuillez saisir
            <span class="font-mono font-bold text-primary">SUPPRIMER</span> ci-dessous :
          </p>
          <UInput
            v-model="deleteConfirmation"
            placeholder="Tapez SUPPRIMER"
            size="lg"
            :ui="{
              root: 'ring-0 border-0 rounded-lg overflow-hidden',
              base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
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
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, computed, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useSettings } from '@/composables/useSettings'
import type { UserTier } from '@/types'

definePageMeta({
  layout: 'authenticated' as const,
  middleware: ['auth'],
})

useHead({
  title: 'Paramètres - Tumulte',
})

const route = useRoute()
const router = useRouter()
const { user, logout, resendVerificationEmail } = useAuth()
const { deleteAccount } = useSettings()
const toast = useToast()
const config = useRuntimeConfig()

// États
const showFoundrySlideover = ref(false)
const showDeleteModal = ref(false)
const deleteConfirmation = ref('')
const deleteLoading = ref(false)
const resending = ref(false)

// États pour le mot de passe
const showPasswordModal = ref(false)
const passwordLoading = ref(false)
const passwordErrorMessage = ref<string | null>(null)
const passwordSuccessMessage = ref<string | null>(null)
const passwordFieldErrors = reactive<Record<string, string | undefined>>({})

const passwordForm = reactive({
  currentPassword: '',
  password: '',
  passwordConfirmation: '',
})

// Référence vers la card Twitch pour l'auto-scroll
const twitchCardRef = ref<{ $el: HTMLElement } | null>(null)

// Tier labels et colors
const tierLabels: Record<UserTier, string> = {
  free: 'Gratuit',
  premium: 'Premium',
  admin: 'Admin',
}

const tierColors: Record<UserTier, 'neutral' | 'primary' | 'error'> = {
  free: 'neutral',
  premium: 'primary',
  admin: 'error',
}

// OAuth providers
const oauthProviders = [
  { id: 'twitch', label: 'Twitch', icon: 'i-simple-icons-twitch', iconColor: 'text-[#9146FF]' },
  { id: 'google', label: 'Google', icon: 'i-simple-icons-google', iconColor: 'text-[#4285F4]' },
]

// Toast helpers
function showSuccess(message: string) {
  toast.add({ title: message, color: 'success', icon: 'i-lucide-check-circle' })
}

function showError(message: string) {
  toast.add({ title: message, color: 'error', icon: 'i-lucide-alert-circle' })
}

// OAuth methods
const isProviderLinked = (providerId: string) => {
  return user.value?.authProviders?.some((p) => p.provider === providerId)
}

const getProviderStatus = (providerId: string) => {
  const provider = user.value?.authProviders?.find((p) => p.provider === providerId)
  if (provider) {
    return provider.providerDisplayName || provider.providerEmail || 'Connecté'
  }
  return 'Non lié'
}

const canUnlinkProvider = computed(() => {
  const linkedCount = user.value?.authProviders?.length ?? 0
  const hasPassword = user.value?.hasPassword ?? false
  // Must have at least one login method remaining
  return linkedCount > 1 || (linkedCount === 1 && hasPassword)
})

function handleLinkProvider(providerId: string) {
  // Redirect to OAuth with link mode
  window.location.href = `${config.public.apiBase}/auth/link/${providerId}`
}

async function handleUnlinkProvider(providerId: string) {
  try {
    const response = await fetch(`${config.public.apiBase}/auth/unlink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ provider: providerId }),
    })

    if (response.ok) {
      showSuccess('Compte délié avec succès')
      // Refresh user data
      window.location.reload()
    } else {
      const result = await response.json()
      showError(result.error || 'Une erreur est survenue')
    }
  } catch {
    showError('Une erreur est survenue')
  }
}

// Email verification
async function handleResendVerification() {
  resending.value = true
  const result = await resendVerificationEmail()
  resending.value = false

  if (result.success) {
    showSuccess('Email de vérification envoyé !')
  } else {
    showError(result.error?.error || 'Une erreur est survenue')
  }
}

// Auto-scroll vers la section Twitch si on arrive depuis l'onboarding
onMounted(async () => {
  if (route.query.linkTwitch === 'true') {
    await nextTick()
    setTimeout(() => {
      if (twitchCardRef.value?.$el) {
        twitchCardRef.value.$el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }
})

const goBackToDashboard = () => {
  router.push('/dashboard')
}

// Password methods
const isPasswordFormValid = computed(() => {
  const hasCurrentIfNeeded = user.value?.hasPassword
    ? passwordForm.currentPassword.length > 0
    : true
  return (
    hasCurrentIfNeeded &&
    passwordForm.password.length >= 8 &&
    passwordForm.password === passwordForm.passwordConfirmation
  )
})

function openPasswordModal() {
  showPasswordModal.value = true
  passwordErrorMessage.value = null
  passwordSuccessMessage.value = null
  passwordForm.currentPassword = ''
  passwordForm.password = ''
  passwordForm.passwordConfirmation = ''
  Object.keys(passwordFieldErrors).forEach((key) => (passwordFieldErrors[key] = undefined))
}

function closePasswordModal() {
  showPasswordModal.value = false
}

async function handlePasswordSubmit() {
  passwordLoading.value = true
  passwordErrorMessage.value = null
  passwordSuccessMessage.value = null
  Object.keys(passwordFieldErrors).forEach((key) => (passwordFieldErrors[key] = undefined))

  try {
    const endpoint = user.value?.hasPassword
      ? `${config.public.apiBase}/auth/change-password`
      : `${config.public.apiBase}/auth/set-password`

    const body = user.value?.hasPassword
      ? {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.password,
        }
      : {
          password: passwordForm.password,
        }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })

    const result = await response.json()

    if (response.ok) {
      passwordSuccessMessage.value = user.value?.hasPassword
        ? 'Mot de passe modifié avec succès'
        : 'Mot de passe créé avec succès'

      // Reset form
      passwordForm.currentPassword = ''
      passwordForm.password = ''
      passwordForm.passwordConfirmation = ''

      // Show success toast and close modal after a short delay
      showSuccess(passwordSuccessMessage.value)
      setTimeout(() => {
        closePasswordModal()
        // Refresh user data
        window.location.reload()
      }, 1500)
    } else {
      passwordErrorMessage.value = result.error

      if (result.errors) {
        Object.entries(result.errors).forEach(([field, messages]) => {
          passwordFieldErrors[field] = (messages as string[])[0]
        })
      }
    }
  } catch {
    passwordErrorMessage.value = 'Une erreur est survenue'
  } finally {
    passwordLoading.value = false
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
    router.push('/')
  } catch (error) {
    console.error('[Settings] Failed to delete account:', error)
  } finally {
    deleteLoading.value = false
  }
}
</script>
