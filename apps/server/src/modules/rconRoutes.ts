/**
 * modules/rconRoutes.ts
 *
 * RCON endpoints.
 *
 * We include a few helper endpoints so the UI can:
 * - Connect/disconnect
 * - Send commands and display responses
 * - Use a ready-made list of common BattlEye commands
 */

import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../app/context.js';
import { requireAuth, requireRole, getReqUser } from '../auth/auth.js';
import { appendRconLog } from '../rcon/rconLog.js';

const CommandBodySchema = z.object({
  command: z.string().min(1)
});

export function registerRconRoutes(api: Router, ctx: AppContext): void {
  const auth = requireAuth({ dataDir: ctx.dataDir, systemConfig: ctx.systemConfig });

  // GET /api/instances/:id/rcon/state
  api.get('/instances/:id/rcon/state', auth, async (req, res) => {
    res.json({ state: ctx.rcon.getState(req.params.id) });
  });

  // POST /api/instances/:id/rcon/connect
  api.post('/instances/:id/rcon/connect', auth, requireRole('MOD'), async (req, res) => {
    const u = getReqUser(req);
    const cfg = await ctx.instances.getInstance(req.params.id);
    const state = await ctx.rcon.connect(cfg);
    await ctx.audit.log('RCON_CONNECT', u, cfg.id, { ok: state.connected });
    res.json({ state });
  });

  // POST /api/instances/:id/rcon/disconnect
  api.post('/instances/:id/rcon/disconnect', auth, requireRole('MOD'), async (req, res) => {
    const u = getReqUser(req);
    await ctx.rcon.disconnect(req.params.id);
    await ctx.audit.log('RCON_DISCONNECT', u, req.params.id);
    res.json({ ok: true });
  });

  // POST /api/instances/:id/rcon/command
  api.post('/instances/:id/rcon/command', auth, requireRole('MOD'), async (req, res) => {
    const u = getReqUser(req);
    const instanceId = req.params.id;
    const body = CommandBodySchema.parse(req.body);
    const cmd = body.command.trim();

    // Convenience: auto-connect if not connected
    if (!ctx.rcon.isConnected(instanceId)) {
      const cfg = await ctx.instances.getInstance(instanceId);
      await ctx.rcon.connect(cfg);
    }

    const started = new Date().toISOString();
    await appendRconLog(ctx.dataDir, instanceId, `[${started}] >> ${cmd}`);

    const response = await ctx.rcon.sendCommand(instanceId, cmd);

    const ended = new Date().toISOString();
    await appendRconLog(ctx.dataDir, instanceId, `[${ended}] << ${response}`);

    await ctx.audit.log('RCON_COMMAND', u, instanceId, { command: cmd });
    res.json({ response });
  });

  // GET /api/instances/:id/rcon/common-commands
  api.get('/instances/:id/rcon/common-commands', auth, async (_req, res) => {
    // Based on the official BattlEye server-side commands list.
    const commands = [
      { cmd: 'commands', desc: 'Show all available commands' },
      { cmd: 'version', desc: 'Show the current BE Server version' },
      { cmd: 'players', desc: 'Show information about all players on the server, including GUID and ping' },
      { cmd: 'admins', desc: 'List connected RCon clients/admins' },
      { cmd: 'say -1 Hello', desc: 'Send a message to all players (player # = -1)' },
      { cmd: 'kick 5 reason', desc: 'Kick player #5 with optional reason' },
      { cmd: 'ban 5 60 reason', desc: 'Ban player #5 for 60 minutes (0 or omitted = permanent)' },
      { cmd: 'bans', desc: 'Show the ban list' },
      { cmd: 'addBan <GUID> 0 reason', desc: 'Ban a GUID/IP that is not currently on the server' },
      { cmd: 'removeBan 3', desc: 'Remove ban #3 (from "bans" output)' },
      { cmd: 'loadBans', desc: 'Reload bans.txt' },
      { cmd: 'writeBans', desc: 'Rewrite bans.txt (removes expired bans)' }
    ];
    res.json({ commands });
  });
}
