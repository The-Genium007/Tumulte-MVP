import { defineStore } from "pinia";
import { ref, computed } from "vue";

const STORAGE_KEY = "tumulte_mock_data_enabled";

export const useMockDataStore = defineStore("mockData", () => {
  // State - initialisé depuis localStorage si disponible
  const enabled = ref<boolean>(false);

  // Initialiser depuis localStorage (côté client uniquement)
  if (import.meta.client) {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      enabled.value = stored === "true";
    }
  }

  // Computed
  const isEnabled = computed(() => enabled.value);

  // Actions
  function toggle(): void {
    enabled.value = !enabled.value;
    persistState();
  }

  function enable(): void {
    enabled.value = true;
    persistState();
  }

  function disable(): void {
    enabled.value = false;
    persistState();
  }

  function persistState(): void {
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, String(enabled.value));
    }
  }

  return {
    // State
    enabled,

    // Computed
    isEnabled,

    // Actions
    toggle,
    enable,
    disable,
  };
});
