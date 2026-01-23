import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiPost } from "@/lib/http";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ServerStatus = {
  running: boolean;
  pid: number | null;
  startedAt: string | null;
  lastExit: { code: number | null; signal: string | null } | null;
  lastExitAt?: string | null;
  crashCount?: number;
  lastCrashAt?: string | null;
  desiredState?: "running" | "stopped";
  detached?: boolean;
  staleRuntime?: boolean;
  restartScheduledAt?: string | null;
  restartSuppressedReason?: string | null;
};

type TailResp = {
  file: string;
  lines: string[];
};

type Mod = {
  workshopId: string;
  name: string | null;
  folderName?: string | null;
  enabled: boolean;
  installedPath: string | null;
};

export default function Server() {
  const qc = useQueryClient();
  const { toast } = useToast();

  // Determine the currently selected instance id (if any).  When multi‑instance is active
  // we persist the selection to localStorage under "dz.instanceId". Including the
  // instanceId in the query keys ensures each instance maintains its own cache entries.
  const instanceId = typeof window !== "undefined" ? localStorage.getItem("dz.instanceId") ?? undefined : undefined;
  const status = useQuery({
    queryKey: ["server-status", instanceId],
    queryFn: () => api<ServerStatus>("/server/status"),
    refetchInterval: 3000,
  });

  const mods = useQuery({
    queryKey: ["mods", instanceId],
    queryFn: () => api<Mod[]>("/mods"),
    refetchInterval: 5000,
  });

  const start = useMutation({
    mutationFn: () => apiPost<any>("/server/start"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["server-status", instanceId] });
      toast({ title: "Server start requested" });
    },
    onError: (e: any) => toast({ title: "Start failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const stop = useMutation({
    mutationFn: () => apiPost<any>("/server/stop"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["server-status", instanceId] });
      toast({ title: "Server stop requested" });
    },
    onError: (e: any) => toast({ title: "Stop failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const restart = useMutation({
    mutationFn: () => apiPost<any>("/server/restart"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["server-status", instanceId] });
      toast({ title: "Server restart requested" });
    },
    onError: (e: any) => toast({ title: "Restart failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const s = status.data;
  const logTail = useQuery({
    queryKey: ["logs-rpt-latest", instanceId],
    queryFn: () => api<TailResp>("/logs/rpt/latest?lines=200"),
    refetchInterval: 2000,
    retry: false,
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Server Control</h2>
        <div className="flex gap-2">
          <Button onClick={() => start.mutate()} disabled={!!s?.running || start.isPending}>
            Start
          </Button>
          <Button variant="secondary" onClick={() => restart.mutate()} disabled={!s?.running || restart.isPending}>
            Restart
          </Button>
          <Button variant="destructive" onClick={() => stop.mutate()} disabled={!s?.running || stop.isPending}>
            Stop
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Running</div>
              <div className="font-medium">{s?.running ? "Yes" : "No"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">PID</div>
              <div className="font-medium">{s?.pid ?? "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Started</div>
              <div className="font-medium">{s?.startedAt ?? "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Last Exit</div>
              <div className="font-medium">
                {s?.lastExit ? `code=${s.lastExit.code ?? "-"} signal=${s.lastExit.signal ?? "-"}` : "-"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Detached</div>
              <div className="font-medium">{s?.detached ? "Yes" : "No"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Crashes</div>
              <div className="font-medium">{typeof s?.crashCount === "number" ? s.crashCount : "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Last Crash</div>
              <div className="font-medium">{s?.lastCrashAt ?? "-"}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Desired State</div>
              <div className="font-medium">{s?.desiredState ?? "-"}</div>
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Note: The panel uses a lightweight supervisor. If the panel restarts while DayZ is running, status is shown as
            "Detached" (PID persisted) and Stop will attempt to terminate the process by PID.
          </p>
        </CardContent>
      </Card>

      

      <Card>
        <CardHeader>
          <CardTitle>Enabled Mods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {(() => {
            const list = mods.data ?? [];
            const enabled = list.filter((m) => m.enabled);
            if (enabled.length === 0) {
              return (
                <div className="text-muted-foreground">
                  No enabled mods. Enable mods from the Mods page.
                </div>
              );
            }
            return enabled.map((m) => (
              <div key={m.workshopId} className="flex items-center justify-between border rounded-md p-2">
                <div className="truncate">
                  <div className="font-medium truncate">{m.name ?? `Workshop ${m.workshopId}`}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.folderName ? `@${m.folderName}` : `@${m.workshopId}`} • {m.workshopId}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {m.installedPath ? "Downloaded" : "Not downloaded"}
                </div>
              </div>
            ));
          })()}
        </CardContent>
      </Card>
<Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Server Monitor</CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span
              className={cn("h-2 w-2 rounded-full", s?.running ? "bg-emerald-500" : "bg-muted-foreground/40")}
            />
            <span>{s?.running ? "Live" : "Offline"}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs text-muted-foreground">
            {logTail.data?.file ?? "DayZServer_x64*.RPT"} • auto-refreshing every 2s
          </div>
          <pre className="text-xs bg-black/70 text-white rounded-lg p-4 overflow-auto max-h-[320px]">
            {logTail.isError
              ? "Latest RPT log not found yet. Start the server to generate a new report file."
              : (logTail.data?.lines ?? []).join("\n")}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
