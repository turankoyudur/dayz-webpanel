import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiPatch, apiPost } from "@/lib/http";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type Mod = {
  workshopId: string;
  name: string | null;
  folderName?: string | null;
  enabled: boolean;
  installedPath: string | null;
  lastUpdateTs: number | null;
  sizeBytes: number | null;
};

type WorkshopSearchResult = {
  workshopId: string;
  name: string;
  lastUpdateTs?: number;
  sizeBytes?: number;
  subscriptions?: number;
};

type WorkshopSearchResponse = {
  total: number;
  results: WorkshopSearchResult[];
};

export default function Mods() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [workshopId, setWorkshopId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [collectionId, setCollectionId] = useState("");

  // --- Data ---
  const mods = useQuery({
    queryKey: ["mods"],
    queryFn: () => api<Mod[]>("/mods"),
    refetchInterval: 5000,
  });

  const list = mods.data ?? [];
  const enabledCount = useMemo(() => list.filter((m) => m.enabled).length, [list]);
  const downloadedMods = useMemo(() => list.filter((m) => !!m.installedPath), [list]);
  const catalogMods = useMemo(() => list.filter((m) => !m.installedPath), [list]);

  // --- Mutations ---
  const add = useMutation({
    mutationFn: (id: string) => apiPost<Mod>("/mods/add", { workshopId: id }),
    onSuccess: () => {
      setWorkshopId("");
      qc.invalidateQueries({ queryKey: ["mods"] });
      toast({ title: "Mod added" });
    },
    onError: (e: any) => toast({ title: "Add failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const search = useQuery({
    queryKey: ["mods-search", searchQuery],
    queryFn: () =>
      api<WorkshopSearchResponse>(`/mods/search?query=${encodeURIComponent(searchQuery)}`),
    enabled: searchQuery.trim().length >= 2,
  });

  const importCollection = useMutation({
    mutationFn: (id: string) =>
      apiPost<{ total: number; added: number }>("/mods/collection", { collectionId: id }),
    onSuccess: (data) => {
      setCollectionId("");
      qc.invalidateQueries({ queryKey: ["mods"] });
      toast({ title: "Collection imported", description: `Added ${data.added}/${data.total} mods.` });
    },
    onError: (e: any) =>
      toast({ title: "Collection import failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const install = useMutation({
    mutationFn: (id: string) => apiPost<any>("/mods/install", { workshopId: id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mods"] });
      toast({ title: "Download complete (or queued)" });
    },
    onError: (e: any) => toast({ title: "Download failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const toggle = useMutation({
    mutationFn: (payload: { id: string; enabled: boolean }) =>
      apiPatch<Mod>("/mods/enable", { workshopId: payload.id, enabled: payload.enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["mods"] });
    },
    onError: (e: any) => toast({ title: "Update failed", description: `${e.code ?? ""} ${e.message}` }),
  });

  const scan = useMutation({
    mutationFn: () => api<any>("/mods/scan"),
    onSuccess: () => toast({ title: "Scan complete" }),
  });

  const refresh = useMutation({
    mutationFn: () => apiPost<{ total: number; refreshed: number }>("/mods/refresh", {}),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["mods"] });
      toast({ title: "Metadata refreshed", description: `${data.refreshed}/${data.total} updated.` });
    },
  });

  const syncKeys = useMutation({
    mutationFn: () => apiPost<{ copied: number; missing: string[] }>("/mods/keys/sync", {}),
    onSuccess: (data) => {
      toast({
        title: "Keys synchronized",
        description: `${data.copied} keys copied. Missing keys for ${data.missing.length} mods.`,
      });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mods</h2>
          <p className="text-sm text-muted-foreground">
            Search Workshop → download via SteamCMD → enable on the server (-mod=@folderName).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => scan.mutate()} disabled={scan.isPending}>
            Scan Disk
          </Button>
          <Button variant="secondary" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
            Refresh Metadata
          </Button>
          <Button variant="secondary" onClick={() => syncKeys.mutate()} disabled={syncKeys.isPending}>
            Sync Keys
          </Button>
        </div>
      </div>

      {/* Manual add for power users */}
      <Card>
        <CardHeader>
          <CardTitle>Add by Workshop ID</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-3">
          <Input
            placeholder="Workshop ID (numbers)"
            value={workshopId}
            onChange={(e) => setWorkshopId(e.target.value)}
          />
          <Button onClick={() => add.mutate(workshopId)} disabled={!workshopId || add.isPending}>
            Add
          </Button>
          <div className="text-xs text-muted-foreground md:ml-auto flex items-center">
            Enabled: {enabledCount}
          </div>
        </CardContent>
      </Card>

      {/* Search + download */}
      <Card>
        <CardHeader>
          <CardTitle>Steam Workshop Search</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <Input
              placeholder="Search DayZ Workshop mods (requires Steam Web API key for best results)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            {search.isFetching && <div className="text-sm text-muted-foreground">Searching...</div>}

            {(search.data?.results ?? []).map((item) => (
              <div
                key={item.workshopId}
                className="flex flex-col md:flex-row md:items-center gap-2 border rounded-md p-3"
              >
                <div className="flex-1">
                  <div className="font-medium">{item.name || `Workshop ${item.workshopId}`}</div>
                  <div className="text-xs text-muted-foreground">
                    ID: {item.workshopId}
                    {item.lastUpdateTs
                      ? ` • Updated ${new Date(item.lastUpdateTs * 1000).toLocaleString()}`
                      : ""}
                    {item.subscriptions ? ` • Subs ${item.subscriptions.toLocaleString()}` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => add.mutate(item.workshopId)}>
                    Add
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => install.mutate(item.workshopId)}
                    disabled={install.isPending}
                  >
                    Download
                  </Button>
                </div>
              </div>
            ))}

            {searchQuery.trim().length >= 2 && (search.data?.results?.length ?? 0) === 0 && !search.isFetching && (
              <div className="text-sm text-muted-foreground">No results found.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Collection */}
      <Card>
        <CardHeader>
          <CardTitle>Import Collection</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-3">
          <Input
            placeholder="Workshop Collection ID"
            value={collectionId}
            onChange={(e) => setCollectionId(e.target.value)}
          />
          <Button
            onClick={() => importCollection.mutate(collectionId)}
            disabled={!collectionId || importCollection.isPending}
          >
            Import
          </Button>
        </CardContent>
      </Card>

      {/* Downloaded */}
      <Card>
        <CardHeader>
          <CardTitle>Downloaded Mods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {downloadedMods.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No downloaded mods yet. Use Workshop Search above and click Download.
            </div>
          ) : null}

          {downloadedMods.map((m) => (
            <div key={m.workshopId} className="border rounded-md p-3">
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <div className="flex-1">
                  <div className="font-medium truncate">{m.name ?? `Workshop ${m.workshopId}`}</div>
                  <div className="text-xs text-muted-foreground">
                    ID: {m.workshopId}
                    {m.folderName ? ` • Folder: @${m.folderName}` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Enabled</span>
                    <Switch
                      checked={m.enabled}
                      onCheckedChange={(v) => toggle.mutate({ id: m.workshopId, enabled: v })}
                    />
                  </div>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => install.mutate(m.workshopId)}
                    disabled={install.isPending}
                  >
                    Update
                  </Button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Installed Path</div>
                  <div className="font-medium truncate">{m.installedPath ?? "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Updated</div>
                  <div className="font-medium">
                    {m.lastUpdateTs ? new Date(m.lastUpdateTs * 1000).toISOString() : "-"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Size</div>
                  <div className="font-medium">
                    {m.sizeBytes ? `${Math.round(m.sizeBytes / (1024 * 1024))} MB` : "-"}
                  </div>
                </div>
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Tip: If DayZ doesn&apos;t load a mod, ensure the panel has permissions to create junctions
                inside your DayZ server directory.
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Catalog */}
      <Card>
        <CardHeader>
          <CardTitle>Catalog (Not Downloaded Yet)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {catalogMods.length === 0 ? (
            <div className="text-sm text-muted-foreground">No catalog mods.</div>
          ) : null}

          {catalogMods.map((m) => (
            <div key={m.workshopId} className="flex flex-col md:flex-row md:items-center gap-2 border rounded-md p-3">
              <div className="flex-1">
                <div className="font-medium">{m.name ?? `Workshop ${m.workshopId}`}</div>
                <div className="text-xs text-muted-foreground">ID: {m.workshopId}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => install.mutate(m.workshopId)} disabled={install.isPending}>
                  Download
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
