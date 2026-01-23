import fs from "fs";
import path from "path";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";

import { AppError, ErrorCodes } from "../../core/errors";
import type { DbClient } from "../../db/prisma";
import { SettingsService } from "../settings/settings.service";
import { getInstanceFolders } from "../instances/instanceFolders";
import { LAUNCH_PRESETS, getLaunchPreset } from "./launchPresets";

type ExitInfo = { code: number | null; signal: NodeJS.Signals | null };

type RuntimeState = {
  version: 1;
  desiredState: "running" | "stopped";

  pid: number | null;
  startedAt: string | null;
  exe: string | null;
  cwd: string | null;
  args: string[];

  lastExit: ExitInfo | null;
  lastExitAt: string | null;

  crashCount: number;
  lastCrashAt: string | null;

  // auto-restart bookkeeping
  restartWindowStart: string | null;
  restartAttemptsInWindow: number;
  restartScheduledAt: string | null;
  restartSuppressedReason: string | null;

  // External supervisor coordination (e.g., ApiBridge wrapper/scheduler)
  expectExitUntil: string | null;
  expectExitReason: string | null;
  lastExpectedExitAt: string | null;
  lastExpectedExitReason: string | null;
};

const DEFAULT_RUNTIME: RuntimeState = {
  version: 1,
  desiredState: "stopped",

  pid: null,
  startedAt: null,
  exe: null,
  cwd: null,
  args: [],

  lastExit: null,
  lastExitAt: null,

  crashCount: 0,
  lastCrashAt: null,

  restartWindowStart: null,
  restartAttemptsInWindow: 0,
  restartScheduledAt: null,
  restartSuppressedReason: null,

  expectExitUntil: null,
  expectExitReason: null,
  lastExpectedExitAt: null,
  lastExpectedExitReason: null,
};

type ProcEntry = {
  proc: ChildProcessWithoutNullStreams | null;
  startedAt: Date | null;
  lastExit: ExitInfo | null;
  lastArgs: string[];
  lastExe: string | null;
  lastCwd: string | null;
  stopRequested: boolean;
  restartTimer: NodeJS.Timeout | null;
  outStream: fs.WriteStream | null;
};

const REGISTRY = new Map<string, ProcEntry>();

function getOrCreateEntry(instanceId: string): ProcEntry {
  const existing = REGISTRY.get(instanceId);
  if (existing) return existing;
  const created: ProcEntry = {
    proc: null,
    startedAt: null,
    lastExit: null,
    lastArgs: [],
    lastExe: null,
    lastCwd: null,
    stopRequested: false,
    restartTimer: null,
    outStream: null,
  };
  REGISTRY.set(instanceId, created);
  return created;
}

function clearRestartTimer(instanceId: string) {
  const entry = REGISTRY.get(instanceId);
  if (!entry?.restartTimer) return;
  clearTimeout(entry.restartTimer);
  entry.restartTimer = null;
}

/**
 * Manages the DayZ server process.
 *
 * v0.3+: per-instance in-memory runtime registry.
 *
 * Notes:
 * - The panel is a lightweight supervisor (not a full process manager).
 * - If the panel restarts while DayZ is still running, we show a "detached" state via persisted PID.
 * - Stop attempts to gracefully terminate, and falls back to taskkill on Windows.
 */
export class ServerControlService {
  private readonly settings: SettingsService;

  constructor(
    private readonly db: DbClient,
    private readonly instanceId: string,
  ) {
    this.settings = new SettingsService(db, instanceId);
  }

  async presets() {
    return { presets: LAUNCH_PRESETS };
  }

  async applyPreset(body: any) {
    const presetId = String(body?.presetId ?? "").trim();
    if (!presetId) {
      throw new AppError({
        code: ErrorCodes.VALIDATION,
        status: 400,
        message: "presetId is required",
      });
    }

    const preset = getLaunchPreset(presetId);
    if (!preset) {
      throw new AppError({
        code: ErrorCodes.NOT_FOUND,
        status: 404,
        message: `Unknown preset: ${presetId}`,
      });
    }

    const next = await this.settings.update({ ...preset.patch });
    return { ok: true, preset, settings: next };
  }

