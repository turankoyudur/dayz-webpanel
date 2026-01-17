/**
 * config/systemConfig.ts
 *
 * Loads and validates the system config file:
 *   data/SystemConfig/config.json
 *
 * Notes:
 * - This is the global configuration (HTTP port, JWT secret, allowed origins, etc.)
 * - It is created by scripts/setup.mjs on first install.
 */

import path from 'node:path';
import { z } from 'zod';
import { fileExists, readJson, writeJsonAtomic } from '../storage/jsonStore.js';

export const SystemConfigSchema = z.object({
  version: z.literal(1),
  http: z.object({
    host: z.string().default('127.0.0.1'),
    port: z.number().int().min(1).max(65535).default(8081)
  }),
  auth: z.object({
    requireLogin: z.boolean().default(true),
    jwtSecret: z.string().min(16),
    tokenTtlMinutes: z.number().int().min(1).default(1440)
  }),
  security: z.object({
    trustProxy: z.boolean().default(false),
    allowedOrigins: z.array(z.string()).default([])
  }),
  paths: z.object({
    dataDir: z.string().default('./data')
  }),
  webhooks: z.object({
    discordWebhookUrl: z.string().optional().default('')
  })
});

export type SystemConfigV1 = z.infer<typeof SystemConfigSchema>;

export function systemConfigPath(dataDir: string): string {
  return path.join(dataDir, 'SystemConfig', 'config.json');
}

export async function loadSystemConfig(dataDir: string): Promise<SystemConfigV1> {
  const cfgPath = systemConfigPath(dataDir);
  if (!(await fileExists(cfgPath))) {
    throw new Error(
      `System config not found: ${cfgPath}.\nRun install.bat (or: npm run setup) to generate it.`
    );
  }

  const raw = await readJson<unknown>(cfgPath);
  const parsed = SystemConfigSchema.parse(raw);
  return parsed;
}

export async function saveSystemConfig(dataDir: string, cfg: SystemConfigV1): Promise<void> {
  const cfgPath = systemConfigPath(dataDir);
  SystemConfigSchema.parse(cfg);
  await writeJsonAtomic(cfgPath, cfg);
}
