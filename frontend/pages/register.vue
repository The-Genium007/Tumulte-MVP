<template>
  <UCard class="w-full max-w-md bg-(--theme-card-bg) border border-(--theme-border)">
    <template #header>
      <div class="text-center space-y-3">
        <div class="flex justify-center">
          <img src="~/assets/images/logo.png" alt="Tumulte" class="size-24" />
        </div>
        <h1 class="text-3xl font-bold text-primary">Créer un compte</h1>
        <p class="text-sm text-muted">Rejoignez Tumulte gratuitement</p>
      </div>
    </template>

    <div class="space-y-6">
      <!-- Message d'erreur global (bien visible en haut) -->
      <UAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        class="mb-4"
      >
        <template #title>
          <span class="font-semibold">Erreur</span>
        </template>
        <template #description>
          <span class="text-sm">{{ errorMessage }}</span>
        </template>
      </UAlert>

      <!-- Formulaire d'inscription -->
      <form @submit.prevent="handleRegister" class="space-y-4">
        <div>
          <label class="block text-sm font-bold text-secondary ml-2 uppercase mb-2">
            Nom d'affichage
          </label>
          <UInput
            v-model="form.displayName"
            type="text"
            name="name"
            autocomplete="name"
            placeholder="Votre pseudo"
            size="xl"
            required
            :ui="{
              root: 'ring-0 border-0 rounded-lg overflow-hidden',
              base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
            }"
          />
          <p v-if="fieldErrors.displayName" class="text-xs text-error-500 mt-1 ml-2">
            {{ fieldErrors.displayName }}
          </p>
        </div>

        <div>
          <label class="block text-sm font-bold text-secondary ml-2 uppercase mb-2"> Email </label>
          <UInput
            v-model="form.email"
            type="email"
            name="email"
            autocomplete="email"
            placeholder="votre@email.com"
            size="xl"
            required
            :ui="{
              root: 'ring-0 border-0 rounded-lg overflow-hidden',
              base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
            }"
          />
          <p v-if="fieldErrors.email" class="text-xs text-error-500 mt-1 ml-2">
            {{ fieldErrors.email }}
          </p>
        </div>

        <div>
          <label class="block text-sm font-bold text-secondary ml-2 uppercase mb-2">
            Mot de passe
          </label>
          <UInput
            v-model="form.password"
            type="password"
            name="new-password"
            autocomplete="new-password"
            placeholder="Minimum 8 caractères"
            size="xl"
            required
            :ui="{
              root: 'ring-0 border-0 rounded-lg overflow-hidden',
              base: 'px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg',
            }"
          />
          <!-- Password strength meter -->
          <div class="mt-2">
            <PasswordStrengthMeter
              :model-value="form.password"
              @update:score="passwordScore = $event"
              @update:is-strong="isPasswordStrong = $event"
            />
          </div>
          <p v-if="fieldErrors.password" class="text-xs text-error-500 mt-1 ml-2">
            {{ fieldErrors.password }}
          </p>
        </div>

        <div>
          <label class="block text-sm font-bold text-secondary ml-2 uppercase mb-2">
            Confirmer le mot de passe
          </label>
          <UInput
            v-model="form.passwordConfirmation"
            type="password"
            name="new-password-confirm"
            autocomplete="new-password"
            placeholder="Confirmez votre mot de passe"
            size="xl"
            required
            :ui="{
              root: 'ring-0 border-0 rounded-lg overflow-hidden',
              base: `px-3.5 py-2.5 bg-(--theme-input-bg) text-(--theme-input-text) placeholder:text-(--theme-input-placeholder) rounded-lg ${
                confirmationTouched && !passwordsMatch ? 'ring-2 ring-error-500' : ''
              }`,
            }"
          />
          <!-- Password mismatch indicator -->
          <p
            v-if="confirmationTouched && !passwordsMatch"
            class="text-xs text-error-500 mt-1 ml-2 flex items-center gap-1"
          >
            <UIcon name="i-lucide-x-circle" class="size-3.5" />
            Les mots de passe ne correspondent pas
          </p>
          <!-- Password match indicator -->
          <p
            v-else-if="confirmationTouched && passwordsMatch && form.password.length > 0"
            class="text-xs text-success-500 mt-1 ml-2 flex items-center gap-1"
          >
            <UIcon name="i-lucide-check-circle" class="size-3.5" />
            Les mots de passe correspondent
          </p>
          <p v-if="fieldErrors.passwordConfirmation" class="text-xs text-error-500 mt-1 ml-2">
            {{ fieldErrors.passwordConfirmation }}
          </p>
        </div>

        <UButton type="submit" block size="xl" :loading="loading" :disabled="!isFormValid">
          Créer mon compte
        </UButton>
      </form>

      <!-- Séparateur -->
      <div class="relative">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-default" />
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="bg-default px-2 text-muted">ou s'inscrire avec</span>
        </div>
      </div>

      <!-- Boutons OAuth -->
      <div class="grid grid-cols-2 gap-3">
        <UButton
          block
          size="xl"
          color="neutral"
          variant="outline"
          icon="i-simple-icons-twitch"
          class="hover:bg-[#9146FF]/10 hover:border-[#9146FF]"
          @click="handleOAuthRegister('twitch')"
        >
          Twitch
        </UButton>

        <UButton
          block
          size="xl"
          color="neutral"
          variant="outline"
          icon="i-simple-icons-google"
          class="hover:bg-[#4285F4]/10 hover:border-[#4285F4]"
          @click="handleOAuthRegister('google')"
        >
          Google
        </UButton>
      </div>

      <!-- Lien connexion -->
      <p class="text-center text-sm text-muted">
        Déjà un compte ?
        <NuxtLink to="/login" class="text-primary hover:underline font-medium">
          Se connecter
        </NuxtLink>
      </p>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

definePageMeta({
  layout: 'auth' as const,
})

const router = useRouter()
const { register, loginWithOAuth, loading } = useAuth()

const form = reactive({
  displayName: '',
  email: '',
  password: '',
  passwordConfirmation: '',
})

const errorMessage = ref<string | null>(null)
const fieldErrors = reactive<Record<string, string | undefined>>({})
const passwordScore = ref(0)
const isPasswordStrong = ref(false)

// Check if passwords match (only show error when confirmation is not empty)
const passwordsMatch = computed(() => {
  if (form.passwordConfirmation.length === 0) return true
  return form.password === form.passwordConfirmation
})

// Check if password confirmation has been touched
const confirmationTouched = computed(() => form.passwordConfirmation.length > 0)

const isFormValid = computed(() => {
  return (
    form.displayName.length >= 2 &&
    form.email.includes('@') &&
    form.password.length >= 8 &&
    isPasswordStrong.value &&
    form.password === form.passwordConfirmation
  )
})

async function handleRegister() {
  errorMessage.value = null
  Object.keys(fieldErrors).forEach((key) => (fieldErrors[key] = undefined))

  const result = await register(form)

  if (result.success) {
    router.push('/verify-email')
  } else if (result.error) {
    errorMessage.value = result.error.error

    // Map field-specific errors
    if (result.error.errors) {
      Object.entries(result.error.errors).forEach(([field, messages]) => {
        fieldErrors[field] = messages[0]
      })
    }
  }
}

function handleOAuthRegister(provider: 'twitch' | 'google') {
  loginWithOAuth(provider)
}
</script>