  async status() {
    const s = await this.settings.get();
    const runtimeFile = runtimeFilePath(s.dataRoot, this.instanceId);
    const runtime = readRuntime(runtimeFile);

    const entry = REGISTRY.get(this.instanceId);
    const inMem = entry?.proc ?? null;
    const inMemRunning = !!inMem;

    // If we have an in-memory child, trust it and keep runtime state in sync.
    if (inMemRunning) {
      const nowIso = new Date().toISOString();
      const next: RuntimeState = {
        ...runtime,
        // Do not override desiredState; a stop may be in progress.
        desiredState: runtime.desiredState,
        pid: inMem!.pid ?? runtime.pid,
        startedAt: entry?.startedAt?.toISOString() ?? runtime.startedAt ?? nowIso,
        exe: entry?.lastExe ?? runtime.exe,
        cwd: entry?.lastCwd ?? runtime.cwd,
        args: entry?.lastArgs?.length ? [...entry.lastArgs] : runtime.args,
        lastExit: entry?.lastExit ?? runtime.lastExit,
      };
      writeRuntime(runtimeFile, next);
      return {
        running: true,
        pid: next.pid,
        startedAt: next.startedAt,
        lastExit: next.lastExit,
        lastExitAt: next.lastExitAt,
        crashCount: next.crashCount,
        lastCrashAt: next.lastCrashAt,
        desiredState: next.desiredState,
        detached: false,
        staleRuntime: false,
        restartScheduledAt: next.restartScheduledAt,
        restartSuppressedReason: next.restartSuppressedReason,
        expectExitUntil: next.expectExitUntil,
        expectExitReason: next.expectExitReason,
        lastExpectedExitAt: next.lastExpectedExitAt,
        lastExpectedExitReason: next.lastExpectedExitReason,
      };
    }

    // No in-memory process: consult persisted PID.
    const pid = runtime.pid;
    const pidRunning = pid ? isPidRunning(pid) : false;

    return {
      running: pidRunning,
      pid: pidRunning ? pid : null,
      startedAt: pidRunning ? runtime.startedAt : null,
      lastExit: runtime.lastExit,
      lastExitAt: runtime.lastExitAt,
      crashCount: runtime.crashCount,
      lastCrashAt: runtime.lastCrashAt,
      desiredState: runtime.desiredState,
      detached: pidRunning,
      staleRuntime: !!pid && !pidRunning,
      restartScheduledAt: runtime.restartScheduledAt,
      restartSuppressedReason: runtime.restartSuppressedReason,
      expectExitUntil: runtime.expectExitUntil,
      expectExitReason: runtime.expectExitReason,
      lastExpectedExitAt: runtime.lastExpectedExitAt,
      lastExpectedExitReason: runtime.lastExpectedExitReason,
    };
  }

  /**
   * Marks the next exit as expected for a short window.
   *
   * Use this when an external supervisor (e.g., ApiBridge wrapper/scheduler) is about to stop/restart the server.
   * This prevents the panel from:
   * - counting it as a crash, and
   * - auto-restarting (if enabled).
   */
  async expectExit(params?: { reason?: string; windowMs?: number }) {
    const s = await this.settings.get();
    const runtimeFile = runtimeFilePath(s.dataRoot, this.instanceId);
    const state = readRuntime(runtimeFile);

    const windowMsRaw = Number(params?.windowMs ?? 30_000);
    const windowMs = Math.max(500, Math.min(30 * 60 * 1000, windowMsRaw));
    const untilIso = new Date(Date.now() + windowMs).toISOString();

    const next: RuntimeState = {
      ...state,
      expectExitUntil: untilIso,
      expectExitReason: String(params?.reason ?? "external"),
    };
    writeRuntime(runtimeFile, next);

    return { ok: true, expectExitUntil: next.expectExitUntil, expectExitReason: next.expectExitReason };
  }

