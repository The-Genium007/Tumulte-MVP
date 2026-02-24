<template>
  <div class="min-h-screen bg-subtle">
    <!-- Hero Section -->
    <section class="relative overflow-hidden py-16 lg:py-24">
      <div
        class="absolute inset-0 bg-linear-to-b from-secondary-500/10 via-transparent to-transparent pointer-events-none"
      />
      <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl relative">
        <div class="text-center space-y-6">
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

              <!-- Barre de compatibilité globale -->
              <div class="platform-score-card mt-6">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <UIcon name="i-lucide-gauge" class="size-4 text-secondary-500" />
                    <span class="text-sm font-semibold text-primary"
                      >Compatibilite globale Foundry VTT</span
                    >
                  </div>
                  <span class="text-sm font-bold text-secondary-500">
                    {{ platformStats.avgScore }}%
                  </span>
                </div>
                <div class="platform-bar">
                  <div
                    class="platform-bar-segment platform-bar-excellent"
                    :style="{ width: platformStats.excellentRatio + '%' }"
                  />
                  <div
                    class="platform-bar-segment platform-bar-good"
                    :style="{ width: platformStats.goodRatio + '%' }"
                  />
                  <div
                    class="platform-bar-segment platform-bar-limited"
                    :style="{ width: platformStats.limitedRatio + '%' }"
                  />
                </div>
                <div class="flex items-center justify-between mt-2 text-xs text-muted">
                  <div class="flex items-center gap-3">
                    <span class="flex items-center gap-1">
                      <span class="inline-block size-2.5 rounded-full bg-green-500" />
                      Excellent ({{ platformStats.excellent }})
                    </span>
                    <span class="flex items-center gap-1">
                      <span class="inline-block size-2.5 rounded-full bg-yellow-500" />
                      Bon ({{ platformStats.good }})
                    </span>
                    <span class="flex items-center gap-1">
                      <span class="inline-block size-2.5 rounded-full bg-gray-400" />
                      Limite ({{ platformStats.limited }})
                    </span>
                  </div>
                  <span>{{ platformStats.total }} systemes</span>
                </div>

                <!-- Tier summary badges -->
                <div class="flex flex-wrap gap-2 mt-3">
                  <span class="tier-summary-badge tier-badge-1">
                    <UIcon name="i-lucide-shield-check" class="size-3.5" />
                    Tier 1 : 15 systemes (~85% des utilisateurs)
                  </span>
                  <span class="tier-summary-badge tier-badge-2">
                    <UIcon name="i-lucide-shield" class="size-3.5" />
                    Tier 2 : {{ tierGroups[1]?.systems.length ?? 0 }} systemes (~10%)
                  </span>
                  <span class="tier-summary-badge tier-badge-3">
                    <UIcon name="i-lucide-shield-off" class="size-3.5" />
                    Tier 3 : 320+ systemes (~5%)
                  </span>
                </div>
              </div>

              <!-- Légende -->
              <div class="flex flex-wrap gap-4 mt-6 mb-4">
                <div class="flex items-center gap-2 text-sm">
                  <span class="status-badge status-full">&#10003;</span>
                  <span>Natif</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                  <span class="status-badge status-beta">&#10022;</span>
                  <span>Beta</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                  <span class="status-badge status-partial">~</span>
                  <span>Partiel</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                  <span class="status-badge status-manual">&#9881;</span>
                  <span>Manuel</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                  <span class="status-badge status-na">&#8212;</span>
                  <span>N/A</span>
                </div>
                <div class="flex items-center gap-2 text-sm">
                  <span class="status-badge status-none">&#10007;</span>
                  <span>Non supporte</span>
                </div>
              </div>

              <!-- Tier groups -->
              <div class="mt-6 space-y-4">
                <div v-for="tierGroup in tierGroups" :key="tierGroup.tier" class="tier-group">
                  <button
                    class="tier-group-header"
                    @click="toggleTier(tierGroup.tier)"
                    :aria-expanded="expandedTiers[tierGroup.tier]"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <UIcon
                        :name="tierGroup.icon"
                        class="size-5 shrink-0"
                        :class="'tier-icon-' + tierGroup.tier"
                      />
                      <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="font-semibold">{{ tierGroup.name }}</span>
                          <span class="text-xs text-muted"
                            >({{
                              tierGroup.tier === 3 ? '320+' : tierGroup.systems.length
                            }}
                            systemes)</span
                          >
                        </div>
                        <p class="text-xs text-muted mt-0.5 hidden sm:block">
                          {{ tierGroup.description }}
                        </p>
                      </div>
                    </div>
                    <UIcon
                      name="i-lucide-chevron-down"
                      class="size-5 text-muted transition-transform duration-200 shrink-0"
                      :class="{ 'rotate-180': expandedTiers[tierGroup.tier] }"
                    />
                  </button>

                  <Transition name="collapse">
                    <div v-if="expandedTiers[tierGroup.tier]" class="tier-group-content">
                      <!-- Tier 3 special message -->
                      <div v-if="tierGroup.tier === 3" class="tier-3-message">
                        <UIcon name="i-lucide-info" class="size-4 shrink-0 text-muted" />
                        <p class="text-sm text-muted">
                          Plus de 320 systemes Foundry VTT fonctionnent en mode basique avec
                          Tumulte. Le MJ peut configurer manuellement les regles de criticite et
                          utiliser les fonctionnalites de gamification universelles (inversion de
                          des, messages chat).
                        </p>
                      </div>

                      <!-- System list -->
                      <div v-for="system in tierGroup.systems" :key="system.id" class="system-row">
                        <div class="system-row-info">
                          <div class="flex items-center gap-2 min-w-0">
                            <UIcon
                              v-if="system.id === 'custom'"
                              name="i-lucide-settings"
                              class="size-4 text-secondary-500 shrink-0"
                            />
                            <span class="system-name truncate">{{ system.name }}</span>
                          </div>
                          <div class="flex items-center gap-2 text-xs text-muted">
                            <span v-if="system.id !== 'custom'" class="system-id">{{
                              system.id
                            }}</span>
                            <span v-else class="system-id">Configurable par le MJ</span>
                            <span v-if="system.installPercent" class="install-percent">{{
                              system.installPercent
                            }}</span>
                          </div>
                        </div>

                        <!-- Score bar with popover -->
                        <UPopover mode="hover" :open-delay="200" :close-delay="150">
                          <div class="score-bar-wrapper">
                            <div class="score-bar">
                              <div
                                class="score-bar-fill"
                                :class="'score-color-' + getScoreColorKey(getSystemScore(system))"
                                :style="{ width: getSystemScore(system) + '%' }"
                              />
                            </div>
                            <span
                              class="score-label"
                              :class="'text-score-' + getScoreColorKey(getSystemScore(system))"
                            >
                              {{ getSystemScore(system) }}%
                            </span>
                          </div>

                          <template #content>
                            <div class="popover-content">
                              <div class="popover-header">
                                <span class="font-semibold text-sm">{{ system.name }}</span>
                                <div class="flex items-center gap-2 text-xs text-muted">
                                  <span v-if="system.primaryDie">{{ system.primaryDie }}</span>
                                  <span
                                    class="font-semibold"
                                    :class="
                                      'text-score-' + getScoreColorKey(getSystemScore(system))
                                    "
                                  >
                                    {{ getSystemScore(system) }}%
                                  </span>
                                </div>
                              </div>
                              <div
                                v-for="category in FEATURE_CATEGORIES"
                                :key="category.key"
                                class="popover-category"
                              >
                                <div class="popover-category-header">
                                  <span>{{ category.label }}</span>
                                </div>
                                <div
                                  v-for="featureKey in category.features"
                                  :key="featureKey"
                                  class="popover-feature-row"
                                >
                                  <span class="text-xs">{{
                                    FEATURE_DEFINITIONS[featureKey].label
                                  }}</span>
                                  <span
                                    class="status-badge status-badge-sm"
                                    :class="'status-' + system[featureKey]"
                                  >
                                    {{ getStatusIcon(system[featureKey]) }}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </template>
                        </UPopover>
                      </div>
                    </div>
                  </Transition>
                </div>
              </div>

              <p class="text-sm text-muted mt-6">
                <UIcon name="i-lucide-info" class="size-4 inline-block mr-1" />
                Survolez la barre de compatibilite d'un systeme pour voir le detail des
                fonctionnalites. Les niveaux de support sont :
                <strong>Natif</strong> (detection automatique), <strong>Beta</strong> (implemente,
                en attente de validation), <strong>Partiel</strong> (generique ou limite),
                <strong>Manuel</strong> (configuration par le MJ), <strong>N/A</strong> (mecanique
                absente du systeme) et <strong>Non supporte</strong>. Les systemes Tier 2 et 3
                peuvent etre configures manuellement via les regles de criticite dans les parametres
                de campagne.
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

