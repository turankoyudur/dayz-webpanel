/**
 * utils/pathUtils.ts
 *
 * Safe path helpers.
 *
 * Why this matters:
 * - The panel can edit files on disk (serverDZ.cfg, BattlEye configs, logs, etc.)
 * - We MUST prevent path traversal like "../../Windows/System32" when a user browses files.
 */

import path from 'node:path';

/**
 * Rejects absolute Windows paths and UNC paths.
 */
export function isPotentiallyUnsafePath(p: string): boolean {
  const trimmed = p.trim();
  if (trimmed === '') return false;

  // UNC path: \\server\share
  if (trimmed.startsWith('\\\\')) return true;

  // Drive absolute: C:\...
  if (/^[a-zA-Z]:[\\/]/.test(trimmed)) return true;

  return false;
}

/**
 * Resolves a user-supplied relative path within a fixed root folder.
 *
 * If the result escapes the root, it throws an Error.
 */
export function resolveWithinRoot(rootAbs: string, relativePath: string): string {
  if (isPotentiallyUnsafePath(relativePath)) {
    throw new Error('Absolute/UNC paths are not allowed. Provide a relative path.');
  }

  const normalizedRel = relativePath.replaceAll('\\', '/').replace(/^\/+/, '');

  const abs = path.resolve(rootAbs, normalizedRel);

  // On Windows, file system is case-insensitive. We compare lowercased.
  const rootNormalized = path.resolve(rootAbs);

  const absLower = abs.toLowerCase();
  const rootLower = rootNormalized.toLowerCase();

  // Ensure abs is inside root (or equal root)
  if (absLower === rootLower) return abs;
  if (!absLower.startsWith(rootLower + path.sep.toLowerCase())) {
    throw new Error('Path escapes the allowed root folder.');
  }

  return abs;
}
