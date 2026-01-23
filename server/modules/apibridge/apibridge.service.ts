import path from "path";
import crypto from "crypto";
import { AppError, ErrorCodes } from "../../core/errors";
import { getLogger } from "../../core/logger";
import type { ApiBridgeCommand, ApiBridgeCommandsFile, ApiBridgeCommandResultsFile, ApiBridgeConfig, ApiBridgeHeartbeatBridge, ApiBridgeHeartbeatNode, ApiBridgeState } from "./apibridge.types";
import { fileMtimeMs, readTextIfExists, safeJsonParse, writeJsonAtomic } from "./apibridge.file";

export type ApiBridgeSettings = {
  profilesPath: string;
  apiBridgePath: string; // absolute path: <profilesPath>\ApiBridge
  apiBridgeApiKey: string;
  apiBridgeCommandTimeoutMs: number;
  apiBridgePollIntervalMs: number;
  apiBridgeNodeId: string;
};

type Status = {
  ok: boolean;
  reason?: string;
  apiBridgePath: string;
  stateMtimeMs?: number | null;
  bridgeHeartbeatMtimeMs?: number | null;
  nodeHeartbeatMtimeMs?: number | null;
  nonce?: string;
  nonceEcho?: string;
};

/**
 * ApiBridge service
 * - reads state.json / heartbeat from the DayZ mod folder
 * - writes node heartbeat + commands
 *
 * IMPORTANT: This integration is file-based on the same machine, so all paths are local filesystem paths.
 */
export class ApiBridgeService {
  private lastNonce: string | null = null;

  private logger = getLogger();

  private paths(s: ApiBridgeSettings) {
    const base = s.apiBridgePath;
    return {
      base,
      cfg: path.join(base, "apibridge.cfg"),
      state: path.join(base, "state.json"),
      commands: path.join(base, "commands.json"),
      results: path.join(base, "command_results.json"),
      nodeHb: path.join(base, "node_heartbeat.json"),
      bridgeHb: path.join(base, "bridge_heartbeat.json"),
    };
  }

  readConfig(s: ApiBridgeSettings): ApiBridgeConfig | null {
    const p = this.paths(s);
    const txt = readTextIfExists(p.cfg);
    if (!txt) return null;
    return safeJsonParse<ApiBridgeConfig>(txt);
  }

  writeConfig(s: ApiBridgeSettings, patch: Partial<ApiBridgeConfig>) {
    const current = this.readConfig(s) ?? { ApiKey: s.apiBridgeApiKey };
    const merged: ApiBridgeConfig = { ...current, ...patch, ApiKey: patch.ApiKey ?? s.apiBridgeApiKey };
    const p = this.paths(s);
    writeJsonAtomic(p.cfg, merged);
    return merged;
  }

  readState(s: ApiBridgeSettings): ApiBridgeState | null {
    const p = this.paths(s);
    const txt = readTextIfExists(p.state);
    if (!txt) return null;
    try {
      return safeJsonParse<ApiBridgeState>(txt);
    } catch (e) {
      // Defensive: if mod writes while we read (should be atomic, but just in case)
      this.logger.warn("E_APIBRIDGE_STATE_PARSE", "Failed to parse state.json", { error: String(e) });
      return null;
    }
  }

  readBridgeHeartbeat(s: ApiBridgeSettings): ApiBridgeHeartbeatBridge | null {
    const p = this.paths(s);
    const txt = readTextIfExists(p.bridgeHb);
    if (!txt) return null;
    try {
      return safeJsonParse<ApiBridgeHeartbeatBridge>(txt);
    } catch {
      return null;
    }
  }

  writeNodeHeartbeat(s: ApiBridgeSettings) {
    const p = this.paths(s);
    const nonce = crypto.randomBytes(16).toString("hex");
    this.lastNonce = nonce;

    const hb: ApiBridgeHeartbeatNode = {
      apiKey: s.apiBridgeApiKey,
      nodeId: s.apiBridgeNodeId,
      nonce,
      sentAt: String(Date.now()),
    };
    writeJsonAtomic(p.nodeHb, hb);
    return hb;
  }

  status(s: ApiBridgeSettings): Status {
    const p = this.paths(s);

    const stateMtime = fileMtimeMs(p.state);
    const bridgeMtime = fileMtimeMs(p.bridgeHb);
    const nodeMtime = fileMtimeMs(p.nodeHb);

    const bridge = this.readBridgeHeartbeat(s);
    const nonceEcho = bridge?.nonceEcho;

    // recommended: bridge heartbeat updated within 3 * snapshot interval
    const now = Date.now();
    const freshnessMs = (this.readConfig(s)?.SnapshotIntervalSec ?? 5) * 3 * 1000;
    const fresh = bridgeMtime != null ? (now - bridgeMtime) <= freshnessMs : false;
    const nonceOk = this.lastNonce ? nonceEcho === this.lastNonce : true;

    const ok = fresh && nonceOk;

    return {
      ok,
      reason: ok ? undefined : !fresh ? "bridge heartbeat not fresh" : "nonce mismatch",
      apiBridgePath: s.apiBridgePath,
      stateMtimeMs: stateMtime,
      bridgeHeartbeatMtimeMs: bridgeMtime,
      nodeHeartbeatMtimeMs: nodeMtime,
      nonce: this.lastNonce ?? undefined,
      nonceEcho,
    };
  }

  /**
   * Send a command via commands.json and wait for its result in command_results.json.
   *
   * This is intentionally simple and robust: file-based bridge, short polling.
   */
  async sendCommand(s: ApiBridgeSettings, cmd: Omit<ApiBridgeCommand, "id" | "apiKey"> & { id?: string; apiKey?: string }) {
    const p = this.paths(s);
    const id = cmd.id ?? `cmd-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const apiKey = cmd.apiKey ?? s.apiBridgeApiKey;

    const payload: ApiBridgeCommandsFile = {
      commands: [{ ...cmd, id, apiKey } as ApiBridgeCommand],
    };

    writeJsonAtomic(p.commands, payload);

    // Poll for results containing our id
    const timeoutAt = Date.now() + s.apiBridgeCommandTimeoutMs;
    while (Date.now() < timeoutAt) {
      const txt = readTextIfExists(p.results);
      if (txt) {
        try {
          const res = safeJsonParse<ApiBridgeCommandResultsFile>(txt);
          const found = res.results?.find((r) => r.id === id);
          if (found) return { id, ...found };
        } catch {
          // ignore parse issues; try again
        }
      }
      await new Promise((r) => setTimeout(r, s.apiBridgePollIntervalMs));
    }

    throw new AppError(ErrorCodes.APIBRIDGE_COMMAND_FAILED, `ApiBridge command timed out (id=${id}).`, {
      id,
      type: cmd.type,
      timeoutMs: s.apiBridgeCommandTimeoutMs,
    });
  }
}
