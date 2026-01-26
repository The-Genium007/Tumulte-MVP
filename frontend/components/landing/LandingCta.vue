<template>
  <section class="py-16 lg:py-24">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
      <div v-motion-scale-up class="relative">
        <!-- Background card -->
        <UCard class="overflow-hidden bg-(--theme-card-bg) border-(--theme-border)">
          <div class="relative">
            <!-- Pattern décoratif -->
            <div class="absolute inset-0 opacity-5 pointer-events-none">
              <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                  <pattern id="cta-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="10" cy="10" r="1" fill="currentColor" />
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#cta-pattern)" />
              </svg>
            </div>

            <!-- Contenu -->
            <div class="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center py-4">
              <!-- Image - Format cinématique 16:9, focalisé sur le cavalier en bas -->
              <div class="order-2 lg:order-1">
                <div class="relative aspect-video overflow-hidden rounded-2xl shadow-lg">
                  <img
                    src="/images/landing/cta-adventure.webp"
                    alt="Aventurier à cheval partant vers de nouvelles quêtes"
                    class="w-full h-full object-cover object-bottom"
                  />
                </div>
              </div>

              <!-- Texte et CTA -->
              <div class="order-1 lg:order-2 text-center lg:text-left space-y-6">
                <div class="space-y-4">
                  <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold">
                    L'Aventure
                    <span class="text-secondary-500">Vous Attend</span>
                  </h2>
                  <p class="text-lg text-muted max-w-lg mx-auto lg:mx-0">
                    Rejoignez les Maîtres du Jeu qui transforment leurs sessions en épopées
                    interactives où chaque viewer compte.
                  </p>
                </div>

                <!-- CTA -->
                <div class="space-y-4">
                  <UButton
                    to="/register"
                    size="xl"
                    class="cta-glow shimmer w-full sm:w-auto"
                    trailing-icon="i-lucide-wand-sparkles"
                  >
                    Créer Mon Compte Gratuit
                  </UButton>

                  <!-- Reassurance -->
                  <div
                    class="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm text-muted"
                  >
                    <span class="flex items-center gap-1">
                      <UIcon name="i-lucide-check" class="size-4 text-success-500" />
                      Gratuit
                    </span>
                    <span class="flex items-center gap-1">
                      <UIcon name="i-lucide-check" class="size-4 text-success-500" />
                      Prêt en 2 minutes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts"></script>
