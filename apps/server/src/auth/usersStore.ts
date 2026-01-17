/**
 * auth/usersStore.ts
 *
 * Local JSON user database:
 *   data/SystemConfig/users.json
 *
 * Why:
 * - You requested a file-based DB (like MCSManager), not Prisma/SQLite.
 * - We still want roles (ADMIN/MOD/VIEWER) and a login.
 */

import path from 'node:path';
import { z } from 'zod';
import { fileExists, readJson, writeJsonAtomic } from '../storage/jsonStore.js';

export const UserRoleSchema = z.enum(['ADMIN', 'MOD', 'VIEWER']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string(),
  username: z.string().min(1),
  displayName: z.string().min(1),
  role: UserRoleSchema,
  password: z.object({
    algo: z.literal('scrypt'),
    value: z.string().min(10)
  }),
  createdAt: z.string()
});

export type User = z.infer<typeof UserSchema>;

export const UsersFileSchema = z.object({
  version: z.literal(1),
  users: z.array(UserSchema)
});

export type UsersFile = z.infer<typeof UsersFileSchema>;

export function usersFilePath(dataDir: string): string {
  return path.join(dataDir, 'SystemConfig', 'users.json');
}

export async function loadUsers(dataDir: string): Promise<UsersFile> {
  const p = usersFilePath(dataDir);
  if (!(await fileExists(p))) {
    throw new Error(
      `Users file not found: ${p}.\nRun install.bat (or: npm run setup) to generate it.`
    );
  }

  const raw = await readJson<unknown>(p);
  return UsersFileSchema.parse(raw);
}

export async function saveUsers(dataDir: string, usersFile: UsersFile): Promise<void> {
  UsersFileSchema.parse(usersFile);
  await writeJsonAtomic(usersFilePath(dataDir), usersFile);
}

export function findUserByUsername(usersFile: UsersFile, username: string): User | undefined {
  const uLower = username.toLowerCase();
  return usersFile.users.find((u) => u.username.toLowerCase() === uLower);
}
