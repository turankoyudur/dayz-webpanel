import { Router } from "express";
import { FsService } from "./fs.service";
import { SettingsService } from "../settings/settings.service";
import { requireLocalhost } from "../../middleware/requireLocalhost";

export const fsRouter = Router();

// Sensitive: restrict to localhost.
fsRouter.use(requireLocalhost);

fsRouter.get("/roots", async (req, res) => {
  const db = req.app.locals.db;
  const settings = await new SettingsService(db, String(req.instanceId || "default")).get();
  const svc = new FsService();
  const roots = svc.getRoots(settings);
  res.json({ roots });
});

fsRouter.get("/list", async (req, res) => {
  const rootId = String(req.query.rootId ?? "");
  const relPath = String(req.query.path ?? "");

  const db = req.app.locals.db;
  const settings = await new SettingsService(db, String(req.instanceId || "default")).get();

  const svc = new FsService();
  const roots = svc.getRoots(settings);
  const result = svc.listDir(roots, rootId, relPath);
  res.json(result);
});
