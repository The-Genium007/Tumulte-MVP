<template>
  <div class="min-h-screen bg-subtle">
    <!-- Hero Section -->
    <section class="relative overflow-hidden py-16 lg:py-24">
      <div
        class="absolute inset-0 bg-linear-to-b from-secondary-500/10 via-transparent to-transparent pointer-events-none"
      />
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl relative">
        <div class="text-center space-y-6">
          <div
            class="inline-flex items-center justify-center size-20 rounded-2xl bg-secondary-500/10 dark:bg-secondary-500/20"
          >
            <UIcon name="i-lucide-sparkles" class="size-10 text-secondary-500" />
          </div>
          <h1 class="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
            A propos de
            <span
              class="text-transparent bg-clip-text bg-linear-to-r from-secondary-600 to-secondary-400"
            >
              Tumulte
            </span>
          </h1>
          <p class="text-lg text-muted max-w-2xl mx-auto">
            L'histoire d'une passion pour le JDR et les communautes connectees
          </p>
        </div>
      </div>
    </section>

    <!-- Content -->
    <section class="pb-16 lg:pb-24">
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
        <div class="space-y-16">
          <!-- Notre mission -->
          <article class="space-y-6">
            <div class="flex items-center gap-4">
              <div
                class="inline-flex items-center justify-center size-12 rounded-xl bg-secondary-500/10 dark:bg-secondary-500/20"
              >
                <UIcon name="i-lucide-target" class="size-6 text-secondary-500" />
              </div>
              <h2 class="text-2xl font-semibold">Notre mission</h2>
            </div>
            <div class="prose-content pl-16">
              <p>
                Tumulte est ne d'un constat simple : lorsque plusieurs streamers partagent une table
                de jeu de role, leurs communautes restent fragmentees. Chaque chat vote de son cote,
                sans impact reel sur l'aventure collective.
              </p>
              <p>
                Notre mission est de <strong>reunir ces communautes</strong> pour creer des moments
                memorables ou chaque viewer, peu importe la chaine qu'il regarde, peut influencer le
                destin des heros.
              </p>
            </div>
          </article>

          <!-- Ce que nous proposons -->
          <article class="space-y-6">
            <div class="flex items-center gap-4">
              <div
                class="inline-flex items-center justify-center size-12 rounded-xl bg-secondary-500/10 dark:bg-secondary-500/20"
              >
                <UIcon name="i-lucide-wand-2" class="size-6 text-secondary-500" />
              </div>
              <h2 class="text-2xl font-semibold">Ce que nous proposons</h2>
            </div>
            <div class="prose-content pl-16">
              <p>Tumulte offre aux Maitres du Jeu et aux Streamers les outils pour :</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                <div class="feature-card">
                  <UIcon name="i-lucide-users" class="size-5 text-secondary-500" />
                  <div>
                    <h3 class="font-semibold">Sondages synchronises</h3>
                    <p class="text-sm text-muted">
                      Lancez un sondage sur toutes les chaines simultanement
                    </p>
                  </div>
                </div>
                <div class="feature-card">
                  <UIcon name="i-lucide-bar-chart-3" class="size-5 text-secondary-500" />
                  <div>
                    <h3 class="font-semibold">Resultats agreges</h3>
                    <p class="text-sm text-muted">
                      Visualisez les votes de toutes les communautes reunies
                    </p>
                  </div>
                </div>
                <div class="feature-card">
                  <UIcon name="i-lucide-palette" class="size-5 text-secondary-500" />
                  <div>
                    <h3 class="font-semibold">Overlay Studio</h3>
                    <p class="text-sm text-muted">Personnalisez l'affichage pour vos streams</p>
                  </div>
                </div>
                <div class="feature-card">
                  <UIcon name="i-lucide-gamepad-2" class="size-5 text-secondary-500" />
                  <div>
                    <h3 class="font-semibold">Gamification</h3>
                    <p class="text-sm text-muted">
                      Jauges, evenements et loot pour enrichir vos sessions
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <!-- Compatibilité VTT -->
          <article class="space-y-6">
            <div class="flex items-center gap-4">
              <div
                class="inline-flex items-center justify-center size-12 rounded-xl bg-secondary-500/10 dark:bg-secondary-500/20"
              >
                <UIcon name="i-lucide-dice-5" class="size-6 text-secondary-500" />
              </div>
              <h2 class="text-2xl font-semibold">Compatibilite VTT</h2>
            </div>
            <div class="prose-content pl-16">
              <p>
                Tumulte s'integre avec <strong>Foundry VTT</strong> pour synchroniser vos
                personnages et detecter les jets de des critiques. Voici la liste des systemes de
                jeu supportes :
              </p>

              <!-- Légende -->
              <div class="flex flex-wrap gap-4 mt-6 mb-4">
                <div class="flex items-center gap-2 text-sm">
                  <span class="status-supported">✓</span>
                  <span>Supporte</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                  <span class="status-partial">~</span>
                  <span>Partiel / Generique</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                  <span class="status-unsupported">✗</span>
                  <span>Non supporte</span>
                </div>
              </div>

              <!-- Tableau des systèmes -->
              <div class="mt-6 space-y-4">
                <div v-for="(group, groupKey) in systemGroups" :key="groupKey" class="system-group">
                  <button
                    class="system-group-header"
                    @click="toggleGroup(groupKey)"
                    :aria-expanded="expandedGroups[groupKey]"
                  >
                    <div class="flex items-center gap-3">
                      <UIcon :name="group.icon" class="size-5 text-secondary-500" />
                      <span class="font-semibold">{{ group.name }}</span>
                      <span class="text-xs text-muted">({{ group.systems.length }})</span>
                    </div>
                    <UIcon
                      name="i-lucide-chevron-down"
                      class="size-5 text-muted transition-transform duration-200"
                      :class="{ 'rotate-180': expandedGroups[groupKey] }"
                    />
                  </button>

                  <Transition name="collapse">
                    <div v-if="expandedGroups[groupKey]" class="system-table-wrapper">
                      <table class="system-table">
                        <thead>
                          <tr>
                            <th class="th-system">Systeme</th>
                            <th class="th-feature" title="Synchronisation des personnages">
                              <span class="hidden sm:inline">Personnages</span>
                              <UIcon name="i-lucide-users" class="sm:hidden size-4" />
                            </th>
                            <th class="th-feature" title="Detection des critiques">
                              <span class="hidden sm:inline">Critiques</span>
                              <UIcon name="i-lucide-zap" class="sm:hidden size-4" />
                            </th>
                            <th class="th-feature" title="Inversion de des">
                              <span class="hidden sm:inline">Inversion</span>
                              <UIcon name="i-lucide-refresh-cw" class="sm:hidden size-4" />
                            </th>
                            <th class="th-feature" title="Extraction des stats avancees">
                              <span class="hidden sm:inline">Stats</span>
                              <UIcon name="i-lucide-bar-chart" class="sm:hidden size-4" />
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="system in group.systems" :key="system.id">
                            <td class="td-system">
                              <span class="system-name">{{ system.name }}</span>
                              <span class="system-id">{{ system.id }}</span>
                            </td>
                            <td class="td-feature">
                              <span :class="getStatusClass(system.characters)">
                                {{ getStatusIcon(system.characters) }}
                              </span>
                            </td>
                            <td class="td-feature">
                              <span :class="getStatusClass(system.criticals)">
                                {{ getStatusIcon(system.criticals) }}
                              </span>
                            </td>
                            <td class="td-feature">
                              <span :class="getStatusClass(system.inversion)">
                                {{ getStatusIcon(system.inversion) }}
                              </span>
                            </td>
                            <td class="td-feature">
                              <span :class="getStatusClass(system.stats)">
                                {{ getStatusIcon(system.stats) }}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </Transition>
                </div>
              </div>

              <p class="text-sm text-muted mt-6">
                <UIcon name="i-lucide-info" class="size-4 inline-block mr-1" />
                Les systemes avec support "partiel" utilisent une detection generique basee sur le
                D20. L'inversion de des necessite une detection de critique fonctionnelle.
              </p>
            </div>
          </article>

          <!-- L'equipe -->
          <article class="space-y-6">
            <div class="flex items-center gap-4">
              <div
                class="inline-flex items-center justify-center size-12 rounded-xl bg-secondary-500/10 dark:bg-secondary-500/20"
              >
                <UIcon name="i-lucide-heart" class="size-6 text-secondary-500" />
              </div>
              <h2 class="text-2xl font-semibold">L'equipe</h2>
            </div>
            <div class="prose-content pl-16">
              <p>
                Tumulte est un projet cree avec passion par
                <a
                  href="https://lucasgiza.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="link-styled"
                >
                  Lucas GIZA
                </a>
                , developpeur et joueur de JDR convaincu que le streaming peut revolutionner la
                facon dont nous vivons nos aventures.
              </p>
              <p>
                Ce projet est le fruit de nombreuses sessions de JDR streamees, ou l'envie de mieux
                connecter les communautes s'est imposee comme une evidence.
              </p>
            </div>
          </article>
        </div>

        <!-- Navigation -->
        <div
          class="mt-16 pt-8 border-t border-(--theme-border) flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <NuxtLink to="/legal/conditions-utilisation">
            <UButton color="neutral" variant="soft" icon="i-lucide-scroll-text">
              Conditions d'utilisation
            </UButton>
          </NuxtLink>
          <NuxtLink to="/legal/politique-confidentialite">
            <UButton color="neutral" variant="soft" icon="i-lucide-shield">
              Politique de confidentialite
            </UButton>
          </NuxtLink>
          <NuxtLink to="/">
            <UButton variant="soft" icon="i-lucide-home"> Retour a l'accueil </UButton>
          </NuxtLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'landing' as const,
})

