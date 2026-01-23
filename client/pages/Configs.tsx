import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, apiPut } from "@/lib/http";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Configs() {
  const { toast } = useToast();
  const filesQ = useQuery({ queryKey: ["config-files"], queryFn: () => api<{ files: any[] }>("/config/files") });
  const rawQ = useQuery({ queryKey: ["servercfg-raw"], queryFn: () => api<{ raw: string }>("/config/servercfg") });

  const [raw, setRaw] = useState("");

  useEffect(() => {
    if (rawQ.data?.raw != null) setRaw(rawQ.data.raw);
  }, [rawQ.data?.raw]);

  const saveM = useMutation({
    mutationFn: () => apiPut("/config/servercfg", { raw }),
    onSuccess: () => toast({ title: "Kaydedildi", description: "server config güncellendi." }),
    onError: (err: any) =>
      toast({ title: "Hata", description: err?.message ?? String(err), variant: "destructive" }),
  });

  const fileLabel = filesQ.data?.files?.[0]?.label ?? "Server Config";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{fileLabel}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-xs opacity-70">
            Dosya yolu: {filesQ.data?.files?.[0]?.path ?? "—"}
          </div>

          <Textarea value={raw} onChange={(e) => setRaw(e.target.value)} className="min-h-[520px] font-mono text-xs" />

          <Button onClick={() => saveM.mutate()} disabled={saveM.isPending}>
            Kaydet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
