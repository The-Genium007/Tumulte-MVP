/**
 * Plugin pour initialiser le toast Sentry au démarrage de l'app
 * Affiche un toast discret quand une erreur est capturée par Sentry
 */
export default defineNuxtPlugin((nuxtApp) => {
  // Le composable doit être appelé dans un contexte Vue actif
  nuxtApp.hook('app:mounted', () => {
    useSentryToast()
  })
})
