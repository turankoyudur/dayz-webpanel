/**
 * modules/processRoutes.ts
 *
 * Start/Stop/Restart the DayZ server process.
 */

import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../app/context.js';
import { requireAuth, requireRole, getReqUser } from '../auth/auth.js';

const StopBodySchema = z.object({
  force: z.boolean().optional().default(false)
});

export function registerProcessRoutes(api: Router, ctx: AppContext): void {
  const auth = requireAuth({ dataDir: ctx.dataDir, systemConfig: ctx.systemConfig });

  // POST /api/instances/:id/process/start
  api.post('/instances/:id/process/start', auth, requireRole('MOD'), async (req, res) => {
    const u = getReqUser(req);
    const cfg = await ctx.instances.getInstance(req.params.id);
    const state = await ctx.process.start(cfg);
    await ctx.audit.log('INSTANCE_START', u, cfg.id);
    res.json({ state });
  });

  // POST /api/instances/:id/process/stop
  api.post('/instances/:id/process/stop', auth, requireRole('MOD'), async (req, res) => {
    const u = getReqUser(req);
    const cfg = await ctx.instances.getInstance(req.params.id);
    const body = StopBodySchema.parse(req.body ?? {});
    const state = await ctx.process.stop(cfg, { force: body.force });
    await ctx.audit.log('INSTANCE_STOP', u, cfg.id, { force: body.force });
    res.json({ state });
  });

  // POST /api/instances/:id/process/restart
  api.post('/instances/:id/process/restart', auth, requireRole('MOD'), async (req, res) => {
    const u = getReqUser(req);
    const cfg = await ctx.instances.getInstance(req.params.id);
    const state = await ctx.process.restart(cfg);
    await ctx.audit.log('INSTANCE_RESTART', u, cfg.id);
    res.json({ state });
  });

  // POST /api/instances/:id/process/clear-console
  api.post('/instances/:id/process/clear-console', auth, requireRole('MOD'), async (req, res) => {
    const u = getReqUser(req);
    await ctx.process.clearConsoleLog(req.params.id);
    await ctx.audit.log('CONSOLE_CLEAR', u, req.params.id);
    res.json({ ok: true });
  });
}
