<template>
  <section class="py-16 lg:py-24 bg-(--theme-bg-elevated)/50">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
      <!-- Header -->
      <div v-motion-fade-up class="text-center space-y-4 mb-12">
        <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold">
          Chroniques des
          <span class="text-secondary-500">Aventuriers</span>
        </h2>
        <p class="text-lg text-muted max-w-2xl mx-auto">
          Les récits de ceux qui ont forgé des légendes avec leurs communautés
        </p>
      </div>

      <!-- Témoignages -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <UCard
          v-for="(testimonial, index) in testimonials"
          :key="testimonial.name"
          v-motion-fade-up
          :delay="index * 100"
          class="card-hover bg-(--theme-card-bg) border-(--theme-border)"
        >
          <div class="space-y-4">
            <!-- Quote icon -->
            <div class="flex justify-between items-start">
              <UIcon name="i-lucide-quote" class="size-6 text-secondary-300" />
              <div class="flex gap-0.5">
                <UIcon
                  v-for="n in 5"
                  :key="n"
                  name="i-lucide-star"
                  class="size-4 text-warning-400 fill-warning-400"
                />
              </div>
            </div>

            <!-- Quote text -->
            <p class="text-muted leading-relaxed">{{ testimonial.quote }}</p>

            <!-- Author -->
            <div class="flex items-center gap-3 pt-2 border-t border-(--theme-border)">
              <div
                class="size-10 rounded-full bg-linear-to-br from-secondary-400 to-secondary-600 flex items-center justify-center text-white font-bold text-sm"
              >
                {{ testimonial.initials }}
              </div>
              <div>
                <p class="font-medium text-sm">{{ testimonial.name }}</p>
                <p class="text-xs text-muted">{{ testimonial.role }}</p>
              </div>
            </div>
          </div>
        </UCard>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const testimonials = [
  {
    name: 'Kara_DM',
    initials: 'KD',
    role: 'Maître du Jeu · 3 campagnes',
    quote:
      "Franchement ? J'étais sceptique au début. Genre, encore un outil... Mais là, wow. La première fois que j'ai vu 400 viewers de 3 chaînes différentes voter en même temps pour sauver ou sacrifier un PNJ, j'ai eu des frissons. Mes joueurs m'ont dit que leurs communautés n'avaient jamais été aussi investies. C'est devenu indispensable.",
  },
  {
    name: 'TheLostBard',
    initials: 'TL',
    role: 'Streamer JDR · 2.4k followers',
    quote:
      "Mon chat était toujours un peu passif pendant les sessions multi-tables. Maintenant ils HURLENT dans les commentaires pour convaincre les autres communautés de voter comme eux 😂 L'engagement a littéralement triplé. Et le setup ? 2 minutes chrono. Je recommande à tous les streamers JDR, sans hésiter.",
  },
  {
    name: 'Masjohn_Off',
    initials: 'MO',
    role: 'MJ & Streamer · 8 ans de JDR',
    quote:
      "Après 8 ans à masteriser, je pensais avoir tout vu. Tumulte m'a prouvé le contraire. Quand ta communauté peut vraiment impacter l'histoire, ça change tout. Le moment où mes viewers ont créé un PNJ qui est devenu le favori de la table... magique. Outil simple, impact énorme.",
  },
]
</script>
