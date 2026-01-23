import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiDelete, apiPatch, apiPost } from "@/lib/http";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type InstanceSummary = {
  id: string;
  displayName: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type InstancesList = {
  activeId: string;
  instances: InstanceSummary[];
};

function validateInstanceId(id: string) {
  // Conservative slug validation.
  // Server enforces only non-empty; this keeps UX clean.
  return /^[a-z0-9][a-z0-9_-]{0,31}$/i.test(id);
}

export default function Instances() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["instances"],
    queryFn: () => api<InstancesList>("/instances"),
    refetchInterval: 5000,
  });

  const activeId = q.data?.activeId ?? "default";
  const instances = useMemo(
    () => (q.data?.instances ?? []).slice().sort((a, b) => a.id.localeCompare(b.id)),
    [q.data?.instances],
  );

  const [newId, setNewId] = useState("");
  const [newName, setNewName] = useState("");

  const createM = useMutation({
    mutationFn: async () => {
      const id = newId.trim();
      const displayName = newName.trim();
      if (!id) throw new Error("Instance id gerekli");
      if (!validateInstanceId(id)) {
        throw new Error("Instance id geçersiz. Örn: srv1, chernarus-1, test_a");
      }
      return apiPost("/instances", { id, displayName: displayName || undefined });
    },
    onSuccess: () => {
      setNewId("");
      setNewName("");
      qc.invalidateQueries({ queryKey: ["instances"] });
      toast({ title: "Instance oluşturuldu", description: "Yeni instance aktif yapıldı." });
      // Active instance changed (backend). Reload to avoid cross-instance cache confusion.
      window.location.reload();
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err?.message ?? String(err), variant: "destructive" });
    },
  });

  const setActiveM = useMutation({
    mutationFn: (id: string) => apiPatch(`/instances/${encodeURIComponent(id)}/active`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instances"] });
      window.location.reload();
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err?.message ?? String(err), variant: "destructive" });
    },
  });

  const renameM = useMutation({
    mutationFn: ({ id, displayName }: { id: string; displayName: string }) =>
      apiPatch(`/instances/${encodeURIComponent(id)}`, { displayName }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instances"] });
      toast({ title: "Güncellendi", description: "Instance adı güncellendi." });
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err?.message ?? String(err), variant: "destructive" });
    },
  });

  const archiveM = useMutation({
    mutationFn: (id: string) => apiDelete(`/instances/${encodeURIComponent(id)}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["instances"] });
      toast({ title: "Arşivlendi", description: "Instance arşivlendi (silinmedi)." });
    },
    onError: (err: any) => {
      toast({ title: "Hata", description: err?.message ?? String(err), variant: "destructive" });
    },
  });

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");

  const visible = instances.filter((i) => !i.archivedAt);

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Instances</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Instance ID</Label>
              <Input
                value={newId}
                onChange={(e) => setNewId(e.target.value)}
                placeholder="default, srv1, chernarus-1"
              />
              <div className="text-xs text-muted-foreground">
                Harf/rakam, “-” ve “_” kullan. (max 32)
              </div>
            </div>

            <div className="space-y-2">
              <Label>Görünen Ad (opsiyonel)</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="My Chernarus Server" />
            </div>

            <div className="flex items-end">
              <Button onClick={() => createM.mutate()} disabled={createM.isPending} className="w-full">
                Instance Oluştur
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {q.isLoading ? <div className="text-sm opacity-70">Yükleniyor…</div> : null}
        {q.isError ? (
          <div className="text-sm text-red-600">Instances yüklenemedi: {(q.error as any)?.message ?? String(q.error)}</div>
        ) : null}

        {visible.length === 0 && !q.isLoading ? (
          <div className="text-sm opacity-70">Kayıtlı instance yok.</div>
        ) : null}

        {visible.map((i) => {
          const isActive = i.id === activeId;
          const isEditing = editId === i.id;

          return (
            <Card key={i.id}>
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{i.displayName ?? i.id}</div>
                      {isActive ? <Badge>ACTIVE</Badge> : null}
                    </div>
                    <div className="text-xs opacity-70">ID: {i.id}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveM.mutate(i.id)}
                        disabled={setActiveM.isPending}
                      >
                        Aktif Yap
                      </Button>
                    ) : null}

                    {!isEditing ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditId(i.id);
                          setEditName(i.displayName ?? "");
                        }}
                      >
                        Adı Düzenle
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditId(null);
                            setEditName("");
                          }}
                        >
                          İptal
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            const n = editName.trim();
                            if (!n) {
                              toast({
                                title: "Hata",
                                description: "Görünen ad boş olamaz.",
                                variant: "destructive",
                              });
                              return;
                            }
                            renameM.mutate({ id: i.id, displayName: n });
                            setEditId(null);
                          }}
                          disabled={renameM.isPending}
                        >
                          Kaydet
                        </Button>
                      </>
                    )}

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (i.id === "default") {
                          toast({
                            title: "Engellendi",
                            description: "default instance arşivlenemez.",
                            variant: "destructive",
                          });
                          return;
                        }
                        if (!confirm(`Instance arşivlensin mi? (${i.id})`)) return;
                        archiveM.mutate(i.id);
                      }}
                      disabled={archiveM.isPending}
                    >
                      Arşivle
                    </Button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label>Görünen Ad</Label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </div>
                    <div className="text-xs opacity-70 self-end">
                      Not: Instance ID değiştirilemez. (Rename, displayName ile yapılır.)
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
