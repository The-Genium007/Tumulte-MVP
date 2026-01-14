export type SupportConsoleEntry = {
  level: "log" | "info" | "warn" | "error";
  message: string;
  timestamp: string;
};

export type SupportErrorEntry = {
  type: string;
  message: string;
  stack?: string;
  timestamp: string;
};

const MAX_LOGS = 50;
const MAX_ERRORS = 20;

const consoleBuffer: SupportConsoleEntry[] = [];
const errorBuffer: SupportErrorEntry[] = [];

let initialized = false;
let sessionId = "";

const serialize = (value: unknown): string => {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
};

const pushConsole = (level: SupportConsoleEntry["level"], args: unknown[]) => {
  const message = args.map((arg) => serialize(arg)).join(" ");
  consoleBuffer.push({
    level,
    message,
    timestamp: new Date().toISOString(),
  });
  if (consoleBuffer.length > MAX_LOGS) {
    consoleBuffer.shift();
  }
};

const pushError = (type: string, value: unknown) => {
  const isError = value instanceof Error;
  errorBuffer.push({
    type,
    message: isError ? value.message : serialize(value),
    stack: isError ? value.stack : undefined,
    timestamp: new Date().toISOString(),
  });

  if (errorBuffer.length > MAX_ERRORS) {
    errorBuffer.shift();
  }
};

export const setupSupportTelemetry = () => {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  sessionId =
    crypto.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  // Synchroniser le sessionId avec Sentry pour corrélation
  import("@/sentry.client.config")
    .then(({ setSentrySessionId }) => {
      setSentrySessionId(sessionId);
    })
    .catch(() => {
      // Sentry non configuré, ignorer
    });

  const original = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  (["log", "info", "warn", "error"] as const).forEach((level) => {
    const originalFn = original[level];
    console[level] = (...args: unknown[]) => {
      try {
        pushConsole(level, args);
      } catch {
        // ignore
      }
      return originalFn?.(...(args as []));
    };
  });

  window.addEventListener("error", (event) => {
    pushError("error", event.error ?? event.message);
  });

  window.addEventListener("unhandledrejection", (event) => {
    pushError("unhandledrejection", event.reason);
  });
};

export const getSupportSnapshot = () => ({
  consoleLogs: [...consoleBuffer],
  errors: [...errorBuffer],
  sessionId,
});
