<template>
  <section class="relative overflow-hidden">
    <!-- Background gradient subtil -->
    <div
      class="absolute inset-0 bg-gradient-to-b from-secondary-500/10 via-transparent to-transparent pointer-events-none"
    />

    <div class="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl py-12 lg:py-20 relative">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        <!-- Image (mobile: first, desktop: left) -->
        <div v-motion-fade-left :delay="200" class="order-1 lg:order-1">
          <div class="relative">
            <img
              src="/images/landing/hero.webp"
              alt="Scène fantasy épique - Aventuriers face à leur destinée"
              class="w-full rounded-2xl shadow-xl img-zoom"
            />
            <!-- Glow effect derrière l'image -->
            <div
              class="absolute -inset-4 bg-gradient-to-r from-secondary-300/20 to-primary-300/20 blur-3xl -z-10 rounded-full"
            />
          </div>
        </div>

        <!-- Texte -->
        <div v-motion-fade-right class="order-2 lg:order-2 space-y-6 lg:space-y-8">
          <div class="space-y-4">
            <h1
              class="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight leading-tight"
            >
              Forgez des
              <span
                class="text-transparent bg-clip-text bg-gradient-to-r from-secondary-600 to-secondary-400"
              >
                Légendes
              </span>
              <br class="hidden sm:block" />
              avec vos Communautés
            </h1>
            <p class="text-lg sm:text-xl text-muted max-w-lg">
              Transformez vos viewers en acteurs de l'aventure. Sondages synchronisés, décisions
              collectives, chaos mémorable.
            </p>
          </div>

          <!-- CTA -->
          <div class="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <UButton
              to="/register"
              size="xl"
              class="cta-glow shimmer w-full sm:w-auto justify-center"
              trailing-icon="i-lucide-wand-sparkles"
              @click="trackCtaClick(ctaText, 'hero_primary')"
            >
              {{ ctaText }}
            </UButton>
            <UButton
              to="#features"
              variant="outline"
              size="xl"
              class="w-full sm:w-auto justify-center"
              @click="trackCtaClick('Découvrir', 'hero_secondary')"
            >
              Découvrir
            </UButton>
          </div>

          <!-- Badge Twitch -->
          <div class="flex items-center gap-2 text-sm text-muted">
            <UIcon name="i-simple-icons-twitch" class="size-5 text-[#9146FF]" />
            <span>Compatible Twitch Affilié & Partenaire</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useAnalytics } from '~/composables/useAnalytics'
import { useFeatureFlags } from '~/composables/useFeatureFlags'

const { track } = useAnalytics()
const { getCtaVariant } = useFeatureFlags()
const ctaText = getCtaVariant() === 'variant_a' ? "Commencer l'Aventure" : "Rejoindre l'Aventure"

/**
 * Track CTA clicks for funnel analysis.
 * Helps identify which CTAs convert best.
 */
function trackCtaClick(ctaText: string, ctaPosition: string) {
  track('cta_clicked', {
    /* eslint-disable camelcase */
    cta_text: ctaText,
    cta_position: ctaPosition,
    /* eslint-enable camelcase */
  })
}
</script>
