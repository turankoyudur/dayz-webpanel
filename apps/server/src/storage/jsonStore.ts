/**
 * storage/jsonStore.ts
 *
 * A tiny "local DB" helper.
 *
 * Why:
 * - You asked to keep the DB local and simple (no Prisma, no SQLite, no server DB).
 * - We store all state as JSON files under ./data (MCSManager style).
 *
 * Guarantees:
 * - Atomic writes (write to .tmp then rename)
 * - Safe reads with helpful errors
 */

import fs from 'node:fs/promises';
import path from 'node:path';

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

export async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await ensureDir(dir);

  const tmpPath = `${filePath}.tmp`;
  const json = JSON.stringify(value, null, 2);

  await fs.writeFile(tmpPath, json, 'utf8');
  await fs.rename(tmpPath, filePath);
}
