import { Router } from "express";
import { ServerControlService } from "./serverControl.service";
import { requireLocalhost } from "../../middleware/requireLocalhost";
import type { DbClient } from "../../db/prisma";

export const serverControlRouter = Router();
function svc(req: any) {
  const db = (req.app.locals.db ?? req.app.get("db")) as DbClient;
  return new ServerControlService(db, String(req.instanceId || "default"));
}

serverControlRouter.get("/status", async (_req, res) => {
  res.json(await svc(_req).status());
});

serverControlRouter.post("/start", async (_req, res) => {
  res.json(await svc(_req).start());
});

serverControlRouter.post("/stop", async (_req, res) => {
  res.json(await svc(_req).stop());
});

serverControlRouter.post("/restart", async (_req, res) => {
  res.json(await svc(_req).restart());
});


serverControlRouter.get("/presets", async (_req, res) => {
  res.json(await svc(_req).presets());
});

serverControlRouter.post("/presets/apply", async (req, res) => {
  res.json(await svc(req).applyPreset(req.body));
});


/**
 * External supervisor coordination endpoints (localhost-only).
 *
 * These are intentionally not "integrations". They just allow an external agent (e.g., ApiBridge wrapper)
 * to coordinate restarts without being counted as crashes.
 */
serverControlRouter.post("/expect-exit", requireLocalhost, async (req, res) => {
  res.json(await svc(req).expectExit(req.body));
});

serverControlRouter.post("/register-pid", requireLocalhost, async (req, res) => {
  res.json(await svc(req).registerPid(req.body));
});
