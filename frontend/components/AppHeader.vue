<template>
  <header
    class="sticky top-0 z-50 transition-all duration-300"
    :class="[isScrolled ? 'bg-subtle/95 backdrop-blur-md shadow-sm' : 'bg-transparent']"
  >
    <div class="container-page py-4">
      <nav class="flex items-center justify-between">
        <!-- Logo -->
        <NuxtLink :to="user ? '/dashboard' : '/'" class="flex items-center gap-3 group">
          <img
            src="~/assets/images/logo.png"
            alt="Tumulte"
            class="size-10 sm:size-12 transition-transform group-hover:scale-105"
          />
          <h1 class="text-lg sm:text-2xl font-bold text-primary hidden sm:block">Tumulte</h1>
        </NuxtLink>

        <!-- Affichage conditionnel : UserMenu si connecté, CTA sinon -->
        <!-- Pendant le chargement, ne rien afficher pour éviter le flash -->
        <UserMenu v-if="!isCheckingAuth && user" />
        <div v-else-if="!isCheckingAuth" class="flex items-center gap-3">
          <UButton variant="ghost" to="/login" size="sm" class="hidden sm:inline-flex">
            Connexion
          </UButton>
          <UButton to="/register" size="sm" class="cta-glow">
            <span class="hidden sm:inline">S'inscrire</span>
            <span class="sm:hidden">Rejoindre</span>
          </UButton>
        </div>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useWindowScroll } from '@vueuse/core'
import { useAuth } from '@/composables/useAuth'
import UserMenu from '@/components/UserMenu.vue'

const { y } = useWindowScroll()
const isScrolled = computed(() => y.value > 20)

const { user, fetchMe } = useAuth()
const isCheckingAuth = ref(true)

// Vérifier l'authentification au montage du composant
onMounted(async () => {
  try {
    // Essayer de récupérer l'utilisateur s'il est connecté
    await fetchMe()
  } catch {
    // Si l'utilisateur n'est pas connecté, c'est normal
    // On ne fait rien
  } finally {
    isCheckingAuth.value = false
  }
})
</script>
