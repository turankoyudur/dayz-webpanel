import fs from "fs";
import path from "path";

/**
 * Small file helpers for the ApiBridge "file bridge" integration.
 *
 * Why:
 * - DayZ mod writes JSON snapshots (state.json, bridge_heartbeat.json)
 * - Node writes JSON commands (commands.json) + node_heartbeat.json
 *
 * We keep reads defensive and writes atomic to avoid half-written JSON.
 */
export function readTextIfExists(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, "utf-8");
}

export function safeJsonParse<T>(text: string): T {
  return JSON.parse(text) as T;
}

/**
 * Atomic JSON write:
 * 1) write to temp file
 * 2) rename over target
 *
 * On Windows, rename within the same directory is effectively atomic.
 */
export function writeJsonAtomic(filePath: string, data: unknown) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, filePath);
}

export function fileMtimeMs(filePath: string): number | null {
  if (!fs.existsSync(filePath)) return null;
  return fs.statSync(filePath).mtimeMs;
}
