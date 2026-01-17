/**
 * config/instanceConfig.ts
 *
 * DayZ instance config schema.
 *
 * File location (MCSManager style):
 *   data/InstanceConfig/<instanceId>.json
 */

import { z } from 'zod';

export const ModSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  // A directory name relative to the server working dir, e.g. "@CF" or "@123456789"
  modDir: z.string().min(1),
  // If it comes from Steam Workshop, store the Workshop file id.
  workshopId: z.number().int().nonnegative().optional()
});

export const InstanceConfigSchemaV1 = z.object({
  version: z.literal(1),
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.literal('dayz'),
  enabled: z.boolean().default(true),

  paths: z.object({
    root: z.string().min(1),
    profiles: z.string().min(1),
    battleye: z.string().min(1),
    serverDzCfg: z.string().min(1)
  }),

  network: z.object({
    host: z.string().default('127.0.0.1'),
    gamePort: z.number().int().min(1).max(65535),
    rconPort: z.number().int().min(1).max(65535)
  }),

  process: z.object({
    exe: z.string().min(1),
    workingDir: z.string().min(1),
    args: z.array(z.string()).default([]),
    gracefulStopCommand: z.string().default('#shutdown'),
    mods: z.array(ModSchema).default([])
  }),

  steamcmd: z.object({
    enabled: z.boolean().default(true),
    exe: z.string().min(1),
    appId: z.number().int().positive().default(223350),
    workshopAppId: z.number().int().positive().default(221100)
  }),

  watchdog: z.object({
    enabled: z.boolean().default(true),
    restartOnCrash: z.boolean().default(true),
    restartDelaySeconds: z.number().int().min(0).default(10)
  })
});

export type InstanceConfigV1 = z.infer<typeof InstanceConfigSchemaV1>;
