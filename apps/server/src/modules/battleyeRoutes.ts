/**
 * modules/battleyeRoutes.ts
 *
 * BattlEye config editor endpoints.
 */

import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../app/context.js';
import { requireAuth, requireRole, getReqUser } from '../auth/auth.js';
import { readBattleyeConfig, writeBattleyeConfig, deleteActiveBattleyeCfg } from '../dayz/beConfig.js';

const UpdateBodySchema = z.object({
  // Key-value updates, e.g. {"RConPassword": "pass", "RConPort": "2305"}
  entries: z.record(z.string()).optional(),
  // If provided, overrides the entire file. (Advanced)
  raw: z.string().optional()
});

export function registerBattleyeRoutes(api: Router, ctx: AppContext): void {
  const auth = requireAuth({ dataDir: ctx.dataDir, systemConfig: ctx.systemConfig });

  // GET /api/instances/:id/battleye/config
  api.get('/instances/:id/battleye/config', auth, requireRole('VIEWER'), async (req, res) => {
    const cfg = await ctx.instances.getInstance(req.params.id);
    const be = await readBattleyeConfig(cfg.paths.battleye);
    res.json(be);
  });

  // PUT /api/instances/:id/battleye/config
  api.put('/instances/:id/battleye/config', auth, requireRole('MOD'), async (req, res) => {
    const u = getReqUser(req);
    const body = UpdateBodySchema.parse(req.body ?? {});
    const cfg = await ctx.instances.getInstance(req.params.id);
    const be = await readBattleyeConfig(cfg.paths.battleye);

    if (body.raw !== undefined) {
      // Raw write (advanced)
      await writeBattleyeConfig(be.filePath, parseRawToMap(body.raw));
    } else {
      const updated = { ...be.entries, ...(body.entries ?? {}) };
      await writeBattleyeConfig(be.filePath, updated);
    }

    await ctx.audit.log('BATTLEYE_CFG_WRITE', u, cfg.id, { filePath: be.filePath });
    const refreshed = await readBattleyeConfig(cfg.paths.battleye);
    res.json(refreshed);
  });

  // POST /api/instances/:id/battleye/delete-active
  api.post('/instances/:id/battleye/delete-active', auth, requireRole('MOD'), async (req, res) => {
    const u = getReqUser(req);
    const cfg = await ctx.instances.getInstance(req.params.id);
    const result = await deleteActiveBattleyeCfg(cfg.paths.battleye);
    await ctx.audit.log('BATTLEYE_CFG_DELETE_ACTIVE', u, cfg.id, { deleted: result.deleted });
    res.json(result);
  });
}

/**
 * Converts raw config text to a key-value map.
 *
 * This is used only when you supply a raw string; it is NOT a perfect parser
 * for every possible custom line, but it covers the standard format.
 */
function parseRawToMap(raw: string): Record<string, string> {
  const map: Record<string, string> = {};
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (t.startsWith('//') || t.startsWith('#') || t.startsWith(';')) continue;
    const m = t.match(/^([A-Za-z0-9_]+)\s+(.*)$/);
    if (!m) continue;
    map[m[1]] = m[2].trim();
  }
  return map;
}
