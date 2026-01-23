import fs from "fs";
import path from "path";
import { z } from "zod";
import { AppError, ErrorCodes } from "../../core/errors";
import type { DbClient } from "../../db/prisma";
import { validateInstanceName } from "../../../shared/instanceName";

/**
 * Settings live in the DB so the user doesn't need to manually edit project files.
 *
 * We keep settings schema-driven so we can validate and evolve safely.
 */
type ManagedPaths = {
  dataRoot: string;
  steamcmdPath: string;
  dayzServerPath: string;
  profilesPath: string;
  apiBridgePath: string;
};

/**
 * "Managed paths" are generated from a single DataRoot + InstanceName.
 *
 * Why:
 * - The project aims to be portable.
 * - We want safe defaults that do not depend on a hard-coded drive letter.
 * - Users can still override any path manually in Settings.
 */
function deriveManagedPaths(dataRoot: string, instanceName: string): ManagedPaths {
  const root = path.resolve(dataRoot);
  const steamcmdDir = path.join(root, "steamcmd");
  const steamcmdPath = process.platform === "win32"
    ? path.join(steamcmdDir, "steamcmd.exe")
    : path.join(steamcmdDir, "steamcmd.sh");

  // When SteamCMD installs DayZ Server (appid: 223350), it creates a standard layout under steamapps/.
  const dayzServerPath = path.join(steamcmdDir, "steamapps", "common", "DayZServer");

  // Instance-specific runtime folders (forward compatible with multi-instance support).
  const instanceRoot = path.join(root, "instances", instanceName);
  const profilesPath = path.join(instanceRoot, "profiles");
  const apiBridgePath = path.join(profilesPath, "ApiBridge");

  return {
    dataRoot: root,
    steamcmdPath,
    dayzServerPath,
    profilesPath,
    apiBridgePath,
  };
}

const DEFAULT_DATA_ROOT = path.resolve(process.cwd(), "data");
export const DEFAULT_INSTANCE_ID = "default";
const DEFAULT_MANAGED = deriveManagedPaths(DEFAULT_DATA_ROOT, DEFAULT_INSTANCE_ID);

export const instanceSettingsSchema = z.object({
  /**
   * Logical instance name.
   *
   * Today we run a single server instance (instance:default in DB).
   * In the next iterations we'll support multiple instances and this name
   * becomes the instance identifier + folder name, so we validate it strictly.
   */
  instanceName: z
    .preprocess((v) => (typeof v === "string" ? v.trim() : v), z.string().min(1))
    .refine(
      (value) => validateInstanceName(String(value)).ok,
      (value) => {
        const r = validateInstanceName(String(value));
        return { message: r.ok ? "" : r.message };
      },
    )
    .default("default"),

  /**
   * Root folder for *runtime* data (SteamCMD, instances, profiles).
   *
   * Note:
   * - Prisma DB + app logs also live under ./data by default, but they are not tied to this setting.
   * - Users can move this root to any drive/folder.
   */
  dataRoot: z.string().min(1).default(DEFAULT_MANAGED.dataRoot),

  /**
   * Setup Wizard / first-run gate.
   * When false, UI should route to /setup.
   */
  setupComplete: z.coerce.boolean().default(false),

  // Core paths
  steamcmdPath: z.string().min(1).default(DEFAULT_MANAGED.steamcmdPath),
  dayzServerPath: z.string().min(1).default(DEFAULT_MANAGED.dayzServerPath),
  profilesPath: z.string().min(1).default(DEFAULT_MANAGED.profilesPath),

  /**
   * ApiBridge folder (typically: <profilesPath>/ApiBridge).
   *
   * This is where the DayZ mod writes/reads the JSON bridge files:
   * - state.json, players.json, bridge_heartbeat.json
   * - commands.json, command_results.json
   */
  apiBridgePath: z.string().min(1).default(DEFAULT_MANAGED.apiBridgePath),

  // Steam Web API (optional but recommended for official workshop search)
  steamWebApiKey: z.string().optional().default(process.env.STEAM_WEB_API_KEY ?? ""),

  // ApiBridge behavior
  apiBridgeApiKey: z.string().optional().default(""),
  apiBridgeNodeId: z.string().min(1).default("panel-node"),
  apiBridgeCommandTimeoutMs: z.coerce.number().int().positive().default(8000),
  apiBridgePollIntervalMs: z.coerce.number().int().positive().default(250),

  // Launch params (stored as key/value and compiled into CLI args)
  serverPort: z.coerce.number().int().positive().default(2302),
  serverConfigFile: z.string().min(1).default("serverDZ.cfg"),
  additionalLaunchArgs: z.string().optional().default("-doLogs -adminLog -netLog -freezeCheck"),

  /**
   * Server supervisor behavior.
   *
   * v0.2: The panel runs a lightweight process supervisor. If the DayZ process
   * crashes, the panel can optionally attempt a restart.
   */
  autoRestartOnCrash: z.coerce.boolean().default(false),
  autoRestartDelayMs: z.coerce.number().int().positive().default(5000),
  autoRestartMaxAttempts: z.coerce.number().int().positive().default(3),
  autoRestartWindowMs: z.coerce.number().int().positive().default(10 * 60 * 1000),

  // Steam login (optional; workshop downloads often require an account)
  steamUser: z.string().optional().default(""),
  steamPassword: z.string().optional().default(""),
});

export type InstanceSettings = z.infer<typeof instanceSettingsSchema>;

export function settingsKeyForInstance(instanceId: string) {
  return `instance:${instanceId}`;
}

