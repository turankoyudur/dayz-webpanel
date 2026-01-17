/**
 * instances/instanceManager.ts
 *
 * Manages instance configs + instance data directories.
 *
 * Inspired by MCSManager file layout:
 * - Instance configs live in data/InstanceConfig/<id>.json
 * - Instance data lives in data/InstanceData/<id>/...
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { InstanceConfigSchemaV1, type InstanceConfigV1 } from '../config/instanceConfig.js';
import { ensureDir, fileExists, readJson, writeJsonAtomic } from '../storage/jsonStore.js';

export class InstanceManager {
  constructor(private dataDir: string) {}

  configDir(): string {
    return path.join(this.dataDir, 'InstanceConfig');
  }

  dataDirForInstance(instanceId: string): string {
    return path.join(this.dataDir, 'InstanceData', instanceId);
  }

  configPath(instanceId: string): string {
    return path.join(this.configDir(), `${instanceId}.json`);
  }

  async listInstances(): Promise<InstanceConfigV1[]> {
    await ensureDir(this.configDir());
    const files = await fs.readdir(this.configDir());
    const configs: InstanceConfigV1[] = [];

    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      const id = f.slice(0, -'.json'.length);
      try {
        const cfg = await this.getInstance(id);
        configs.push(cfg);
      } catch {
        // Ignore invalid configs to keep the panel from crashing.
        // They can be fixed manually or removed.
      }
    }

    return configs.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getInstance(instanceId: string): Promise<InstanceConfigV1> {
    const cfgPath = this.configPath(instanceId);
    if (!(await fileExists(cfgPath))) {
      throw new Error(`Instance not found: ${instanceId}`);
    }
    const raw = await readJson<unknown>(cfgPath);
    return InstanceConfigSchemaV1.parse(raw);
  }

  async saveInstance(cfg: InstanceConfigV1): Promise<void> {
    const parsed = InstanceConfigSchemaV1.parse(cfg);
    await writeJsonAtomic(this.configPath(parsed.id), parsed);

    // Ensure stable instance folders exist.
    await ensureDir(path.join(this.dataDirForInstance(parsed.id), 'logs'));
    await ensureDir(path.join(this.dataDirForInstance(parsed.id), 'runtime'));
    await ensureDir(path.join(this.dataDirForInstance(parsed.id), 'backups'));
  }
}
