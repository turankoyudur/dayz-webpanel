import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SettingsField from "@/components/settings/SettingsField";
import PathPickerDialog from "@/components/fs/PathPickerDialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import type { SettingsModel } from "@/types/settings";
import type { UpdateSettings } from "@/components/settings/types";
import { validateInstanceName } from "@shared/instanceName";

type Props = {
  form: SettingsModel;
  onUpdate: UpdateSettings;
};

/**
 * Instance identifier card.
 *
 * This name will be used as an identifier (and later as a folder name) when
 * multiple server instances are supported. To avoid Windows path issues, we
 * restrict it to a safe allowlist.
 */
export default function SettingsInstanceCard({ form, onUpdate }: Props) {
  const validation = validateInstanceName(form.instanceName ?? "");
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Server Instance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <SettingsField
              label="Data Root (runtime folder)"
              value={form.dataRoot}
              placeholder="C:\\path\\to\\panel-data"
              helperText={
                "SteamCMD, instances, and profiles will be placed under this root by default. Changing Data Root will rebase managed paths (unless you manually override them)."
              }
              onChange={(value) => onUpdate("dataRoot", value)}
            />
          </div>
          <Button variant="outline" className="mt-7" onClick={() => setOpen(true)}>
            Browse
          </Button>
        </div>

        <SettingsField
          label="Instance name (letters/numbers/_/-)"
          value={form.instanceName}
          onChange={(value) => onUpdate("instanceName", value)}
        />
        {!validation.ok ? (
          <p className="text-xs text-destructive">{validation.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            OK. This will be used as an identifier for the server instance.
          </p>
        )}

        <div className="text-xs text-muted-foreground">
          Setup status: <span className="font-medium">{form.setupComplete ? "Complete" : "Not complete"}</span>
          {!form.setupComplete ? (
            <span> — go to <span className="font-medium">/setup</span> to complete first-run steps.</span>
          ) : null}
        </div>
      </CardContent>

      <PathPickerDialog
        open={open}
        onOpenChange={setOpen}
        title="Select Data Root folder"
        initialPath={form.dataRoot}
        onSelect={(abs) => onUpdate("dataRoot", abs)}
      />
    </Card>
  );
}
