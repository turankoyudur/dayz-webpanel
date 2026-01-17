/**
 * steam/steamcmdService.ts
 *
 * Runs SteamCMD actions:
 * - Update DayZ Dedicated Server (appId 223350)
 * - Download workshop mods (workshopAppId 221100)
 *
 * Notes:
 * - Dedicated server updates can usually be done with anonymous login.
 * - Workshop downloads often require a Steam account that owns DayZ.
 */

import { EventEmitter } from 'node:events';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import type { InstanceConfigV1 } from '../config/instanceConfig.js';
import { ensureDir } from '../storage/jsonStore.js';

export type SteamCmdResult = {
  code: number | null;
  signal: string | null;
};

export class SteamCmdService extends EventEmitter {
  constructor(private dataDir: string) {
    super();
  }

  private logPath(instanceId: string): string {
    return path.join(this.dataDir, 'InstanceData', instanceId, 'logs', 'steamcmd.log');
  }

  private async run(instanceId: string, exe: string, args: string[], cwd?: string): Promise<SteamCmdResult> {
    await ensureDir(path.dirname(this.logPath(instanceId)));

    const logStream = fs.createWriteStream(this.logPath(instanceId), { flags: 'a' });
    const child = spawn(exe, args, { cwd, windowsHide: true });

    const forward = (line: string, src: 'stdout' | 'stderr') => {
      const msg = `[${new Date().toISOString()}] [steamcmd:${src}] ${line}`;
      logStream.write(msg + '\n');
      this.emit('output', { instanceId, line: msg });
    };

    const rlOut = readline.createInterface({ input: child.stdout });
    rlOut.on('line', (l) => forward(l, 'stdout'));

    const rlErr = readline.createInterface({ input: child.stderr });
    rlErr.on('line', (l) => forward(l, 'stderr'));

    return await new Promise<SteamCmdResult>((resolve) => {
      child.on('exit', (code, signal) => {
        rlOut.close();
        rlErr.close();
        logStream.end();
        resolve({ code, signal });
      });
    });
  }

  /**
   * Updates the DayZ Dedicated Server using SteamCMD.
   */
  async updateServer(cfg: InstanceConfigV1): Promise<SteamCmdResult> {
    const args = [
      '+force_install_dir',
      cfg.paths.root,
      '+login',
      'anonymous',
      '+app_update',
      String(cfg.steamcmd.appId),
      'validate',
      '+quit'
    ];

    this.emit('output', {
      instanceId: cfg.id,
      line: `[${new Date().toISOString()}] [steamcmd] Starting server update (appId=${cfg.steamcmd.appId})...`
    });

    return this.run(cfg.id, cfg.steamcmd.exe, args);
  }

  /**
   * Downloads a workshop item.
   *
   * IMPORTANT: In many cases Steam requires an account that owns DayZ to download workshop content.
   * This panel keeps the method, but you may need to extend it with Steam credentials / 2FA handling.
   */
  async downloadWorkshopItem(cfg: InstanceConfigV1, workshopId: number, login?: { username: string; password: string }): Promise<SteamCmdResult> {
    const loginArgs = login ? ['+login', login.username, login.password] : ['+login', 'anonymous'];

    const args = [
      '+force_install_dir',
      cfg.paths.root,
      ...loginArgs,
      '+workshop_download_item',
      String(cfg.steamcmd.workshopAppId),
      String(workshopId),
      'validate',
      '+quit'
    ];

    this.emit('output', {
      instanceId: cfg.id,
      line: `[${new Date().toISOString()}] [steamcmd] Downloading workshop item ${workshopId} (appId=${cfg.steamcmd.workshopAppId})...`
    });

    return this.run(cfg.id, cfg.steamcmd.exe, args);
  }
}
