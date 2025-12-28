import { ref } from "vue";

// État global partagé pour le widget de support
const isSupportWidgetOpen = ref(false);

export const useSupportWidget = () => {
  const openSupport = () => {
    isSupportWidgetOpen.value = true;
  };

  const closeSupport = () => {
    isSupportWidgetOpen.value = false;
  };

  return {
    isSupportWidgetOpen,
    openSupport,
    closeSupport,
  };
};