useSeoMeta({
  title: 'A propos - Tumulte',
  description:
    'Decouvrez Tumulte, la plateforme de sondages Twitch multi-streams pour les jeux de role. Notre mission, notre equipe et la compatibilite avec les systemes de JDR.',
})

// Types
type SupportLevel = 'full' | 'partial' | 'none'

interface SystemInfo {
  id: string
  name: string
  characters: SupportLevel
  criticals: SupportLevel
  inversion: SupportLevel
  stats: SupportLevel
}

interface SystemGroup {
  name: string
  icon: string
  systems: SystemInfo[]
}

// État des groupes (collapsibles)
const expandedGroups = ref<Record<string, boolean>>({
  dnd: true, // Ouvrir D&D par défaut
  horror: false,
  scifi: false,
  fantasy: false,
  narrative: false,
  yearzero: false,
  savage: false,
  warhammer: false,
  other: false,
})

function toggleGroup(groupKey: string) {
  expandedGroups.value[groupKey] = !expandedGroups.value[groupKey]
}

// Helpers pour les icônes de statut
function getStatusIcon(level: SupportLevel): string {
  switch (level) {
    case 'full':
      return '✓'
    case 'partial':
      return '~'
    case 'none':
      return '✗'
  }
}

function getStatusClass(level: SupportLevel): string {
  switch (level) {
    case 'full':
      return 'status-supported'
    case 'partial':
      return 'status-partial'
    case 'none':
      return 'status-unsupported'
  }
}

