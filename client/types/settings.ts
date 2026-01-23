export type SettingsModel = {
  instanceName: string;

  // Setup
  dataRoot: string;
  setupComplete: boolean;

  // Paths
  steamcmdPath: string;
  dayzServerPath: string;
  profilesPath: string;
  apiBridgePath: string;

  // ApiBridge
  apiBridgeApiKey: string;
  apiBridgeNodeId: string;
  apiBridgeCommandTimeoutMs: number;
  apiBridgePollIntervalMs: number;

  // Launch
  serverPort: number;
  serverConfigFile: string;
  additionalLaunchArgs: string;

  // Supervisor
  autoRestartOnCrash: boolean;
  autoRestartDelayMs: number;
  autoRestartMaxAttempts: number;
  autoRestartWindowMs: number;

  // Steam
  steamWebApiKey: string;
  steamUser: string;
  steamPassword: string;
};
