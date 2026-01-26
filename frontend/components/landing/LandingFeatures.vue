<template>
  <section id="features" class="py-16 lg:py-24 bg-(--theme-bg-elevated)/50">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
      <!-- Header -->
      <div v-motion-fade-up class="text-center space-y-4 mb-12 lg:mb-16">
        <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold">
          Les Trois
          <span class="text-secondary-500">Sortilèges</span>
        </h2>
        <p class="text-lg text-muted max-w-2xl mx-auto">
          Maîtrisez l'art de synchroniser vos communautés en trois étapes simples
        </p>
      </div>

      <!-- Steps -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
        <div
          v-for="(step, index) in steps"
          :key="index"
          v-motion-pop
          :delay="index * 150"
          class="text-center space-y-4"
        >
          <!-- Image ou placeholder -->
          <div class="relative mx-auto w-full max-w-xs">
            <img
              v-if="step.image"
              :src="step.image"
              :alt="step.imageLabel"
              class="w-full aspect-square object-cover rounded-2xl shadow-lg"
            />
            <ImagePlaceholder
              v-else
              :label="`step-${index + 1}.webp - ${step.imageLabel}`"
              aspect="square"
              :icon="step.icon"
              class="w-full"
            />
            <!-- Numéro -->
            <div
              class="absolute -top-3 -left-3 size-10 rounded-full bg-secondary-500 text-white font-bold flex items-center justify-center text-lg shadow-lg"
            >
              {{ index + 1 }}
            </div>
          </div>

          <!-- Texte -->
          <div class="space-y-2">
            <h3 class="text-xl font-semibold">{{ step.title }}</h3>
            <p class="text-muted">{{ step.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import ImagePlaceholder from './ImagePlaceholder.vue'

const steps = [
  {
    title: 'Invoquer',
    description:
      'Rassemblez vos alliés streamers sous une même bannière. Formez le cercle qui scellera le destin de vos aventures.',
    icon: 'i-lucide-users-round',
    imageLabel: 'Création campagne',
    image: '/images/landing/step-1.webp',
  },
  {
    title: 'Déchaîner',
    description:
      "Lancez votre sondage. En un instant, tous les royaumes reçoivent l'appel. Les communautés unies tremblent d'anticipation.",
    icon: 'i-lucide-send',
    imageLabel: 'Lancement sondage',
    image: '/images/landing/step-2.webp',
  },
  {
    title: 'Révéler',
    description:
      "Les voix convergent depuis chaque royaume. Le verdict tombe, forgé par des centaines de volontés. L'histoire s'écrit.",
    icon: 'i-lucide-bar-chart-3',
    imageLabel: 'Résultats agrégés',
    image: '/images/landing/step-3.webp',
  },
]
</script>
