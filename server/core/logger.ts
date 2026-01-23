import fs from "fs";
import path from "path";
import winston from "winston";
import "winston-daily-rotate-file";

/**
 * Central logger for the whole app.
 *
 * - Writes to console
 * - Writes to ./data/logs/app-YYYY-MM-DD.log (rotated daily)
 * - File output is a single line per log entry with a full timestamp
 *   (better readability for the Logs UI)
 */
let singleton: winston.Logger | undefined;

/**
 * Returns the app-wide singleton logger.
 *
 * Why singleton?
 * - We want consistent formatting everywhere.
 * - Some services may import the logger directly (e.g., background tasks)
 *   without having access to Express' app.locals.
 */
export function getLogger() {
  if (singleton) return singleton;

  const logsDir = path.resolve(process.cwd(), "data", "logs");
  fs.mkdirSync(logsDir, { recursive: true });

  // One line per log entry, with full timestamp at the beginning.
  // Also collapses multi-line stacks to a single line so the UI can split by \n safely.
  const fileLineFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    winston.format.errors({ stack: true }),
    winston.format.printf((info) => {
      const code = info.code ? ` ${String(info.code)}` : "";
      const msg = typeof info.message === "string" ? info.message : JSON.stringify(info.message);
      const ctx = info.context ? ` context=${safeJson(info.context)}` : "";
      const stack = info.stack
        ? ` stack=${String(info.stack).replace(/\r?\n/g, " | ")}`
        : "";
      return `${info.timestamp} [${info.level}]${code} ${msg}${ctx}${stack}`;
    }),
  );

  const rotate = new (winston.transports as any).DailyRotateFile({
    dirname: logsDir,
    filename: "app-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    maxFiles: "14d",
    zippedArchive: true,
    format: fileLineFormat,
  });

  // Dedicated error log file. This transport will capture only "error" level logs
  // and include the error code alongside the message. Having a separate error log
  // makes it easy to find the root cause of issues without digging into the main
  // application logs. Each entry includes the timestamp, log level, error code,
  // message and context (if provided).
  const errorRotate = new (winston.transports as any).DailyRotateFile({
    dirname: logsDir,
    filename: "error-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    maxFiles: "14d",
    zippedArchive: true,
    level: "error",
    format: winston.format.combine(
      winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
      winston.format.errors({ stack: true }),
      winston.format.printf((info) => {
        const code = info.code ? String(info.code) : "";
        const msg = typeof info.message === "string" ? info.message : JSON.stringify(info.message);
        const ctx = info.context ? ` context=${safeJson(info.context)}` : "";
        return `${info.timestamp} [${info.level}] ${code} ${msg}${ctx}`;
      }),
    ),
  });

  const logger = winston.createLogger({
    level: "info",
    // Console stays human readable.
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
          winston.format.printf((info) => {
            // Human-readable console output
            const msg = typeof info.message === "string" ? info.message : JSON.stringify(info.message);
            const code = info.code ? ` ${String(info.code)}` : "";
            return `${info.timestamp} ${info.level}${code}: ${msg}`;
          }),
        ),
      }),
      rotate,
      errorRotate,
    ],
  });

  singleton = logger;
  return singleton;
}

/**
 * Backwards compatible alias.
 * Existing code calls createLogger() during server init.
 */
export function createLogger() {
  return getLogger();
}

export type AppLogger = ReturnType<typeof createLogger>;

function safeJson(v: unknown) {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