  /**
   * Allows an external wrapper to register the current DayZ PID.
   * The panel will treat this as a "detached" process (not spawned by the panel).
   */
  async registerPid(params: { pid: number; startedAt?: string | null }) {
    const pid = Number(params?.pid);
    if (!Number.isFinite(pid) || pid <= 0) {
      throw new AppError({
        code: ErrorCodes.VALIDATION,
        status: 400,
        message: "Invalid pid",
        context: { pid: params?.pid },
      });
    }

    const s = await this.settings.get();
    const runtimeFile = runtimeFilePath(s.dataRoot, this.instanceId);
    const state = readRuntime(runtimeFile);

    const startedAt = params?.startedAt ? String(params.startedAt) : new Date().toISOString();

    const next: RuntimeState = {
      ...state,
      desiredState: "running",
      pid,
      startedAt,
    };
    writeRuntime(runtimeFile, next);

    return { ok: true, pid, startedAt };
  }

  /**
   * Starts DayZServer_x64.exe with params derived from Settings + enabled mods.
   */
  async start() {
    const current = await this.status();
    if (current.running) {
      return { ok: true, alreadyRunning: true, ...current };
    }

    const s = await this.settings.get();
    const runtimeFile = runtimeFilePath(s.dataRoot, this.instanceId);

    clearRestartTimer(this.instanceId);
    const entry = getOrCreateEntry(this.instanceId);
    entry.stopRequested = false;

    const exe = await this.settings.getDayzExecutablePath();

    // Prefer instance-scoped config file if present.
    const instanceCfg = path.join(getInstanceFolders(s.dataRoot, this.instanceId).configs, s.serverConfigFile);
    const serverCfg = fs.existsSync(instanceCfg) ? instanceCfg : path.join(s.dayzServerPath, s.serverConfigFile);

    // Build -mod param (enabled mods -> junction folders under DayZ server dir)
    const enabledMods = await this.db.mod.findMany({ where: { enabled: true } });
    await ensureJunctionsForMods({ dayzServerPath: s.dayzServerPath, mods: enabledMods });

    const modArg = enabledMods.length
      ? `-mod=${enabledMods.map((m) => `@${m.folderName ?? m.workshopId}`).join(";")}`
      : null;

    const args = [
      `-config=${serverCfg}`,
      `-profiles=${s.profilesPath}`,
      `-port=${s.serverPort}`,
      ...(modArg ? [modArg] : []),
    ];

    // User-provided raw args from the Settings UI.
    const extraArgs = splitArgs(String((s as any).additionalLaunchArgs ?? ""));
    if (extraArgs.length) args.push(...extraArgs);

    // Spawn DayZ server process
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn(exe, args, {
        cwd: s.dayzServerPath,
        windowsHide: process.platform === "win32",
      });
    } catch (err) {
      throw new AppError({
        code: ErrorCodes.SERVER_PROCESS_START_FAILED,
        status: 500,
        message: "Failed to start DayZ server process",
        cause: err,
      });
    }

    entry.proc = child;
    entry.startedAt = new Date();
    entry.lastExit = null;
    entry.lastArgs = [...args];
    entry.lastExe = exe;
    entry.lastCwd = s.dayzServerPath;

    // Persist stdout/stderr to an instance-scoped rolling server log file (best effort)
    const folders = getInstanceFolders(s.dataRoot, this.instanceId);
    fs.mkdirSync(folders.logs, { recursive: true });
    const outFile = path.join(folders.logs, "dayz-server-current.log");
    const outStream = fs.createWriteStream(outFile, { flags: "a" });
    entry.outStream = outStream;
    child.stdout.pipe(outStream);
    child.stderr.pipe(outStream);

    // Persist runtime state
    const nowIso = new Date().toISOString();
    const next: RuntimeState = {
      ...readRuntime(runtimeFile),
      desiredState: "running",
      pid: child.pid ?? null,
      startedAt: nowIso,
      exe,
      cwd: s.dayzServerPath,
      args: [...args],
      lastExit: null,
      lastExitAt: null,
      restartScheduledAt: null,
      restartSuppressedReason: null,
    };
    writeRuntime(runtimeFile, next);

