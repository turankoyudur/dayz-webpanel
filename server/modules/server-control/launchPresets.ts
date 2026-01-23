export type LaunchPresetPatch = {
  /**
   * Raw extra args, appended after core arguments (-config/-profiles/-port/-mod).
   * This is stored into Settings.additionalLaunchArgs.
   */
  additionalLaunchArgs?: string;

  /** Optional overrides */
  serverPort?: number;
  serverConfigFile?: string;
};

export type LaunchPreset = {
  id: string;
  name: string;
  description: string;
  patch: LaunchPresetPatch;
};

/**
 * Built-in DayZ server launch presets.
 *
 * Notes:
 * - Mods are handled separately by the panel (enabled mods => -mod=...).
 * - These presets only set "additionalLaunchArgs" and a few basic settings.
 */
export const LAUNCH_PRESETS: LaunchPreset[] = [
  {
    id: "recommended-logs",
    name: "Recommended Logs",
    description: "Enables RPT/admin/network logs and freeze check.",
    patch: { additionalLaunchArgs: "-doLogs -adminLog -netLog -freezeCheck" },
  },
  {
    id: "dev-filepatching",
    name: "Dev + File Patching",
    description: "Recommended logs plus file patching for development workflows.",
    patch: { additionalLaunchArgs: "-doLogs -adminLog -netLog -freezeCheck -filePatching" },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "No additional flags (use only core args).",
    patch: { additionalLaunchArgs: "" },
  },
];

export function getLaunchPreset(id: string): LaunchPreset | undefined {
  return LAUNCH_PRESETS.find((p) => p.id === id);
}
