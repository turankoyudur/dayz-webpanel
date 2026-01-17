/**
 * modules/schedulerRoutes.ts
 *
 * CRUD for scheduler tasks.
 */

import { Router } from 'express';
import type { AppContext } from '../app/context.js';
import { requireAuth, requireRole, getReqUser } from '../auth/auth.js';

export function registerSchedulerRoutes(api: Router, ctx: AppContext): void {
  const auth = requireAuth({ dataDir: ctx.dataDir, systemConfig: ctx.systemConfig });

  // GET /api/instances/:id/scheduler/tasks
  api.get('/instances/:id/scheduler/tasks', auth, requireRole('VIEWER'), async (req, res) => {
    const tasks = await ctx.scheduler.loadTasks(req.params.id);
    res.json(tasks);
  });

  // PUT /api/instances/:id/scheduler/tasks
  // Body must match the scheduler schema. Validation happens inside scheduler.saveTasks().
  api.put('/instances/:id/scheduler/tasks', auth, requireRole('ADMIN'), async (req, res) => {
    const u = getReqUser(req);
    await ctx.scheduler.saveTasks(req.params.id, req.body);
    await ctx.audit.log('SCHEDULER_UPDATE', u, req.params.id);
    res.json({ ok: true });
  });
}
