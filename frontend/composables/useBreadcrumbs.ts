export interface Breadcrumb {
  label: string;
  to: string | null; // null = page actuelle (non cliquable)
  icon?: string;
}

export const useBreadcrumbs = () => {
  const route = useRoute();

  // Extraire breadcrumbs depuis route.meta
  const breadcrumbs = computed<Breadcrumb[]>(() => {
    const metaBreadcrumbs = route.meta.breadcrumbs;

    if (!metaBreadcrumbs) {
      return [];
    }

    // Si c'est déjà un tableau, le retourner
    if (Array.isArray(metaBreadcrumbs)) {
      return metaBreadcrumbs as Breadcrumb[];
    }

    // Si c'est un ComputedRef, l'unwrap
    if (typeof metaBreadcrumbs === "function") {
      return (metaBreadcrumbs as () => Breadcrumb[])();
    }

    return [];
  });

  const hasBreadcrumbs = computed(() => breadcrumbs.value.length > 0);

  return {
    breadcrumbs,
    hasBreadcrumbs,
  };
};
