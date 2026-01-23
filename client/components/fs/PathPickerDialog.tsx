import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/http";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Folder, File } from "lucide-react";
import type { FsListResponse, FsRootsResponse, FsRoot } from "@/types/fs";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /**
   * If provided, the dialog will try to start from this path.
   * If it is outside of allowlisted roots, it will fall back to Data Root.
   */
  initialPath?: string;
  onSelect: (absolutePath: string) => void;
};

function joinNative(rootPath: string, relPath: string) {
  if (!relPath) return rootPath;
  const isWindows = rootPath.includes("\\");
  const sep = isWindows ? "\\" : "/";
  const base = rootPath.replace(/[\\/]+$/, "");
  const rel = isWindows ? relPath.replaceAll("/", "\\") : relPath;
  return `${base}${sep}${rel}`;
}

function tryResolveInitial(roots: FsRoot[], initialPath?: string) {
  if (!initialPath) return null;
  // Basic heuristic: choose a root whose path is a prefix of the initialPath.
  const norm = (p: string) => p.replaceAll("\\", "/").replace(/\/+$/, "");
  const init = norm(initialPath);
  const candidates = roots
    .map((r) => ({ r, rp: norm(r.path) }))
    .filter((x) => init === x.rp || init.startsWith(`${x.rp}/`))
    .sort((a, b) => b.rp.length - a.rp.length);
  if (!candidates.length) return null;
  const root = candidates[0].r;
  const rp = norm(root.path);
  const rel = init === rp ? "" : init.slice(rp.length + 1);
  return { rootId: root.id, relPath: rel };
}

export default function PathPickerDialog({ open, onOpenChange, title, initialPath, onSelect }: Props) {
  const rootsQ = useQuery({
    queryKey: ["fs-roots"],
    queryFn: () => api<FsRootsResponse>("/fs/roots"),
    enabled: open,
  });

  const roots = rootsQ.data?.roots ?? [];

  const defaultRootId = useMemo(() => {
    if (roots.find((r) => r.id === "dataRoot")) return "dataRoot";
    if (roots.find((r) => r.id === "panelRoot")) return "panelRoot";
    return roots[0]?.id ?? "";
  }, [roots]);

  const [rootId, setRootId] = useState<string>("");
  const [relPath, setRelPath] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    if (!roots.length) return;

    const resolved = tryResolveInitial(roots, initialPath);
    setRootId(resolved?.rootId ?? defaultRootId);
    setRelPath(resolved?.relPath ?? "");
  }, [open, roots.length, initialPath, defaultRootId]);

  const listQ = useQuery({
    queryKey: ["fs-list", rootId, relPath],
    queryFn: () => api<FsListResponse>(`/fs/list?rootId=${encodeURIComponent(rootId)}&path=${encodeURIComponent(relPath)}`),
    enabled: open && !!rootId,
  });

  const list = listQ.data;

  const breadcrumb = useMemo(() => {
    const parts = (list?.relPath ?? "").split("/").filter(Boolean);
    const items: { label: string; rel: string }[] = [{ label: "(root)", rel: "" }];
    let acc = "";
    for (const p of parts) {
      acc = acc ? `${acc}/${p}` : p;
      items.push({ label: p, rel: acc });
    }
    return items;
  }, [list?.relPath]);

  const canSelect = !!list?.root;
  const selectedAbs = list?.root ? joinNative(list.root.path, list.relPath) : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title ?? "Select a folder"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <div className="text-xs text-muted-foreground mb-1">Root</div>
              <Select value={rootId} onValueChange={(v) => { setRootId(v); setRelPath(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select root" />
                </SelectTrigger>
                <SelectContent>
                  {roots.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Path</div>
              <div className="text-sm border rounded-md px-3 py-2 bg-muted/30 break-all">
                {selectedAbs || "—"}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            {breadcrumb.map((b, idx) => (
              <Button
                key={`${b.rel}-${idx}`}
                variant={idx === breadcrumb.length - 1 ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setRelPath(b.rel)}
              >
                {b.label}
              </Button>
            ))}
            {list?.parentRelPath ? (
              <Button variant="outline" size="sm" onClick={() => setRelPath(list.parentRelPath)}>
                Up
              </Button>
            ) : null}
          </div>

          <div className="border rounded-md">
            <ScrollArea className="h-[360px]">
              <div className="p-2 space-y-1">
                {listQ.isLoading ? (
                  <div className="p-4 text-sm text-muted-foreground">Loading…</div>
                ) : listQ.isError ? (
                  <div className="p-4 text-sm text-destructive">Failed to load directory.</div>
                ) : (
                  (list?.entries ?? []).map((e) => (
                    <button
                      key={`${e.name}-${e.isDir}`}
                      className="w-full flex items-center gap-2 text-left px-2 py-2 rounded hover:bg-muted/50"
                      onClick={() => {
                        if (!e.isDir) return;
                        const next = list?.relPath ? `${list.relPath}/${e.name}` : e.name;
                        setRelPath(next);
                      }}
                      type="button"
                    >
                      {e.isDir ? <Folder className="w-4 h-4" /> : <File className="w-4 h-4" />}
                      <div className="flex-1">
                        <div className="text-sm font-medium">{e.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {e.isDir ? "Folder" : `${e.size} bytes`} • {new Date(e.mtimeMs).toLocaleString()}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canSelect}
            onClick={() => {
              if (!selectedAbs) return;
              onSelect(selectedAbs);
              onOpenChange(false);
            }}
          >
            Select this folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
