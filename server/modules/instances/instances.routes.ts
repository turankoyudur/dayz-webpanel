import { Router } from "express";
import { z } from "zod";
import { requireLocalhost } from "../../middleware/requireLocalhost";
import { InstancesService } from "./instances.service";

export const instancesRouter = Router();

function svc(req: any) {
  return new InstancesService(req.app.locals.db);
}

instancesRouter.get("/", async (req, res) => {
  const result = await svc(req).list();
  res.json(result);
});

instancesRouter.post("/", requireLocalhost, async (req, res) => {
  const bodySchema = z.object({ id: z.string().min(1), displayName: z.string().optional() });
  const body = bodySchema.parse(req.body ?? {});
  const result = await svc(req).create(body);
  res.json(result);
});

instancesRouter.patch("/:id", requireLocalhost, async (req, res) => {
  const id = String(req.params.id ?? "");
  const bodySchema = z.object({ displayName: z.string().min(1) });
  const body = bodySchema.parse(req.body ?? {});
  const result = await svc(req).updateDisplayName(id, body.displayName);
  res.json(result);
});

instancesRouter.patch("/:id/active", requireLocalhost, async (req, res) => {
  const id = String(req.params.id ?? "");
  const result = await svc(req).setActive(id);
  res.json(result);
});

instancesRouter.delete("/:id", requireLocalhost, async (req, res) => {
  const id = String(req.params.id ?? "");
  const result = await svc(req).archive(id);
  res.json(result);
});
