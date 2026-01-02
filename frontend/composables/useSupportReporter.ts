import { useAuthStore } from "@/stores/auth";
import { usePollControlStore } from "@/stores/pollControl";
import { getSupportSnapshot } from "@/utils/supportTelemetry";

const buildPerformanceSnapshot = () => {
  if (typeof performance === "undefined") return undefined;

  const navigation = performance.getEntriesByType?.("navigation")?.[0] as
    | PerformanceNavigationTiming
    | undefined;
  const memory = (
    performance as unknown as {
      memory?: { usedJSHeapSize: number; totalJSHeapSize: number };
    }
  )?.memory;

  return {
    navigation: navigation
      ? {
          duration: Math.round(navigation.duration),
          domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),
          load: Math.round(navigation.loadEventEnd),
          transferSize: (navigation as unknown as { transferSize?: number })
            ?.transferSize,
        }
      : undefined,
    memory: memory
      ? {
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
        }
      : undefined,
  };
};

export const useSupportReporter = () => {
  const config = useRuntimeConfig();
  const API_URL = config.public.apiBase;

  const authStore = useAuthStore();
  const pollControlStore = usePollControlStore();

  const buildStoreSnapshot = () => ({
    auth: {
      userId: authStore.user?.id ?? null,
      role: authStore.user?.role ?? null,
      displayName:
        // eslint-disable-next-line @typescript-eslint/naming-convention
        (authStore.user as unknown as { display_name?: string })
          ?.display_name ?? null,
      email: authStore.user?.email ?? null,
      streamer: authStore.user?.streamer,
    },
    pollControl: {
      activeSessionId:
        (pollControlStore.activeSession as unknown as { id?: string })?.id ??
        null,
      pollStatus: pollControlStore.pollStatus,
      currentPollIndex: pollControlStore.currentPollIndex,
      countdown: pollControlStore.countdown,
      launchedPollsCount: pollControlStore.launchedPolls?.length ?? 0,
    },
  });

  const buildFrontendContext = (
    description: string,
    includeDiagnostics: boolean,
  ) => {
    const snapshot = includeDiagnostics
      ? getSupportSnapshot()
      : { consoleLogs: [], errors: [], sessionId: "" };
    const resolved = Intl.DateTimeFormat().resolvedOptions();

    return {
      description: description.trim(),
      url: typeof window !== "undefined" ? window.location.href : undefined,
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
      locale: typeof navigator !== "undefined" ? navigator.language : undefined,
      timezone: resolved.timeZone,
      viewport:
        typeof window !== "undefined"
          ? { width: window.innerWidth, height: window.innerHeight }
          : undefined,
      screen:
        typeof window !== "undefined" && window.screen
          ? { width: window.screen.width, height: window.screen.height }
          : undefined,
      sessionId: snapshot.sessionId,
      storeState: includeDiagnostics ? buildStoreSnapshot() : undefined,
      consoleLogs: includeDiagnostics ? snapshot.consoleLogs : undefined,
      errors: includeDiagnostics ? snapshot.errors : undefined,
      performance: includeDiagnostics ? buildPerformanceSnapshot() : undefined,
    };
  };

  const sendSupportReport = async (
    description: string,
    options?: { includeDiagnostics?: boolean },
  ) => {
    if (!description || !description.trim()) {
      throw new Error("Merci de décrire le problème avant l'envoi.");
    }

    const includeDiagnostics = options?.includeDiagnostics ?? true;

    if (!authStore.user) {
      try {
        await authStore.fetchMe();
      } catch {
        // ignore, le backend renverra 401 si nécessaire
      }
    }

    const payload = {
      description: description.trim(),
      frontend: buildFrontendContext(description, includeDiagnostics),
    };

    const response = await fetch(`${API_URL}/support/report`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(
        error?.error || "Impossible d'envoyer le ticket Discord.",
      );
    }

    return response.json().catch(() => ({}));
  };

  return { sendSupportReport };
};
