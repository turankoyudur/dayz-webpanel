/**
 * modules/steamRoutes.ts
 *
 * SteamCMD endpoints (update server, download workshop mod).
 */

import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../app/context.js';
import { requireAuth, requireRole, getReqUser } from '../auth/auth.js';

const WorkshopBodySchema = z.object({
  workshopId: z.number().int().positive(),
  // Optional login object. If omitted, we use anonymous login.
  login: z
    .object({
      username: z.string().min(1),
      password: z.string().min(1)
    })
    .optional()
});

export function registerSteamRoutes(api: Router, ctx: AppContext): void {
  const auth = requireAuth({ dataDir: ctx.dataDir, systemConfig: ctx.systemConfig });

  // POST /api/instances/:id/steamcmd/update
  api.post('/instances/:id/steamcmd/update', auth, requireRole('MOD'), async (req, res) => {
    const u = getReqUser(req);
    const cfg = await ctx.instances.getInstance(req.params.id);
    const result = await ctx.steamcmd.updateServer(cfg);
    await ctx.audit.log('STEAMCMD_UPDATE', u, cfg.id, { code: result.code, signal: result.signal });
    res.json({ result });
  });

  // POST /api/instances/:id/steamcmd/workshop/download
  api.post('/instances/:id/steamcmd/workshop/download', auth, requireRole('MOD'), async (req, res) => {
    const u = getReqUser(req);
    const cfg = await ctx.instances.getInstance(req.params.id);
    const body = WorkshopBodySchema.parse(req.body);
    const result = await ctx.steamcmd.downloadWorkshopItem(cfg, body.workshopId, body.login);
    await ctx.audit.log('STEAMCMD_WORKSHOP_DOWNLOAD', u, cfg.id, { workshopId: body.workshopId, code: result.code });
    res.json({ result });
  });
}
