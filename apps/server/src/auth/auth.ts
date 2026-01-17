/**
 * auth/auth.ts
 *
 * JWT authentication + role-based access.
 *
 * Why:
 * - Even on a local machine, a DayZ management panel can run dangerous actions
 *   (edit files, run processes, run SteamCMD, bans/kicks via RCON).
 * - This keeps things safe and auditable.
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { verifyPassword } from './password.js';
import { loadUsers, findUserByUsername, type UserRole } from './usersStore.js';
import type { SystemConfigV1 } from '../config/systemConfig.js';

export type AuthenticatedUser = {
  id: string;
  username: string;
  role: UserRole;
};

export type AuthContext = {
  dataDir: string;
  systemConfig: SystemConfigV1;
};

const LoginBodySchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

function roleRank(role: UserRole): number {
  switch (role) {
    case 'ADMIN':
      return 3;
    case 'MOD':
      return 2;
    case 'VIEWER':
      return 1;
  }
}

export async function handleLogin(req: Request, res: Response, ctx: AuthContext): Promise<void> {
  const body = LoginBodySchema.parse(req.body);

  const usersFile = await loadUsers(ctx.dataDir);
  const user = findUserByUsername(usersFile, body.username);

  if (!user) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  if (!verifyPassword(body.password, user.password.value)) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  const token = jwt.sign(
    {
      username: user.username,
      role: user.role
    },
    ctx.systemConfig.auth.jwtSecret,
    {
      subject: user.id,
      expiresIn: `${ctx.systemConfig.auth.tokenTtlMinutes}m`
    }
  );

  res.json({ token });
}

export function requireAuth(ctx: AuthContext) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!ctx.systemConfig.auth.requireLogin) {
      (req as any).user = { id: 'u_system', username: 'system', role: 'ADMIN' } as AuthenticatedUser;
      return next();
    }

    const header = req.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
    if (!token) {
      res.status(401).json({ error: 'Missing Authorization: Bearer <token>' });
      return;
    }

    try {
      const decoded = jwt.verify(token, ctx.systemConfig.auth.jwtSecret) as any;
      const user: AuthenticatedUser = {
        id: String(decoded.sub ?? ''),
        username: String(decoded.username ?? ''),
        role: decoded.role as UserRole
      };
      if (!user.id || !user.username || !user.role) {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
      (req as any).user = user;
      return next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
  };
}

export function requireRole(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as AuthenticatedUser | undefined;
    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (roleRank(user.role) < roleRank(minRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    return next();
  };
}

export function getReqUser(req: Request): AuthenticatedUser {
  return (req as any).user as AuthenticatedUser;
}
