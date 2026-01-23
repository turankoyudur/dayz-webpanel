import fs from "fs";
import path from "path";

export function getInstanceRoot(dataRoot: string, instanceId: string) {
  return path.join(path.resolve(dataRoot), "instances", instanceId);
}

export function getInstanceFolders(dataRoot: string, instanceId: string) {
  const root = getInstanceRoot(dataRoot, instanceId);
  return {
    root,
    profiles: path.join(root, "profiles"),
    runtime: path.join(root, "runtime"),
    keys: path.join(root, "keys"),
    configs: path.join(root, "configs"),
    logs: path.join(root, "logs"),
  };
}

/**
 * Creates instance runtime folders.
 *
 * NOTE: This does not download SteamCMD/DayZ; it only scaffolds folder structure.
 */
export function ensureInstanceFolders(dataRoot: string, instanceId: string) {
  const folders = getInstanceFolders(dataRoot, instanceId);
  const created: string[] = [];
  for (const dir of Object.values(folders)) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      created.push(dir);
    }
  }
  return { folders, created };
}
