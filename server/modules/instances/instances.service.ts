import fs from "fs";
import path from "path";
import type { DbClient } from "../../db/prisma";
import { AppError, ErrorCodes } from "../../core/errors";
import { validateInstanceName } from "../../../shared/instanceName";
import { createDefaultInstanceSettings, SettingsService } from "../settings/settings.service";
import { ensureInstanceFolders, getInstanceFolders } from "./instanceFolders";

const ACTIVE_KEY = "global:activeInstanceId";

export type InstanceSummary = {
  id: string;
  displayName: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export class InstancesService {
  constructor(private readonly db: DbClient) {}

  async ensureDefault() {
    await this.db.instance.upsert({
      where: { id: "default" },
      create: { id: "default", displayName: "default" },
      update: {},
    });

    // Ensure settings for default exist.
    await new SettingsService(this.db, "default").get();

    const active = await this.getActiveId();
    if (!active) {
      await this.setActive("default");
    }
  }

  async list() {
    await this.ensureDefault();
    const instances = await this.db.instance.findMany({
      orderBy: [{ archivedAt: "asc" }, { id: "asc" }],
    });
    const activeId = (await this.getActiveId()) ?? "default";
    return { activeId, instances };
  }

  async getActiveId(): Promise<string | null> {
    const row = await this.db.setting.findUnique({ where: { key: ACTIVE_KEY } });
    const raw = (row?.value ?? "").trim();
    return raw ? raw : null;
  }

  async setActive(instanceId: string) {
    const exists = await this.db.instance.findUnique({ where: { id: instanceId } });
    if (!exists || exists.archivedAt) {
      throw new AppError({
        code: ErrorCodes.NOT_FOUND,
        status: 404,
        message: "Instance not found",
        context: { instanceId },
      });
    }
    await this.db.setting.upsert({
      where: { key: ACTIVE_KEY },
      create: { key: ACTIVE_KEY, value: instanceId },
      update: { value: instanceId },
    });
    return { ok: true, activeId: instanceId };
  }

  async create(args: { id: string; displayName?: string }) {
    const v = validateInstanceName(args.id);
    if (!v.ok) {
      throw new AppError({
        code: ErrorCodes.VALIDATION,
        status: 400,
        message: v.message,
        context: { id: args.id },
      });
    }
    const id = v.normalized;
    await this.ensureDefault();

    const existing = await this.db.instance.findUnique({ where: { id } });
    if (existing && !existing.archivedAt) {
      throw new AppError({
        code: ErrorCodes.VALIDATION,
        status: 400,
        message: "Instance already exists",
        context: { id },
      });
    }

    // Seed settings from current active instance (or default).
    const seedFrom = (await this.getActiveId()) ?? "default";
    const seedSettings = await new SettingsService(this.db, seedFrom).get();

    // Ensure unique port (best effort).
    const usedPorts = await this.collectUsedPorts();
    let nextPort = Number(seedSettings.serverPort ?? 2302);
    while (usedPorts.has(nextPort)) {
      nextPort += 10;
    }

    const settings = createDefaultInstanceSettings({ instanceId: id, dataRoot: seedSettings.dataRoot });
    const merged = {
      ...seedSettings,
      ...settings,
      instanceName: id,
      serverPort: nextPort,
    };
    const finalSettings = await new SettingsService(this.db, id).update(merged as any);

    const instance = await this.db.instance.upsert({
      where: { id },
      create: { id, displayName: args.displayName?.trim() || id, archivedAt: null },
      update: { displayName: args.displayName?.trim() || id, archivedAt: null },
    });

    // Scaffold instance folder structure
    ensureInstanceFolders(finalSettings.dataRoot, id);

    // Best effort: seed instance config file if missing.
    await this.seedConfigIfMissing(finalSettings.dataRoot, id, finalSettings.dayzServerPath, finalSettings.serverConfigFile);

    // Switch active to the newly created instance
    await this.setActive(id);

    return { ok: true, instance, settings: finalSettings };
  }

  async updateDisplayName(instanceId: string, displayName: string) {
    await this.ensureDefault();
    const exists = await this.db.instance.findUnique({ where: { id: instanceId } });
    if (!exists || exists.archivedAt) {
      throw new AppError({ code: ErrorCodes.NOT_FOUND, status: 404, message: "Instance not found" });
    }
    const instance = await this.db.instance.update({
      where: { id: instanceId },
      data: { displayName: displayName.trim() || instanceId },
    });
    return { ok: true, instance };
  }

  async archive(instanceId: string) {
    await this.ensureDefault();
    if (instanceId === "default") {
      throw new AppError({
        code: ErrorCodes.VALIDATION,
        status: 400,
        message: "Default instance cannot be archived",
      });
    }
    const exists = await this.db.instance.findUnique({ where: { id: instanceId } });
    if (!exists || exists.archivedAt) {
      throw new AppError({ code: ErrorCodes.NOT_FOUND, status: 404, message: "Instance not found" });
    }

    const activeId = (await this.getActiveId()) ?? "default";
    if (activeId === instanceId) {
      await this.setActive("default");
    }

    const instance = await this.db.instance.update({
      where: { id: instanceId },
      data: { archivedAt: new Date() },
    });
    return { ok: true, instance };
  }

  private async collectUsedPorts() {
    const instances = await this.db.instance.findMany({ where: { archivedAt: null } });
    const ports = new Set<number>();
    for (const inst of instances) {
      try {
        const s = await new SettingsService(this.db, inst.id).get();
        const p = Number(s.serverPort);
        if (Number.isFinite(p)) ports.add(p);
      } catch {
        // ignore
      }
    }
    return ports;
  }

  private async seedConfigIfMissing(
    dataRoot: string,
    instanceId: string,
    dayzServerPath: string,
    serverConfigFile: string,
  ) {
    try {
      const folders = getInstanceFolders(dataRoot, instanceId);
      const dest = path.join(folders.configs, serverConfigFile);
      if (fs.existsSync(dest)) return;

      const src = path.join(dayzServerPath, serverConfigFile);
      if (fs.existsSync(src)) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
      } else {
        // Create an empty placeholder so the path exists.
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.writeFileSync(dest, "", "utf8");
      }
    } catch {
      // best effort
    }
  }
}
