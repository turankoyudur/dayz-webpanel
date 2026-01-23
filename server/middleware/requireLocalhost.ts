import { AppError, ErrorCodes } from "../core/errors";

function isLocalSocket(remoteAddress: string | undefined | null) {
  if (!remoteAddress) return false;
  return (
    remoteAddress === "127.0.0.1" ||
    remoteAddress === "::1" ||
    remoteAddress === "::ffff:127.0.0.1"
  );
}

/**
 * Restrict sensitive endpoints to localhost.
 *
 * The socket remoteAddress cannot be spoofed unless you put a proxy in front.
 * If you later add a reverse proxy, revisit this (and consider auth).
 */
export function requireLocalhost(req: any, _res: any, next: any) {
  const ra = req.socket?.remoteAddress as string | undefined;
  if (!isLocalSocket(ra)) {
    return next(
      new AppError({
        code: ErrorCodes.FORBIDDEN,
        status: 403,
        message: "This endpoint is only available from localhost.",
        context: { remoteAddress: ra },
      }),
    );
  }
  return next();
}
