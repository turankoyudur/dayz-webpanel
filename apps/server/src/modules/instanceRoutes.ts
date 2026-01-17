/**
 * modules/instanceRoutes.ts
 *
 * Instance management endpoints.
 */

import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../app/context.js';
import { requireAuth, requireRole, getReqUser } from '../auth/auth.js';
import { InstanceConfigSchemaV1 } from '../config/instanceConfig.js';

export function registerInstanceRoutes(api: Router, ctx: AppContext): void {
  const auth = requireAuth({ dataDir: ctx.dataDir, systemConfig: ctx.systemConfig });

  // GET /api/instances
  api.get('/instances', auth, async (_req, res) => {
    const instances = await ctx.instances.listInstances();
    res.json({ instances });
  });

  // GET /api/instances/:id
  api.get('/instances/:id', auth, async (req, res) => {
    const cfg = await ctx.instances.getInstance(req.params.id);
    res.json({ instance: cfg });
  });

  // PUT /api/instances/:id  (ADMIN)
  api.put('/instances/:id', auth, requireRole('ADMIN'), async (req, res) => {
    const u = getReqUser(req);
    const cfg = InstanceConfigSchemaV1.parse({ ...req.body, id: req.params.id });
    await ctx.instances.saveInstance(cfg);
    await ctx.audit.log('INSTANCE_UPDATE', u, cfg.id, { name: cfg.name });
    res.json({ ok: true, instance: cfg });
  });

  // GET /api/instances/:id/status
  api.get('/instances/:id/status', auth, async (req, res) => {
    const id = req.params.id;
    res.json({
      instanceId: id,
      process: ctx.process.getState(id),
      rcon: ctx.rcon.getState(id)
    });
  });

  // GET /api/system/health (no auth)
  api.get('/system/health', (_req, res) => {
    res.json({ ok: true });
  });
}
