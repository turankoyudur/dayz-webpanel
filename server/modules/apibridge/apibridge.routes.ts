import { Router } from "express";
import { z } from "zod";
import type { DbClient } from "../../db/prisma";
import { SettingsService } from "../settings/settings.service";
import { ApiBridgeService } from "./apibridge.service";

export const apibridgeRouter = Router();
const svc = new ApiBridgeService();

function getDb(req: any): DbClient {
  return req.app.locals.db as DbClient;
}

apibridgeRouter.get("/status", async (req, res) => {
  const db = getDb(req);
  const settings = await new SettingsService(db, String(req.instanceId || "default")).get();

  // Write node heartbeat on each status request (simple + reliable)
  svc.writeNodeHeartbeat(settings);

  return res.json(svc.status(settings));
});

apibridgeRouter.get("/state", async (req, res) => {
  const db = getDb(req);
  const settings = await new SettingsService(db, String(req.instanceId || "default")).get();
  return res.json({ state: svc.readState(settings) });
});

apibridgeRouter.get("/players", async (req, res) => {
  const db = getDb(req);
  const settings = await new SettingsService(db, String(req.instanceId || "default")).get();
  const state = svc.readState(settings);
  const players = state?.players ?? [];
  return res.json({ players });
});

apibridgeRouter.get("/config", async (req, res) => {
  const db = getDb(req);
  const settings = await new SettingsService(db, String(req.instanceId || "default")).get();
  return res.json({ config: svc.readConfig(settings) });
});

apibridgeRouter.put("/config", async (req, res) => {
  const db = getDb(req);
  const settings = await new SettingsService(db, String(req.instanceId || "default")).get();

  const bodySchema = z.object({
    ApiKey: z.string().optional(),
    SnapshotIntervalSec: z.coerce.number().int().positive().optional(),
    CommandCleanupSec: z.coerce.number().int().positive().optional(),
  });

  const patch = bodySchema.parse(req.body ?? {});
  const config = svc.writeConfig(settings, patch);
  return res.json({ ok: true, config });
});

apibridgeRouter.post("/commands", async (req, res) => {
  const db = getDb(req);
  const settings = await new SettingsService(db, String(req.instanceId || "default")).get();

  // We keep this very permissive so your mod API can evolve without UI changes.
  const bodySchema = z.record(z.any());
  const cmd = bodySchema.parse(req.body ?? {});

  const result = await svc.sendCommand(settings, cmd as any);
  return res.json({ ok: true, result });
});
