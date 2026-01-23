import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { Router } from "express";
import { getPrisma } from "../../db/prisma";
import { SettingsService } from "../settings/settings.service";
import { AppError, ErrorCodes } from "../../core/errors";
import { SetupJobStore } from "./setup.jobs";
import { ensureInstanceFolders } from "../instances/instanceFolders";

/**
 * /api/setup
 *
 * First-run helpers.
 *
 * v2 adds job-based installers to avoid long-running HTTP requests.
 */
export const setupRouter = Router();

function instanceSvc(req: any) {
  const db = req.app.locals.db ?? getPrisma();
  return new SettingsService(db, String(req.instanceId || "default"));
}

setupRouter.get("/status", async (req, res) => {
  const svc = instanceSvc(req);
  const settings = await svc.get();
  const health = await svc.validatePaths();
  res.json({ setupComplete: settings.setupComplete, health, settings });
});

setupRouter.post("/create-folders", async (req, res, next) => {
  try {
    const svc = instanceSvc(req);
    const settings = await svc.get();

    const created: string[] = [];
    const dataRoot = path.resolve(settings.dataRoot);

    // Shared folders under dataRoot
    for (const dir of [dataRoot, path.join(dataRoot, "steamcmd")]) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        created.push(dir);
      }
    }

    // Instance-specific folders
    const inst = ensureInstanceFolders(settings.dataRoot, String(req.instanceId || "default"));
    created.push(...inst.created);

    // Panel logs live under project ./data by default.
    const panelLogs = path.resolve(process.cwd(), "data", "logs");
    if (!fs.existsSync(panelLogs)) {
      fs.mkdirSync(panelLogs, { recursive: true });
      created.push(panelLogs);
    }

    res.json({ ok: true, created });
  } catch (error) {
    next(
      new AppError({
        code: ErrorCodes.FILE_IO,
        status: 500,
        message: "Failed to create setup folders",
        cause: error,
      }),
    );
  }
});

setupRouter.post("/complete", async (req, res) => {
  const body = (req.body ?? {}) as { setupComplete?: boolean };
  const setupComplete = body.setupComplete !== false;
  const settings = await instanceSvc(req).update({ setupComplete });
  res.json({ ok: true, setupComplete: settings.setupComplete });
});

// ---------------------------------------------------------------------------
// v2: Job-based automation (recommended)
// ---------------------------------------------------------------------------

setupRouter.get("/jobs", (_req, res) => {
  res.json({ jobs: SetupJobStore.list() });
});

setupRouter.get("/jobs/:id", (req, res, next) => {
  const id = String(req.params.id || "");
  const job = SetupJobStore.get(id);
  if (!job) {
    return next(
      new AppError({
        code: ErrorCodes.NOT_FOUND,
        status: 404,
        message: "Job not found",
        context: { id },
      }),
    );
  }
  res.json({ job });
});

setupRouter.delete("/jobs/:id", (req, res) => {
  const id = String(req.params.id || "");
  const ok = SetupJobStore.clear(id);
  res.json({ ok });
});

setupRouter.post("/jobs/install-steamcmd", async (req, res, next) => {
  try {
    if (process.platform !== "win32") {
      return next(
        new AppError({
          code: ErrorCodes.VALIDATION,
          status: 400,
          message: "SteamCMD auto-install is currently supported only on Windows.",
        }),
      );
    }

    const settings = await instanceSvc(req).get();
    const steamcmdDir = path.dirname(settings.steamcmdPath);
    fs.mkdirSync(steamcmdDir, { recursive: true });

    const url = "https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip";
    const zipPath = path.join(steamcmdDir, "steamcmd.zip");

    const ps = [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `Invoke-WebRequest -Uri '${url}' -OutFile '${zipPath}'; ` +
        `Expand-Archive -Path '${zipPath}' -DestinationPath '${steamcmdDir}' -Force; ` +
        `Remove-Item -Force '${zipPath}'`,
    ];

    const job = SetupJobStore.start("install-steamcmd", "powershell", ps);

    res.json({ ok: true, job, url, steamcmdDir, steamcmdPath: settings.steamcmdPath });
  } catch (error) {
    next(
      new AppError({
        code: ErrorCodes.FILE_IO,
        status: 500,
        message: "Failed to start SteamCMD install job",
        cause: error,
      }),
    );
  }
});