// ========================================
// TYPES
// ========================================

type SupportLevel = 'full' | 'beta' | 'partial' | 'manual' | 'na' | 'none'

type SystemTier = 1 | 2 | 3

type FeatureKey = 'characters' | 'criticals' | 'inversion' | 'stats' | 'spells' | 'combat'

interface TumulteFeatureMatrix {
  characters: SupportLevel
  criticals: SupportLevel
  inversion: SupportLevel
  stats: SupportLevel
  spells: SupportLevel
  combat: SupportLevel
}

interface SystemInfo extends TumulteFeatureMatrix {
  id: string
  name: string
  tier: SystemTier
  installPercent?: string
  primaryDie?: string
}

interface TierGroup {
  tier: SystemTier
  name: string
  description: string
  icon: string
  systems: SystemInfo[]
}

interface FeatureDefinition {
  label: string
  icon: string
}

interface FeatureCategory {
  key: string
  label: string
  features: FeatureKey[]
}

// ========================================
// FEATURE DEFINITIONS
// ========================================

const FEATURE_DEFINITIONS: Record<FeatureKey, FeatureDefinition> = {
  characters: { label: 'Personnages', icon: 'i-lucide-users' },
  criticals: { label: 'Critiques', icon: 'i-lucide-zap' },
  stats: { label: 'Stats', icon: 'i-lucide-bar-chart' },
  inversion: { label: 'Inversion', icon: 'i-lucide-refresh-cw' },
  spells: { label: 'Sorts', icon: 'i-lucide-sparkles' },
  combat: { label: 'Combat', icon: 'i-lucide-swords' },
}

