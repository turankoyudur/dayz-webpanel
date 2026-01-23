import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/http";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Status = {
  ok: boolean;
  reason?: string;
  apiBridgePath: string;
  stateMtimeMs?: number | null;
  bridgeHeartbeatMtimeMs?: number | null;
  nodeHeartbeatMtimeMs?: number | null;
  nonce?: string;
  nonceEcho?: string;
};

type Player = {
  steamId?: string;
  name?: string;
  pos?: { x: number; y: number; z: number };
  health?: number;
};

export default function ApiBridge() {
  const statusQ = useQuery({
    queryKey: ["apibridge-status"],
    queryFn: () => api<Status>("/apibridge/status"),
    refetchInterval: 2000,
  });

  const playersQ = useQuery({
    queryKey: ["apibridge-players"],
    queryFn: () => api<{ players: Player[] }>("/apibridge/players"),
    refetchInterval: 4000,
  });

  const status = statusQ.data;
  const players = playersQ.data?.players ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Bridge</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <span>Durum:</span>
            {status?.ok ? (
              <Badge>OK</Badge>
            ) : (
              <Badge variant="destructive">NOT READY</Badge>
            )}
            {status?.reason ? <span className="text-sm opacity-70">{status.reason}</span> : null}
          </div>

          <div className="text-sm opacity-80">
            <div>
              <span className="font-medium">Klasör:</span> {status?.apiBridgePath ?? "—"}
            </div>
            <div>
              <span className="font-medium">state.json mtime:</span>{" "}
              {status?.stateMtimeMs ? new Date(status.stateMtimeMs).toLocaleString() : "—"}
            </div>
            <div>
              <span className="font-medium">bridge_heartbeat mtime:</span>{" "}
              {status?.bridgeHeartbeatMtimeMs ? new Date(status.bridgeHeartbeatMtimeMs).toLocaleString() : "—"}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Oyuncular</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {players.length === 0 ? (
            <div className="text-sm opacity-70">Oyuncu yok (veya state.json okunamadı).</div>
          ) : (
            <div className="space-y-2">
              {players.map((p) => (
                <div key={p.steamId ?? p.name} className="flex items-center justify-between border rounded-md p-2">
                  <div>
                    <div className="font-medium">{p.name ?? "Unknown"}</div>
                    <div className="text-xs opacity-70">{p.steamId ?? "-"}</div>
                  </div>
                  <div className="text-xs opacity-70 text-right">
                    <div>HP: {p.health ?? "-"}</div>
                    <div>
                      Pos: {p.pos ? `${p.pos.x.toFixed(0)},${p.pos.y.toFixed(0)},${p.pos.z.toFixed(0)}` : "-"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
