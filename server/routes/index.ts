import { Router } from "express";
import { settingsRouter } from "../modules/settings/settings.routes";
import { configRouter } from "../modules/config/config.routes";
import { modsRouter } from "../modules/mods/mods.routes";
import { serverControlRouter } from "../modules/server-control/serverControl.routes";
import { apibridgeRouter } from "../modules/apibridge/apibridge.routes";
import { logsRouter } from "../modules/logs/logs.routes";
import { setupRouter } from "../modules/setup/setup.routes";
import { fsRouter } from "../modules/fs/fs.routes";
import { instancesRouter } from "../modules/instances/instances.routes";
import { instanceContext } from "../middleware/instanceContext";

/**
 * Root API router.
 *
 * Each feature module registers its own router, similar to how tools like
 * MCSManager organize functionality into isolated parts.
 */
export function createApiRouter() {
  const router = Router();

  router.get("/ping", (_req, res) => res.json({ message: "pong" }));

  // Instance management routes do NOT require an active instance context.
  router.use("/instances", instancesRouter);

  // All remaining feature routes are instance-scoped.
  router.use(instanceContext());

  router.use("/settings", settingsRouter);
  router.use("/setup", setupRouter);
  router.use("/fs", fsRouter);
  router.use("/config", configRouter);
  router.use("/mods", modsRouter);
  router.use("/server", serverControlRouter);
  router.use("/apibridge", apibridgeRouter);
  router.use("/logs", logsRouter);

  return router;
}
