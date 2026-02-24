<template>
  <UCard class="w-full max-w-md bg-(--theme-card-bg) border border-(--theme-border)">
    <template #header>
      <div class="text-center space-y-3">
        <div class="flex justify-center">
          <div
            :class="[
              'size-16 rounded-full flex items-center justify-center',
              verificationStatus === 'loading' && 'bg-primary/10',
              verificationStatus === 'success' && 'bg-success/10',
              verificationStatus === 'error' && 'bg-error/10',
            ]"
          >
            <UIcon
              v-if="verificationStatus === 'loading'"
              name="i-game-icons-dice-twenty-faces-twenty"
              class="size-8 text-primary animate-spin-slow"
            />
            <UIcon
              v-else-if="verificationStatus === 'success'"
              name="i-lucide-check-circle"
              class="size-8 text-success"
            />
            <UIcon v-else name="i-lucide-x-circle" class="size-8 text-error" />
          </div>
        </div>
        <h1 class="text-2xl font-bold">
          <template v-if="verificationStatus === 'loading'">Vérification en cours...</template>
          <template v-else-if="verificationStatus === 'success'">Email vérifié !</template>
          <template v-else>Échec de la vérification</template>
        </h1>
      </div>
    </template>

    <div class="space-y-6">
      <template v-if="verificationStatus === 'loading'">
        <p class="text-center text-muted">Nous vérifions votre adresse email...</p>
      </template>

      <template v-else-if="verificationStatus === 'success'">
        <p class="text-center text-muted">
          Votre adresse email a été vérifiée avec succès. Vous pouvez maintenant accéder à toutes
          les fonctionnalités de Tumulte.
        </p>

        <UButton block size="lg" to="/dashboard"> Accéder à Tumulte </UButton>
      </template>

      <template v-else>
        <UAlert
          color="error"
          variant="soft"
          :title="errorMessage || 'Une erreur est survenue'"
          icon="i-lucide-alert-circle"
        />

        <div class="space-y-3">
          <UButton block size="lg" variant="outline" to="/verify-email"> Renvoyer l'email </UButton>

          <UButton block size="lg" variant="ghost" to="/login"> Retour à la connexion </UButton>
        </div>
      </template>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAnalytics } from '@/composables/useAnalytics'

definePageMeta({
  layout: 'auth' as const,
})

const route = useRoute()
const config = useRuntimeConfig()
const { track } = useAnalytics()

const verificationStatus = ref<'loading' | 'success' | 'error'>('loading')
const errorMessage = ref<string | null>(null)

onMounted(async () => {
  const token = route.query.token as string

  if (!token) {
    verificationStatus.value = 'error'
    errorMessage.value = 'Lien de vérification invalide.'
    return
  }

  try {
    const response = await fetch(`${config.public.apiBase}/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
      credentials: 'include',
    })

    const result = await response.json()

    if (response.ok) {
      verificationStatus.value = 'success'
      track('email_verified')
    } else {
      verificationStatus.value = 'error'
      errorMessage.value = result.error || 'Une erreur est survenue.'
    }
  } catch {
    verificationStatus.value = 'error'
    errorMessage.value = 'Impossible de contacter le serveur.'
  }
})
</script>
