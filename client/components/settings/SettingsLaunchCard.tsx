import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import SettingsField from "@/components/settings/SettingsField";
import type { SettingsModel } from "@/types/settings";
import type { UpdateSettings } from "@/components/settings/types";

type SettingsLaunchCardProps = {
  form: SettingsModel;
  onUpdate: UpdateSettings;
};

export default function SettingsLaunchCard({
  form,
  onUpdate,
}: SettingsLaunchCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Launch Parameters</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SettingsField
          label="serverDZ.cfg"
          value={form.serverConfigFile}
          onChange={(value) => onUpdate("serverConfigFile", value)}
        />
        <SettingsField
          label="Game Port"
          value={String(form.serverPort)}
          onChange={(value) => onUpdate("serverPort", Number(value))}
        />
        <div className="md:col-span-2">
          <Label>Additional Launch Args</Label>
          <Textarea
            value={form.additionalLaunchArgs}
            onChange={(event) =>
              onUpdate("additionalLaunchArgs", event.target.value)
            }
            placeholder="-doLogs -adminLog -netLog -freezeCheck"
            className="min-h-[120px] font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Default recommended flags: -doLogs -adminLog -netLog -freezeCheck
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
