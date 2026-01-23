import type { SettingsModel } from "@/types/settings";

export type UpdateSettings = (
  key: keyof SettingsModel,
  value: SettingsModel[keyof SettingsModel]
) => void;
