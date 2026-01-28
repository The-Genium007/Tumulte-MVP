<template>
  <section class="py-16 lg:py-24">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
        <!-- Image / Mockup -->
        <div v-motion-fade-right :delay="300" class="order-1 lg:order-1">
          <div class="relative">
            <div class="aspect-video overflow-hidden rounded-2xl shadow-lg">
              <img
                src="/images/landing/solution-mockup.webp"
                alt="Interface Tumulte - Dashboard de gestion des sondages"
                class="w-full h-full object-cover object-center"
              />
            </div>
            <!-- Effet de profondeur -->
            <div
              class="absolute -bottom-4 -right-4 w-full h-full bg-secondary-200/30 rounded-2xl -z-10"
            />
          </div>
        </div>

        <!-- Texte -->
        <div v-motion-fade-up class="space-y-6 order-2 lg:order-2">
          <div class="space-y-4">
            <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold">
              Un Seul Portail,
              <span class="text-secondary-500">Tous les Mondes Unis</span>
            </h2>
            <p class="text-lg text-muted">
              Tumulte est le grimoire qui unit les royaumes. Vos viewers deviennent une seule force
              capable de bouleverser l'aventure.
            </p>
          </div>

          <!-- Bénéfices -->
          <ul class="space-y-4">
            <li
              v-for="(benefit, index) in benefits"
              :key="index"
              v-motion-fade-left
              :delay="100 + index * 100"
              class="flex items-start gap-3"
            >
              <div
                class="size-8 rounded-lg bg-success-100 flex items-center justify-center shrink-0 mt-0.5"
              >
                <UIcon :name="benefit.icon" class="size-4 text-success-600" />
              </div>
              <div>
                <p class="font-medium text-primary-600">{{ benefit.title }}</p>
                <p class="text-sm text-muted">{{ benefit.description }}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const benefits = [
  {
    icon: 'i-lucide-vote',
    title: 'Sondages multi-streams',
    description:
      'Lancez des votes synchronisés sur toutes les chaînes. Résultats agrégés en temps réel.',
  },
  {
    icon: 'i-lucide-swords',
    title: 'Interactions en jeu',
    description:
      "Vos viewers influencent directement l'aventure : choix narratifs, actions des personnages.",
  },
  {
    icon: 'i-lucide-user-plus',
    title: 'Création de PNJ',
    description: 'Laissez la communauté façonner les personnages qui peupleront votre univers.',
  },
  {
    icon: 'i-lucide-sparkles',
    title: 'Événements aléatoires',
    description: 'Déclenchez des rebondissements votés par le public pour pimenter vos sessions.',
  },
]
</script>
