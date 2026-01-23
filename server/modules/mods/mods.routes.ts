import { Router } from "express";
import { z } from "zod";
import { AppError, ErrorCodes } from "../../core/errors";
import { ModsService } from "./mods.service";
import type { DbClient } from "../../db/prisma";

export const modsRouter = Router();
function svc(req: any) {
  const db = (req.app.locals.db ?? req.app.get("db")) as DbClient;
  return new ModsService(db, String(req.instanceId || "default"));
}

modsRouter.get("/", async (req, res) => {
  res.json(await svc(req).list());
});

modsRouter.post("/add", async (req, res) => {
  const schema = z.object({ workshopId: z.string().regex(/^\d+$/, "workshopId must be numeric") });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError({
      code: ErrorCodes.VALIDATION,
      status: 400,
      message: "Invalid mod payload",
      context: { issues: parsed.error.issues },
    });
  }
  res.json(await svc(req).add(parsed.data.workshopId));
});

modsRouter.post("/install", async (req, res) => {
  const schema = z.object({ workshopId: z.string().regex(/^\d+$/) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError({ code: ErrorCodes.VALIDATION, status: 400, message: "Invalid payload" });
  }
  res.json(await svc(req).install(parsed.data.workshopId));
});

modsRouter.patch("/enable", async (req, res) => {
  const schema = z.object({ workshopId: z.string().regex(/^\d+$/), enabled: z.boolean() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError({ code: ErrorCodes.VALIDATION, status: 400, message: "Invalid payload" });
  }
  res.json(await svc(req).setEnabled(parsed.data.workshopId, parsed.data.enabled));
});

modsRouter.get("/scan", async (req, res) => {
  res.json(await svc(req).scanInstalledOnDisk());
});

modsRouter.get("/search", async (req, res) => {
  const schema = z.object({ query: z.string().min(2) });
  const parsed = schema.safeParse(req.query);
  if (!parsed.success) {
    throw new AppError({
      code: ErrorCodes.VALIDATION,
      status: 400,
      message: "Invalid search query",
      context: { issues: parsed.error.issues },
    });
  }
  res.json(await svc(req).search(parsed.data.query));
});

modsRouter.post("/collection", async (req, res) => {
  const schema = z.object({ collectionId: z.string().regex(/^\d+$/) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError({ code: ErrorCodes.VALIDATION, status: 400, message: "Invalid payload" });
  }
  res.json(await svc(req).importCollection(parsed.data.collectionId));
});

modsRouter.post("/refresh", async (req, res) => {
  res.json(await svc(req).refreshMetadata());
});

modsRouter.post("/keys/sync", async (req, res) => {
  res.json(await svc(req).syncKeys());
});
