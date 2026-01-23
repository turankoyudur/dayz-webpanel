import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPut } from "@/lib/http";
import SettingsHeader from "@/components/settings/SettingsHeader";
import SettingsHealthCard from "@/components/settings/SettingsHealthCard";
import SettingsInstanceCard from "@/components/settings/SettingsInstanceCard";
import SettingsPathsCard from "@/components/settings/SettingsPathsCard";
import SettingsApiBridgeCard from "@/components/settings/SettingsApiBridgeCard";
import SettingsLaunchCard from "@/components/settings/SettingsLaunchCard";
import SettingsLaunchPresetsCard from "@/components/settings/SettingsLaunchPresetsCard";
import SettingsSteamCard from "@/components/settings/SettingsSteamCard";
import { useToast } from "@/hooks/use-toast";
import type { SettingsModel } from "@/types/settings";

export default function Settings() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const q = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<SettingsModel>("/settings"),
  });

  const [form, setForm] = useState<SettingsModel | null>(null);

  useEffect(() => {
    if (q.data) setForm(q.data);
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => apiPut<any>("/settings", form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["config-files"] });
      toast({ title: "Settings saved" });
    },
    onError: (e: any) =>
      toast({ title: "Save failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const health = useQuery({
    queryKey: ["settings-health"],
    queryFn: () => api<any>("/settings/health"),
    enabled: !!form,
  });

  const update = (key: keyof SettingsModel, value: SettingsModel[keyof SettingsModel]) => {
    if (!form) return;
    setForm({ ...form, [key]: value });
  };

  if (!form) {
    return <div className="p-6 text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <SettingsHeader onSave={() => save.mutate()} isSaving={save.isPending} />
      <SettingsHealthCard checks={health.data?.checks} />

      <SettingsInstanceCard form={form} onUpdate={update} />
      <SettingsPathsCard form={form} onUpdate={update} />
      <SettingsApiBridgeCard form={form} onUpdate={update} />
      <SettingsLaunchPresetsCard form={form} onUpdate={update} />
      <SettingsLaunchCard form={form} onUpdate={update} />
      <SettingsSteamCard form={form} onUpdate={update} />
    </div>
  );
}