const FEATURE_KEYS: FeatureKey[] = [
  'characters',
  'criticals',
  'inversion',
  'stats',
  'spells',
  'combat',
]

const FEATURE_CATEGORIES: FeatureCategory[] = [
  { key: 'base', label: 'Base', features: ['characters', 'criticals', 'stats'] },
  { key: 'dice', label: 'Des', features: ['inversion'] },
  { key: 'magic', label: 'Magie', features: ['spells'] },
  { key: 'combat', label: 'Combat', features: ['combat'] },
]

const SUPPORT_LEVEL_SCORE: Record<SupportLevel, number> = {
  full: 100,
  beta: 100,
  partial: 50,
  manual: 25,
  na: -1,
  none: 0,
}

// ========================================
// STATE
// ========================================

const expandedTiers = ref<Record<number, boolean>>({
  1: true,
  2: false,
  3: false,
})

function toggleTier(tier: number) {
  expandedTiers.value[tier] = !expandedTiers.value[tier]
}

// ========================================
// HELPERS
// ========================================

function getStatusIcon(level: SupportLevel): string {
  switch (level) {
    case 'full':
      return '\u2713'
    case 'beta':
      return '\u2726'
    case 'partial':
      return '~'
    case 'manual':
      return '\u2699'
    case 'na':
      return '\u2014'
    case 'none':
      return '\u2717'
  }
}

function getSystemScore(system: TumulteFeatureMatrix): number {
  const applicable = FEATURE_KEYS.filter((key) => system[key] !== 'na')
  if (applicable.length === 0) return 100
  const total = applicable.reduce((sum, key) => sum + SUPPORT_LEVEL_SCORE[system[key]], 0)
  return Math.round(total / applicable.length)
}

