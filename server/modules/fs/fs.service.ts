import fs from "fs";
import path from "path";
import { AppError, ErrorCodes } from "../../core/errors";
import type { InstanceSettings } from "../settings/settings.service";

export type FsRoot = {
  id: string;
  label: string;
  path: string;
};

export type FsEntry = {
  name: string;
  isDir: boolean;
  size: number;
  mtimeMs: number;
};

/**
 * Security model
 * - The panel is expected to run locally.
 * - We provide a *restricted* file browser for UX (path picking).
 * - All browse operations are limited to allowlisted roots.
 */
export class FsService {
  getRoots(settings: InstanceSettings): FsRoot[] {
    const panelRoot = path.resolve(process.cwd());
    const dataRoot = path.resolve(settings.dataRoot);

    // Keep roots stable and simple.
    // If dataRoot equals panelRoot, de-dupe.
    const roots: FsRoot[] = [{ id: "panelRoot", label: "Panel Root", path: panelRoot }];
    if (dataRoot !== panelRoot) {
      roots.push({ id: "dataRoot", label: "Data Root", path: dataRoot });
    }
    return roots;
  }

  listDir(roots: FsRoot[], rootId: string, relPath: string) {
    const root = roots.find((r) => r.id === rootId);
    if (!root) {
      throw new AppError({
        code: ErrorCodes.VALIDATION,
        status: 400,
        message: `Unknown rootId: ${rootId}`,
      });
    }

    const rootAbs = path.resolve(root.path);
    const requestedAbs = path.resolve(rootAbs, relPath || ".");

    if (!isWithinRoot(rootAbs, requestedAbs)) {
      throw new AppError({
        code: ErrorCodes.FORBIDDEN,
        status: 403,
        message: "Requested path is outside of the allowed root.",
        context: { rootId, rootAbs, relPath },
      });
    }

    if (!existsDir(requestedAbs)) {
      throw new AppError({
        code: ErrorCodes.FILE_NOT_FOUND,
        status: 404,
        message: "Directory not found.",
        context: { rootId, requestedAbs },
      });
    }

    const entries = safeReadDir(requestedAbs)
      .map((name) => {
        const full = path.join(requestedAbs, name);
        const st = safeStat(full);
        if (!st) return null;
        return {
          name,
          isDir: st.isDirectory(),
          size: st.size,
          mtimeMs: st.mtimeMs,
        } satisfies FsEntry;
      })
      .filter(Boolean) as FsEntry[];

    // Directories first, then files; stable name sort.
    entries.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    // Hard limit to prevent huge UI payloads.
    const limited = entries.slice(0, 500);

    const normalizedRel = normalizeRelPath(path.relative(rootAbs, requestedAbs));
    const parentRel = normalizedRel ? normalizeRelPath(path.dirname(normalizedRel)) : "";

    return {
      root,
      relPath: normalizedRel,
      parentRelPath: parentRel === "." ? "" : parentRel,
      entries: limited,
    };
  }
}

function isWithinRoot(rootAbs: string, requestedAbs: string) {
  const rel = path.relative(rootAbs, requestedAbs);
  return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel) ? true : requestedAbs === rootAbs;
}

function normalizeRelPath(p: string) {
  const norm = p.split(path.sep).join("/");
  return norm === "." ? "" : norm;
}

function safeReadDir(dir: string) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

function safeStat(p: string) {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

function existsDir(p: string) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}
