<template>
  <UCard class="w-full max-w-md bg-(--theme-card-bg) border border-(--theme-border)">
    <template #header>
      <div class="text-center space-y-3">
        <div class="flex justify-center">
          <div class="size-16 rounded-full bg-primary/10 flex items-center justify-center">
            <UIcon name="i-lucide-lock-keyhole" class="size-8 text-primary" />
          </div>
        </div>
        <h1 class="text-2xl font-bold">Nouveau mot de passe</h1>
        <p class="text-sm text-muted">Choisissez un nouveau mot de passe sécurisé</p>
      </div>
    </template>

    <div class="space-y-6">
      <!-- Token invalide -->
      <template v-if="!token">
        <UAlert
          color="error"
          variant="soft"
          title="Lien invalide"
          description="Ce lien de réinitialisation est invalide ou a expiré."
          icon="i-lucide-alert-circle"
        />

        <UButton block size="lg" to="/forgot-password"> Demander un nouveau lien </UButton>
      </template>

      <!-- Succès -->
      <template v-else-if="resetSuccess">
        <UAlert
          color="success"
          variant="soft"
          title="Mot de passe modifié !"
          description="Vous pouvez maintenant vous connecter avec votre nouveau mot de passe."
          icon="i-lucide-check-circle"
        />

        <UButton block size="lg" to="/login"> Se connecter </UButton>
      </template>

      <!-- Formulaire -->
      <template v-else>
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <UFormField label="Nouveau mot de passe" name="password" :error="fieldErrors.password">
            <UInput
              v-model="form.password"
              type="password"
              placeholder="Minimum 8 caractères"
              icon="i-lucide-lock"
              size="lg"
              required
            />
          </UFormField>

          <UFormField
            label="Confirmer le mot de passe"
            name="passwordConfirmation"
            :error="fieldErrors.passwordConfirmation"
          >
            <UInput
              v-model="form.passwordConfirmation"
              type="password"
              placeholder="Confirmez votre mot de passe"
              icon="i-lucide-lock"
              size="lg"
              required
            />
          </UFormField>

          <UButton type="submit" block size="lg" :loading="loading" :disabled="!isFormValid">
            Réinitialiser le mot de passe
          </UButton>
        </form>

        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          :title="errorMessage"
          icon="i-lucide-alert-circle"
        />
      </template>

      <!-- Retour connexion -->
      <div v-if="!resetSuccess" class="text-center">
        <NuxtLink to="/login" class="text-sm text-primary hover:underline">
          <UIcon name="i-lucide-arrow-left" class="size-4 mr-1" />
          Retour à la connexion
        </NuxtLink>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

definePageMeta({
  layout: 'auth' as const,
})

const route = useRoute()
const { resetPassword, loading } = useAuth()

const token = ref<string | null>(null)
const resetSuccess = ref(false)
const errorMessage = ref<string | null>(null)
const fieldErrors = reactive<Record<string, string | undefined>>({})

const form = reactive({
  password: '',
  passwordConfirmation: '',
})

const isFormValid = computed(() => {
  return form.password.length >= 8 && form.password === form.passwordConfirmation
})

onMounted(() => {
  token.value = (route.query.token as string) || null
})

async function handleSubmit() {
  if (!token.value) return

  errorMessage.value = null
  Object.keys(fieldErrors).forEach((key) => (fieldErrors[key] = undefined))

  const result = await resetPassword(token.value, form.password, form.passwordConfirmation)

  if (result.success) {
    resetSuccess.value = true
  } else if (result.error) {
    errorMessage.value = result.error.error

    // Check if token expired
    if (result.error.error.includes('expiré') || result.error.error.includes('invalide')) {
      token.value = null
    }

    // Map field-specific errors
    if (result.error.errors) {
      Object.entries(result.error.errors).forEach(([field, messages]) => {
        fieldErrors[field] = messages[0]
      })
    }
  }
}
</script>