    // Crash detection + optional auto-restart
    child.on("close", (code, signal) => {
      void (async () => {
        const e = getOrCreateEntry(this.instanceId);

        e.proc = null;
        e.lastExit = { code, signal };
        const startedAtPrev = e.startedAt;
        e.startedAt = null;

        const exitIso = new Date().toISOString();
        const s2 = await this.settings.get();
        const state = readRuntime(runtimeFile);

        const stopRequested = e.stopRequested;
        e.stopRequested = false;

        const nextState: RuntimeState = {
          ...state,
          pid: null,
          startedAt: null,
          lastExit: { code, signal },
          lastExitAt: exitIso,
          restartScheduledAt: null,
          restartSuppressedReason: null,
        };

        // If desired is "running" and we did not request a stop,
        // treat this as a crash *unless* an external supervisor marked the exit as expected.
        const nowMs = Date.now();
        const expectActive = !!state.expectExitUntil && Date.parse(state.expectExitUntil) > nowMs;

        // Clear expectation window (one-shot semantics)
        nextState.expectExitUntil = null;
        nextState.expectExitReason = null;

        if (expectActive) {
          nextState.lastExpectedExitAt = exitIso;
          nextState.lastExpectedExitReason = state.expectExitReason ?? "external";
        }

        const isCrash = !stopRequested && nextState.desiredState === "running" && !expectActive;
        if (isCrash) {
          nextState.crashCount = (nextState.crashCount ?? 0) + 1;
          nextState.lastCrashAt = exitIso;
        }

        writeRuntime(runtimeFile, nextState);

        // Best-effort close output stream
        try {
          e.outStream?.end();
        } catch {
          // ignore
        }
        e.outStream = null;

        // Optional auto-restart
        if (isCrash && s2.autoRestartOnCrash) {
          const decision = computeAutoRestartDecision({
            runtime: nextState,
            now: Date.now(),
            windowMs: s2.autoRestartWindowMs,
            maxAttempts: s2.autoRestartMaxAttempts,
          });

          const delayMs = Math.max(250, s2.autoRestartDelayMs);
          const scheduledIso = decision.ok ? new Date(Date.now() + delayMs).toISOString() : null;
          const afterDecision = {
            ...nextState,
            ...decision.next,
            restartScheduledAt: scheduledIso,
          } as RuntimeState;
          writeRuntime(runtimeFile, afterDecision);

          if (decision.ok) {
            clearRestartTimer(this.instanceId);
            e.restartTimer = setTimeout(() => {
              void (async () => {
                const st = readRuntime(runtimeFile);
                if (st.desiredState !== "running") return;
                await this.start();
              })();
            }, delayMs);
          }
        }

        // Defensive: if we had a startedAt but state did not, keep it for debugging
        void startedAtPrev;
      })();
    });

    return { ok: true, args, ...(await this.status()) };
  }

  /**
   * Stops the process.
   */
  async stop(opts?: { desiredStateAfter?: "running" | "stopped" }) {
    const s = await this.settings.get();
    const runtimeFile = runtimeFilePath(s.dataRoot, this.instanceId);

    clearRestartTimer(this.instanceId);
    const entry = getOrCreateEntry(this.instanceId);
    entry.stopRequested = true;

    const desiredStateAfter = opts?.desiredStateAfter ?? "stopped";

    // Persist desired state first (so close events aren't treated as crashes).
    const before = readRuntime(runtimeFile);
    writeRuntime(runtimeFile, {
      ...before,
      desiredState: desiredStateAfter,
      restartScheduledAt: null,
      restartSuppressedReason: null,
    });

    const proc = entry.proc;
    if (proc) {
      try {
        proc.kill();
      } catch (err) {
        throw new AppError({
          code: ErrorCodes.SERVER_PROCESS_STOP_FAILED,
          status: 500,
          message: "Failed to stop DayZ server process",
          cause: err,
        });
      }
      return { ok: true, detached: false };
    }

    // No in-memory proc: attempt to stop a detached process by PID.
    const state = readRuntime(runtimeFile);
    if (state.pid && isPidRunning(state.pid)) {
      try {
        await killPid(state.pid);
      } catch (err) {
        throw new AppError({
          code: ErrorCodes.SERVER_PROCESS_STOP_FAILED,
          status: 500,
          message: "Failed to stop detached DayZ process",
          cause: err,
          context: { pid: state.pid },
        });
      }
      const after = readRuntime(runtimeFile);
      writeRuntime(runtimeFile, { ...after, pid: null, startedAt: null });
      return { ok: true, detached: true };
    }

    return { ok: true, alreadyStopped: true };
  }

  async restart() {
    await this.stop({ desiredStateAfter: "running" });
    // Small delay to let OS release ports
    await new Promise((r) => setTimeout(r, 2000));
    return this.start();
  }
}

