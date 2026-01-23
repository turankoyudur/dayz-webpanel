import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SettingsField from "@/components/settings/SettingsField";
import type { SettingsModel } from "@/types/settings";
import type { UpdateSettings } from "@/components/settings/types";

type SettingsSteamCardProps = {
  form: SettingsModel;
  onUpdate: UpdateSettings;
};

/**
 * Steam settings
 *
 * What this card is for:
 * - SteamCMD Workshop downloads may require a Steam account (that owns DayZ).
 * - Workshop search can use the Steam Web API (requires a Web API key).
 *
 * NOTE:
 * - These secrets are stored locally in the panel DB.
 * - For a future hardening pass, we can encrypt at rest.
 */
export default function SettingsSteamCard({
  form,
  onUpdate,
}: SettingsSteamCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Steam (for SteamCMD Workshop Downloads)</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SettingsField
          label="Steam Username"
          value={form.steamUser}
          placeholder="your_steam_login"
          onChange={(value) => onUpdate("steamUser", value)}
        />

        <SettingsField
          label="Steam Password"
          value={form.steamPassword}
          placeholder="********"
          type="password"
          onChange={(value) => onUpdate("steamPassword", value)}
        />

        <SettingsField
          label="Steam Web API Key"
          value={form.steamWebApiKey}
          placeholder="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
          helperText={
            "Used to search DayZ Workshop mods via the official Steam Web API (server-side)."
          }
          onChange={(value) => onUpdate("steamWebApiKey", value)}
        />

        <p className="text-xs text-muted-foreground md:col-span-2">
          For security, consider using a dedicated Steam account. In a future
          version we can add encryption/Windows Credential Manager.
        </p>
      </CardContent>
    </Card>
  );
}
