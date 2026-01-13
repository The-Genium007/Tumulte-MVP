/**
 * Composable pour gérer l'écran de chargement D20
 * Gère le chargement initial (hydration) et les navigations entre pages
 */

const isLoading = ref(true);

export function useLoadingScreen() {
  const nuxtApp = useNuxtApp();

  const show = () => {
    isLoading.value = true;
  };

  const hide = () => {
    isLoading.value = false;
  };

  // Initialisation : écoute les hooks Nuxt
  const init = () => {
    // Chargement initial terminé
    nuxtApp.hook("app:mounted", () => {
      // Petit délai pour laisser le rendu se stabiliser
      setTimeout(hide, 300);
    });

    // Navigation entre pages
    nuxtApp.hook("page:start", show);
    nuxtApp.hook("page:finish", () => {
      setTimeout(hide, 200);
    });
  };

  return {
    isLoading: readonly(isLoading),
    show,
    hide,
    init,
  };
}
