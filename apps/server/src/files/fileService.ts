/**
 * files/fileService.ts
 *
 * File manager operations for an instance.
 *
 * Security model:
 * - The client NEVER sends an absolute path.
 * - The client sends: { rootKey: "root" | "profiles" | "battleye", relPath: "..." }
 * - The server resolves the absolute path and enforces it stays inside the chosen root.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { InstanceConfigV1 } from '../config/instanceConfig.js';
import { resolveWithinRoot } from '../utils/pathUtils.js';

export type AllowedRootKey = 'root' | 'profiles' | 'battleye';

export type FileEntry = {
  name: string;
  type: 'file' | 'dir';
  size: number;
  mtimeMs: number;
};

export class FileService {
  /** Returns a map of root key => absolute folder path */
  roots(cfg: InstanceConfigV1): Record<AllowedRootKey, string> {
    return {
      root: cfg.paths.root,
      profiles: cfg.paths.profiles,
      battleye: cfg.paths.battleye
    };
  }

  private resolve(cfg: InstanceConfigV1, rootKey: AllowedRootKey, relPath: string): string {
    const roots = this.roots(cfg);
    const rootAbs = roots[rootKey];
    if (!rootAbs) throw new Error('Invalid root key');
    return resolveWithinRoot(rootAbs, relPath);
  }

  async list(cfg: InstanceConfigV1, rootKey: AllowedRootKey, relPath: string): Promise<{ absPath: string; entries: FileEntry[] }> {
    const abs = this.resolve(cfg, rootKey, relPath);
    const items = await fs.readdir(abs, { withFileTypes: true });

    const entries: FileEntry[] = [];
    for (const it of items) {
      const p = path.join(abs, it.name);
      const st = await fs.stat(p);
      entries.push({
        name: it.name,
        type: it.isDirectory() ? 'dir' : 'file',
        size: st.size,
        mtimeMs: st.mtimeMs
      });
    }

    // Sort: folders first, then files; then alphabetical
    entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return { absPath: abs, entries };
  }

  async readText(cfg: InstanceConfigV1, rootKey: AllowedRootKey, relPath: string): Promise<{ absPath: string; content: string }> {
    const abs = this.resolve(cfg, rootKey, relPath);
    const content = await fs.readFile(abs, 'utf8');
    return { absPath: abs, content };
  }

  async writeText(cfg: InstanceConfigV1, rootKey: AllowedRootKey, relPath: string, content: string): Promise<{ absPath: string }> {
    const abs = this.resolve(cfg, rootKey, relPath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf8');
    return { absPath: abs };
  }

  async mkdir(cfg: InstanceConfigV1, rootKey: AllowedRootKey, relPath: string): Promise<{ absPath: string }> {
    const abs = this.resolve(cfg, rootKey, relPath);
    await fs.mkdir(abs, { recursive: true });
    return { absPath: abs };
  }

  async delete(cfg: InstanceConfigV1, rootKey: AllowedRootKey, relPath: string): Promise<{ absPath: string }> {
    const abs = this.resolve(cfg, rootKey, relPath);
    await fs.rm(abs, { recursive: true, force: true });
    return { absPath: abs };
  }

  async rename(cfg: InstanceConfigV1, rootKey: AllowedRootKey, relPath: string, newRelPath: string): Promise<{ absPath: string; newAbsPath: string }> {
    const abs = this.resolve(cfg, rootKey, relPath);
    const newAbs = this.resolve(cfg, rootKey, newRelPath);
    await fs.rename(abs, newAbs);
    return { absPath: abs, newAbsPath: newAbs };
  }
}
