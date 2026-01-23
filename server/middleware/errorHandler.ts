import type { NextFunction, Request, Response } from "express";
import type { AppLogger } from "../core/logger";
import { AppError, ErrorCodes, isAppError } from "../core/errors";
import type { DbClient } from "../db/prisma";

/**
 * Express error middleware.
 *
 * What it does:
 * - Normalizes any thrown error into a stable error response.
 * - Saves error to DB (ErrorLog table)
 * - Logs to file + console
 */
export function createErrorHandler(args: { logger: AppLogger; db: DbClient }) {
  const { logger, db } = args;

  return async function errorHandler(
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) {
    const appErr = isAppError(err)
      ? err
      : new AppError({
          code: ErrorCodes.UNKNOWN,
          status: 500,
          message: err instanceof Error ? err.message : "Unknown error",
          cause: err,
        });

    // Persist to DB (best effort - never crash the process if logging fails)
    try {
      await db.errorLog.create({
        data: {
          code: appErr.code,
          message: appErr.message,
          stack: err instanceof Error ? err.stack : undefined,
          context: appErr.context ? JSON.stringify(appErr.context) : undefined,
        },
      });
    } catch (dbErr) {
      logger.error("Failed to persist error to DB", { dbErr });
    }

    logger.error(appErr.message, {
      code: appErr.code,
      status: appErr.status,
      context: appErr.context,
      stack: err instanceof Error ? err.stack : undefined,
    });

    res.status(appErr.status).json({
      error: {
        code: appErr.code,
        message: appErr.message,
      },
    });
  };
}