function getScoreColorKey(score: number): string {
  if (score >= 90) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 30) return 'moderate'
  return 'limited'
}

// ========================================
// TIER DATA
// ========================================

const tierGroups: TierGroup[] = [
  // ── Tier 1 — Support complet ──────────────────────────────────────────────
  {
    tier: 1,
    name: 'Support complet',
    description: 'Adaptateur dedie + presets automatiques + detection enrichie',
    icon: 'i-lucide-shield-check',
    systems: [
      {
        id: 'dnd5e',
        name: 'D&D 5th Edition',
        tier: 1,
        installPercent: '64.28%',
        primaryDie: 'd20',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
        spells: 'full',
        combat: 'full',
      },
      {
        id: 'pf2e',
        name: 'Pathfinder 2e',
        tier: 1,
        installPercent: '30.52%',
        primaryDie: 'd20',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
        spells: 'full',
        combat: 'full',
      },
      {
        id: 'CoC7',
        name: "L'Appel de Cthulhu 7e",
        tier: 1,
        installPercent: '6.71%',
        primaryDie: 'd100',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
        spells: 'beta',
        combat: 'beta',
      },
      {
        id: 'wfrp4e',
        name: 'Warhammer Fantasy 4e',
        tier: 1,
        installPercent: '4.16%',
        primaryDie: 'd100',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
        spells: 'beta',
        combat: 'beta',
      },
      {
        id: 'swade',
        name: 'Savage Worlds (SWADE)',
        tier: 1,
        installPercent: '3.94%',
        primaryDie: 'Variable',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
        spells: 'full',
        combat: 'full',
      },
      {
        id: 'vtm5e',
        name: 'Vampire: La Mascarade V5',
        tier: 1,
        installPercent: '3.61%',
        primaryDie: 'd10',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
        spells: 'na',
        combat: 'na',
      },
      {
        id: 'cyberpunk-red-core',
        name: 'Cyberpunk RED',
        tier: 1,
        installPercent: '3.50%',
        primaryDie: 'd10',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
        spells: 'na',
        combat: 'beta',
      },
      {
        id: 'starwarsffg',
        name: 'Star Wars FFG / Genesys',
        tier: 1,
        installPercent: '3.28%',
        primaryDie: 'd12',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
        spells: 'beta',
        combat: 'beta',
      },
      {
        id: 'alienrpg',
        name: 'Alien RPG',
        tier: 1,
        installPercent: '3.02%',
        primaryDie: 'd6',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
        spells: 'na',
        combat: 'beta',
      },
      {
        id: 'shadowrun5e',
        name: 'Shadowrun 5e / 6e',
        tier: 1,
        installPercent: '~2.0%',
        primaryDie: 'd6',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
        spells: 'beta',
        combat: 'beta',
      },
      {
        id: 'forbidden-lands',
        name: 'Forbidden Lands',
        tier: 1,
        installPercent: '1.87%',
        primaryDie: 'd6',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
        spells: 'full',
        combat: 'beta',
      },
      {
        id: 'blades-in-the-dark',
        name: 'Blades in the Dark',
        tier: 1,
        installPercent: '~1.5%',
        primaryDie: 'd6',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
        spells: 'na',
        combat: 'na',
      },
      {
        id: 'vaesen',
        name: 'Vaesen',
        tier: 1,
        installPercent: '~1.0%',
        primaryDie: 'd6',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
        spells: 'na',
        combat: 'beta',
      },
      {
        id: 'fate-core-official',
        name: 'FATE Core',
        tier: 1,
        installPercent: '~0.8%',
        primaryDie: '4dF',
        characters: 'full',
        criticals: 'full',
        inversion: 'full',
        stats: 'full',
        spells: 'na',
        combat: 'na',
      },
    ],
  },

  // ── Tier 2 — Support partiel ──────────────────────────────────────────────
  {
    tier: 2,
    name: 'Support partiel',
    description:
      'Adaptateur generique — detection d20 automatique, autres mecaniques en configuration manuelle',
    icon: 'i-lucide-shield',
    systems: [
      // Tier 2a — d20-based
      {
        id: 'pf1',
        name: 'Pathfinder 1e',
        tier: 2,
        installPercent: '4.32%',
        primaryDie: 'd20',
        characters: 'partial',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'none',
        spells: 'manual',
        combat: 'none',
      },
      {
        id: 'sfrpg',
        name: 'Starfinder',
        tier: 2,
        installPercent: '4.06%',
        primaryDie: 'd20',
        characters: 'partial',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'none',
        spells: 'manual',
        combat: 'none',
      },
      {
        id: 'lancer',
        name: 'LANCER',
        tier: 2,
        installPercent: '3.87%',
        primaryDie: 'd20',
        characters: 'partial',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'none',
        spells: 'none',
        combat: 'none',
      },
      {
        id: 'a5e',
        name: 'Level Up: Advanced 5e',
        tier: 2,
        installPercent: '2.34%',
        primaryDie: 'd20',
        characters: 'partial',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'none',
        spells: 'manual',
        combat: 'none',
      },
      {
        id: 'shadowdark',
        name: 'Shadowdark RPG',
        tier: 2,
        installPercent: '1.85%',
        primaryDie: 'd20',
        characters: 'partial',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'none',
        spells: 'none',
        combat: 'none',
      },
      {
        id: 'd35e',
        name: 'D&D 3.5e',
        tier: 2,
        installPercent: '1.51%',
        primaryDie: 'd20',
        characters: 'partial',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'none',
        spells: 'manual',
        combat: 'none',
      },
      {
        id: 'tormenta20',
        name: 'Tormenta20',
        tier: 2,
        installPercent: '0.90%',
        primaryDie: 'd20',
        characters: 'partial',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'none',
        spells: 'manual',
        combat: 'none',
      },
      {
        id: 'dcc',
        name: 'Dungeon Crawl Classics',
        tier: 2,
        installPercent: '~0.7%',
        primaryDie: 'd20',
        characters: 'partial',
        criticals: 'partial',
        inversion: 'partial',
        stats: 'none',
        spells: 'manual',
        combat: 'none',
      },
      // Tier 2b — d100/percentile
      {
        id: 'deltagreen',
        name: 'Delta Green',
        tier: 2,
        installPercent: '2.26%',
        primaryDie: 'd100',
        characters: 'partial',
        criticals: 'manual',
        inversion: 'manual',
        stats: 'none',
        spells: 'none',
        combat: 'none',
      },
      {
        id: 'dsa5',
        name: 'Das Schwarze Auge 5e',
        tier: 2,
        installPercent: '1.01%',
        primaryDie: '3d20',
        characters: 'partial',
        criticals: 'manual',
        inversion: 'manual',
        stats: 'none',
        spells: 'none',
        combat: 'none',
      },
      // Tier 2c — d6/d10 dice pool
      {
        id: 'wrath-and-glory',
        name: 'Wrath & Glory',
        tier: 2,
        installPercent: '2.37%',
        primaryDie: 'd6',
        characters: 'partial',
        criticals: 'manual',
        inversion: 'manual',
        stats: 'none',
        spells: 'none',
        combat: 'none',
      },
      {
        id: 'worldofdarkness',
        name: 'World of Darkness 20th',
        tier: 2,
        installPercent: '2.10%',
        primaryDie: 'd10',
        characters: 'partial',
        criticals: 'manual',
        inversion: 'manual',
        stats: 'none',
        spells: 'none',
        combat: 'none',
      },
      {
        id: 'dragonbane',
        name: 'Dragonbane',
        tier: 2,
        installPercent: '1.43%',
        primaryDie: 'd20',
        characters: 'partial',
        criticals: 'manual',
        inversion: 'manual',
        stats: 'none',
        spells: 'none',
        combat: 'none',
      },
      {
        id: 'blade-runner',
        name: 'Blade Runner RPG',
        tier: 2,
        installPercent: '~0.5%',
        primaryDie: 'd6-d12',
        characters: 'partial',
        criticals: 'manual',
        inversion: 'manual',
        stats: 'none',
        spells: 'none',
        combat: 'none',
      },
      // Tier 2d — Other mechanics
      {
        id: 'gurps',
        name: 'GURPS 4th Edition',
        tier: 2,
        installPercent: '1.85%',
        primaryDie: '3d6',
        characters: 'partial',
        criticals: 'manual',
        inversion: 'manual',
        stats: 'none',
        spells: 'none',
        combat: 'none',
      },
      {
        id: 'foundry-ironsworn',
        name: 'Ironsworn / Starforged',
        tier: 2,
        installPercent: '~0.7%',
        primaryDie: 'd6+2d10',
        characters: 'partial',
        criticals: 'manual',
        inversion: 'manual',
        stats: 'none',
        spells: 'none',
        combat: 'none',
      },
      {
        id: 'demonlord',
        name: 'Shadow of the Demon Lord',
        tier: 2,
        installPercent: '~0.5%',
        primaryDie: 'd20',
        characters: 'partial',
        criticals: 'manual',
        inversion: 'manual',
        stats: 'none',
        spells: 'none',
        combat: 'none',
      },
      {
        id: 'city-of-mist',
        name: 'City of Mist',
        tier: 2,
        installPercent: '~0.4%',
        primaryDie: '2d6',
        characters: 'partial',
        criticals: 'manual',
        inversion: 'manual',
        stats: 'none',
        spells: 'none',
        combat: 'none',
      },
      {
        id: 'torgeternity',
        name: 'Torg Eternity',
        tier: 2,
        installPercent: '~0.3%',
        primaryDie: 'd20',
        characters: 'partial',
        criticals: 'manual',
        inversion: 'manual',
        stats: 'none',
        spells: 'none',
        combat: 'none',
      },
    ],
  },

  // ── Tier 3 — Support basique ──────────────────────────────────────────────
  {
    tier: 3,
    name: 'Support basique',
    description:
      'Extraction de des basique — configuration manuelle requise pour toutes les fonctionnalites',
    icon: 'i-lucide-shield-off',
    systems: [
      {
        id: 'custom',
        name: 'Custom / Homebrew',
        tier: 3,
        primaryDie: 'Variable',
        characters: 'manual',
        criticals: 'manual',
        inversion: 'manual',
        stats: 'none',
        spells: 'none',
        combat: 'none',
      },
    ],
  },
]

