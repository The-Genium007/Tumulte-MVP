import { useAuthStore } from "@/stores/auth";
import { usePollControlStore } from "@/stores/pollControl";
import { getSupportSnapshot } from "@/utils/supportTelemetry";

/**
 * Patterns de données sensibles à filtrer
 */
const SENSITIVE_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-_.]+/gi, // Bearer tokens
  /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/gi, // JWT tokens
  /[a-z0-9]{30,}/gi, // Long hex/alphanumeric tokens
  /password["'\s:=]+[^"'\s,}]+/gi, // Passwords
  /secret["'\s:=]+[^"'\s,}]+/gi, // Secrets
  /access_token["'\s:=]+[^"'\s,}]+/gi, // Access tokens
  /refresh_token["'\s:=]+[^"'\s,}]+/gi, // Refresh tokens
  /api_key["'\s:=]+[^"'\s,}]+/gi, // API keys
  /authorization["'\s:=]+[^"'\s,}]+/gi, // Authorization headers
];

/**
 * Sanitize une chaîne en remplaçant les données sensibles par [REDACTED]
 */
const sanitizeString = (str: string): string => {
  let sanitized = str;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }
  return sanitized;
};

/**
 * Sanitize récursivement un objet
 */
const sanitizeObject = (obj: unknown): unknown => {
  if (typeof obj === "string") {
    return sanitizeString(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (obj && typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Filtrer les clés sensibles
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes("token") ||
        lowerKey.includes("password") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("apikey") ||
        lowerKey.includes("authorization")
      ) {
        sanitized[key] = "[REDACTED]";
      } else {
        sanitized[key] = sanitizeObject(value);
      }
    }
    return sanitized;
  }
  return obj;
};

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

type BugReportResult = {
  message: string;
  githubIssueUrl: string | null;
  discordSent: boolean;
};

type SuggestionResult = {
  message: string;
  githubDiscussionUrl: string | null;
  discordSent: boolean;
};

export const useSupportReporter = () => {
  const config = useRuntimeConfig();
  const API_URL = config.public.apiBase;

  const authStore = useAuthStore();
  const pollControlStore = usePollControlStore();

  const buildStoreSnapshot = () => ({
    auth: {
      userId: authStore.user?.id ?? null,
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
      : {
          consoleLogs: [],
          errors: [],
          sessionId: getSupportSnapshot().sessionId,
        };
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

  /**
   * Récupère les logs backend de l'utilisateur depuis Redis
   */
  const fetchBackendLogs = async (): Promise<unknown[]> => {
    try {
      const response = await fetch(`${API_URL}/support/logs`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        return data.data?.logs || [];
      }
    } catch {
      // Silent fail - logs backend optionnels
    }
    return [];
  };

  /**
   * Envoie un rapport de bug vers Discord #support-bugs + GitHub Issue
   */
  const sendBugReport = async (
    title: string,
    description: string,
    options?: { includeDiagnostics?: boolean },
  ): Promise<BugReportResult> => {
    if (!title || title.trim().length < 5) {
      throw new Error("Le titre doit faire au moins 5 caractères.");
    }

    if (!description || description.trim().length < 10) {
      throw new Error("La description doit faire au moins 10 caractères.");
    }

    const includeDiagnostics = options?.includeDiagnostics ?? true;

    if (!authStore.user) {
      try {
        await authStore.fetchMe();
      } catch {
        // ignore, le backend renverra 401 si nécessaire
      }
    }

    // Récupérer les logs backend si diagnostics activés
    let backendLogs: unknown[] = [];
    if (includeDiagnostics) {
      backendLogs = await fetchBackendLogs();
    }

    // Sanitize les données pour retirer les informations sensibles
    const payload = sanitizeObject({
      title: title.trim(),
      description: description.trim(),
      includeDiagnostics,
      frontend: buildFrontendContext(description, includeDiagnostics),
      backendLogs,
    }) as {
      title: string;
      description: string;
      includeDiagnostics: boolean;
      frontend: ReturnType<typeof buildFrontendContext>;
      backendLogs: unknown[];
    };

    const response = await fetch(`${API_URL}/support/report`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Session-Id": getSupportSnapshot().sessionId || "",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.error || "Impossible d'envoyer le rapport de bug.",
      );
    }

    const result = await response.json();
    return {
      message: result.message || "Bug signalé",
      githubIssueUrl: result.githubIssueUrl || null,
      discordSent: result.discordSent ?? false,
    };
  };

  /**
   * Envoie une suggestion vers Discord #suggestions + crée une GitHub Discussion
   */
  const sendSuggestion = async (
    title: string,
    description: string,
  ): Promise<SuggestionResult> => {
    if (!title || title.trim().length < 5) {
      throw new Error("Le titre doit faire au moins 5 caractères.");
    }

    if (!description || description.trim().length < 10) {
      throw new Error("La description doit faire au moins 10 caractères.");
    }

    if (!authStore.user) {
      try {
        await authStore.fetchMe();
      } catch {
        // ignore, le backend renverra 401 si nécessaire
      }
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
    };

    const response = await fetch(`${API_URL}/support/suggestion`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.error || "Impossible d'envoyer la suggestion.",
      );
    }

    const result = await response.json();
    return {
      message: result.message || "Suggestion envoyée",
      githubDiscussionUrl: result.githubDiscussionUrl || null,
      discordSent: result.discordSent ?? false,
    };
  };

  return { sendBugReport, sendSuggestion };
};
