import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, apiPost } from "@/lib/http";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Status = {
  ok: boolean;
  reason?: string;
  apiBridgePath: string;
};

export default function Console() {
  const { toast } = useToast();

  const [jsonText, setJsonText] = useState(() =>
    JSON.stringify(
      {
        type: "teleport",
        playerId: "STEAM64",
        x: 7500,
        y: 0,
        z: 7500,
      },
      null,
      2,
    ),
  );

  const statusM = useMutation({
    mutationFn: () => api<Status>("/apibridge/status"),
  });

  const sendM = useMutation({
    mutationFn: async () => {
      let body: unknown;
      try {
        body = JSON.parse(jsonText);
      } catch (e) {
        throw new Error("JSON parse failed: " + String(e));
      }
      return apiPost<{ ok: boolean; result: any }>("/apibridge/commands", body);
    },
    onSuccess: (data) => {
      toast({
        title: "Komut gönderildi",
        description: data?.result ? JSON.stringify(data.result) : "OK",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Komut hatası",
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    },
  });

  const parsed = useMemo(() => {
    try {
      JSON.parse(jsonText);
      return { ok: true, error: "" };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  }, [jsonText]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>API Console (ApiBridge)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => statusM.mutate()}
              disabled={statusM.isPending}
            >
              Durumu Kontrol Et
            </Button>
            <Button onClick={() => sendM.mutate()} disabled={!parsed.ok || sendM.isPending}>
              Komutu Gönder
            </Button>
          </div>

          {statusM.data ? (
            <div className="text-sm opacity-80">
              Status: <b>{statusM.data.ok ? "OK" : "NOT READY"}</b>{" "}
              {statusM.data.reason ? `(${statusM.data.reason})` : ""}
              <div>Path: {statusM.data.apiBridgePath}</div>
            </div>
          ) : null}

          <div className="space-y-1">
            <div className="text-sm font-medium">Komut JSON</div>
            <Textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="min-h-[260px] font-mono text-xs"
            />
            {!parsed.ok ? (
              <div className="text-xs text-red-600">JSON hatası: {parsed.error}</div>
            ) : (
              <div className="text-xs opacity-60">type + playerId + alanlar mod tarafındaki komutlara göre değişir.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
