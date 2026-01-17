/**
 * app/context.ts
 *
 * The central dependency container.
 *
 * Why:
 * - Keeps the architecture modular.
 * - Makes it easy to add/remove features (modules) without rewriting everything.
 * - Helps future revisions: you can swap implementations (e.g. replace file store with SQLite later)
 *   while keeping the external API stable.
 */

import type { SystemConfigV1 } from '../config/systemConfig.js';
import type { InstanceManager } from '../instances/instanceManager.js';
import type { AuditLogger } from '../audit/audit.js';
import type { RconManager } from '../rcon/rconManager.js';
import type { DayzProcessManager } from '../dayz/processManager.js';
import type { SteamCmdService } from '../steam/steamcmdService.js';
import type { SchedulerService } from '../scheduler/scheduler.js';

export type AppContext = {
  repoRoot: string;
  dataDir: string;
  systemConfig: SystemConfigV1;

  instances: InstanceManager;
  audit: AuditLogger;
  rcon: RconManager;
  process: DayzProcessManager;
  steamcmd: SteamCmdService;
  scheduler: SchedulerService;
};
