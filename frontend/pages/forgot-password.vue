<template>
  <UCard class="w-full max-w-md bg-(--theme-card-bg) border border-(--theme-border)">
    <template #header>
      <div class="text-center space-y-3">
        <div class="flex justify-center">
          <UIcon name="i-lucide-key-round" class="size-12 text-primary" />
        </div>
        <h1 class="text-2xl font-bold">Mot de passe oublié</h1>
        <p class="text-sm text-muted">
          Entrez votre email pour recevoir un lien de réinitialisation
        </p>
      </div>
    </template>

    <div class="space-y-6">
      <!-- Formulaire -->
      <form v-if="!emailSent" @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-bold text-secondary ml-2 uppercase mb-2"> Email </label>
          <UInput
            v-model="email"
            type="email"
            placeholder="votre@email.com"
            size="xl"
            required
            :ui="{
              root: 'ring-0 border-0 rounded-lg overflow-hidden',
              base: 'px-3.5 py-2.5 bg-primary-100 text-primary-500 placeholder:text-primary-400 rounded-lg',
            }"
          />
        </div>

        <UButton type="submit" block size="lg" :loading="loading" :disabled="!email">
          Envoyer le lien
        </UButton>
      </form>

      <!-- Confirmation -->
      <div v-else class="space-y-4">
        <UAlert
          color="success"
          variant="soft"
          title="Email envoyé !"
          description="Si un compte existe avec cet email, vous recevrez un lien de réinitialisation."
          icon="i-lucide-check-circle"
        />

        <UButton block size="lg" variant="outline" @click="emailSent = false">
          Renvoyer l'email
        </UButton>
      </div>

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        :title="errorMessage"
        icon="i-lucide-alert-circle"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'

definePageMeta({
  layout: 'auth' as const,
})

const { forgotPassword, loading } = useAuth()

const email = ref('')
const emailSent = ref(false)
const errorMessage = ref<string | null>(null)

async function handleSubmit() {
  errorMessage.value = null

  const result = await forgotPassword(email.value)

  if (result.success) {
    emailSent.value = true
  } else if (result.error) {
    errorMessage.value = result.error.error
  }
}
</script>