export function createDefaultInstanceSettings(args: { instanceId: string; dataRoot?: string }) {
  const instanceId = String(args.instanceId || DEFAULT_INSTANCE_ID).trim() || DEFAULT_INSTANCE_ID;
  const dataRoot = args.dataRoot ? path.resolve(String(args.dataRoot)) : DEFAULT_DATA_ROOT;
  const derived = deriveManagedPaths(dataRoot, instanceId);
  return instanceSettingsSchema.parse({
    instanceName: instanceId,
    dataRoot,
    steamcmdPath: derived.steamcmdPath,
    dayzServerPath: derived.dayzServerPath,
    profilesPath: derived.profilesPath,
    apiBridgePath: derived.apiBridgePath,
  });
}

export class SettingsService {
  constructor(
    private readonly db: DbClient,
    private readonly instanceId: string = DEFAULT_INSTANCE_ID,
  ) {}

  /**
   * Reads the settings JSON from the DB and returns a validated settings object.
   */
  async get(): Promise<InstanceSettings> {
    const key = settingsKeyForInstance(this.instanceId);
    const row = await this.db.setting.findUnique({ where: { key } });
    const json = row?.value ? safeJsonParse(row.value) : null;

    // If missing, lazily create default settings for this instance.
    if (!json) {
      const created = createDefaultInstanceSettings({ instanceId: this.instanceId });
      await this.db.setting.upsert({
        where: { key },
        create: { key, value: JSON.stringify(created) },
        update: { value: JSON.stringify(created) },
      });
      return created;
    }
    
    // Normalize common launch-arg typos from older versions (e.g., missing leading dash)
    if (json && typeof (json as any).additionalLaunchArgs === "string") {
      (json as any).additionalLaunchArgs = normalizeAdditionalLaunchArgs((json as any).additionalLaunchArgs);
    }
    // Force instanceName to the instance id (managed by Instances module).
    const merged = { ...(json as any), instanceName: this.instanceId };
    return instanceSettingsSchema.parse(merged);
  }

  /**
   * Partial update. Unknown keys are rejected by Zod.
   */
  async update(patch: Partial<InstanceSettings>): Promise<InstanceSettings> {
    const current = await this.get();

    // instanceName is managed by the Instances subsystem.
    const { instanceName: _ignored, ...safePatch } = (patch ?? {}) as any;

    // When DataRoot or InstanceName changes, we "rebase" managed paths
    // ONLY if the current values were still on the previous managed defaults.
    const prevManaged = deriveManagedPaths(current.dataRoot, current.instanceName);

    const merged: any = { ...current, ...safePatch, instanceName: this.instanceId };
    const nextManaged = deriveManagedPaths(merged.dataRoot, merged.instanceName);

    const derivedKeys: Array<keyof ManagedPaths> = [
      "steamcmdPath",
      "dayzServerPath",
      "profilesPath",
      "apiBridgePath",
    ];

    for (const key of derivedKeys) {
      const patchHasKey = Object.prototype.hasOwnProperty.call(safePatch, key);
      if (patchHasKey) continue;

      // Only rebase if the user did not override the value before.
      if ((current as any)[key] === (prevManaged as any)[key]) {
        merged[key] = (nextManaged as any)[key];
      }
    }

    const next = instanceSettingsSchema.parse(merged);

    const dbKey = settingsKeyForInstance(this.instanceId);
    await this.db.setting.upsert({
      where: { key: dbKey },
      create: { key: dbKey, value: JSON.stringify(next) },
      update: { value: JSON.stringify(next) },
    });

    return next;
  }

  /**
   * Validates that configured paths exist on disk.
   */
  async validatePaths() {
    const s = await this.get();
    let dayzExeOk = false;
    try {
      await this.getDayzExecutablePath();
      dayzExeOk = true;
    } catch {
      dayzExeOk = false;
    }

    const results = {
      dataRoot: dirExists(s.dataRoot),
      steamcmdPath: fileExists(s.steamcmdPath),
      dayzServerPath: dirExists(s.dayzServerPath),
      dayzExecutable: dayzExeOk,
      profilesPath: dirExists(s.profilesPath),
      apiBridgePath: dirExists(s.apiBridgePath),
    };

    return results;
  }

  /**
   * Returns a derived path to the DayZ server executable.
   */
  async getDayzExecutablePath() {
    const s = await this.get();
    const candidates = process.platform === "win32" ? ["DayZServer_x64.exe"] : ["DayZServer_x64", "DayZServer"];
    for (const candidate of candidates) {
      const exe = path.join(s.dayzServerPath, candidate);
      if (fileExists(exe)) return exe;
    }
    throw new AppError({
      code: ErrorCodes.FILE_NOT_FOUND,
      status: 400,
      message: `DayZ server executable not found. Expected ${candidates.join(" or ")}.`,
      context: { dayzServerPath: s.dayzServerPath },
    });
  }
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function normalizeAdditionalLaunchArgs(input: string): string {
  const s = String(input ?? "").trim();
  if (!s) return "";
  // Replace legacy tokens missing a leading dash.
  // We keep this conservative to avoid surprising custom args.
  let out = s;
  // dologs -> -doLogs
  out = out.replace(/(^|\s)dologs(\s|$)/gi, "$1-doLogs$2");
  // normalize common flag casing
  out = out.replace(/-adminlog/gi, "-adminLog");
  out = out.replace(/-netlog/gi, "-netLog");
  out = out.replace(/-freezecheck/gi, "-freezeCheck");
  out = out.replace(/-dologs/gi, "-doLogs");
  return out;
}


function fileExists(p: string) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function dirExists(p: string) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}
