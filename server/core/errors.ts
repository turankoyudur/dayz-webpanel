/**
 * A stable error code catalog.
 *
 * IMPORTANT:
 * - Keep codes stable.
 * - Prefer adding new codes over renaming/deleting existing ones.
 */
export const ErrorCodes = {
  // General
  UNKNOWN: "E_UNKNOWN",
  VALIDATION: "E_VALIDATION",
  FORBIDDEN: "E_FORBIDDEN",
  NOT_FOUND: "E_NOT_FOUND",

  // Settings
  SETTINGS_NOT_CONFIGURED: "E_SETTINGS_NOT_CONFIGURED",

  // Config
  CONFIG_FILE_NOT_FOUND: "E_CONFIG_FILE_NOT_FOUND",
  CONFIG_WRITE_FAILED: "E_CONFIG_WRITE_FAILED",

  // File IO
  FILE_NOT_FOUND: "E_FILE_NOT_FOUND",
  FILE_IO: "E_FILE_IO",

  // External dependencies / environment
  DEPENDENCY_MISSING: "E_DEPENDENCY_MISSING",

  // SteamCMD
  STEAMCMD_NOT_FOUND: "E_STEAMCMD_NOT_FOUND",
  STEAMCMD_FAILED: "E_STEAMCMD_FAILED",

  // Mods
  MOD_INSTALL_FAILED: "E_MOD_INSTALL_FAILED",
  MOD_REMOVE_FAILED: "E_MOD_REMOVE_FAILED",

  // Game server process
  SERVER_PROCESS_START_FAILED: "E_SERVER_PROCESS_START_FAILED",
  SERVER_PROCESS_STOP_FAILED: "E_SERVER_PROCESS_STOP_FAILED",

  // ApiBridge (File Bridge)
  APIBRIDGE_NOT_READY: "E_APIBRIDGE_NOT_READY",
  APIBRIDGE_COMMAND_FAILED: "E_APIBRIDGE_COMMAND_FAILED",
  APIBRIDGE_IO_FAILED: "E_APIBRIDGE_IO_FAILED",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

type AppErrorArgs = {
  code: ErrorCode;
  message: string;
  status?: number;
  cause?: unknown;
  context?: Record<string, unknown>;
};

/**
 * Custom error that carries a stable error code + HTTP status.
 *
 * NOTE: This class supports two constructor styles for backward compatibility:
 *  - new AppError({ code, message, status?, context?, cause? })
 *  - new AppError(code, message, context?, status?, cause?)
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly status: number;
  public readonly context?: Record<string, unknown>;

  constructor(args: AppErrorArgs);
  constructor(
    code: ErrorCode,
    message: string,
    context?: Record<string, unknown>,
    status?: number,
    cause?: unknown,
  );
  constructor(
    arg1: AppErrorArgs | ErrorCode,
    message?: string,
    context?: Record<string, unknown>,
    status?: number,
    cause?: unknown,
  ) {
    const args: AppErrorArgs =
      typeof arg1 === "string"
        ? {
            code: arg1,
            message: message ?? "",
            context,
            status,
            cause,
          }
        : arg1;

    super(args.message);
    this.code = args.code;
    this.status = args.status ?? 500;
    this.context = args.context;

    // Preserve original cause for debugging (Node 16+)
    if (args.cause) {
      // @ts-expect-error - TS doesn't know about Error.cause in some configs
      this.cause = args.cause;
    }
  }
}

/**
 * A type guard to detect AppError.
 */
export function isAppError(err: unknown): err is AppError {
  return !!err && typeof err === "object" && "code" in err && "status" in err;
}
