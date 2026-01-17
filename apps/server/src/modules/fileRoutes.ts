/**
 * modules/fileRoutes.ts
 *
 * File manager API.
 */

import { Router } from 'express';
import { z } from 'zod';
import type { AppContext } from '../app/context.js';
import { requireAuth, requireRole, getReqUser } from '../auth/auth.js';
import { FileService, type AllowedRootKey } from '../files/fileService.js';

const RootKeySchema = z.enum(['root', 'profiles', 'battleye']);

const ListQuerySchema = z.object({
  rootKey: RootKeySchema,
  path: z.string().optional().default('')
});

const ReadQuerySchema = z.object({
  rootKey: RootKeySchema,
  path: z.string().min(1)
});

const WriteBodySchema = z.object({
  rootKey: RootKeySchema,
  path: z.string().min(1),
  content: z.string().default('')
});

const MkdirBodySchema = z.object({
  rootKey: RootKeySchema,
  path: z.string().min(1)
});

const DeleteBodySchema = z.object({
  rootKey: RootKeySchema,
  path: z.string().min(1)
});

const RenameBodySchema = z.object({
  rootKey: RootKeySchema,
  path: z.string().min(1),
  newPath: z.string().min(1)
});

export function registerFileRoutes(api: Router, ctx: AppContext): void {
  const auth = requireAuth({ dataDir: ctx.dataDir, systemConfig: ctx.systemConfig });
  const fsSvc = new FileService();

  // GET /api/instances/:id/files/list?rootKey=root&path=
  api.get('/instances/:id/files/list', auth, requireRole('VIEWER'), async (req, res) => {
    const q = ListQuerySchema.parse(req.query);
    const cfg = await ctx.instances.getInstance(req.params.id);
    const result = await fsSvc.list(cfg, q.rootKey as AllowedRootKey, q.path);
    res.json(result);
  });

  // GET /api/instances/:id/files/read?rootKey=root&path=serverDZ.cfg
  api.get('/instances/:id/files/read', auth, requireRole('VIEWER'), async (req, res) => {
    const q = ReadQuerySchema.parse(req.query);
    const cfg = await ctx.instances.getInstance(req.params.id);
    const result = await fsSvc.readText(cfg, q.rootKey as AllowedRootKey, q.path);
    res.json(result);
  });

  // PUT /api/instances/:id/files/write
  api.put('/instances/:id/files/write', auth, requireRole('MOD'), async (req, res) => {
    const u = getReqUser(req);
    const body = WriteBodySchema.parse(req.body);
    const cfg = await ctx.instances.getInstance(req.params.id);
    const result = await fsSvc.writeText(cfg, body.rootKey as AllowedRootKey, body.path, body.content);
    await ctx.audit.log('FILE_WRITE', u, cfg.id, { rootKey: body.rootKey, path: body.path });
    res.json(result);
  });

  // POST /api/instances/:id/files/mkdir
  api.post('/instances/:id/files/mkdir', auth, requireRole('MOD'), async (req, res) => {
    const u = getReqUser(req);
    const body = MkdirBodySchema.parse(req.body);
    const cfg = await ctx.instances.getInstance(req.params.id);
    const result = await fsSvc.mkdir(cfg, body.rootKey as AllowedRootKey, body.path);
    await ctx.audit.log('FILE_MKDIR', u, cfg.id, { rootKey: body.rootKey, path: body.path });
    res.json(result);
  });

  // POST /api/instances/:id/files/delete
  api.post('/instances/:id/files/delete', auth, requireRole('MOD'), async (req, res) => {
    const u = getReqUser(req);
    const body = DeleteBodySchema.parse(req.body);
    const cfg = await ctx.instances.getInstance(req.params.id);
    const result = await fsSvc.delete(cfg, body.rootKey as AllowedRootKey, body.path);
    await ctx.audit.log('FILE_DELETE', u, cfg.id, { rootKey: body.rootKey, path: body.path });
    res.json(result);
  });

  // POST /api/instances/:id/files/rename
  api.post('/instances/:id/files/rename', auth, requireRole('MOD'), async (req, res) => {
    const u = getReqUser(req);
    const body = RenameBodySchema.parse(req.body);
    const cfg = await ctx.instances.getInstance(req.params.id);
    const result = await fsSvc.rename(cfg, body.rootKey as AllowedRootKey, body.path, body.newPath);
    await ctx.audit.log('FILE_RENAME', u, cfg.id, { rootKey: body.rootKey, path: body.path, newPath: body.newPath });
    res.json(result);
  });
}
