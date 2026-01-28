<template>
  <section class="py-16 lg:py-24 bg-(--theme-bg-elevated)/50">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
        <!-- Texte -->
        <div v-motion-fade-up class="space-y-6 order-2 lg:order-1">
          <div class="space-y-4">
            <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold">
              Le Chaos des Royaumes
              <span class="text-secondary-500">Divisés</span>
            </h2>
            <p class="text-lg text-muted">
              Quand plusieurs streamers partagent une table de JDR, leurs communautés devraient
              partager le pouvoir de changer le destin.
            </p>
          </div>

          <!-- Pain points -->
          <ul class="space-y-4">
            <li
              v-for="(pain, index) in painPoints"
              :key="index"
              v-motion-fade-left
              :delay="100 + index * 100"
              class="flex items-start gap-3"
            >
              <div
                class="size-8 rounded-lg bg-error-100 flex items-center justify-center shrink-0 mt-0.5"
              >
                <UIcon :name="pain.icon" class="size-4 text-error-500" />
              </div>
              <div>
                <p class="font-medium text-primary-600">{{ pain.title }}</p>
                <p class="text-sm text-muted">{{ pain.description }}</p>
              </div>
            </li>
          </ul>
        </div>

        <!-- Image -->
        <div v-motion-scale-up :delay="200" class="order-1 lg:order-2">
          <img
            src="/images/landing/problem.webp"
            alt="Illustration du chaos des communautés fragmentées - plusieurs chats Twitch déconnectés"
            class="w-full max-w-md mx-auto lg:max-w-none rounded-2xl shadow-xl"
            loading="lazy"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const painPoints = [
  {
    icon: 'i-lucide-split',
    title: 'Communautés fragmentées',
    description:
      "Vos viewers votent chacun de leur côté, sans impact réel sur l'aventure collective.",
  },
  {
    icon: 'i-lucide-chart-scatter',
    title: 'Résultats dispersés',
    description: 'Les données de chaque chat sont isolées, impossibles à agréger efficacement.',
  },
  {
    icon: 'i-lucide-unlink',
    title: 'Expériences déconnectées',
    description: 'Chaque communauté vit sa propre aventure, déconnectée du récit partagé.',
  },
]
</script>
