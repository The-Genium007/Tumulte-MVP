import { ref } from "vue";
import type { SupportActionType } from "@/utils/supportErrorMessages";

// État global partagé pour le widget de support
const isSupportWidgetOpen = ref(false);
const prefillMessage = ref<string>("");
const prefillActionType = ref<SupportActionType | null>(null);

export const useSupportWidget = () => {
  const openSupport = () => {
    isSupportWidgetOpen.value = true;
  };

  const closeSupport = () => {
    isSupportWidgetOpen.value = false;
    // Reset prefill après fermeture (avec délai pour l'animation)
    setTimeout(() => {
      prefillMessage.value = "";
      prefillActionType.value = null;
    }, 300);
  };

  const openWithPrefill = (message: string, actionType?: SupportActionType) => {
    prefillMessage.value = message;
    prefillActionType.value = actionType ?? null;
    isSupportWidgetOpen.value = true;
  };

  return {
    isSupportWidgetOpen,
    prefillMessage,
    prefillActionType,
    openSupport,
    closeSupport,
    openWithPrefill,
  };
};
