import { ref, computed, onMounted, onUnmounted } from "vue";

/**
 * Composable for device type detection and responsive breakpoints.
 *
 * @returns Device state and breakpoint flags
 *
 * @example
 * const { isMobile, isTablet, isDesktop } = useDevice()
 */
export function useDevice() {
  const windowWidth = ref(0);

  /**
   * Updates the window width value.
   */
  const updateWidth = () => {
    if (typeof window !== "undefined") {
      windowWidth.value = window.innerWidth;
    }
  };

  /**
   * Is the device mobile (< 640px)?
   */
  const isMobile = computed(() => windowWidth.value < 640);

  /**
   * Is the device tablet (>= 640px and < 1024px)?
   */
  const isTablet = computed(
    () => windowWidth.value >= 640 && windowWidth.value < 1024,
  );

  /**
   * Is the device desktop (>= 1024px)?
   */
  const isDesktop = computed(() => windowWidth.value >= 1024);

  /**
   * Device type as string.
   */
  const deviceType = computed(() => {
    if (isMobile.value) return "mobile";
    if (isTablet.value) return "tablet";
    return "desktop";
  });

  onMounted(() => {
    updateWidth();
    window.addEventListener("resize", updateWidth);
  });

  onUnmounted(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("resize", updateWidth);
    }
  });

  return {
    windowWidth,
    isMobile,
    isTablet,
    isDesktop,
    deviceType,
  };
}
