/**
 * modules/authRoutes.ts
 *
 * Express routes for authentication.
 */

import { Router } from 'express';
import type { AppContext } from '../app/context.js';
import { handleLogin, requireAuth, getReqUser } from '../auth/auth.js';

export function registerAuthRoutes(api: Router, ctx: AppContext): void {
  // POST /api/auth/login
  // Body: { username, password }
  api.post('/auth/login', async (req, res) => {
    await handleLogin(req, res, { dataDir: ctx.dataDir, systemConfig: ctx.systemConfig });
  });

  // GET /api/auth/me
  api.get('/auth/me', requireAuth({ dataDir: ctx.dataDir, systemConfig: ctx.systemConfig }), (req, res) => {
    const u = getReqUser(req);
    res.json({ user: u });
  });
}
