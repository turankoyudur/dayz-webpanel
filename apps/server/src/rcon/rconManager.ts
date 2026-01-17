/**
 * rcon/rconManager.ts
 *
 * BattlEye RCon connection manager.
 *
 * Inspired by OmegaManager/CF Tools workflows:
 * - Connect to BattlEye using the data from BEServer_x64.cfg
 * - Expose a simple API: connect/disconnect/sendCommand
 * - Emit messages in real-time to the web UI
 */

import { EventEmitter } from 'node:events';
import { BattleNode } from 'battle-node-v2';
import type { BattleNodeConfig } from 'battle-node-v2';
import type { InstanceConfigV1 } from '../config/instanceConfig.js';
import { readBattleyeConfig } from '../dayz/beConfig.js';

export type RconState = {
  connected: boolean;
  lastError?: string;
  connectedAt?: string;
};

type ManagedConnection = {
  client: BattleNode;
  config: BattleNodeConfig;
  state: RconState;
};

export class RconManager extends EventEmitter {
  private conns = new Map<string, ManagedConnection>();

  /**
   * Returns a snapshot of connection state for an instance.
   */
  getState(instanceId: string): RconState {
    return this.conns.get(instanceId)?.state ?? { connected: false };
  }

  isConnected(instanceId: string): boolean {
    return this.getState(instanceId).connected;
  }

  /**
   * Connects (or reconnects) to BattlEye for a given instance.
   *
   * Important:
   * - The password and port are read from BEServer_x64.cfg when possible.
   */
  async connect(instance: InstanceConfigV1): Promise<RconState> {
    // Disconnect an existing connection first (clean restart)
    await this.disconnect(instance.id).catch(() => undefined);

    const be = await readBattleyeConfig(instance.paths.battleye);
    const password = be.entries['RConPassword'] ?? '';
    const portRaw = be.entries['RConPort'];
    const port = portRaw ? Number(portRaw) : instance.network.rconPort;

    if (!password) {
      const state: RconState = {
        connected: false,
        lastError: `RConPassword not found in ${be.filePath}`
      };
      this.conns.set(instance.id, {
        client: null as any,
        config: { ip: instance.network.host, port, rconPassword: '' },
        state
      });
      return state;
    }

    const cfg: BattleNodeConfig = {
      ip: instance.network.host,
      port,
      rconPassword: password
    };

    const client = new BattleNode(cfg);

    // Forward server messages to whoever listens (Socket.IO layer)
    client.on('message', (msg: string) => {
      this.emit('message', { instanceId: instance.id, message: msg });
    });

    client.on('disconnected', () => {
      const existing = this.conns.get(instance.id);
      if (existing) {
        existing.state.connected = false;
      }
      this.emit('disconnected', { instanceId: instance.id });
    });

    const conn: ManagedConnection = {
      client,
      config: cfg,
      state: { connected: false }
    };

    this.conns.set(instance.id, conn);

    try {
      await client.login();
      conn.state = { connected: true, connectedAt: new Date().toISOString() };
      this.conns.set(instance.id, conn);
      this.emit('connected', { instanceId: instance.id });
      return conn.state;
    } catch (err: any) {
      conn.state = { connected: false, lastError: String(err?.message ?? err) };
      this.conns.set(instance.id, conn);
      return conn.state;
    }
  }

  async disconnect(instanceId: string): Promise<void> {
    const conn = this.conns.get(instanceId);
    if (!conn) return;

    try {
      conn.client.disconnect();
    } finally {
      this.conns.delete(instanceId);
    }
  }

  /**
   * Sends a command and returns the response string.
   */
  async sendCommand(instanceId: string, command: string): Promise<string> {
    const conn = this.conns.get(instanceId);
    if (!conn || !conn.state.connected) {
      throw new Error('RCON not connected');
    }

    const response = await conn.client.sendCommand(command);
    return response;
  }
}
