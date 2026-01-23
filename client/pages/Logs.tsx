import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/http";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type LogsIndex = {
  logsDir: string;
  files: { name: string; size: number; mtimeMs: number }[];
};

type TailResp = {
  file: string;
  lines: string[];
};

export default function Logs() {
  const [file, setFile] = useState<string>("app-current.log");
  const [lines, setLines] = useState<number>(200);

  // Include the current instance id in query keys for per-instance cache isolation
  const instanceId = typeof window !== "undefined" ? window.localStorage.getItem("dz.instanceId") ?? "" : "";

  const index = useQuery({
    queryKey: ["logs-index", instanceId],
    queryFn: () => api<LogsIndex>("/logs"),
    refetchInterval: 5000,
  });

  useEffect(() => {
    // pick the newest log file by default
    const files = index.data?.files;
    if (!files || files.length === 0) return;
    if (files.some((f) => f.name === file)) return;
    setFile(files[0].name);
  }, [index.data, file]);

  const tail = useQuery({
    queryKey: ["logs-tail", instanceId, file, lines],
    queryFn: () => api<TailResp>(`/logs/tail?file=${encodeURIComponent(file)}&lines=${lines}`),
    enabled: !!file,
    refetchInterval: 3000,
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Logs</h2>
        <p className="text-sm text-muted-foreground">Panel logs + DayZ server stdout/stderr logs.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Viewer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <Select value={file} onValueChange={setFile}>
              <SelectTrigger className="w-full md:w-[420px]">
                <SelectValue placeholder="Select log" />
              </SelectTrigger>
              <SelectContent>
                {(index.data?.files ?? []).map((f) => (
                  <SelectItem key={f.name} value={f.name}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground md:ml-auto">{index.data?.logsDir}</div>
          </div>

          <div className="flex gap-2">
            {[200, 500, 1000].map((n) => (
              <Button key={n} variant={lines === n ? "default" : "secondary"} size="sm" onClick={() => setLines(n)}>
                {n} lines
              </Button>
            ))}
          </div>

          <pre className="text-xs bg-black/60 text-white rounded-lg p-4 overflow-auto max-h-[520px]">
            {(tail.data?.lines ?? []).join("\n")}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
