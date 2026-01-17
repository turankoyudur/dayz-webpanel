/**
 * modules/logsRoutes.ts
 *
 * Log listing + tail.
 */

import { Router } from 'express';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { AppContext } from '../app/context.js';
import { requireAuth, requireRole } from '../auth/auth.js';
import { tailTextFile } from '../utils/tailFile.js';
import { FileService, type AllowedRootKey } from '../files/fileService.js';
import { resolveWithinRoot } from '../utils/pathUtils.js';

const RootKeySchema = z.enum(['root', 'profiles', 'battleye']);

const TailQuerySchema = z.object({
  rootKey: RootKeySchema,
  path: z.string().min(1),
  lines: z.coerce.number().int().positive().max(2000).optional().default(200),
  maxBytes: z.coerce.number().int().positive().max(5_000_000).optional().default(512_000)
});

export function registerLogsRoutes(api: Router, ctx: AppContext): void {
  const auth = requireAuth({ dataDir: ctx.dataDir, systemConfig: ctx.systemConfig });
  const fsSvc = new FileService();

  // GET /api/instances/:id/logs/list
  api.get('/instances/:id/logs/list', auth, requireRole('VIEWER'), async (req, res) => {
    const cfg = await ctx.instances.getInstance(req.params.id);

    // Panel-managed logs (always stored under data/InstanceData/<id>/logs)
    const instanceLogsDir = path.join(ctx.dataDir, 'InstanceData', cfg.id, 'logs');

    const panelCandidates: Array<{ label: string; filename: string }> = [
      { label: 'console.log (panel capture)', filename: 'console.log' },
      { label: 'rcon.log', filename: 'rcon.log' },
      { label: 'steamcmd.log', filename: 'steamcmd.log' },
      { label: 'audit.ndjson', filename: 'audit.ndjson' }
    ];

    const panelLogs: Array<{ label: string; rootKey: AllowedRootKey; path: string }> = [];
    for (const c of panelCandidates) {
      const abs = path.join(instanceLogsDir, c.filename);
      try {
        await fs.stat(abs);
        panelLogs.push({ label: c.label, rootKey: 'root', path: `__panel__/${c.filename}` });
      } catch {
        // ignore missing
      }
    }

    // Also list profile logs (DayZ writes many logs there)
    const profileLogs: Array<{ label: string; rootKey: AllowedRootKey; path: string; mtimeMs: number }> = [];
    try {
      const items = await fs.readdir(cfg.paths.profiles, { withFileTypes: true });
      for (const it of items) {
        if (!it.isFile()) continue;
        const name = it.name;
        if (!/\.(rpt|adm|log|txt)$/i.test(name)) continue;
        const abs = path.join(cfg.paths.profiles, name);
        const st = await fs.stat(abs);
        profileLogs.push({ label: name, rootKey: 'profiles', path: name, mtimeMs: st.mtimeMs });
      }
    } catch {
      // ignore
    }

    profileLogs.sort((a, b) => b.mtimeMs - a.mtimeMs);

    res.json({
      instanceId: cfg.id,
      panelLogs,
      profileLogs: profileLogs.slice(0, 50)
    });
  });

  // GET /api/instances/:id/logs/tail?rootKey=profiles&path=script.log&lines=200
  api.get('/instances/:id/logs/tail', auth, requireRole('VIEWER'), async (req, res) => {
    const q = TailQuerySchema.parse(req.query);
    const cfg = await ctx.instances.getInstance(req.params.id);

    const instanceLogsDir = path.join(ctx.dataDir, 'InstanceData', cfg.id, 'logs');

    let absPath: string;

    if (q.path.startsWith('__panel__/')) {
      const rel = q.path.replace(/^__panel__\//, '');
      absPath = resolveWithinRoot(instanceLogsDir, rel);
    } else {
      const roots = fsSvc.roots(cfg);
      const rootAbs = roots[q.rootKey as AllowedRootKey];
      absPath = resolveWithinRoot(rootAbs, q.path);
    }

    const tail = await tailTextFile(absPath, { lines: q.lines, maxBytes: q.maxBytes });
    res.json({ absPath, ...tail });
  });
}
