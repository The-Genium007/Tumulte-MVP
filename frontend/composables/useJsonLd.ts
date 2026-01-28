/**
 * Composable pour injecter des donnees structurees JSON-LD
 *
 * JSON-LD (JavaScript Object Notation for Linked Data) permet aux moteurs
 * de recherche de mieux comprendre le contenu et le type de site web.
 *
 * @see https://schema.org/
 * @see https://developers.google.com/search/docs/appearance/structured-data
 */
export function useJsonLd() {
  const config = useRuntimeConfig()
  const baseUrl = 'https://tumulte.app'

  /**
   * Injecte le schema Organization
   * Decrit l'organisation/entreprise derriere le site
   */
  const injectOrganization = () => {
    useHead({
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Tumulte',
            url: baseUrl,
            logo: `${baseUrl}/images/og-image.png`,
            description:
              'Plateforme de sondages multi-streams Twitch synchronises pour sessions JDR',
            foundingDate: '2024',
            sameAs: [
              'https://twitter.com/tumulte_app',
              // Ajouter d'autres reseaux sociaux si applicable
            ],
            contactPoint: {
              '@type': 'ContactPoint',
              contactType: 'customer support',
              availableLanguage: ['French'],
            },
          }),
        },
      ],
    })
  }

  /**
   * Injecte le schema WebApplication
   * Decrit l'application web et ses caracteristiques
   */
  const injectWebApplication = () => {
    useHead({
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'Tumulte',
            url: baseUrl,
            applicationCategory: 'GameApplication',
            operatingSystem: 'Web Browser',
            description:
              "Transformez vos viewers en acteurs de l'aventure JDR. Sondages Twitch synchronises sur plusieurs chaines, decisions collectives, chaos memorable.",
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'EUR',
              description: 'Gratuit',
            },
            featureList: [
              'Sondages multi-streams synchronises',
              'Integration Twitch native',
              'Tableaux de bord en temps reel',
              'Gestion de campagnes JDR',
              'Overlay personnalisable',
            ],
            screenshot: `${baseUrl}/images/landing/solution-mockup.webp`,
            softwareVersion: config.public.appVersion || '1.0.0',
            author: {
              '@type': 'Organization',
              name: 'Tumulte',
            },
          }),
        },
      ],
    })
  }

  /**
   * Injecte le schema WebSite avec SearchAction
   * Utile pour apparaitre dans les sitelinks search box de Google
   */
  const injectWebSite = () => {
    useHead({
      script: [
        {
          type: 'application/ld+json',
          innerHTML: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Tumulte',
            url: baseUrl,
            description: 'Plateforme de sondages multi-streams Twitch pour sessions JDR',
            inLanguage: 'fr-FR',
          }),
        },
      ],
    })
  }

  /**
   * Injecte tous les schemas pour la landing page
   */
  const injectLandingPageSchemas = () => {
    injectOrganization()
    injectWebApplication()
    injectWebSite()
  }

  return {
    injectOrganization,
    injectWebApplication,
    injectWebSite,
    injectLandingPageSchemas,
  }
}
