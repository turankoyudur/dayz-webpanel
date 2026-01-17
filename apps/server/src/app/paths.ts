/**
 * app/paths.ts
 *
 * Determines important paths (repo root, data directory, web build directory).
 *
 * Why:
 * - In an npm workspace, the server starts with cwd = apps/server.
 * - But our data folder lives at the repo root: ./data
 * - We want this to work no matter how the user starts the server.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Best-effort repo root detection.
 */
export async function findRepoRoot(): Promise<string> {
  const envRoot = process.env.DAYZ_PANEL_ROOT;
  const cwd = process.cwd();

  const candidates = [
    envRoot,
    cwd,
    path.resolve(cwd, '..'),
    path.resolve(cwd, '../..'),
    path.resolve(cwd, '../../..')
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    const pkg = path.join(c, 'package.json');
    const appsServer = path.join(c, 'apps', 'server');
    if (await exists(pkg) && await exists(appsServer)) {
      return c;
    }
  }

  // Fallback: use cwd.
  return cwd;
}

export function dataDirFromRoot(root: string): string {
  return path.join(root, 'data');
}

export function webDistDirFromRoot(root: string): string {
  return path.join(root, 'apps', 'web', 'dist');
}