// ========================================
// COMPUTED
// ========================================

const platformStats = computed(() => {
  const allSystems = tierGroups.flatMap((g) => g.systems).filter((s) => s.id !== 'custom')
  const scores = allSystems.map((s) => getSystemScore(s))

  const excellent = scores.filter((s) => s >= 90).length
  const good = scores.filter((s) => s >= 60 && s < 90).length
  const limited = scores.filter((s) => s < 60).length
  const total = allSystems.length
  const avgScore = total > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / total) : 0

  return {
    excellent,
    good,
    limited,
    total,
    avgScore,
    excellentRatio: Math.round((excellent / total) * 100),
    goodRatio: Math.round((good / total) * 100),
    limitedRatio: Math.round((limited / total) * 100),
  }
})
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

/* Status badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge-sm {
  width: 1.25rem;
  height: 1.25rem;
  font-size: 0.625rem;
}

.status-full {
  background-color: rgba(34, 197, 94, 0.15);
  color: rgb(34, 197, 94);
}

.status-partial {
  background-color: rgba(234, 179, 8, 0.15);
  color: rgb(234, 179, 8);
}

.status-manual {
  background-color: rgba(59, 130, 246, 0.15);
  color: rgb(59, 130, 246);
}

.status-beta {
  background-color: rgba(139, 92, 246, 0.15);
  color: rgb(139, 92, 246);
}

.status-na {
  background-color: rgba(156, 163, 175, 0.1);
  color: rgb(156, 163, 175);
}

.status-none {
  background-color: rgba(107, 114, 128, 0.15);
  color: rgb(107, 114, 128);
}

/* Platform score card */
.platform-score-card {
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  background-color: var(--theme-bg-elevated);
  border: 1px solid var(--theme-border-muted);
}

