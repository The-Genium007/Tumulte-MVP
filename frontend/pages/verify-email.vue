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
      <!-- Message d'information sur la vérification -->
      <p class="text-center text-muted">
        Nous avons envoyé un email de vérification à
        <span class="font-medium text-default">{{ user?.email }}</span
        >.
      </p>

      <p class="text-center text-sm text-muted">
        Cliquez sur le lien dans l'email pour activer votre compte. Si vous ne trouvez pas l'email,
        vérifiez vos spams.
      </p>

      <!-- Info sur la redirection après vérification -->
      <UAlert
        v-if="route.query.redirect"
        color="info"
        variant="soft"
        icon="i-lucide-info"
        title="Vérification requise"
        description="Vérifiez votre email pour accéder à cette page."
      />

      <UAlert
        v-if="successMessage"
        color="success"
        variant="soft"
        :title="successMessage"
        icon="i-lucide-check-circle"
      />

      <UAlert v-if="errorMessage" color="error" variant="soft" icon="i-lucide-alert-circle">
        <template #title>{{ errorMessage }}</template>
        <template v-if="isSessionExpired" #description>
          <NuxtLink to="/login" class="underline hover:no-underline">
            Cliquez ici pour vous reconnecter
          </NuxtLink>
        </template>
      </UAlert>

      <div class="space-y-3">
        <!-- Bouton Renvoyer l'email -->
        <UButton
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

        <!-- Utiliser un autre compte -->
        <UButton block size="lg" variant="ghost" @click="handleLogout">
          Utiliser un autre compte
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
  middleware: 'auth-unverified',
})

const { user, resendVerificationEmail, logout } = useAuth()
const route = useRoute()

const resending = ref(false)
const cooldown = ref(0)
const successMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const isSessionExpired = ref(false)

let cooldownInterval: ReturnType<typeof setInterval> | null = null

// Le middleware auth-unverified s'occupe de l'authentification
// Si on arrive ici, l'utilisateur est forcément connecté (sinon redirigé vers /login)
onMounted(() => {
  // Cooldown initial pour éviter le spam d'envoi d'emails
  cooldown.value = 10
  cooldownInterval = setInterval(() => {
    cooldown.value--
    if (cooldown.value <= 0 && cooldownInterval) {
      clearInterval(cooldownInterval)
      cooldownInterval = null
    }
  }, 1000)
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
