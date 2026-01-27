/**
 * Composable pour gérer l'écran de chargement D20
 * Gère le chargement initial (hydration) et les navigations entre pages
 */

const isLoading = ref(true)
const isTransitioning = ref(false)

export function useLoadingScreen() {
  const nuxtApp = useNuxtApp()

  const show = () => {
    // Évite d'afficher pendant une transition en cours
    if (isTransitioning.value) return
    isLoading.value = true
  }

  const hide = () => {
    // Évite de cacher pendant une transition en cours
    if (isTransitioning.value) return
    isTransitioning.value = true
    isLoading.value = false
  }

  // Appelé quand la transition CSS est terminée
  const onTransitionEnd = () => {
    isTransitioning.value = false
  }

  // Initialisation : écoute les hooks Nuxt
  const init = () => {
    // Chargement initial terminé
    nuxtApp.hook('app:mounted', () => {
      // Délai pour laisser le rendu et la détection du thème se stabiliser
      setTimeout(hide, 400)
    })

    // Navigation entre pages
    nuxtApp.hook('page:start', show)
    nuxtApp.hook('page:finish', () => {
      setTimeout(hide, 200)
    })

    // Fallback : page:loading:end
    nuxtApp.hook('page:loading:end', () => {
      setTimeout(hide, 200)
    })

    // Sécurité : cacher en cas d'erreur pour éviter un écran bloqué
    nuxtApp.hook('app:error', () => {
      isLoading.value = false
      isTransitioning.value = false
    })
  }

  return {
    isLoading: readonly(isLoading),
    isTransitioning: readonly(isTransitioning),
    show,
    hide,
    onTransitionEnd,
    init,
  }
}
