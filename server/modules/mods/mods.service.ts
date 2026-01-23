import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import axios from "axios";
import { AppError, ErrorCodes } from "../../core/errors";
import { SettingsService } from "../settings/settings.service";
import type { DbClient } from "../../db/prisma";


/**
 * Derive a stable mod folder name from the Workshop title.
 *
 * DayZ servers commonly use a folder naming convention like:
 *   @CF, @VPPAdminTools, @My_Custom_Mod
 *
 * Workshop titles can contain characters that are invalid on Windows
 * (e.g. : * ? " < > |). We sanitize aggressively.
 */
function deriveFolderName(title: string | undefined, workshopId: string): string {
  const base = (title ?? workshopId).trim();
  // Remove Windows-invalid filename chars and control chars
  const cleaned = base.replace(/[\/:*?"<>|\u0000-\u001F]/g, "");
  // Replace whitespace with underscores, collapse repeats
  const underscored = cleaned.replace(/\s+/g, "_");
  // Keep it reasonably short to avoid long paths
  const limited = underscored.slice(0, 64);
  // Final fallback
  const finalName = limited.length ? limited : workshopId;
  return finalName;
}

/**
 * ModsService
 *
 * Responsibilities:
 * - Keep a local catalog of mods (DB)
 * - Fetch metadata from Steam Workshop (title, size, updated timestamp)
 * - Install mods using SteamCMD
 * - Enable/disable mods (affects server launch -mod=... argument)
 */
export class ModsService {
  private readonly settings: SettingsService;

  constructor(
    private readonly db: DbClient,
    private readonly instanceId: string,
  ) {
    this.settings = new SettingsService(db, instanceId);
  }

  /**
   * Lists mods from the DB.
   */
  async list() {
    return this.db.mod.findMany({ orderBy: { enabled: "desc" } });
  }

  /**
   * Adds a workshop ID to the catalog.
   *
   * This does NOT install it yet (install is a separate action).
   */
  async add(workshopId: string) {
    const meta = await fetchWorkshopDetails(workshopId);
    return this.db.mod.upsert({
      where: { workshopId },
      create: {
        workshopId,
        name: meta?.name,
        folderName: deriveFolderName(meta?.name, workshopId),
        description: meta?.description,
        sizeBytes: meta?.sizeBytes,
        lastUpdateTs: meta?.lastUpdateTs,
        enabled: false,
      },
      update: {
        name: meta?.name,
        folderName: deriveFolderName(meta?.name, workshopId),
        description: meta?.description,
        sizeBytes: meta?.sizeBytes,
        lastUpdateTs: meta?.lastUpdateTs,
      },
    });
  }

  /**
   * Installs the given Workshop mod via SteamCMD.
   *
   * IMPORTANT:
   * - DayZ workshop downloads usually require a Steam account that owns DayZ.
   * - For safety, we take credentials from Settings (UI), not from code files.
   */
  async install(workshopId: string) {
    // Ensure the mod exists in DB so /install works even if the UI calls it directly.
    // We try to pull metadata first, but fall back to a minimal row if Steam API is unreachable.
    try {
      await this.add(workshopId);
    } catch {
      await this.db.mod.upsert({
        where: { workshopId },
        create: { workshopId, enabled: false, folderName: deriveFolderName(undefined, workshopId) },
        update: {},
      });
    }

    const s = await this.settings.get();

    // Quick checks
    if (!fs.existsSync(s.steamcmdPath)) {
      throw new AppError({
        code: ErrorCodes.STEAMCMD_NOT_FOUND,
        status: 400,
        message: "SteamCMD not found. Please set the correct SteamCMD path in Settings.",
        context: { steamcmdPath: s.steamcmdPath },
      });
    }

    // Workshop content path is usually: <steamapps>/workshop/content/221100/<id>
    const steamappsDir = path.resolve(s.dayzServerPath, "..", "..");
    const workshopDir = path.join(steamappsDir, "workshop", "content", "221100", workshopId);

    // Compose SteamCMD command
    const login = s.steamUser && s.steamPassword ? [s.steamUser, s.steamPassword] : ["anonymous"];

    const args = [
      "+force_install_dir",
      s.dayzServerPath,
      "+login",
      ...login,
      "+workshop_download_item",
      "221100",
      workshopId,
      "validate",
      "+quit",
    ];

    const result = await runProcess(s.steamcmdPath, args);

    if (result.exitCode !== 0) {
      throw new AppError({
        code: ErrorCodes.STEAMCMD_FAILED,
        status: 500,
        message: "SteamCMD failed while downloading the mod",
        context: { workshopId, exitCode: result.exitCode, stdout: result.stdout.slice(-2000) },
      });
    }

    // Best-effort update installedPath
    const installedPath = fs.existsSync(workshopDir) ? workshopDir : undefined;

    await this.db.mod.upsert({
      where: { workshopId },
      create: { workshopId, enabled: false, name: null, folderName: deriveFolderName(undefined, workshopId), installedPath },
      update: { installedPath },
    });

    return { ok: true, installedPath, output: result.stdout };
  }

  /**
   * Enables/disables a mod.
   * This only affects launch arguments; it does not delete files.
   */
  async setEnabled(workshopId: string, enabled: boolean) {
    const mod = await this.db.mod.update({
      where: { workshopId },
      data: { enabled },
    });
    return mod;
  }

  /**
   * Scans the workshop directory to detect mods that exist on disk.
   * This is used to reconcile manual downloads / updates.
   */
  async scanInstalledOnDisk() {
    const s = await this.settings.get();
    const steamappsDir = path.resolve(s.dayzServerPath, "..", "..");
    const base = path.join(steamappsDir, "workshop", "content", "221100");
    if (!fs.existsSync(base)) return { base, found: [] as string[] };
    const found = fs
      .readdirSync(base, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    return { base, found };
  }

  /**
   * Searches the Steam Workshop for DayZ mods (best-effort, no auth).
   */
  async search(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return { total: 0, results: [] };

    const s = await this.settings.get();

    // Prefer the official Steam Web API (requires a Web API key).
    // This is more stable than scraping steamcommunity HTML/JSON endpoints.
    if (s.steamWebApiKey) {
      const input = {
        // 221100 = DayZ app (Workshop universe for DayZ).
        // query_type: 12 = RankedByTextSearch
        appid: 221100,
        query_type: 12,
        search_text: trimmed,
        // Keep responses small.
        return_short_description: true,
        return_metadata: true,
        return_children: false,
        return_kv_tags: false,
        // Pagination
        page: 1,
        numperpage: 25,
        cursor: "*",
      };

      const resp = await axios.get(
        "https://api.steampowered.com/IPublishedFileService/QueryFiles/v1/",
        {
          params: {
            key: s.steamWebApiKey,
            input_json: JSON.stringify(input),
          },
          timeout: 10_000,
        },
      );

      const details = Array.isArray(resp.data?.response?.publishedfiledetails)
        ? resp.data.response.publishedfiledetails
        : [];

      const results = details.map((item: any) => ({
        workshopId: String(item.publishedfileid ?? ""),
        name: String(item.title ?? ""),
        lastUpdateTs: toNumber(item.time_updated ?? item.time_updated?.toString()),
        sizeBytes: toNumber(item.file_size ?? item.file_size?.toString()),
        subscriptions: toNumber(item.subscriptions ?? item.subscriptions?.toString()),
      }));

      const total = toNumber(resp.data?.response?.total) ?? results.length;
      return { total, results: results.filter((r) => r.workshopId) };
    }

    // Fallback: older steamcommunity endpoint.
    // NOTE: This may break if Valve changes the endpoint behavior.
    const resp = await axios.get("https://steamcommunity.com/workshop/browse/", {
      params: {
        appid: 221100,
        searchtext: trimmed,
        browsesort: "textsearch",
        section: "readytouseitems",
        actualsort: "textsearch",
        json: 1,
      },
      timeout: 10_000,
    });

    const data = resp.data ?? {};
    const rawResults = Array.isArray(data.results)
      ? data.results
      : Array.isArray(data.response?.results)
        ? data.response.results
        : [];

    const results = rawResults.map((item: any) => ({
      workshopId: String(item.publishedfileid ?? item.id ?? ""),
      name: String(item.title ?? item.name ?? ""),
      lastUpdateTs: toNumber(item.time_updated ?? item.time_updated?.toString()),
      sizeBytes: toNumber(item.file_size ?? item.file_size?.toString()),
      subscriptions: toNumber(item.subscriptions ?? item.subscriptions?.toString()),
    }));

    const total = toNumber(data.total ?? data.response?.total) ?? results.length;
    return { total, results: results.filter((r) => r.workshopId) };
  }

  /**
   * Imports all mods inside a Workshop collection and adds them to the DB.
   */
  async importCollection(collectionId: string) {
    const ids = await fetchCollectionChildren(collectionId);
    const results = await Promise.all(ids.map((id) => this.add(id)));
    return { total: ids.length, added: results.length };
  }

  /**
   * Refreshes metadata for all known mods.
   */
  async refreshMetadata() {
    const mods = await this.db.mod.findMany();
    const updated = await Promise.all(
      mods.map(async (mod) => {
        const meta = await fetchWorkshopDetails(mod.workshopId);
        if (!meta) return null;
        return this.db.mod.update({
          where: { workshopId: mod.workshopId },
          data: {
            name: meta.name,
            folderName: deriveFolderName(meta.name, mod.workshopId),
            description: meta.description,
            sizeBytes: meta.sizeBytes,
            lastUpdateTs: meta.lastUpdateTs,
          },
        });
      }),
    );

    return {
      total: mods.length,
      refreshed: updated.filter(Boolean).length,
    };
  }

  /**
   * Copies .bikey files from installed mods into the DayZ server keys folder.
   */
  async syncKeys() {
    const s = await this.settings.get();
    const mods = await this.db.mod.findMany({ where: { installedPath: { not: null } } });
    const serverKeysPath = path.join(s.dayzServerPath, "keys");
    ensureDir(serverKeysPath);

    let copied = 0;
    const missing: string[] = [];

    for (const mod of mods) {
      const installedPath = mod.installedPath ?? "";
      const keysPath = path.join(installedPath, "keys");
      if (!dirExists(keysPath)) {
        missing.push(mod.workshopId);
        continue;
      }
      const files = fs.readdirSync(keysPath).filter((file) => file.toLowerCase().endsWith(".bikey"));
      for (const file of files) {
        const src = path.join(keysPath, file);
        const dest = path.join(serverKeysPath, file);
        fs.copyFileSync(src, dest);
        copied += 1;
      }
    }

    return { copied, missing };
  }
}

/**
 * Fetches Steam Workshop details.
 *
 * This endpoint is widely used by community tools and doesn't require auth.
 * If Valve changes it or rate limits you, you'll still be able to manage mods by ID.
 */
async function fetchWorkshopDetails(workshopId: string) {
  try {
    const params = new URLSearchParams();
    params.set("itemcount", "1");
    params.set("publishedfileids[0]", workshopId);

    const resp = await axios.post(
      "https://api.steampowered.com/ISteamRemoteStorage/GetPublishedFileDetails/v1/",
      params,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );

    const details = resp.data?.response?.publishedfiledetails?.[0];
    if (!details || details.result !== 1) return null;
    return {
      name: details.title as string,
      description: (details.description as string) ?? undefined,
      sizeBytes: typeof details.file_size === "number" ? details.file_size : undefined,
      lastUpdateTs: typeof details.time_updated === "number" ? details.time_updated : undefined,
    };
  } catch {
    return null;
  }
}

async function fetchCollectionChildren(collectionId: string) {
  try {
    const params = new URLSearchParams();
    params.set("collectioncount", "1");
    params.set("publishedfileids[0]", collectionId);

    const resp = await axios.post(
      "https://api.steampowered.com/ISteamRemoteStorage/GetCollectionDetails/v1/",
      params,
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );

    const details = resp.data?.response?.collectiondetails?.[0];
    const children = Array.isArray(details?.children) ? details.children : [];
    return children.map((child: any) => String(child?.publishedfileid ?? "")).filter(Boolean);
  } catch {
    return [];
  }
}

function toNumber(value: string | number | undefined | null) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function ensureDir(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // ignore
  }
}

function dirExists(p: string) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

type WorkshopSearchResult = {
  workshopId: string;
  name: string;
  lastUpdateTs?: number;
  sizeBytes?: number;
  subscriptions?: number;
};

function runProcess(command: string, args: string[]) {
  return new Promise<{ exitCode: number; stdout: string }>((resolve) => {
    const child = spawn(command, args, {
      windowsHide: process.platform === "win32",
    });
    let stdout = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stdout += d.toString()));
    child.on("close", (code) => {
      resolve({ exitCode: code ?? 0, stdout });
    });
  });
}
