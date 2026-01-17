/**
 * audit/audit.ts
 *
 * Append-only audit logging (NDJSON).
 *
 * Why:
 * - This is one of the most useful "CF Cloud"-style features: seeing who did what and when.
 * - With file-based storage, append-only logs are simple, fast and reliable.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { AuthenticatedUser } from '../auth/auth.js';
import { ensureDir } from '../storage/jsonStore.js';

export type AuditEvent = {
  ts: string; // ISO
  action: string; // e.g. INSTANCE_START, RCON_COMMAND, FILE_WRITE
  user: {
    id: string;
    username: string;
    role: string;
  };
  instanceId?: string;
  details?: Record<string, unknown>;
};

export class AuditLogger {
  constructor(private dataDir: string) {}

  private globalAuditPath(): string {
    return path.join(this.dataDir, 'SystemConfig', 'audit.ndjson');
  }

  private instanceAuditPath(instanceId: string): string {
    return path.join(this.dataDir, 'InstanceData', instanceId, 'logs', 'audit.ndjson');
  }

  /**
   * Appends an audit event to the global audit log and optionally the instance audit log.
   */
  async log(action: string, user: AuthenticatedUser, instanceId?: string, details?: Record<string, unknown>): Promise<void> {
    const evt: AuditEvent = {
      ts: new Date().toISOString(),
      action,
      user: { id: user.id, username: user.username, role: user.role },
      instanceId,
      details
    };

    // Global log
    await this.appendLine(this.globalAuditPath(), JSON.stringify(evt));

    // Per-instance log (if relevant)
    if (instanceId) {
      await this.appendLine(this.instanceAuditPath(instanceId), JSON.stringify(evt));
    }
  }

  private async appendLine(filePath: string, line: string): Promise<void> {
    await ensureDir(path.dirname(filePath));
    await fs.appendFile(filePath, line + '\n', 'utf8');
  }
}
