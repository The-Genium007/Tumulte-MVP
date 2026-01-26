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
      <p class="text-center text-muted">
        Nous avons envoyé un email de vérification à
        <span v-if="user?.email" class="font-medium text-default">{{ user.email }}</span>
        <span v-else class="font-medium text-default">votre adresse email</span>.
      </p>

      <p class="text-center text-sm text-muted">
        Cliquez sur le lien dans l'email pour activer votre compte. Si vous ne trouvez pas l'email,
        vérifiez vos spams.
      </p>

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
        :title="errorMessage"
        icon="i-lucide-alert-circle"
      />

      <div class="space-y-3">
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

        <UButton block size="lg" variant="ghost" to="/login"> Retour à la connexion </UButton>
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

const { user, resendVerificationEmail } = useAuth()

const resending = ref(false)
const cooldown = ref(0)
const successMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

let cooldownInterval: ReturnType<typeof setInterval> | null = null

async function handleResend() {
  successMessage.value = null
  errorMessage.value = null
  resending.value = true

  const result = await resendVerificationEmail()

  resending.value = false

  if (result.success) {
    successMessage.value = 'Email de vérification envoyé !'
    startCooldown()
  } else if (result.error) {
    errorMessage.value = result.error.error
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

onMounted(() => {
  // Start with a short cooldown to prevent immediate resend
  cooldown.value = 10
  cooldownInterval = setInterval(() => {
    cooldown.value--
    if (cooldown.value <= 0 && cooldownInterval) {
      clearInterval(cooldownInterval)
      cooldownInterval = null
    }
  }, 1000)
})

onUnmounted(() => {
  if (cooldownInterval) {
    clearInterval(cooldownInterval)
  }
})
</script>
