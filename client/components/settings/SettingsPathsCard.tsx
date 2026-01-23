import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SettingsField from "@/components/settings/SettingsField";
import { Button } from "@/components/ui/button";
import PathPickerDialog from "@/components/fs/PathPickerDialog";
import { useState } from "react";
import type { SettingsModel } from "@/types/settings";
import type { UpdateSettings } from "@/components/settings/types";

type SettingsPathsCardProps = {
  form: SettingsModel;
  onUpdate: UpdateSettings;
};

type PathKey = "steamcmdPath" | "dayzServerPath" | "profilesPath" | "apiBridgePath";

export default function SettingsPathsCard({
  form,
  onUpdate,
}: SettingsPathsCardProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeKey, setActiveKey] = useState<PathKey | null>(null);

  const openPicker = (key: PathKey) => {
    setActiveKey(key);
    setPickerOpen(true);
  };

  const currentValue = activeKey ? form[activeKey] : "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paths (Windows/Linux)</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <SettingsField
                label="SteamCMD Path"
                value={form.steamcmdPath}
                onChange={(value) => onUpdate("steamcmdPath", value)}
              />
            </div>
            <Button variant="outline" className="mt-7" onClick={() => openPicker("steamcmdPath")}>Browse</Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <SettingsField
                label="DayZ Server Path"
                value={form.dayzServerPath}
                onChange={(value) => onUpdate("dayzServerPath", value)}
              />
            </div>
            <Button variant="outline" className="mt-7" onClick={() => openPicker("dayzServerPath")}>Browse</Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <SettingsField
                label="Profiles Path (-profiles=...) "
                value={form.profilesPath}
                onChange={(value) => onUpdate("profilesPath", value)}
              />
            </div>
            <Button variant="outline" className="mt-7" onClick={() => openPicker("profilesPath")}>Browse</Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <SettingsField
                label="ApiBridge Path (Profiles\\ApiBridge)"
                value={form.apiBridgePath}
                onChange={(value) => onUpdate("apiBridgePath", value)}
              />
            </div>
            <Button variant="outline" className="mt-7" onClick={() => openPicker("apiBridgePath")}>Browse</Button>
          </div>
        </div>
      </CardContent>

      <PathPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Select folder"
        initialPath={currentValue}
        onSelect={(abs) => {
          if (!activeKey) return;
          onUpdate(activeKey, abs);
        }}
      />
    </Card>
  );
}
