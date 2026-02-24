<template>
  <div>
    <LandingHero />
    <LandingProblem />
    <LandingSolution />
    <LandingFeatures />
    <LandingUseCases />
    <LandingVttCompatibility />
    <LandingTestimonials />
    <LandingCta />
  </div>
</template>

<script setup lang="ts">
import LandingHero from '~/components/landing/LandingHero.vue'
import LandingProblem from '~/components/landing/LandingProblem.vue'
import LandingSolution from '~/components/landing/LandingSolution.vue'
import LandingFeatures from '~/components/landing/LandingFeatures.vue'
import LandingUseCases from '~/components/landing/LandingUseCases.vue'
import LandingVttCompatibility from '~/components/landing/LandingVttCompatibility.vue'
import LandingTestimonials from '~/components/landing/LandingTestimonials.vue'
import LandingCta from '~/components/landing/LandingCta.vue'
import { useAnalytics } from '~/composables/useAnalytics'
import { useJsonLd } from '~/composables/useJsonLd'

definePageMeta({
  layout: 'landing' as const,
})

// Analytics: Track landing page view with UTM parameters
const route = useRoute()
const { track } = useAnalytics()

onMounted(() => {
  /* eslint-disable camelcase */
  track('landing_page_viewed', {
    source: route.query.ref || 'direct',
    utm_source: route.query.utm_source || null,
    utm_medium: route.query.utm_medium || null,
    utm_campaign: route.query.utm_campaign || null,
    utm_content: route.query.utm_content || null,
  })
  /* eslint-enable camelcase */
})

// SEO - Meta tags complets pour referencement et partage social
const baseUrl = 'https://tumulte.app'
const ogImageUrl = `${baseUrl}/images/og-image.png`

useSeoMeta({
  // Meta de base
  title: 'Tumulte - Forgez des Legendes avec vos Communautes',
  description:
    "Transformez vos viewers en acteurs de l'aventure JDR. Sondages Twitch synchronises sur plusieurs chaines, decisions collectives, chaos memorable.",

  // Open Graph (Facebook, LinkedIn, Discord)
  ogTitle: 'Tumulte - Forgez des Legendes avec vos Communautes',
  ogDescription:
    "Transformez vos viewers en acteurs de l'aventure JDR. Sondages Twitch synchronises sur plusieurs chaines.",
  ogType: 'website',
  ogImage: ogImageUrl,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: 'Tumulte - Plateforme de sondages multi-streams pour JDR',
  ogUrl: baseUrl,
  ogSiteName: 'Tumulte',
  ogLocale: 'fr_FR',

  // Twitter Cards
  twitterCard: 'summary_large_image',
  twitterTitle: 'Tumulte - Forgez des Legendes avec vos Communautes',
  twitterDescription:
    "Transformez vos viewers en acteurs de l'aventure JDR. Sondages Twitch synchronises.",
  twitterImage: ogImageUrl,
  twitterImageAlt: 'Tumulte - Plateforme de sondages multi-streams pour JDR',
  // twitterSite: '@tumulte_app', // Decommenter quand le compte Twitter existe
  // twitterCreator: '@tumulte_app',

  // SEO supplementaire
  robots: 'index, follow',
  author: 'Tumulte',
})

// URL canonique pour eviter le duplicate content
useHead({
  link: [{ rel: 'canonical', href: baseUrl }],
})

// JSON-LD - Donnees structurees pour Google
const { injectLandingPageSchemas } = useJsonLd()
injectLandingPageSchemas()
</script>
