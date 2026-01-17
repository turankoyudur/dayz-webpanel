/**
 * rcon/rconLog.ts
 *
 * Simple append-only log for RCON commands + responses.
 *
 * Stored at:
 *   data/InstanceData/<id>/logs/rcon.log
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir } from '../storage/jsonStore.js';

export function rconLogPath(dataDir: string, instanceId: string): string {
  return path.join(dataDir, 'InstanceData', instanceId, 'logs', 'rcon.log');
}

export async function appendRconLog(dataDir: string, instanceId: string, line: string): Promise<void> {
  const p = rconLogPath(dataDir, instanceId);
  await ensureDir(path.dirname(p));
  await fs.appendFile(p, line + '\n', 'utf8');
}
