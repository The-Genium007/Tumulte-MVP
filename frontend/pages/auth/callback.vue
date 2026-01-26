<template>
  <div class="min-h-screen flex items-center justify-center bg-secondary">
    <UIcon
      name="i-game-icons-dice-twenty-faces-twenty"
      class="w-40 h-40 text-primary animate-spin-slow"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'

const route = useRoute()
const _router = useRouter()
const { fetchMe } = useAuth()

onMounted(async () => {
  try {
    // Récupérer l'utilisateur connecté
    await fetchMe()

    // Récupérer et valider la destination de redirection
    // Sécurité: empêcher les open redirects vers des domaines externes
    const rawRedirect = (route.query.redirect as string) || '/'
    const safeRedirect =
      rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/'

    // Rediriger vers la page appropriée
    _router.push(safeRedirect)
  } catch (error) {
    console.error('Auth callback error:', error)
    // Si erreur, rediriger vers login
    _router.push('/login?error=session_failed')
  }
})
</script>
