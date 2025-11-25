type LogLevel = "error" | "warn" | "info" | "debug";

const LOG_LEVEL: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) || "info";

const levelPriority: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

const shouldLog = (level: LogLevel): boolean => {
  return levelPriority[level] <= levelPriority[LOG_LEVEL];
};

const log = (level: LogLevel, message: string, meta?: unknown) => {
  if (!shouldLog(level)) return;

  const time = new Date().toISOString();
  const base = `[${time}] [${level.toUpperCase()}] ${message}`;

  if (meta) {
    console.log(base, meta);
  } else {
    console.log(base);
  }
};

export const logger = {
  error: (message: string, meta?: unknown) => log("error", message, meta),
  warn: (message: string, meta?: unknown) => log("warn", message, meta),
  info: (message: string, meta?: unknown) => log("info", message, meta),
  debug: (message: string, meta?: unknown) => log("debug", message, meta)
};
