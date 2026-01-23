<script setup lang="ts">
import { useAuth } from '@/composables/useAuth'

definePageMeta({
  middleware: async () => {
    const { fetchMe } = useAuth()

    try {
      // Essayer de récupérer l'utilisateur connecté
      await fetchMe()

      // Tous les utilisateurs authentifiés vont vers /dashboard
      return navigateTo('/dashboard')
    } catch {
      // Si non authentifié, rediriger vers la landing page
      return navigateTo('/home')
    }
  },
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-subtle">
    <UIcon
      name="i-game-icons-dice-twenty-faces-twenty"
      class="w-40 h-40 text-primary animate-spin-slow"
    />
  </div>
</template>
