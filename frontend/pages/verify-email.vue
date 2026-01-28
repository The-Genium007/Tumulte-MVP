<template>
  <UCard class="w-full max-w-md bg-(--theme-card-bg) border border-(--theme-border)">
    <template #header>
      <div class="text-center space-y-3">
        <div class="flex justify-center">
          <div class="size-16 rounded-full bg-primary/10 flex items-center justify-center">
            <UIcon name="i-lucide-mail-check" class="size-8 text-primary" />
          </div>
        </div>
        <h1 class="text-2xl font-bold">Vérifiez votre email</h1>
      </div>
    </template>

    <div class="space-y-6">
      <!-- État authentifié : affiche l'email -->
      <template v-if="isAuthenticated && user?.email">
        <p class="text-center text-muted">
          Nous avons envoyé un email de vérification à
          <span class="font-medium text-default">{{ user.email }}</span
          >.
        </p>

        <p class="text-center text-sm text-muted">
          Cliquez sur le lien dans l'email pour activer votre compte. Si vous ne trouvez pas
          l'email, vérifiez vos spams.
        </p>
      </template>

      <!-- État non authentifié : message informatif -->
      <template v-else-if="!loading">
        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-log-in"
          title="Connexion requise"
          description="Connectez-vous pour renvoyer l'email de vérification à votre adresse."
        />
      </template>

      <!-- État de chargement -->
      <template v-else>
        <div class="flex justify-center py-4">
          <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-muted" />
        </div>
      </template>

      <UAlert
        v-if="successMessage"
        color="success"
        variant="soft"
        :title="successMessage"
        icon="i-lucide-check-circle"
      />

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
      >
        <template #title>{{ errorMessage }}</template>
        <template v-if="isSessionExpired" #description>
          <NuxtLink to="/login" class="underline hover:no-underline">
            Cliquez ici pour vous reconnecter
          </NuxtLink>
        </template>
      </UAlert>

      <div class="space-y-3">
        <!-- Bouton Renvoyer : visible uniquement si authentifié -->
        <UButton
          v-if="isAuthenticated"
          block
          size="lg"
          variant="outline"
          :loading="resending"
          :disabled="cooldown > 0"
          @click="handleResend"
        >
          <template v-if="cooldown > 0"> Renvoyer dans {{ cooldown }}s </template>
          <template v-else> Renvoyer l'email </template>
        </UButton>

        <!-- Bouton Se connecter : visible si non authentifié -->
        <UButton v-else block size="lg" to="/login"> Se connecter </UButton>

        <UButton
          v-if="isAuthenticated"
          block
          size="lg"
          variant="ghost"
          to="/login"
          @click="handleLogout"
        >
          Utiliser un autre compte
        </UButton>
        <UButton v-else block size="lg" variant="ghost" to="/register">
          Créer un compte
        </UButton>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuth } from '@/composables/useAuth'

definePageMeta({
  layout: 'auth' as const,
})

const { user, isAuthenticated, loading, fetchMe, resendVerificationEmail, logout } = useAuth()

const resending = ref(false)
const cooldown = ref(0)
const successMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const isSessionExpired = ref(false)

let cooldownInterval: ReturnType<typeof setInterval> | null = null

// Tenter de récupérer l'utilisateur au montage
onMounted(async () => {
  if (!user.value) {
    try {
      await fetchMe()
    } catch {
      // Pas de session, l'utilisateur devra se connecter
    }
  }

  // Cooldown initial seulement si authentifié
  if (isAuthenticated.value) {
    cooldown.value = 10
    cooldownInterval = setInterval(() => {
      cooldown.value--
      if (cooldown.value <= 0 && cooldownInterval) {
        clearInterval(cooldownInterval)
        cooldownInterval = null
      }
    }, 1000)
  }
})

async function handleResend() {
  successMessage.value = null
  errorMessage.value = null
  isSessionExpired.value = false
  resending.value = true

  const result = await resendVerificationEmail()

  resending.value = false

  if (result.success) {
    successMessage.value = 'Email de vérification envoyé !'
    startCooldown()
  } else if (result.error) {
    // Détecter si c'est une erreur d'authentification (session expirée)
    if (result.isUnauthorized) {
      errorMessage.value = 'Votre session a expiré.'
      isSessionExpired.value = true
    } else {
      errorMessage.value = result.error.error || 'Une erreur est survenue.'
    }
  }
}

async function handleLogout() {
  try {
    await logout()
  } catch {
    // Ignore, navigateTo('/login') sera fait par le logout
  }
}

function startCooldown() {
  cooldown.value = 60

  cooldownInterval = setInterval(() => {
    cooldown.value--
    if (cooldown.value <= 0 && cooldownInterval) {
      clearInterval(cooldownInterval)
      cooldownInterval = null
    }
  }, 1000)
}

onUnmounted(() => {
  if (cooldownInterval) {
    clearInterval(cooldownInterval)
  }
})
</script>
