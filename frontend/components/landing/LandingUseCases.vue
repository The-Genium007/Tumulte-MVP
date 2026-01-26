<template>
  <section class="py-16 lg:py-24">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
      <!-- Header -->
      <div v-motion-fade-up class="text-center space-y-4 mb-12">
        <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold">
          Pour les Héros et les
          <span class="text-secondary-500">Guides</span>
        </h2>
        <p class="text-lg text-muted max-w-2xl mx-auto">
          Que vous orchestriez l'aventure ou y participiez, Tumulte a été forgé pour vous
        </p>
      </div>

      <!-- Cards -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
        <!-- Card MJ -->
        <div v-motion-fade-left class="card-hover">
          <UCard class="h-full bg-(--theme-card-bg) border-(--theme-border)">
            <div class="space-y-6">
              <!-- Header avec image -->
              <div class="flex flex-col sm:flex-row gap-4 items-start">
                <div class="w-full sm:w-32 shrink-0">
                  <img
                    src="/images/landing/persona-gm.webp"
                    alt="Maître du Jeu orchestrant une partie de JDR"
                    class="w-full rounded-xl"
                    loading="lazy"
                  />
                </div>
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <div
                      class="size-10 rounded-xl bg-secondary-100 flex items-center justify-center"
                    >
                      <UIcon name="i-lucide-crown" class="size-5 text-secondary-600" />
                    </div>
                    <h3 class="text-xl font-semibold">Maîtres du Jeu</h3>
                  </div>
                  <p class="text-sm text-muted">
                    Orchestrez le chaos depuis votre grimoire numérique
                  </p>
                </div>
              </div>

              <!-- Features list -->
              <ul class="space-y-3">
                <li
                  v-for="(feature, index) in gmFeatures"
                  :key="index"
                  class="flex items-start gap-2"
                >
                  <UIcon name="i-lucide-check" class="size-5 text-success-500 mt-0.5 shrink-0" />
                  <span class="text-muted">{{ feature }}</span>
                </li>
              </ul>
            </div>
          </UCard>
        </div>

        <!-- Card Streamers -->
        <div v-motion-fade-right :delay="100" class="card-hover">
          <UCard class="h-full bg-(--theme-card-bg) border-(--theme-border)">
            <div class="space-y-6">
              <!-- Header avec image -->
              <div class="flex flex-col sm:flex-row gap-4 items-start">
                <div class="w-full sm:w-32 shrink-0">
                  <img
                    src="/images/landing/persona-streamer.webp"
                    alt="Streamer Twitch engageant sa communauté"
                    class="w-full rounded-xl"
                    loading="lazy"
                  />
                </div>
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <div
                      class="size-10 rounded-xl bg-[#9146FF]/10 flex items-center justify-center"
                    >
                      <UIcon name="i-simple-icons-twitch" class="size-5 text-[#9146FF]" />
                    </div>
                    <h3 class="text-xl font-semibold">Aventuriers Streamers</h3>
                  </div>
                  <p class="text-sm text-muted">Offrez à votre communauté le pouvoir d'agir</p>
                </div>
              </div>

              <!-- Features list -->
              <ul class="space-y-3">
                <li
                  v-for="(feature, index) in streamerFeatures"
                  :key="index"
                  class="flex items-start gap-2"
                >
                  <UIcon name="i-lucide-check" class="size-5 text-success-500 mt-0.5 shrink-0" />
                  <span class="text-muted">{{ feature }}</span>
                </li>
              </ul>
            </div>
          </UCard>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const gmFeatures = [
  'Forgez des campagnes multi-streams en quelques incantations',
  'Préparez des sondages qui bouleversent le destin des héros',
  "Observez l'engagement de toutes les communautés en temps réel",
  'Orchestrez vos interventions comme un stratège légendaire',
  "Offrez à chaque viewer un rôle clé dans l'épopée",
]

const streamerFeatures = [
  "Ralliez votre chaîne à une campagne d'un simple clic",
  'Embarquez votre communauté dans une quête collective',
  'Offrez à chaque viewer un rôle clé dans la légende',
  'Overlay enchanteur pour une immersion totale',
  'Gardez le contrôle : déconnectez-vous à tout moment',
  'Permissions minimales, sécurité maximale',
]
</script>
