export type ApiBridgeConfig = {
  ApiKey: string;
  SnapshotIntervalSec?: number;
  CommandCleanupSec?: number;
};

export type ApiBridgeState = {
  serverTimeMs?: number;
  server?: {
    name?: string;
    mission?: string;
    playersOnline?: number;
    maxPlayers?: number;
  };
  players?: Array<{
    steamId?: string;
    name?: string;
    pos?: { x: number; y: number; z: number };
    health?: number;
  }>;
  bridge?: {
    lastNodeSeenServerTimeMs?: number;
  };
};

export type ApiBridgeHeartbeatNode = {
  apiKey: string;
  nodeId: string;
  nonce: string;
  sentAt: string; // unix ms as string
};

export type ApiBridgeHeartbeatBridge = {
  modVersion?: string;
  serverTimeMs?: number;
  lastNodeSeenServerTimeMs?: number;
  nodeId?: string;
  nonceEcho?: string;
};

export type ApiBridgeCommand = {
  id: string;
  apiKey: string;
  type: string;
  playerId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};

export type ApiBridgeCommandsFile = {
  commands: ApiBridgeCommand[];
};

export type ApiBridgeCommandResultsFile = {
  serverTimeMs?: number;
  results: Array<{ id: string; ok: boolean; message?: string }>;
};
