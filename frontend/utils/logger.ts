/**
 * Conditional logger utility
 * Only logs in development mode to prevent information leakage in production
 */

interface LoggerOptions {
  prefix?: string;
}

class Logger {
  private prefix: string;
  private isDev: boolean;

  constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix ? `[${options.prefix}]` : "";
    this.isDev = process.env.NODE_ENV === "development";
  }

  /**
   * Debug level - only in development
   */
  debug(...args: unknown[]): void {
    if (this.isDev) {
      console.log(this.prefix, ...args);
    }
  }

  /**
   * Info level - only in development
   */
  info(...args: unknown[]): void {
    if (this.isDev) {
      console.info(this.prefix, ...args);
    }
  }

  /**
   * Warn level - always logged (important for debugging issues)
   */
  warn(...args: unknown[]): void {
    console.warn(this.prefix, ...args);
  }

  /**
   * Error level - always logged
   */
  error(...args: unknown[]): void {
    console.error(this.prefix, ...args);
  }

  /**
   * Create a child logger with a specific prefix
   */
  child(prefix: string): Logger {
    const combinedPrefix = this.prefix ? `${this.prefix} [${prefix}]` : prefix;
    return new Logger({ prefix: combinedPrefix });
  }
}

// Default logger instance
export const logger = new Logger();

// Factory function to create prefixed loggers
export function createLogger(prefix: string): Logger {
  return new Logger({ prefix });
}

// Pre-configured loggers for common modules
export const loggers = {
  auth: createLogger("Auth"),
  api: createLogger("API"),
  ws: createLogger("WebSocket"),
  poll: createLogger("Poll"),
  campaign: createLogger("Campaign"),
  notification: createLogger("Notification"),
};

export default logger;
