/**
 * dayz/processManager.ts
 *
 * Starts/stops/restarts the DayZ server process (DayZServer_x64.exe).
 *
 * This gives you the "server manager" part (like OmegaManager / CF Tools),
 * not just RCON.
 *
 * Features:
 * - Spawn with configured args
 * - Capture stdout/stderr and stream to the UI via Socket.IO
 * - Write console output to InstanceData/<id>/logs/console.log
 * - Watchdog: restart on crash (configurable)
 */

import { EventEmitter } from 'node:events';
import { spawn, execFile } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import type { InstanceConfigV1 } from '../config/instanceConfig.js';
import { ensureDir } from '../storage/jsonStore.js';
import type { RconManager } from '../rcon/rconManager.js';

export type ProcessState = {
  running: boolean;
  pid?: number;
  startedAt?: string;
  exitedAt?: string;
  exitCode?: number | null;
  exitSignal?: string | null;
  lastError?: string;
};

type ManagedProcess = {
  child: ReturnType<typeof spawn>;
  cfg: InstanceConfigV1;
  state: ProcessState;
};

export class DayzProcessManager extends EventEmitter {
  private procs = new Map<string, ManagedProcess>();

  constructor(private dataDir: string, private rcon: RconManager) {
    super();
  }

  getState(instanceId: string): ProcessState {
    return this.procs.get(instanceId)?.state ?? { running: false };
  }

  isRunning(instanceId: string): boolean {
    return this.getState(instanceId).running;
  }

  private consoleLogPath(instanceId: string): string {
    return path.join(this.dataDir, 'InstanceData', instanceId, 'logs', 'console.log');
  }

  /**
   * Builds a final argument array.
   *
   * We keep this separate so you can extend later (mods, cpuCount, etc.).
   */
  private buildArgs(cfg: InstanceConfigV1): string[] {
    const base = [...cfg.process.args];

    // If mods are enabled, append -mod=...
    const enabledMods = cfg.process.mods.filter((m) => m.enabled);
    if (enabledMods.length > 0) {
      const modValue = enabledMods.map((m) => m.modDir).join(';');
      base.push(`-mod=${modValue}`);
    }

    return base;
  }

  async start(cfg: InstanceConfigV1): Promise<ProcessState> {
    if (this.isRunning(cfg.id)) {
      throw new Error('Server is already running');
    }

    const exePath = path.join(cfg.paths.root, cfg.process.exe);
    if (!fs.existsSync(exePath)) {
      throw new Error(`DayZ server executable not found: ${exePath}`);
    }

    await ensureDir(path.dirname(this.consoleLogPath(cfg.id)));

    const args = this.buildArgs(cfg);

    // Spawn the DayZ server process
    const child = spawn(exePath, args, {
      cwd: cfg.process.workingDir,
      windowsHide: true
    });

    const state: ProcessState = {
      running: true,
      pid: child.pid,
      startedAt: new Date().toISOString()
    };

    this.procs.set(cfg.id, { child, cfg, state });
    this.emit('state', { instanceId: cfg.id, state });

    // Write stdout/stderr to a log file and emit to UI.
    const logStream = fs.createWriteStream(this.consoleLogPath(cfg.id), { flags: 'a' });

    const forwardLine = (line: string, source: 'stdout' | 'stderr') => {
      const msg = `[${new Date().toISOString()}] [${source}] ${line}`;
      logStream.write(msg + '\n');
      this.emit('console', { instanceId: cfg.id, line: msg });
    };

    const rlOut = readline.createInterface({ input: child.stdout });
    rlOut.on('line', (line) => forwardLine(line, 'stdout'));

    const rlErr = readline.createInterface({ input: child.stderr });
    rlErr.on('line', (line) => forwardLine(line, 'stderr'));

    child.on('exit', async (code, signal) => {
      rlOut.close();
      rlErr.close();
      logStream.end();

      const mp = this.procs.get(cfg.id);
      if (!mp) return;

      mp.state.running = false;
      mp.state.exitedAt = new Date().toISOString();
      mp.state.exitCode = code;
      mp.state.exitSignal = signal;
      this.emit('state', { instanceId: cfg.id, state: mp.state });
      this.procs.delete(cfg.id);

      // Watchdog: restart if enabled and crash-like exit.
      if (cfg.watchdog.enabled && cfg.watchdog.restartOnCrash) {
        const shouldRestart = code !== 0; // simplistic. You can refine later.
        if (shouldRestart) {
          const delay = cfg.watchdog.restartDelaySeconds * 1000;
          this.emit('console', {
            instanceId: cfg.id,
            line: `[${new Date().toISOString()}] [watchdog] Process exited (code=${code}, signal=${signal}). Restarting in ${cfg.watchdog.restartDelaySeconds}s...`
          });
          setTimeout(() => {
            this.start(cfg).catch((err) => {
              this.emit('console', {
                instanceId: cfg.id,
                line: `[${new Date().toISOString()}] [watchdog] Restart failed: ${String(err?.message ?? err)}`
              });
            });
          }, delay);
        }
      }
    });

    child.on('error', (err) => {
      const mp = this.procs.get(cfg.id);
      if (mp) {
        mp.state.lastError = String(err?.message ?? err);
        this.emit('state', { instanceId: cfg.id, state: mp.state });
      }
    });

    return state;
  }

  /**
   * Attempts a graceful stop, then force-kills if needed.
   */
  async stop(cfg: InstanceConfigV1, opts?: { force?: boolean }): Promise<ProcessState> {
    const mp = this.procs.get(cfg.id);
    if (!mp) return { running: false };

    const force = opts?.force ?? false;

    // 1) Try graceful stop via RCON (if connected)
    if (!force && this.rcon.isConnected(cfg.id) && cfg.process.gracefulStopCommand) {
      try {
        await this.rcon.sendCommand(cfg.id, cfg.process.gracefulStopCommand);
      } catch {
        // Ignore and fallback to killing the process.
      }
    }

    // 2) Try Node's kill (soft)
    try {
      mp.child.kill();
    } catch {
      // ignore
    }

    // 3) Wait a bit for exit; if still alive, taskkill /F.
    await this.waitForExit(cfg.id, 15000);

    if (this.procs.has(cfg.id) && mp.child.pid) {
      await this.forceKillWindows(mp.child.pid);
      await this.waitForExit(cfg.id, 8000);
    }

    return this.getState(cfg.id);
  }

  async restart(cfg: InstanceConfigV1): Promise<ProcessState> {
    await this.stop(cfg);
    return this.start(cfg);
  }

  private waitForExit(instanceId: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const start = Date.now();
      const tick = () => {
        if (!this.procs.has(instanceId)) return resolve();
        if (Date.now() - start >= timeoutMs) return resolve();
        setTimeout(tick, 250);
      };
      tick();
    });
  }

  /**
   * Windows-only hard kill.
   *
   * On Windows, child_process.kill() can sometimes leave child processes behind.
   * taskkill /T /F is a reliable fallback.
   */
  private async forceKillWindows(pid: number): Promise<void> {
    await new Promise<void>((resolve) => {
      execFile('taskkill', ['/PID', String(pid), '/T', '/F'], () => resolve());
    });
  }

  /**
   * Clears the console log (does not affect the running process).
   */
  async clearConsoleLog(instanceId: string): Promise<void> {
    const p = this.consoleLogPath(instanceId);
    await ensureDir(path.dirname(p));
    await fsp.writeFile(p, '', 'utf8');
  }
}
