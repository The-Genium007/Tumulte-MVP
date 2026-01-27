<template>
  <Transition name="fade">
    <div
      v-if="isVisible"
      class="loading-screen fixed inset-0 z-9999 flex items-center justify-center"
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

        <!-- Texte de chargement optionnel -->
        <p class="loading-text text-sm font-medium tracking-wider uppercase opacity-60">
          Chargement...
        </p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  isVisible: boolean
}>()
</script>

<style scoped>
/* === LOADING SCREEN - Theme-aware === */
.loading-screen {
  /* Light mode: fond beige parchemin */
  background: linear-gradient(
    135deg,
    var(--color-bg-page) 0%,
    var(--color-secondary-100) 50%,
    var(--color-bg-page) 100%
  );
}

/* Dark mode: fond cuir sombre "Grimoire Ancien" */
:global(html.dark) .loading-screen {
  background: linear-gradient(
    135deg,
    var(--color-dark-bg-deepest) 0%,
    var(--color-dark-bg-base) 50%,
    var(--color-dark-bg-deepest) 100%
  );
}

/* === MOTIF DÉCORATIF === */
.loading-pattern {
  position: absolute;
  inset: 0;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

:global(html.dark) .loading-pattern {
  opacity: 0.05;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d8b790' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
}

/* === GLOW EFFECT === */
.loading-glow {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  /* Light mode: glow doré subtil */
  background: radial-gradient(
    circle,
    var(--color-secondary-300) 0%,
    transparent 70%
  );
  opacity: 0.4;
  animation: pulse-glow 2s ease-in-out infinite;
}

:global(html.dark) .loading-glow {
  /* Dark mode: glow doré plus prononcé */
  background: radial-gradient(
    circle,
    var(--color-dark-accent) 0%,
    transparent 70%
  );
  opacity: 0.3;
}

@keyframes pulse-glow {
  0%, 100% {
    transform: scale(1);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.6;
  }
}

:global(html.dark) .loading-glow {
  animation-name: pulse-glow-dark;
}

@keyframes pulse-glow-dark {
  0%, 100% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.5;
  }
}

/* === DICE ICON === */
.loading-dice {
  /* Light mode: marron foncé (brand) */
  color: var(--color-brand-500);
  filter: drop-shadow(0 4px 6px rgba(15, 11, 4, 0.1));
}

:global(html.dark) .loading-dice {
  /* Dark mode: doré accent */
  color: var(--color-dark-accent);
  filter: drop-shadow(0 4px 12px rgba(216, 183, 144, 0.3));
}

/* === LOADING TEXT === */
.loading-text {
  color: var(--color-text-muted);
}

:global(html.dark) .loading-text {
  color: var(--color-dark-text-muted);
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
  .loading-glow {
    animation: none;
    opacity: 0.3;
  }
}
</style>
