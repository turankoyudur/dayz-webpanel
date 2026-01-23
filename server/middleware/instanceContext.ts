import type { RequestHandler } from "express";
import { AppError, ErrorCodes } from "../core/errors";
import type { DbClient } from "../db/prisma";
import { validateInstanceName } from "../../shared/instanceName";
import { SettingsService, settingsKeyForInstance } from "../modules/settings/settings.service";

export const GLOBAL_ACTIVE_INSTANCE_KEY = "global:activeInstanceId";

async function getActiveInstanceId(db: DbClient): Promise<string | null> {
  const row = await db.setting.findUnique({ where: { key: GLOBAL_ACTIVE_INSTANCE_KEY } });
  const raw = (row?.value ?? "").trim();
  return raw ? raw : null;
}

async function setActiveInstanceId(db: DbClient, instanceId: string) {
  await db.setting.upsert({
    where: { key: GLOBAL_ACTIVE_INSTANCE_KEY },
    create: { key: GLOBAL_ACTIVE_INSTANCE_KEY, value: instanceId },
    update: { value: instanceId },
  });
}

async function ensureInstanceExists(db: DbClient, instanceId: string) {
  await db.instance.upsert({
    where: { id: instanceId },
    create: { id: instanceId, displayName: instanceId },
    update: {},
  });

  // Ensure settings row exists (lazy create).
  const key = settingsKeyForInstance(instanceId);
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) {
    // SettingsService.get() will create + persist defaults when missing.
    await new SettingsService(db, instanceId).get();
  }

  // Ensure an active instance is set.
  const active = await getActiveInstanceId(db);
  if (!active) await setActiveInstanceId(db, instanceId);
}

/**
 * Resolves the active instance for this request.
 *
 * Resolution order:
 * 1) X-Instance-Id header (preferred)
 * 2) DB setting global:activeInstanceId
 * 3) "default"
 */
export function instanceContext(): RequestHandler {
  return async (req, _res, next) => {
    try {
      const db = (req.app.locals.db ?? req.app.get("db")) as DbClient;

      const header = String(req.header("x-instance-id") ?? "").trim();
      let instanceId: string | null = header || null;

      if (instanceId) {
        const v = validateInstanceName(instanceId);
        if (!v.ok) {
          return next(
            new AppError({
              code: ErrorCodes.VALIDATION,
              status: 400,
              message: `Invalid X-Instance-Id: ${v.message}`,
              context: { instanceId },
            }),
          );
        }
        instanceId = v.normalized;

        const exists = await db.instance.findUnique({ where: { id: instanceId } });
        if (!exists || exists.archivedAt) {
          return next(
            new AppError({
              code: ErrorCodes.NOT_FOUND,
              status: 404,
              message: "Instance not found",
              context: { instanceId },
            }),
          );
        }
      }

      if (!instanceId) {
        const active = await getActiveInstanceId(db);
        instanceId = active || "default";
      }

      await ensureInstanceExists(db, instanceId);
      req.instanceId = instanceId;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}
