<template>
  <div class="error-page">
    <!-- Background gradient subtil -->
    <div
      class="absolute inset-0 bg-gradient-to-b from-secondary-100/30 via-transparent to-transparent pointer-events-none"
    />

    <!-- Contenu principal centré -->
    <div class="container mx-auto px-4 max-w-2xl relative z-10">
      <div class="flex flex-col items-center justify-center min-h-screen py-12 space-y-8">
        <!-- Image du gobelin - Placeholder 500x500 -->
        <div class="goblin-container">
          <div class="goblin-placeholder">
            <UIcon name="i-lucide-cone" class="size-24 text-secondary-400" />
            <span class="text-sm text-muted mt-3">Gobelin animé ici</span>
            <span class="text-xs text-muted/70">500x500px</span>
          </div>

          <!-- Effet glow derrière le gobelin -->
          <div
            class="absolute -inset-8 bg-gradient-to-r from-secondary-300/20 to-primary-300/20 blur-3xl -z-10 rounded-full"
          />
        </div>

        <!-- Le 404 -->
        <div class="error-code">
          <span
            class="text-transparent bg-clip-text bg-gradient-to-r from-secondary-600 to-secondary-400"
          >
            404
          </span>
        </div>

        <!-- Message -->
        <div class="text-center space-y-3">
          <h1 class="error-title">
            Chemin Introuvable
          </h1>
          <p class="error-description">
            {{ errorMessage }}
          </p>
        </div>

        <!-- Bouton CTA unique -->
        <UButton
          to="/"
          size="xl"
          class="cta-glow shimmer"
          trailing-icon="i-lucide-home"
          @click="handleGoHome"
        >
          Retour à l'Accueil
        </UButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface NuxtError {
  statusCode?: number
  statusMessage?: string
  message?: string
  fatal?: boolean
  unhandled?: boolean
  data?: unknown
}

const props = defineProps<{
  error?: NuxtError
}>()

const errorMessage = computed(() => {
  if (props.error?.statusCode === 404) {
    return "Cette page s'est perdue dans les méandres du donjon... Mais pas d'inquiétude, l'aventure continue !"
  }
  if (props.error?.statusCode === 500) {
    return "Un sortilège s'est retourné contre nous... Nos mages travaillent à le dissiper."
  }
  return props.error?.message || "Une erreur inattendue s'est produite dans votre quête."
})

const handleGoHome = () => {
  clearError({ redirect: '/' })
}
</script>

<style scoped>
/* Page principale */
.error-page {
  min-height: 100dvh;
  background-color: var(--color-bg-page);
  position: relative;
  overflow: hidden;
}

/* Conteneur du gobelin */
.goblin-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

/* Placeholder du gobelin */
.goblin-placeholder {
  width: 500px;
  height: 500px;
  max-width: 90vw;
  max-height: 50vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 3px dashed var(--color-secondary-300);
  border-radius: 1rem;
  background: linear-gradient(
    135deg,
    rgba(216, 183, 144, 0.05) 0%,
    rgba(216, 183, 144, 0.1) 100%
  );
  transition: transform 0.3s ease;
}

.goblin-placeholder:hover {
  transform: scale(1.02);
}

/* Code d'erreur 404 */
.error-code {
  font-family: var(--font-heading);
  font-size: clamp(5rem, 15vw, 10rem);
  font-weight: 700;
  line-height: 1;
  letter-spacing: 0.05em;
  text-align: center;
  margin: 0;
}

/* Titre */
.error-title {
  font-family: var(--font-heading);
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 700;
  color: var(--color-text-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

/* Description */
.error-description {
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: var(--color-text-secondary);
  line-height: 1.6;
  max-width: 600px;
  margin: 0 auto;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .goblin-placeholder {
    width: 300px;
    height: 300px;
  }

  .error-code {
    margin-top: -1rem;
  }
}

/* Animation shimmer pour le bouton CTA (si pas déjà dans main.css) */
@keyframes shimmer {
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
}

:deep(.shimmer) {
  background: linear-gradient(
    90deg,
    var(--color-primary-600) 0%,
    var(--color-primary-500) 25%,
    var(--color-primary-400) 50%,
    var(--color-primary-500) 75%,
    var(--color-primary-600) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 3s linear infinite;
}

:deep(.cta-glow) {
  box-shadow:
    0 0 20px rgba(216, 183, 144, 0.3),
    0 4px 6px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease;
}

:deep(.cta-glow:hover) {
  box-shadow:
    0 0 30px rgba(216, 183, 144, 0.5),
    0 6px 12px rgba(0, 0, 0, 0.15);
}
</style>
