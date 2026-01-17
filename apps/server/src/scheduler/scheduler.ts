/**
 * scheduler/scheduler.ts
 *
 * Minimal scheduler (cron-like) inspired by CF Tools Cloud Scheduler.
 *
 * Storage:
 *   data/InstanceData/<id>/tasks.json
 */

import path from 'node:path';
import cron from 'node-cron';
import { z } from 'zod';
import { ensureDir, fileExists, readJson, writeJsonAtomic } from '../storage/jsonStore.js';
import type { InstanceManager } from '../instances/instanceManager.js';
import type { RconManager } from '../rcon/rconManager.js';
import type { DayzProcessManager } from '../dayz/processManager.js';
import type { SteamCmdService } from '../steam/steamcmdService.js';

const TaskActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('RCON_COMMAND'), command: z.string().min(1) }),
  z.object({ type: z.literal('SERVER_RESTART') }),
  z.object({ type: z.literal('SERVER_UPDATE') })
]);

export type TaskAction = z.infer<typeof TaskActionSchema>;

const TaskSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  cron: z.string().min(5),
  action: TaskActionSchema
});

export type ScheduledTask = z.infer<typeof TaskSchema>;

const TasksFileSchema = z.object({
  version: z.literal(1),
  tasks: z.array(TaskSchema)
});

export type TasksFile = z.infer<typeof TasksFileSchema>;

export class SchedulerService {
  private jobs = new Map<string, cron.ScheduledTask[]>();

  constructor(
    private dataDir: string,
    private instances: InstanceManager,
    private rcon: RconManager,
    private process: DayzProcessManager,
    private steamcmd: SteamCmdService
  ) {}

  private tasksPath(instanceId: string): string {
    return path.join(this.dataDir, 'InstanceData', instanceId, 'tasks.json');
  }

  async loadTasks(instanceId: string): Promise<TasksFile> {
    const p = this.tasksPath(instanceId);
    if (!(await fileExists(p))) {
      const empty: TasksFile = { version: 1, tasks: [] };
      await ensureDir(path.dirname(p));
      await writeJsonAtomic(p, empty);
      return empty;
    }
    const raw = await readJson<unknown>(p);
    return TasksFileSchema.parse(raw);
  }

  async saveTasks(instanceId: string, file: TasksFile): Promise<void> {
    TasksFileSchema.parse(file);
    await writeJsonAtomic(this.tasksPath(instanceId), file);
    await this.reloadInstance(instanceId);
  }

  /**
   * Reload schedules for all instances.
   */
  async reloadAll(): Promise<void> {
    const instances = await this.instances.listInstances();
    for (const i of instances) {
      await this.reloadInstance(i.id);
    }
  }

  /**
   * Reload schedules for one instance.
   */
  async reloadInstance(instanceId: string): Promise<void> {
    // Stop old jobs
    const old = this.jobs.get(instanceId) ?? [];
    for (const j of old) j.stop();
    this.jobs.delete(instanceId);

    const tasksFile = await this.loadTasks(instanceId);
    const jobs: cron.ScheduledTask[] = [];

    for (const task of tasksFile.tasks) {
      if (!task.enabled) continue;
      if (!cron.validate(task.cron)) continue;

      const job = cron.schedule(task.cron, async () => {
        await this.execute(instanceId, task.action).catch(() => undefined);
      });
      jobs.push(job);
    }

    this.jobs.set(instanceId, jobs);
  }

  private async execute(instanceId: string, action: TaskAction): Promise<void> {
    const cfg = await this.instances.getInstance(instanceId);

    switch (action.type) {
      case 'RCON_COMMAND':
        if (!this.rcon.isConnected(instanceId)) {
          await this.rcon.connect(cfg);
        }
        await this.rcon.sendCommand(instanceId, action.command);
        return;

      case 'SERVER_RESTART':
        await this.process.restart(cfg);
        return;

      case 'SERVER_UPDATE':
        await this.steamcmd.updateServer(cfg);
        return;
    }
  }
}
