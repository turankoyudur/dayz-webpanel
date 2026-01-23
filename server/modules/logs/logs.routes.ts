import fs from "fs/promises";
import path from "path";
import { Router } from "express";
import { AppError, ErrorCodes } from "../../core/errors";
import type { DbClient } from "../../db/prisma";
import { SettingsService } from "../settings/settings.service";
import { getInstanceFolders } from "../instances/instanceFolders";

const logsRouter = Router();
const appLogsDir = path.resolve(process.cwd(), "data", "logs");

const INSTANCE_PREFIX = "instance__";

async function getInstanceLogsDir(req: any) {
  const db = (req.app.locals.db ?? req.app.get("db")) as DbClient;
  const settings = await new SettingsService(db, String(req.instanceId || "default")).get();
  return getInstanceFolders(settings.dataRoot, String(req.instanceId || "default")).logs;
}

logsRouter.get("/", async (req, res, next) => {
  try {
    const instanceLogsDir = await getInstanceLogsDir(req);

    const files: { name: string; size: number; mtimeMs: number; scope?: "app" | "instance" }[] = [];

    // App logs
    try {
      const entries = await fs.readdir(appLogsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const fullPath = path.join(appLogsDir, entry.name);
        const stats = await fs.stat(fullPath);
        files.push({ name: entry.name, size: stats.size, mtimeMs: stats.mtimeMs, scope: "app" });
      }
    } catch {
      // ignore
    }

    // Instance logs
    try {
      const entries = await fs.readdir(instanceLogsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile()) continue;
        const fullPath = path.join(instanceLogsDir, entry.name);
        const stats = await fs.stat(fullPath);
        files.push({
          name: `${INSTANCE_PREFIX}${entry.name}`,
          size: stats.size,
          mtimeMs: stats.mtimeMs,
          scope: "instance",
        });
      }
    } catch {
      // ignore
    }

    files.sort((a, b) => b.mtimeMs - a.mtimeMs);

    res.json({
      logsDir: appLogsDir,
      instanceLogsDir,
      files,
    });
  } catch (error) {
    next(
      new AppError({
        code: ErrorCodes.FILE_IO,
        status: 500,
        message: "Failed to list log files.",
        cause: error,
      }),
    );
  }
});

logsRouter.get("/tail", async (req, res, next) => {
  const file = typeof req.query.file === "string" ? req.query.file : "";
  const linesParam = Number(req.query.lines ?? 200);
  const lines = Number.isFinite(linesParam) ? Math.max(1, Math.min(linesParam, 2000)) : 200;

  if (!file) {
    return next(
      new AppError({
        code: ErrorCodes.VALIDATION,
        status: 400,
        message: "Query param 'file' is required.",
      }),
    );
  }

  // Map virtual file names -> real paths (app logs vs instance logs)
  let fullPath = "";
  try {
    if (file.startsWith(INSTANCE_PREFIX)) {
      const instanceLogsDir = await getInstanceLogsDir(req);
      const actual = file.slice(INSTANCE_PREFIX.length);
      fullPath = path.join(instanceLogsDir, actual);
      // Ensure no path traversal
      const resolved = path.resolve(fullPath);
      if (!resolved.startsWith(path.resolve(instanceLogsDir))) {
        return next(
          new AppError({
            code: ErrorCodes.VALIDATION,
            status: 400,
            message: "Invalid instance log file path.",
          }),
        );
      }
      fullPath = resolved;
    } else {
      fullPath = path.resolve(appLogsDir, file);
      if (!fullPath.startsWith(appLogsDir)) {
        return next(
          new AppError({
            code: ErrorCodes.VALIDATION,
            status: 400,
            message: "Invalid log file path.",
          }),
        );
      }
    }
  } catch (error) {
    return next(
      new AppError({
        code: ErrorCodes.FILE_IO,
        status: 500,
        message: "Failed to resolve log path.",
        cause: error,
      }),
    );
  }

  try {
    const content = await fs.readFile(fullPath, "utf-8");
    const allLines = content.split(/\r?\n/);
    const tailLines = allLines.slice(-lines);
    res.json({ file, lines: tailLines });
  } catch (error) {
    next(
      new AppError({
        code: ErrorCodes.FILE_NOT_FOUND,
        status: 404,
        message: "Log file not found.",
        cause: error,
        context: { file },
      }),
    );
  }
});

logsRouter.get("/rpt/latest", async (req, res, next) => {
  const linesParam = Number(req.query.lines ?? 200);
  const lines = Number.isFinite(linesParam) ? Math.max(1, Math.min(linesParam, 2000)) : 200;

  try {
    const db = (req.app.locals.db ?? req.app.get("db")) as DbClient;
    const settings = await new SettingsService(db, String(req.instanceId || "default")).get();
    const profilesPath = settings.profilesPath;
    const entries = await fs.readdir(profilesPath, { withFileTypes: true });
    const rptCandidates = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && /dayzserver_x64.*\.rpt$/i.test(entry.name))
        .map(async (entry) => {
          const fullPath = path.join(profilesPath, entry.name);
          const stats = await fs.stat(fullPath);
          return { name: entry.name, fullPath, mtimeMs: stats.mtimeMs };
        }),
    );

    if (!rptCandidates.length) {
      return next(
        new AppError({
          code: ErrorCodes.FILE_NOT_FOUND,
          status: 404,
          message: "No DayZServer_x64*.RPT files found in profiles path.",
          context: { profilesPath },
        }),
      );
    }

    rptCandidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
    const latest = rptCandidates[0];
    const content = await fs.readFile(latest.fullPath, "utf-8");
    const allLines = content.split(/\r?\n/);
    const tailLines = allLines.slice(-lines);

    res.json({
      file: latest.name,
      mtimeMs: latest.mtimeMs,
      profilesPath,
      lines: tailLines,
    });
  } catch (error) {
    next(
      new AppError({
        code: ErrorCodes.FILE_IO,
        status: 500,
        message: "Failed to read latest RPT log.",
        cause: error,
      }),
    );
  }
});

export { logsRouter };
