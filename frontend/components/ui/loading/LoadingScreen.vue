<template>
  <Transition name="fade" @after-leave="$emit('transitionEnd')">
    <div
      v-if="isVisible"
      :class="[
        'loading-screen',
        'fixed inset-0 z-50',
        'flex items-center justify-center',
        isDark ? 'dark-theme' : 'light-theme',
      ]"
    >
      <!-- Motif décoratif en arrière-plan -->
      <div class="loading-pattern" />

      <!-- Conteneur principal avec effet de glow -->
      <div class="loading-content relative flex flex-col items-center gap-6">
        <!-- Cercle lumineux derrière le dé -->
        <div class="loading-glow" />

        <!-- Icône du D20 -->
        <UIcon
          name="i-game-icons-dice-twenty-faces-twenty"
          class="loading-dice w-32 h-32 sm:w-40 sm:h-40 animate-spin-slow relative z-10"
        />

        <!-- Texte de chargement -->
        <p class="loading-text text-sm font-medium tracking-wider uppercase">Chargement...</p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  isVisible: boolean
}>()

defineEmits<{
  (e: 'transitionEnd'): void
}>()

// Utilise useColorMode() pour détecter le thème de façon réactive
const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
</script>

<style scoped>
/* === LOADING SCREEN === */
/* Isolation pour garantir un fond opaque sans interférence */
.loading-screen {
  isolation: isolate;
}

/* === LIGHT THEME === */
/* Fond beige parchemin - couleurs hardcodées pour éviter les problèmes de timing CSS variables */
.loading-screen.light-theme {
  background: linear-gradient(135deg, #f2e4d4 0%, #e8dcc8 50%, #f2e4d4 100%);
}

.light-theme .loading-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.light-theme .loading-glow {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, #d8c4a6 0%, transparent 70%);
  opacity: 0.4;
  animation: pulse-glow 2s ease-in-out infinite;
}

.light-theme .loading-dice {
  color: #3d2e1f;
  filter: drop-shadow(0 4px 6px rgba(15, 11, 4, 0.1));
}

.light-theme .loading-text {
  color: #6b5b4f;
  opacity: 0.6;
}

/* === DARK THEME === */
/* Fond cuir sombre "Grimoire Ancien" - couleurs hardcodées */
.loading-screen.dark-theme {
  background: linear-gradient(135deg, #120e0a 0%, #1a1410 50%, #120e0a 100%);
}

.dark-theme .loading-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d8b790' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

.dark-theme .loading-glow {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: radial-gradient(circle, #d8b790 0%, transparent 70%);
  opacity: 0.3;
  animation: pulse-glow-dark 2s ease-in-out infinite;
}

.dark-theme .loading-dice {
  color: #d8b790;
  filter: drop-shadow(0 4px 12px rgba(216, 183, 144, 0.3));
}

.dark-theme .loading-text {
  color: #a89080;
  opacity: 0.6;
}

/* === ANIMATIONS === */
@keyframes pulse-glow {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.6;
  }
}

@keyframes pulse-glow-dark {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.5;
  }
}

/* === TRANSITIONS === */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* === REDUCED MOTION === */
@media (prefers-reduced-motion: reduce) {
  .light-theme .loading-glow,
  .dark-theme .loading-glow {
    animation: none;
    opacity: 0.3;
  }
}
</style>