.platform-bar {
  display: flex;
  height: 0.5rem;
  border-radius: 9999px;
  overflow: hidden;
  background-color: rgba(107, 114, 128, 0.2);
}

.platform-bar-segment {
  transition: width 0.5s ease;
}

.platform-bar-excellent {
  background-color: rgb(34, 197, 94);
}

.platform-bar-good {
  background-color: rgb(234, 179, 8);
}

.platform-bar-limited {
  background-color: rgb(156, 163, 175);
}

/* Tier summary badges */
.tier-summary-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 500;
}

.tier-badge-1 {
  background-color: rgba(34, 197, 94, 0.1);
  color: rgb(34, 197, 94);
}

.tier-badge-2 {
  background-color: rgba(234, 179, 8, 0.1);
  color: rgb(202, 155, 7);
}

.tier-badge-3 {
  background-color: rgba(107, 114, 128, 0.1);
  color: rgb(107, 114, 128);
}

/* Tier groups */
.tier-group {
  border: 1px solid var(--theme-border-muted);
  border-radius: 0.75rem;
  overflow: hidden;
  background-color: var(--theme-bg-elevated);
}

.tier-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.875rem 1rem;
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s ease;
  text-align: left;
}

.tier-group-header:hover {
  background-color: var(--theme-bg-muted);
}

