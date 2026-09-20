import "server-only";

export type LogContext = Record<string, unknown>;
type LogLevel = "info" | "warn" | "error" | "debug";

const sensitiveKey = /(password|passwordhash|resetcode|codehash|challenge|verificationcode|otp|\bcode\b|token|cookie|authorization|apikey|secret|clientsecret|accesstoken|refreshtoken|databaseurl|email)/i;

function redact(key: string, value: unknown, depth = 0): unknown {
  if (sensitiveKey.test(key)) return "[REDACTED]";
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  if (depth > 3 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(key, item, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .slice(0, 50)
      .map(([childKey, childValue]) => [childKey, redact(childKey, childValue, depth + 1)]),
  );
}

function normalizeContext(context: LogContext = {}): LogContext {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [key, redact(key, value)]),
  );
}

function write(level: LogLevel, message: string, context?: LogContext): void {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    context: normalizeContext(context),
  });

  if (level === "error") {
    console.error(entry);
  } else if (level === "warn") {
    console.warn(entry);
  } else if (level === "debug") {
    console.debug(entry);
  } else {
    console.info(entry);
  }
}

export const logger = {
  info(message: string, context?: LogContext): void {
    write("info", message, context);
  },
  warn(message: string, context?: LogContext): void {
    write("warn", message, context);
  },
  error(message: string, context?: LogContext): void {
    write("error", message, context);
  },
  debug(message: string, context?: LogContext): void {
    write("debug", message, context);
  },
};
