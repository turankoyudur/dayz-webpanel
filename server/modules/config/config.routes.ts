import { Router } from "express";
import { z } from "zod";
import { ConfigService } from "./config.service";

export const configRouter = Router();
function svc(req: any) {
  return new ConfigService(String(req.instanceId || "default"));
}

/**
 * List editable files (for UI tabs).
 */
configRouter.get("/files", async (req, res) => {
  const files = await svc(req).listEditableFiles();
  res.json({ files });
});

/**
 * Read server config raw text.
 */
configRouter.get("/servercfg", async (req, res) => {
  const raw = await svc(req).readServerCfgRaw();
  res.json({ raw });
});

/**
 * Write server config raw text.
 */
configRouter.put("/servercfg", async (req, res) => {
  const bodySchema = z.object({ raw: z.string() });
  const body = bodySchema.parse(req.body ?? {});
  const result = await svc(req).writeServerCfgRaw(body.raw);
  res.json(result);
});
