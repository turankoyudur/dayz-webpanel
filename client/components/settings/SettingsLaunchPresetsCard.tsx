import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/http";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SettingsModel } from "@/types/settings";
import type { UpdateSettings } from "@/components/settings/types";

type LaunchPreset = {
  id: string;
  name: string;
  description: string;
  patch: Partial<Pick<SettingsModel, "additionalLaunchArgs" | "serverPort" | "serverConfigFile">>;
};

type PresetsResp = { presets: LaunchPreset[] };

type Props = {
  form: SettingsModel;
  onUpdate: UpdateSettings;
};

export default function SettingsLaunchPresetsCard({ form, onUpdate }: Props) {
  const q = useQuery({
    queryKey: ["launch-presets"],
    queryFn: () => api<PresetsResp>("/server/presets"),
    retry: false,
  });

  const presets = q.data?.presets ?? [];
  const [selectedId, setSelectedId] = useState<string>(presets[0]?.id ?? "recommended-logs");

  const selected = useMemo(() => presets.find((p) => p.id === selectedId) ?? null, [presets, selectedId]);

  const apply = () => {
    if (!selected) return;

    if (typeof selected.patch.serverPort === "number") onUpdate("serverPort", selected.patch.serverPort);
    if (typeof selected.patch.serverConfigFile === "string") onUpdate("serverConfigFile", selected.patch.serverConfigFile);
    if (typeof selected.patch.additionalLaunchArgs === "string") onUpdate("additionalLaunchArgs", selected.patch.additionalLaunchArgs);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Launch Presets</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <Label>Preset</Label>
            <Select value={selectedId} onValueChange={setSelectedId} disabled={!presets.length}>
              <SelectTrigger>
                <SelectValue placeholder={q.isLoading ? "Loading..." : "Select a preset"} />
              </SelectTrigger>
              <SelectContent>
                {presets.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button onClick={apply} disabled={!selected}>
              Apply to form
            </Button>
          </div>
        </div>

        {selected ? (
          <div className="space-y-2">
            <div className="text-muted-foreground">{selected.description}</div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="border rounded-md p-2">
                <div className="text-xs text-muted-foreground">serverPort</div>
                <div className="font-medium">{selected.patch.serverPort ?? form.serverPort}</div>
              </div>
              <div className="border rounded-md p-2">
                <div className="text-xs text-muted-foreground">serverConfigFile</div>
                <div className="font-medium">{selected.patch.serverConfigFile ?? form.serverConfigFile}</div>
              </div>
              <div className="border rounded-md p-2">
                <div className="text-xs text-muted-foreground">additionalLaunchArgs</div>
                <div className="font-mono text-xs break-words">{selected.patch.additionalLaunchArgs ?? ""}</div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Note: Mods are managed separately (enabled mods are appended as <span className="font-mono">-mod=@a;@b</span> on start).
              Presets only update the extra flags stored in Settings.
            </p>
          </div>
        ) : (
          <div className="text-muted-foreground">{q.isLoading ? "Loading presets..." : "No presets found."}</div>
        )}
      </CardContent>
    </Card>
  );
}
