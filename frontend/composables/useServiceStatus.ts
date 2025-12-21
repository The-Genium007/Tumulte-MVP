type ServiceStatus = "operational" | "degraded" | "unknown";

export const useServiceStatus = () => {
  const status = ref<ServiceStatus>("unknown");
  const loading = ref(false);

  const checkStatus = async () => {
    loading.value = true;

    try {
      const config = useRuntimeConfig();
      const apiBase = config.public.apiBase;
      const apiVersion = config.public.apiVersion;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(`${apiBase}/api/${apiVersion}/health`, {
        method: "GET",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      status.value = response.ok ? "operational" : "degraded";
    } catch (err) {
      // Timeout ou erreur réseau
      status.value = "unknown";
      console.warn("Service status check failed:", err);
    } finally {
      loading.value = false;
    }
  };

  // Check au montage
  onMounted(() => {
    checkStatus();
  });

  return {
    status: readonly(status),
    loading: readonly(loading),
    refresh: checkStatus,
  };
};
