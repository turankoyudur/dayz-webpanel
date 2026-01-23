import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { api, apiDelete, apiPost, apiPut } from "@/lib/http";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import type { SettingsModel } from "@/types/settings";
import PathPickerDialog from "@/components/fs/PathPickerDialog";

type SetupStatus = {
  setupComplete: boolean;
  health: Record<string, boolean>;
  settings: SettingsModel;
};

type SetupJob = {
  id: string;
  type: string;
  status: "queued" | "running" | "success" | "failed";
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number;
  outputTail: string;
  outputBytes: number;
  error?: string;
};

export default function Setup() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { toast } = useToast();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [step, setStep] = useState<number>(() => {
    const raw = window.localStorage.getItem("setupWizardStep");
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? Math.max(0, Math.min(4, n)) : 0;
  });

  const [pickerOpen, setPickerOpen] = useState(false);

  // Local draft for the few settings we want editable during setup.
  const [draft, setDraft] = useState<Partial<SettingsModel>>({});

  const status = useQuery({
    queryKey: ["setup-status"],
    queryFn: () => api<SetupStatus>("/setup/status"),
    refetchInterval: 3000,
  });

  const settings = status.data?.settings;
  const health = status.data?.health ?? {};

  const foldersReady = useMemo(() => {
    // We consider folders ready if DataRoot exists and instance profiles folder exists.
    // (profilesPath is managed and should be created by create-folders)
    return !!health.dataRoot && !!health.profilesPath;
  }, [health.dataRoot, health.profilesPath]);

  const job = useQuery({
    queryKey: ["setup-job", activeJobId],
    queryFn: () => api<{ job: SetupJob }>(`/setup/jobs/${activeJobId}`),
    enabled: !!activeJobId,
    refetchInterval: (q) => {
      const current = (q.state.data as any)?.job as SetupJob | undefined;
      if (!current) return 1000;
      return current.status === "queued" || current.status === "running" ? 1000 : false;
    },
  });

  const activeJob = job.data?.job;
  const jobRunning = activeJob?.status === "queued" || activeJob?.status === "running";

  // Persist step in localStorage so refresh doesn't reset the wizard.
  useEffect(() => {
    window.localStorage.setItem("setupWizardStep", String(step));
  }, [step]);

  // Keep draft in sync with server settings.
  useEffect(() => {
    if (!settings) return;
    setDraft({
      dataRoot: settings.dataRoot,
      instanceName: settings.instanceName,
      steamUser: settings.steamUser,
      steamPassword: settings.steamPassword,
      steamWebApiKey: settings.steamWebApiKey,
    });
  }, [settings?.dataRoot, settings?.instanceName, settings?.steamUser, settings?.steamPassword, settings?.steamWebApiKey]);

  // Auto-advance the wizard when prerequisites are satisfied.
  useEffect(() => {
    if (!settings) return;
    // Step 1 requires folder bootstrap.
    if (step === 1 && foldersReady) setStep(2);
    // Step 2 (SteamCMD optional) can be skipped automatically if already installed.
    if (step === 2 && health.steamcmdPath) setStep(3);
    // Step 3 (DayZ optional) can be skipped automatically if executable exists.
    if (step === 3 && health.dayzExecutable) setStep(4);
  }, [step, foldersReady, health.steamcmdPath, health.dayzExecutable, settings]);

  const createFolders = useMutation({
    mutationFn: () => apiPost<{ ok: boolean; created: string[] }>("/setup/create-folders", {}),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["setup-status"] });
      qc.invalidateQueries({ queryKey: ["settings-health"] });
      toast({
        title: "Folders created",
        description: data.created.length ? data.created.join("\n") : "No new folders were needed.",
      });
    },
    onError: (e: any) => toast({ title: "Failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const startSteamcmdJob = useMutation({
    mutationFn: () => apiPost<{ ok: boolean; job: SetupJob }>("/setup/jobs/install-steamcmd", {}),
    onSuccess: (data) => {
      setActiveJobId(data.job.id);
      toast({ title: "SteamCMD job started", description: `Job: ${data.job.id}` });
    },
    onError: (e: any) => toast({ title: "SteamCMD job failed to start", description: `${e.code ?? ""} ${e.message}` }),
  });

  const startDayzJob = useMutation({
    mutationFn: () => apiPost<{ ok: boolean; job: SetupJob }>("/setup/jobs/install-dayz", {}),
    onSuccess: (data) => {
      setActiveJobId(data.job.id);
      toast({ title: "DayZ install job started", description: `Job: ${data.job.id}` });
    },
    onError: (e: any) => toast({ title: "DayZ job failed to start", description: `${e.code ?? ""} ${e.message}` }),
  });

  const clearJob = useMutation({
    mutationFn: async (id: string) => apiDelete<{ ok: boolean }>(`/setup/jobs/${id}`),
    onSuccess: () => {
      setActiveJobId(null);
      toast({ title: "Job cleared" });
    },
    onError: (e: any) => toast({ title: "Failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const complete = useMutation({
    mutationFn: () => apiPost<{ ok: boolean; setupComplete: boolean }>("/setup/complete", {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["setup-status"] });
      toast({ title: "Setup complete" });
      nav("/");
    },
    onError: (e: any) => toast({ title: "Failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const saveBasics = useMutation({
    mutationFn: () => apiPut<SettingsModel>("/settings", draft),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["setup-status"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["settings-health"] });
      toast({ title: "Saved", description: "Settings updated." });
    },
    onError: (e: any) => toast({ title: "Failed to save", description: `${e.code ?? ""} ${e.message}` }),
  });

  if (status.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading setup...</div>;
  }

  if (status.isError || !settings) {
    return <div className="p-6 text-sm text-destructive">Failed to load setup status.</div>;
  }

  const steps = [
    {
      title: "Basics",
      description: "Set Data Root, Instance name and optional Steam credentials.",
      complete: true,
    },
    {
      title: "Create folders",
      description: "Bootstrap runtime folders under Data Root.",
      complete: foldersReady,
    },
    {
      title: "Install SteamCMD (optional)",
      description: "Download SteamCMD automatically (Windows only).",
      complete: !!health.steamcmdPath,
      optional: true,
    },
    {
      title: "Install DayZ Server (optional)",
      description: "Install DayZ Dedicated Server via SteamCMD (appid 223350).",
      complete: !!health.dayzExecutable,
      optional: true,
    },
    {
      title: "Verify & finish",
      description: "Review health checks and mark setup complete.",
      complete: !!status.data?.setupComplete,
    },
  ] as const;

  const total = steps.length;
  const pct = Math.round(((step + 1) / total) * 100);

  function goNext() {
    setStep((s) => Math.min(4, s + 1));
  }
  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">First-Run Setup</h2>
        <p className="text-sm text-muted-foreground">
          This wizard prepares the panel runtime folders and confirms that your Settings are sane.
          Long-running installer tasks are executed as jobs so the UI can keep showing progress.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Step {step + 1} / {total}</div>
            <div className="text-sm font-medium">{pct}%</div>
          </div>
          <Progress value={pct} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Steps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {steps.map((s, idx) => (
              <button
                key={s.title}
                type="button"
                className={`w-full text-left rounded-md border px-3 py-3 hover:bg-muted/40 ${idx === step ? "bg-muted/30" : ""}`}
                onClick={() => setStep(idx)}
                disabled={jobRunning}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{idx + 1}. {s.title}</div>
                  <div className={`text-xs ${s.complete ? "text-status-online" : "text-muted-foreground"}`}>
                    {s.complete ? "Done" : (s.optional ? "Optional" : "Pending")}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{s.description}</div>
              </button>
            ))}

            <Separator />
            <div className="text-xs text-muted-foreground">
              Need advanced settings? <Link className="underline" to="/settings">Open Settings</Link>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle>{steps[step].title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 0 && (
              <>
                <p className="text-sm text-muted-foreground">
                  Choose where the panel should place runtime files (SteamCMD, instances, profiles). You can also provide Steam credentials
                  for Workshop-related operations.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Data Root</div>
                    <div className="flex gap-2">
                      <Input
                        value={String(draft.dataRoot ?? "")}
                        onChange={(e) => setDraft((d) => ({ ...d, dataRoot: e.target.value }))}
                        placeholder="D:\\DayZPanelData"
                      />
                      <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>
                        Browse
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Instance name</div>
                    <Input
                      value={String(draft.instanceName ?? "")}
                      onChange={(e) => setDraft((d) => ({ ...d, instanceName: e.target.value }))}
                      placeholder="default"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Steam username (optional)</div>
                    <Input
                      value={String(draft.steamUser ?? "")}
                      onChange={(e) => setDraft((d) => ({ ...d, steamUser: e.target.value }))}
                      placeholder="steamUser"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Steam password (optional)</div>
                    <Input
                      type="password"
                      value={String(draft.steamPassword ?? "")}
                      onChange={(e) => setDraft((d) => ({ ...d, steamPassword: e.target.value }))}
                      placeholder="(hidden)"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <div className="text-xs text-muted-foreground">Steam Web API key (optional)</div>
                    <Input
                      value={String(draft.steamWebApiKey ?? "")}
                      onChange={(e) => setDraft((d) => ({ ...d, steamWebApiKey: e.target.value }))}
                      placeholder="(used for official Workshop search)"
                    />
                  </div>
                </div>

                <div className="rounded-md border bg-muted/30 p-3 text-xs">
                  <div className="font-medium mb-1">Derived paths (preview)</div>
                  <div className="space-y-1 text-muted-foreground">
                    <div>SteamCMD: <span className="font-mono">{settings.steamcmdPath}</span></div>
                    <div>DayZ Server: <span className="font-mono">{settings.dayzServerPath}</span></div>
                    <div>Profiles: <span className="font-mono">{settings.profilesPath}</span></div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-2">
                  <Button onClick={() => saveBasics.mutate()} disabled={saveBasics.isPending || jobRunning}>
                    Save basics
                  </Button>
                  <Button variant="secondary" onClick={goNext} disabled={jobRunning}>
                    Next
                  </Button>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <p className="text-sm text-muted-foreground">
                  This step creates runtime folders under Data Root (steamcmd/, instances/&lt;name&gt;/profiles, runtime, keys) and ensures data/logs exists.
                </p>

                <Button onClick={() => createFolders.mutate()} disabled={createFolders.isPending || jobRunning}>
                  Create folders
                </Button>

                <div className="text-xs text-muted-foreground">
                  Status: <span className="font-medium">{foldersReady ? "OK" : "Not ready"}</span>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={goBack} disabled={jobRunning}>Back</Button>
                  <Button onClick={goNext} disabled={jobRunning || !foldersReady}>Next</Button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <p className="text-sm text-muted-foreground">
                  Optional (Windows): download and unpack SteamCMD under Data Root.
                </p>

                <div className="flex flex-col md:flex-row gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => startSteamcmdJob.mutate()}
                    disabled={startSteamcmdJob.isPending || jobRunning}
                  >
                    Start SteamCMD install job
                  </Button>
                  <Button variant="outline" onClick={goNext} disabled={jobRunning}>
                    Skip
                  </Button>
                </div>

                <JobPanel
                  activeJobId={activeJobId}
                  activeJob={activeJob}
                  loading={job.isLoading}
                  onRefresh={() => qc.invalidateQueries({ queryKey: ["setup-job", activeJobId] })}
                  onClear={() => (activeJob ? clearJob.mutate(activeJob.id) : null)}
                  clearing={clearJob.isPending}
                  disabled={jobRunning}
                />

                <div className="flex gap-2">
                  <Button variant="outline" onClick={goBack} disabled={jobRunning}>Back</Button>
                  <Button onClick={goNext} disabled={jobRunning}>Next</Button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <p className="text-sm text-muted-foreground">
                  Optional: install DayZ Dedicated Server via SteamCMD (appid 223350). You can use anonymous login or provide Steam credentials.
                </p>

                <div className="flex flex-col md:flex-row gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => startDayzJob.mutate()}
                    disabled={startDayzJob.isPending || jobRunning}
                  >
                    Start DayZ install job
                  </Button>
                  <Button variant="outline" onClick={goNext} disabled={jobRunning}>
                    Skip
                  </Button>
                </div>

                <JobPanel
                  activeJobId={activeJobId}
                  activeJob={activeJob}
                  loading={job.isLoading}
                  onRefresh={() => qc.invalidateQueries({ queryKey: ["setup-job", activeJobId] })}
                  onClear={() => (activeJob ? clearJob.mutate(activeJob.id) : null)}
                  clearing={clearJob.isPending}
                  disabled={jobRunning}
                />

                <div className="flex gap-2">
                  <Button variant="outline" onClick={goBack} disabled={jobRunning}>Back</Button>
                  <Button onClick={goNext} disabled={jobRunning}>Next</Button>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <p className="text-sm text-muted-foreground">
                  Review the health checks below. You can still install DayZ later; setup completion only disables the redirect.
                </p>

                <div className="space-y-2">
                  {Object.entries(health).map(([key, ok]) => (
                    <div key={key} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <div className="text-sm font-medium">{key}</div>
                      <div className={`text-xs ${ok ? "text-status-online" : "text-status-offline"}`}>{ok ? "OK" : "Missing"}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
                  <Button onClick={() => complete.mutate()} disabled={complete.isPending || jobRunning}>
                    Mark setup complete
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    After marking complete, the panel will stop redirecting you to this page.
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={goBack} disabled={jobRunning}>Back</Button>
                  <Button variant="secondary" onClick={() => nav("/")} disabled={!status.data?.setupComplete || jobRunning}>
                    Go to dashboard
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <PathPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Select Data Root"
        initialPath={String(draft.dataRoot ?? "")}
        onSelect={(p) => setDraft((d) => ({ ...d, dataRoot: p }))}
      />
    </div>
  );
}

function JobPanel({
  activeJobId,
  activeJob,
  loading,
  onRefresh,
  onClear,
  clearing,
  disabled,
}: {
  activeJobId: string | null;
  activeJob: SetupJob | undefined;
  loading: boolean;
  onRefresh: () => void;
  onClear: () => void;
  clearing: boolean;
  disabled: boolean;
}) {
  if (!activeJobId) return null;

  if (!activeJob && loading) {
    return <div className="text-sm text-muted-foreground">Loading job…</div>;
  }

  if (!activeJob) {
    return <div className="text-sm text-muted-foreground">Job not found.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="text-sm space-y-1">
        <div className="flex justify-between"><span className="font-medium">Job</span><span className="font-mono text-xs">{activeJob.id}</span></div>
        <div className="flex justify-between"><span className="font-medium">Type</span><span className="text-xs">{activeJob.type}</span></div>
        <div className="flex justify-between"><span className="font-medium">Status</span><span className="text-xs">{activeJob.status}</span></div>
        <div className="flex justify-between"><span className="font-medium">Exit</span><span className="text-xs">{activeJob.exitCode ?? "—"}</span></div>
      </div>

      {activeJob.error && (
        <div className="text-xs text-destructive">{activeJob.error}</div>
      )}

      <div className="rounded-md border bg-muted p-3">
        <pre className="text-xs whitespace-pre-wrap break-words">{activeJob.outputTail || "(no output yet)"}</pre>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onRefresh} disabled={disabled}>
          Refresh
        </Button>
        <Button variant="destructive" onClick={onClear} disabled={clearing || disabled}>
          Clear job
        </Button>
      </div>
    </div>
  );
}