.tier-icon-1 {
  color: rgb(34, 197, 94);
}

.tier-icon-2 {
  color: rgb(202, 155, 7);
}

.tier-icon-3 {
  color: rgb(107, 114, 128);
}

.tier-group-content {
  border-top: 1px solid var(--theme-border-muted);
}

.tier-3-message {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: var(--theme-bg-muted);
  border-bottom: 1px solid var(--theme-border-muted);
}

/* System rows */
.system-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.625rem 1rem;
  border-bottom: 1px solid var(--theme-border-muted);
  transition: background-color 0.1s ease;
}

.system-row:last-child {
  border-bottom: none;
}

.system-row:hover {
  background-color: var(--theme-bg-muted);
}

.system-row-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
  flex: 1;
}

.system-name {
  font-weight: 500;
  font-size: 0.875rem;
  color: var(--color-text-primary);
}

.system-id {
  font-family: ui-monospace, monospace;
}

.install-percent {
  padding: 0.0625rem 0.375rem;
  border-radius: 9999px;
  background-color: var(--theme-bg-muted);
  font-size: 0.6875rem;
}

/* Score bar */
.score-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: default;
  flex-shrink: 0;
}

.score-bar {
  width: 5rem;
  height: 0.375rem;
  border-radius: 9999px;
  overflow: hidden;
  background-color: rgba(107, 114, 128, 0.15);
}

.score-bar-fill {
  height: 100%;
  border-radius: 9999px;
  transition: width 0.4s ease;
}

.score-color-excellent {
  background-color: rgb(34, 197, 94);
}

.score-color-good {
  background-color: rgb(234, 179, 8);
}

.score-color-moderate {
  background-color: rgb(249, 115, 22);
}

.score-color-limited {
  background-color: rgb(156, 163, 175);
}

.score-label {
  font-size: 0.75rem;
  font-weight: 600;
  min-width: 2.5rem;
  text-align: right;
}

.text-score-excellent {
  color: rgb(34, 197, 94);
}

.text-score-good {
  color: rgb(202, 155, 7);
}

.text-score-moderate {
  color: rgb(249, 115, 22);
}

.text-score-limited {
  color: rgb(107, 114, 128);
}

/* Popover */
.popover-content {
  width: 15rem;
  padding: 0.75rem;
}

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--theme-border-muted);
  margin-bottom: 0.5rem;
}

.popover-category {
  margin-bottom: 0.375rem;
}

.popover-category:last-child {
  margin-bottom: 0;
}

.popover-category-header {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.025em;
  padding: 0.25rem 0;
}

.popover-feature-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.125rem 0;
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
  max-height: 2000px;
}

/* Responsive */
@media (max-width: 640px) {
  .score-bar {
    width: 3rem;
  }

  .score-label {
    min-width: 2rem;
    font-size: 0.6875rem;
  }

  .system-row {
    padding: 0.5rem 0.75rem;
  }

  .tier-summary-badge {
    font-size: 0.625rem;
  }
}
</style>