setupRouter.post("/jobs/install-dayz", async (req, res, next) => {
  try {
    const settings = await instanceSvc(req).get();

    if (!fs.existsSync(settings.steamcmdPath)) {
      return next(
        new AppError({
          code: ErrorCodes.STEAMCMD_NOT_FOUND,
          status: 400,
          message: "SteamCMD not found. Install it first or set steamcmdPath.",
          context: { steamcmdPath: settings.steamcmdPath },
        }),
      );
    }

    const steamcmdDir = path.dirname(settings.steamcmdPath);
    fs.mkdirSync(steamcmdDir, { recursive: true });

    const login = settings.steamUser && settings.steamPassword
      ? [settings.steamUser, settings.steamPassword]
      : ["anonymous"];

    const args = [
      "+force_install_dir",
      steamcmdDir,
      "+login",
      ...login,
      "+app_update",
      "223350",
      "validate",
      "+quit",
    ];

    const job = SetupJobStore.start("install-dayz", settings.steamcmdPath, args);

    res.json({ ok: true, job, dayzServerPath: settings.dayzServerPath });
  } catch (error) {
    next(
      new AppError({
        code: ErrorCodes.STEAMCMD_FAILED,
        status: 500,
        message: "Failed to start DayZ Dedicated Server install job",
        cause: error,
      }),
    );
  }
});

// ---------------------------------------------------------------------------
// v1: Synchronous endpoints (kept for backwards compatibility)
// ---------------------------------------------------------------------------

setupRouter.post("/install-steamcmd", async (req, res, next) => {
  try {
    if (process.platform !== "win32") {
      return next(
        new AppError({
          code: ErrorCodes.VALIDATION,
          status: 400,
          message: "SteamCMD auto-install is currently supported only on Windows.",
        }),
      );
    }

    const settings = await instanceSvc(req).get();
    const steamcmdDir = path.dirname(settings.steamcmdPath);
    fs.mkdirSync(steamcmdDir, { recursive: true });

    const url = "https://steamcdn-a.akamaihd.net/client/installer/steamcmd.zip";
    const zipPath = path.join(steamcmdDir, "steamcmd.zip");

    const ps = [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      `Invoke-WebRequest -Uri '${url}' -OutFile '${zipPath}'; ` +
        `Expand-Archive -Path '${zipPath}' -DestinationPath '${steamcmdDir}' -Force; ` +
        `Remove-Item -Force '${zipPath}'`,
    ];

    const out = await runProcess("powershell", ps);

    res.json({
      ok: true,
      steamcmdDir,
      steamcmdPath: settings.steamcmdPath,
      exitCode: out.exitCode,
      output: out.stdout.slice(-8000),
      url,
    });
  } catch (error) {
    next(
      new AppError({
        code: ErrorCodes.FILE_IO,
        status: 500,
        message: "Failed to install SteamCMD",
        cause: error,
      }),
    );
  }
});

setupRouter.post("/install-dayz", async (req, res, next) => {
  try {
    const settings = await instanceSvc(req).get();

    if (!fs.existsSync(settings.steamcmdPath)) {
      return next(
        new AppError({
          code: ErrorCodes.STEAMCMD_NOT_FOUND,
          status: 400,
          message: "SteamCMD not found. Install it first or set steamcmdPath.",
          context: { steamcmdPath: settings.steamcmdPath },
        }),
      );
    }

    const steamcmdDir = path.dirname(settings.steamcmdPath);
    fs.mkdirSync(steamcmdDir, { recursive: true });

    const login = settings.steamUser && settings.steamPassword
      ? [settings.steamUser, settings.steamPassword]
      : ["anonymous"];

    const args = [
      "+force_install_dir",
      steamcmdDir,
      "+login",
      ...login,
      "+app_update",
      "223350",
      "validate",
      "+quit",
    ];

    const out = await runProcess(settings.steamcmdPath, args);

    res.json({
      ok: true,
      exitCode: out.exitCode,
      output: out.stdout.slice(-12000),
      dayzServerPath: settings.dayzServerPath,
    });
  } catch (error) {
    next(
      new AppError({
        code: ErrorCodes.STEAMCMD_FAILED,
        status: 500,
        message: "Failed to install DayZ Dedicated Server via SteamCMD",
        cause: error,
      }),
    );
  }
});

function runProcess(command: string, args: string[]) {
  return new Promise<{ exitCode: number; stdout: string }>((resolve) => {
    const child = spawn(command, args, {
      windowsHide: process.platform === "win32",
    });
    let stdout = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stdout += d.toString()));
    child.on("close", (code) => {
      resolve({ exitCode: code ?? 0, stdout });
    });
  });
}