// Données des systèmes groupées
const systemGroups: Record<string, SystemGroup> = {
  dnd: {
    name: 'D&D et derives',
    icon: 'i-lucide-sword',
    systems: [
      {
        id: 'dnd5e',
        name: 'D&D 5th Edition',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
      },
      {
        id: 'pf2e',
        name: 'Pathfinder 2e',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
      },
      {
        id: 'a5e',
        name: 'Level Up: A5E',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'sfrpg',
        name: 'Starfinder',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'ose',
        name: 'Old-School Essentials',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'dcc',
        name: 'Dungeon Crawl Classics',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'castles-and-crusades',
        name: 'Castles & Crusades',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'archmage',
        name: '13th Age',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
    ],
  },
  horror: {
    name: 'Horreur et enquete',
    icon: 'i-lucide-skull',
    systems: [
      {
        id: 'CoC7',
        name: 'Call of Cthulhu 7e',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
      },
      {
        id: 'deltagreen',
        name: 'Delta Green',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'wod5e',
        name: 'World of Darkness 5e',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
      {
        id: 'mta',
        name: 'Chronicles of Darkness',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
      {
        id: 'motw',
        name: 'Monster of the Week',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
    ],
  },
  scifi: {
    name: 'Science-Fiction',
    icon: 'i-lucide-rocket',
    systems: [
      {
        id: 'cyberpunk-red-core',
        name: 'Cyberpunk RED',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
      },
      {
        id: 'alienrpg',
        name: 'Alien RPG',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
      },
      {
        id: 'shadowrun6-eden',
        name: 'Shadowrun 6e',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
      {
        id: 'shadowrun5e',
        name: 'Shadowrun 5e',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
      {
        id: 'lancer',
        name: 'Lancer',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'traveller',
        name: 'Traveller',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'starwarsffg',
        name: 'Star Wars FFG',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
      {
        id: 'genesys',
        name: 'Genesys',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
      {
        id: 'mothership',
        name: 'Mothership',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 't2k4e',
        name: 'Twilight 2000 4e',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'cyphersystem',
        name: 'Cypher System',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
    ],
  },
  fantasy: {
    name: 'Fantaisie medievale',
    icon: 'i-lucide-castle',
    systems: [
      {
        id: 'forbidden-lands',
        name: 'Forbidden Lands',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
      },
      {
        id: 'dragonbane',
        name: 'Dragonbane',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'tor2e',
        name: 'The One Ring 2e',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'dungeonworld',
        name: 'Dungeon World',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
      {
        id: 'mausritter',
        name: 'Mausritter',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'demonlord',
        name: 'Shadow of the Demon Lord',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'weirdwizard',
        name: 'Shadow of the Weird Wizard',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'symbaroum',
        name: 'Symbaroum',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'rqg',
        name: 'RuneQuest Glorantha',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'mythras',
        name: 'Mythras',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'arm5e',
        name: 'Ars Magica 5e',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'pendragon',
        name: 'Pendragon 6e',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'l5r5e',
        name: 'Legend of the Five Rings',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
      {
        id: 'morkborg',
        name: 'Mork Borg / Pirate Borg',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
    ],
  },
  narrative: {
    name: 'Narratif et PbtA',
    icon: 'i-lucide-book-open',
    systems: [
      {
        id: 'blades-in-the-dark',
        name: 'Blades in the Dark',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
      },
      {
        id: 'pbta',
        name: 'Powered by the Apocalypse',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
      {
        id: 'fate-core-official',
        name: 'FATE Core',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
      {
        id: 'foundry-ironsworn',
        name: 'Ironsworn / Starforged',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
      {
        id: 'city-of-mist',
        name: 'City of Mist',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
      {
        id: 'masks',
        name: 'Masks: A New Generation',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
      {
        id: 'avatarlegends',
        name: 'Avatar Legends',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
      {
        id: 'root',
        name: 'Root RPG',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
      {
        id: 'kids-on-bikes',
        name: 'Kids on Bikes',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
      {
        id: 'daggerheart',
        name: 'Daggerheart',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
      {
        id: 'quest',
        name: 'Quest RPG',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
      {
        id: 'draw-steel',
        name: 'Draw Steel (MCDM)',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
    ],
  },
  yearzero: {
    name: 'Year Zero Engine',
    icon: 'i-lucide-dices',
    systems: [
      {
        id: 'vaesen',
        name: 'Vaesen',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
      },
      {
        id: 'yzecoriolis',
        name: 'Coriolis',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'mutant-year-zero',
        name: 'Mutant Year Zero',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'tftloop',
        name: 'Tales from the Loop',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
    ],
  },
  savage: {
    name: 'Savage Worlds',
    icon: 'i-lucide-flame',
    systems: [
      {
        id: 'swade',
        name: 'Savage Worlds (SWADE)',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
      },
      {
        id: 'swpf',
        name: 'Savage Pathfinder',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'partial',
      },
    ],
  },
  warhammer: {
    name: 'Warhammer',
    icon: 'i-lucide-shield',
    systems: [
      {
        id: 'wfrp4e',
        name: 'WFRP 4e',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
      },
      {
        id: 'dark-heresy',
        name: 'Dark Heresy 2e',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'wrath-and-glory',
        name: 'Wrath & Glory',
        characters: 'full',
        criticals: 'partial',
        inversion: 'none',
        stats: 'partial',
      },
    ],
  },
  other: {
    name: 'Autres systemes',
    icon: 'i-lucide-layers',
    systems: [
      {
        id: 'worldbuilding',
        name: 'Simple Worldbuilding',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'none',
      },
      {
        id: 'gurps',
        name: 'GURPS',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'rolemaster',
        name: 'Rolemaster',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
      {
        id: 'paranoia',
        name: 'Paranoia',
        characters: 'full',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'partial',
      },
    ],
  },
}
</script>

<style scoped>
.prose-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: var(--color-text-secondary);
  line-height: 1.625;
}

.prose-content p {
  color: var(--color-text-secondary);
}

.link-styled {
  color: var(--color-secondary-600);
  text-underline-offset: 2px;
  transition: color 0.15s ease;
}

.link-styled:hover {
  text-decoration: underline;
}

:deep(.dark) .link-styled,
.dark .link-styled {
  color: var(--color-secondary-400);
}

.feature-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 0.75rem;
  background-color: var(--theme-bg-elevated);
  border: 1px solid var(--theme-border-muted);
  transition: all 0.15s ease;
}

.feature-card:hover {
  border-color: var(--theme-border);
}

/* Statuts de compatibilité */
.status-supported {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  background-color: rgba(34, 197, 94, 0.15);
  color: rgb(34, 197, 94);
  font-size: 0.75rem;
  font-weight: 600;
}

.status-partial {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  background-color: rgba(234, 179, 8, 0.15);
  color: rgb(234, 179, 8);
  font-size: 0.75rem;
  font-weight: 600;
}

.status-unsupported {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  background-color: rgba(107, 114, 128, 0.15);
  color: rgb(107, 114, 128);
  font-size: 0.75rem;
  font-weight: 600;
}

/* Groupes de systèmes */
.system-group {
  border: 1px solid var(--theme-border-muted);
  border-radius: 0.75rem;
  overflow: hidden;
  background-color: var(--theme-bg-elevated);
}

.system-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.875rem 1rem;
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.system-group-header:hover {
  background-color: var(--theme-bg-muted);
}

/* Tableau des systèmes */
.system-table-wrapper {
  overflow-x: auto;
  border-top: 1px solid var(--theme-border-muted);
}

.system-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.system-table thead {
  background-color: var(--theme-bg-muted);
}

.system-table th {
  padding: 0.625rem 0.75rem;
  text-align: left;
  font-weight: 500;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.th-system {
  min-width: 180px;
}

.th-feature {
  text-align: center !important;
  min-width: 70px;
}

.system-table td {
  padding: 0.5rem 0.75rem;
  border-top: 1px solid var(--theme-border-muted);
}

.td-system {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.system-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.system-id {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-family: ui-monospace, monospace;
}

.td-feature {
  text-align: center;
}

/* Animation collapse */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 1000px;
}

/* Responsive */
@media (max-width: 640px) {
  .th-feature {
    min-width: 50px;
    padding: 0.5rem 0.25rem;
  }

  .td-feature {
    padding: 0.5rem 0.25rem;
  }

  .system-table {
    font-size: 0.8125rem;
  }

  .th-system {
    min-width: 140px;
  }
}
</style>