function runtimeFilePath(dataRoot: string, instanceId: string) {
  return path.join(path.resolve(dataRoot), "instances", instanceId, "runtime", "server-process.json");
}

function readRuntime(file: string): RuntimeState {
  try {
    if (!fs.existsSync(file)) return { ...DEFAULT_RUNTIME };
    const raw = fs.readFileSync(file, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_RUNTIME,
      ...(parsed ?? {}),
      version: 1,
    } as RuntimeState;
  } catch {
    return { ...DEFAULT_RUNTIME };
  }
}

function writeRuntime(file: string, state: RuntimeState) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, file);
  } catch {
    // best effort
  }
}

function isPidRunning(pid: number) {
  try {
    // Signal 0 is a common cross-platform way to check for process existence.
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    // EPERM means the process exists but we don't have permission.
    return err?.code === "EPERM";
  }
}

async function killPid(pid: number) {
  // Best effort: try process.kill first.
  try {
    process.kill(pid);
  } catch {
    // ignore
  }

  // Wait a bit
  await new Promise((r) => setTimeout(r, 1500));
  if (!isPidRunning(pid)) return;

  // Fallback: Windows taskkill
  if (process.platform === "win32") {
    await runCmd(["taskkill", "/PID", String(pid), "/T", "/F"]);
  } else {
    // Force kill on POSIX
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // ignore
    }
  }
}

function computeAutoRestartDecision(args: {
  runtime: RuntimeState;
  now: number;
  windowMs: number;
  maxAttempts: number;
}): { ok: boolean; next: Partial<RuntimeState> } {
  const nowIso = new Date(args.now).toISOString();
  const windowStartMs = args.runtime.restartWindowStart ? Date.parse(args.runtime.restartWindowStart) : 0;
  const windowExpired = !windowStartMs || args.now - windowStartMs > args.windowMs;

  const restartWindowStart = windowExpired ? nowIso : args.runtime.restartWindowStart;
  const restartAttemptsInWindow = windowExpired ? 0 : args.runtime.restartAttemptsInWindow;

  if (restartAttemptsInWindow >= args.maxAttempts) {
    return {
      ok: false,
      next: {
        restartWindowStart,
        restartAttemptsInWindow,
        restartScheduledAt: null,
        restartSuppressedReason: `Auto-restart suppressed: reached max attempts (${args.maxAttempts}) within window.`,
      },
    };
  }

  return {
    ok: true,
    next: {
      restartWindowStart,
      restartAttemptsInWindow: restartAttemptsInWindow + 1,
      restartScheduledAt: nowIso,
      restartSuppressedReason: null,
    },
  };
}

/**
 * Splits a command line string into arguments, respecting quotes.
 */
function splitArgs(input: string) {
  const out: string[] = [];
  const re = /\s*([^"\s]+|"(?:\\.|[^\\"])*")\s*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input))) {
    let token = m[1] ?? "";
    if (token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1).replace(/\\"/g, '"');
    }
    if (token) out.push(token);
  }
  return out;
}

async function ensureJunctionsForMods(args: {
  dayzServerPath: string;
  mods: { workshopId: string; installedPath: string | null; folderName?: string | null }[];
}) {
  // DayZ server generally loads mods from folders like "@CF" in the server directory.
  // We create @<folderName> junctions to workshop content (fallback: workshopId).
  //
  // NOTE: On Windows, junction creation may require admin permission depending on policy.
  // If this fails, the UI will still let you manage mods, but the server may not load them.
  for (const mod of args.mods) {
    if (!mod.installedPath) continue;
    const linkPath = path.join(args.dayzServerPath, `@${mod.folderName ?? mod.workshopId}`);
    if (fs.existsSync(linkPath)) continue;

    // Best-effort link creation
    try {
      if (process.platform === "win32") {
        await runCmd(["cmd", "/c", "mklink", "/J", linkPath, mod.installedPath]);
      } else {
        await fs.promises.symlink(mod.installedPath, linkPath);
      }
    } catch {
      // ignore - non-fatal
    }
  }
}

function runCmd(cmd: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd[0], cmd.slice(1), { windowsHide: process.platform === "win32" });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed: ${cmd.join(" ")}`));
    });
  });
}
