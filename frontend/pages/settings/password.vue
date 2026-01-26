<template>
  <div class="max-w-2xl mx-auto space-y-6">
    <!-- Header avec retour -->
    <UCard>
      <div class="flex items-center gap-4">
        <UButton
          color="neutral"
          variant="soft"
          size="xl"
          square
          class="group shrink-0"
          to="/settings"
        >
          <template #leading>
            <UIcon
              name="i-lucide-arrow-left"
              class="size-6 transition-transform duration-200 group-hover:-translate-x-1"
            />
          </template>
        </UButton>
        <h1 class="text-xl sm:text-3xl font-bold text-primary">
          {{ user?.hasPassword ? 'Modifier le mot de passe' : 'Créer un mot de passe' }}
        </h1>
      </div>
    </UCard>

    <UCard>
      <template #header>
        <h2 class="text-xl font-semibold text-primary">
          {{ user?.hasPassword ? 'Changer votre mot de passe' : 'Définir un mot de passe' }}
        </h2>
      </template>

      <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Current password (only if has password) -->
        <UFormField
          v-if="user?.hasPassword"
          label="Mot de passe actuel"
          name="currentPassword"
          :error="fieldErrors.currentPassword"
          required
        >
          <UInput
            v-model="form.currentPassword"
            type="password"
            placeholder="Votre mot de passe actuel"
            leading-icon="i-lucide-lock"
            color="primary"
            variant="outline"
            size="xl"
            required
          />
        </UFormField>

        <UFormField
          label="Nouveau mot de passe"
          name="password"
          :error="fieldErrors.password"
          required
          hint="Minimum 8 caractères"
        >
          <UInput
            v-model="form.password"
            type="password"
            placeholder="Votre nouveau mot de passe"
            leading-icon="i-lucide-lock"
            color="primary"
            variant="outline"
            size="xl"
            required
          />
        </UFormField>

        <UFormField
          label="Confirmer le mot de passe"
          name="passwordConfirmation"
          :error="fieldErrors.passwordConfirmation"
          required
        >
          <UInput
            v-model="form.passwordConfirmation"
            type="password"
            placeholder="Confirmez votre nouveau mot de passe"
            leading-icon="i-lucide-lock"
            color="primary"
            variant="outline"
            size="xl"
            required
          />
        </UFormField>

        <UAlert v-if="errorMessage" color="error" variant="subtle" icon="i-lucide-alert-circle">
          <template #title>
            <span class="font-semibold">{{ errorMessage }}</span>
          </template>
        </UAlert>

        <UAlert
          v-if="successMessage"
          color="success"
          variant="subtle"
          icon="i-lucide-check-circle-2"
        >
          <template #title>
            <span class="font-semibold">{{ successMessage }}</span>
          </template>
        </UAlert>

        <div class="flex flex-col sm:flex-row gap-3 pt-4">
          <UButton
            type="submit"
            color="primary"
            variant="solid"
            size="xl"
            class="w-full sm:w-auto"
            :loading="loading"
            :disabled="!isFormValid"
            trailing-icon="i-lucide-check"
          >
            {{ user?.hasPassword ? 'Modifier le mot de passe' : 'Créer le mot de passe' }}
          </UButton>
          <UButton
            color="neutral"
            variant="soft"
            size="xl"
            class="w-full sm:w-auto"
            to="/settings"
            trailing-icon="i-lucide-x"
          >
            Annuler
          </UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useAuth } from '@/composables/useAuth'

definePageMeta({
  layout: 'authenticated' as const,
  middleware: 'auth',
})

const { user } = useAuth()
const config = useRuntimeConfig()

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const fieldErrors = reactive<Record<string, string | undefined>>({})

const form = reactive({
  currentPassword: '',
  password: '',
  passwordConfirmation: '',
})

const isFormValid = computed(() => {
  const hasCurrentIfNeeded = user.value?.hasPassword ? form.currentPassword.length > 0 : true
  return (
    hasCurrentIfNeeded && form.password.length >= 8 && form.password === form.passwordConfirmation
  )
})

async function handleSubmit() {
  loading.value = true
  errorMessage.value = null
  successMessage.value = null
  Object.keys(fieldErrors).forEach((key) => (fieldErrors[key] = undefined))

  try {
    const endpoint = user.value?.hasPassword
      ? `${config.public.apiBase}/auth/change-password`
      : `${config.public.apiBase}/auth/set-password`

    const body = user.value?.hasPassword
      ? {
          currentPassword: form.currentPassword,
          newPassword: form.password,
        }
      : {
          password: form.password,
        }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    })

    const result = await response.json()

    if (response.ok) {
      successMessage.value = user.value?.hasPassword
        ? 'Mot de passe modifié avec succès'
        : 'Mot de passe créé avec succès'
      form.currentPassword = ''
      form.password = ''
      form.passwordConfirmation = ''
    } else {
      errorMessage.value = result.error

      if (result.errors) {
        Object.entries(result.errors).forEach(([field, messages]) => {
          fieldErrors[field] = (messages as string[])[0]
        })
      }
    }
  } catch {
    errorMessage.value = 'Une erreur est survenue'
  } finally {
    loading.value = false
  }
}
</script>
