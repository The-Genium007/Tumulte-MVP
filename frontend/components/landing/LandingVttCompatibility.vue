<template>
  <section class="py-16 lg:py-24 overflow-hidden">
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
      <!-- Header -->
      <div v-motion-fade-up class="text-center space-y-4 mb-12 lg:mb-16">
        <div
          class="flex items-center justify-center gap-2 text-sm font-medium text-secondary-600 uppercase tracking-widest mb-3"
        >
          <UIcon name="i-game-icons-perspective-dice-six-faces-random" class="size-4" />
          <span>Intégration VTT</span>
          <UIcon name="i-game-icons-perspective-dice-six-faces-random" class="size-4" />
        </div>
        <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold">
          Tous les Royaumes,
          <span class="text-secondary-500">Un Seul Grimoire</span>
        </h2>
        <p class="text-lg text-muted max-w-2xl mx-auto">
          De Donjons & Dragons aux terres sombres de Vampire, Tumulte reconnaît votre système et s'y
          adapte automatiquement — sans incantation supplémentaire.
        </p>
      </div>
    </div>

    <!-- Carousel pleine largeur -->
    <div v-motion-fade-up :delay="150" class="relative mb-14">
      <!-- Masques de fondu latéraux -->
      <div
        class="absolute left-0 top-0 bottom-0 w-24 sm:w-48 z-10 pointer-events-none"
        style="background: linear-gradient(to right, var(--theme-bg), transparent)"
      />
      <div
        class="absolute right-0 top-0 bottom-0 w-24 sm:w-48 z-10 pointer-events-none"
        style="background: linear-gradient(to left, var(--theme-bg), transparent)"
      />

      <UCarousel
        v-slot="{ item }"
        :items="systemsDoubled"
        loop
        :auto-scroll="{ speed: 0.6 }"
        :arrows="false"
        :dots="false"
        :ui="{
          root: 'overflow-hidden',
          viewport: 'overflow-visible',
          item: 'basis-52 sm:basis-56 shrink-0 px-2',
        }"
      >
        <!-- Carte système avec couleur de marque -->
        <div
          class="vtt-card group relative flex flex-col items-center gap-3 p-5 rounded-2xl border select-none h-48 justify-center overflow-hidden transition-all duration-300"
          :style="{
            borderColor: `${item.color}20`,
            background: `linear-gradient(180deg, var(--theme-card-bg) 0%, ${item.color}08 100%)`,
          }"
        >
          <!-- Halo décoratif au hover -->
          <div
            class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            :style="`background: radial-gradient(circle at 50% 30%, ${item.color}15, transparent 70%)`"
          />

          <!-- Icône du système dans un médaillon -->
          <div
            class="relative size-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
            :style="{
              backgroundColor: `${item.color}15`,
              boxShadow: `0 0 0 0 ${item.color}00`,
            }"
          >
            <UIcon
              :name="item.icon"
              class="size-7 transition-colors duration-300"
              :style="{ color: item.color }"
            />
          </div>

          <!-- Nom du système -->
          <div class="text-center space-y-1.5 relative z-10">
            <p class="font-semibold text-sm leading-tight">{{ item.name }}</p>
            <div class="flex items-center justify-center gap-1.5">
              <span
                class="inline-block size-1.5 rounded-full"
                :style="{ backgroundColor: item.color }"
              />
              <p class="text-xs text-muted font-medium">{{ item.dice }}</p>
            </div>
          </div>

          <!-- Genre tag -->
          <div
            class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-colors duration-300"
            :style="{
              backgroundColor: `${item.color}12`,
              color: item.color,
            }"
          >
            {{ item.genre }}
          </div>
        </div>
      </UCarousel>
    </div>

    <!-- Section "Qu'est-ce qui est supporté ?" -->
    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
      <!-- Feature highlights -->
      <div v-motion-fade-up :delay="250" class="mb-12">
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div
            v-for="(feature, index) in features"
            :key="index"
            v-motion-pop
            :delay="300 + index * 60"
            class="vtt-feature-chip group flex flex-col items-center gap-2 p-4 rounded-xl border border-(--theme-border) bg-(--theme-card-bg) text-center transition-all duration-300 hover:border-secondary-400/50"
          >
            <div
              class="size-9 rounded-lg flex items-center justify-center bg-secondary-50 group-hover:bg-secondary-100 transition-colors duration-300"
            >
              <UIcon :name="feature.icon" class="size-4.5 text-secondary-600" />
            </div>
            <div>
              <p class="text-xs font-semibold leading-tight">{{ feature.label }}</p>
              <p class="text-[10px] text-muted mt-0.5">{{ feature.desc }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Stats bar -->
      <div v-motion-fade-up :delay="400" class="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div
          v-for="(stat, index) in stats"
          :key="index"
          v-motion-pop
          :delay="450 + index * 80"
          class="vtt-stat-card relative flex flex-col items-center text-center p-5 rounded-2xl border border-(--theme-border) bg-(--theme-card-bg) overflow-hidden group transition-all duration-300 hover:border-secondary-400/30"
        >
          <!-- Accent décoratif en fond -->
          <div
            class="absolute inset-0 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity duration-500 pointer-events-none"
            :style="`background: radial-gradient(ellipse at 50% 100%, ${stat.accentColor}, transparent 70%)`"
          />

          <!-- Icône -->
          <div
            class="size-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110"
            :style="`background-color: ${stat.bgColor}`"
          >
            <UIcon :name="stat.icon" class="size-5" :style="`color: ${stat.iconColor}`" />
          </div>

          <!-- Valeur -->
          <p class="text-2xl sm:text-3xl font-bold mb-1">
            {{ stat.value }}
          </p>

          <!-- Label -->
          <p class="text-xs sm:text-sm text-muted leading-tight">{{ stat.label }}</p>
        </div>
      </div>

      <!-- Note sur les systèmes Tier 2/3 -->
      <div v-motion-fade-up :delay="650" class="text-center mt-8">
        <div
          class="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-(--theme-border) bg-(--theme-card-bg)"
        >
          <div class="flex -space-x-1">
            <UIcon name="i-game-icons-dice-twenty-faces-twenty" class="size-4 text-secondary-500" />
            <UIcon
              name="i-game-icons-perspective-dice-six-faces-random"
              class="size-4 text-secondary-400"
            />
            <UIcon name="i-game-icons-dice-ten-faces-ten" class="size-4 text-secondary-300" />
          </div>
          <p class="text-sm text-muted">
            <strong class="text-secondary-600">364+ systèmes</strong> supplémentaires détectés
            automatiquement via Foundry VTT
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * LandingVttCompatibility displays the VTT system compatibility section.
 *
 * Shows an auto-scrolling marquee carousel of the 15 Tier 1 fully supported
 * systems with brand-colored cards, a feature matrix strip, and a stats bar
 * highlighting the breadth of VTT coverage.
 *
 * @example
 * <LandingVttCompatibility />
 */

interface VttSystem {
  name: string
  dice: string
  icon: string
  color: string
  genre: string
}

const systems: VttSystem[] = [
  {
    name: 'D&D 5e',
    dice: 'd20',
    icon: 'i-game-icons-dragon-head',
    color: '#c0392b',
    genre: 'Héroïque',
  },
  {
    name: 'Pathfinder 2e',
    dice: 'd20',
    icon: 'i-game-icons-compass',
    color: '#1a5276',
    genre: 'Héroïque',
  },
  {
    name: "L'Appel de Cthulhu",
    dice: 'd100',
    icon: 'i-game-icons-tentacles-skull',
    color: '#2e4053',
    genre: 'Horreur',
  },
  {
    name: 'Warhammer Fantasy',
    dice: 'd100',
    icon: 'i-game-icons-warhammer',
    color: '#7d3c98',
    genre: 'Grimdark',
  },
  {
    name: 'Savage Worlds',
    dice: 'Variable',
    icon: 'i-game-icons-dice-fire',
    color: '#d35400',
    genre: 'Pulp',
  },
  {
    name: 'Cyberpunk RED',
    dice: 'd10',
    icon: 'i-game-icons-cyber-eye',
    color: '#e74c3c',
    genre: 'Cyberpunk',
  },
  {
    name: 'Vampire V5',
    dice: 'd10',
    icon: 'i-game-icons-vampire-dracula',
    color: '#922b21',
    genre: 'Gothique',
  },
  {
    name: 'Star Wars FFG',
    dice: 'Narratif',
    icon: 'i-game-icons-ringed-planet',
    color: '#f39c12',
    genre: 'Sci-Fi',
  },
  {
    name: 'Alien RPG',
    dice: 'd6',
    icon: 'i-game-icons-alien-stare',
    color: '#1abc9c',
    genre: 'Horreur Sci-Fi',
  },
  {
    name: 'Shadowrun',
    dice: 'd6',
    icon: 'i-game-icons-circuitry',
    color: '#27ae60',
    genre: 'Cyberpunk',
  },
  {
    name: 'Forbidden Lands',
    dice: 'd6',
    icon: 'i-game-icons-crossed-swords',
    color: '#6c3483',
    genre: 'Survie',
  },
  {
    name: 'Blades in the Dark',
    dice: 'd6',
    icon: 'i-game-icons-knife-thrust',
    color: '#2c3e50',
    genre: 'Braquage',
  },
  {
    name: 'FATE Core',
    dice: '4dF',
    icon: 'i-game-icons-perspective-dice-six-faces-random',
    color: '#2980b9',
    genre: 'Narratif',
  },
  {
    name: 'Vaesen',
    dice: 'd6',
    icon: 'i-game-icons-forest',
    color: '#117a65',
    genre: 'Folklore',
  },
  {
    name: 'World of Darkness',
    dice: 'd10',
    icon: 'i-game-icons-wolf-howl',
    color: '#5d6d7e',
    genre: 'Gothique',
  },
]

const systemsDoubled = computed(() => [...systems, ...systems])

const features = [
  {
    icon: 'i-game-icons-character',
    label: 'Personnages',
    desc: 'Sync Foundry',
  },
  {
    icon: 'i-game-icons-dice-twenty-faces-twenty',
    label: 'Critiques',
    desc: 'Détection auto',
  },
  {
    icon: 'i-game-icons-cycling',
    label: 'Inversion',
    desc: 'Retournement dés',
  },
  {
    icon: 'i-lucide-bar-chart-3',
    label: 'Stats',
    desc: 'Extraction avancée',
  },
  {
    icon: 'i-game-icons-spell-book',
    label: 'Sorts',
    desc: 'Interactions magiques',
  },
  {
    icon: 'i-game-icons-sword-clash',
    label: 'Combat',
    desc: 'Actions tactiques',
  },
]

const stats = [
  {
    value: '15+',
    label: 'Systèmes avec support complet',
    icon: 'i-lucide-shield-check',
    bgColor: 'rgba(34, 197, 94, 0.1)',
    iconColor: '#16a34a',
    accentColor: '#22c55e',
  },
  {
    value: '364+',
    label: 'Systèmes détectés automatiquement',
    icon: 'i-game-icons-dice-twenty-faces-twenty',
    bgColor: 'rgba(216, 183, 144, 0.15)',
    iconColor: '#c2a582',
    accentColor: '#d8b790',
  },
  {
    value: '85%',
    label: 'Des joueurs Foundry couverts',
    icon: 'i-lucide-users-round',
    bgColor: 'rgba(59, 130, 246, 0.1)',
    iconColor: '#2563eb',
    accentColor: '#3b82f6',
  },
  {
    value: 'Auto',
    label: 'Configuration sans intervention',
    icon: 'i-lucide-wand-sparkles',
    bgColor: 'rgba(139, 111, 71, 0.1)',
    iconColor: '#8b6f47',
    accentColor: '#8b6f47',
  },
]
</script>

<style scoped>
.vtt-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(216, 183, 144, 0.15);
}

.vtt-feature-chip:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.04);
}

.vtt-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.04);
}

@media (prefers-reduced-motion: reduce) {
  .vtt-card:hover,
  .vtt-feature-chip:hover,
  .vtt-stat-card:hover {
    transform: none;
  }
}
</style>
