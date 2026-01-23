import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SettingsField from "@/components/settings/SettingsField";
import type { SettingsModel } from "@/types/settings";
import type { UpdateSettings } from "@/components/settings/types";

/**
 * ApiBridge settings
 * - apiKey must match apibridge.cfg in the mod folder
 * - nodeId is used for heartbeat identification
 * - timeout/poll controls how long we wait for command_results.json
 */
type Props = {
  form: SettingsModel;
  onUpdate: UpdateSettings;
};

export default function SettingsApiBridgeCard({ form, onUpdate }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ApiBridge</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SettingsField
          label="ApiKey"
          value={form.apiBridgeApiKey}
          onChange={(value) => onUpdate("apiBridgeApiKey", value)}
        />
        <SettingsField
          label="Node ID"
          value={form.apiBridgeNodeId}
          onChange={(value) => onUpdate("apiBridgeNodeId", value)}
        />
        <SettingsField
          label="Command Timeout (ms)"
          value={String(form.apiBridgeCommandTimeoutMs)}
          onChange={(value) => onUpdate("apiBridgeCommandTimeoutMs", Number(value))}
        />
        <SettingsField
          label="Poll Interval (ms)"
          value={String(form.apiBridgePollIntervalMs)}
          onChange={(value) => onUpdate("apiBridgePollIntervalMs", Number(value))}
        />
      </CardContent>
    </Card>
  );
}
