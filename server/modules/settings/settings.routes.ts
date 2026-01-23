import { Router } from "express";
import { z } from "zod";
import { AppError, ErrorCodes } from "../../core/errors";
import { SettingsService, instanceSettingsSchema, createDefaultInstanceSettings } from "./settings.service";

/**
 * /api/settings
 */
export const settingsRouter = Router();

function instanceSvc(req: any) {
  const db = req.app.locals.db;
  const instanceId = String(req.instanceId || "default");
  return new SettingsService(db, instanceId);
}

settingsRouter.get("/", async (req, res) => {
  const settings = await instanceSvc(req).get();
  res.json(settings);
});

settingsRouter.put("/", async (req, res) => {
  // Validate partial patch. Zod's .partial() ensures only known keys are accepted.
  const patchSchema = instanceSettingsSchema.partial();
  const patch = patchSchema.safeParse(req.body);
  if (!patch.success) {
    throw new AppError({
      code: ErrorCodes.VALIDATION,
      status: 400,
      message: "Invalid settings payload",
      context: { issues: patch.error.issues },
    });
  }

  const updated = await instanceSvc(req).update(patch.data);
  res.json(updated);
});

settingsRouter.get("/health", async (req, res) => {
  const results = await instanceSvc(req).validatePaths();
  const checks = [
    { key: "dataRoot", label: "Data Root", exists: !!results.dataRoot },
    { key: "steamcmdPath", label: "SteamCMD", exists: !!results.steamcmdPath },
    { key: "dayzServerPath", label: "DayZ Server Folder", exists: !!results.dayzServerPath },
    { key: "dayzExecutable", label: "DayZ Executable", exists: !!results.dayzExecutable },
    { key: "profilesPath", label: "Profiles Folder", exists: !!results.profilesPath },
    {
      key: "apiBridgePath",
      label: "ApiBridge Folder (optional)",
      exists: !!results.apiBridgePath,
    },
  ];
  res.json({ checks, results });
});

settingsRouter.get("/validate", async (req, res) => {
  const results = await instanceSvc(req).validatePaths();
  res.json(results);
});

settingsRouter.post("/reset", async (req, res) => {
  const instanceId = String(req.instanceId || "default");
  const defaults = createDefaultInstanceSettings({ instanceId });
  const updated = await instanceSvc(req).update(defaults);
  res.json(updated);
});

// Simple helper endpoint to test request validation patterns used across the project
settingsRouter.post("/validate-example", (req, res) => {
  const schema = z.object({ foo: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError({
      code: ErrorCodes.VALIDATION,
      status: 400,
      message: "foo is required",
    });
  }
  res.json({ ok: true, foo: parsed.data.foo });
});
