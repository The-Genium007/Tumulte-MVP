/**
 * Plugin pour initialiser le toast Sentry au démarrage de l'app
 * Affiche un toast discret quand une erreur est capturée par Sentry
 */
export default defineNuxtPlugin(() => {
  // Le composable s'auto-initialise et s'abonne aux événements Sentry
  useSentryToast();
});
