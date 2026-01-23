import { useMutation, useQuery } from "@tanstack/react-query";
import { api, apiPatch } from "@/lib/http";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

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

export default function InstanceSelector() {
  const { toast } = useToast();

  const q = useQuery({
    queryKey: ["instances"],
    queryFn: () => api<InstancesList>("/instances"),
    refetchInterval: 5000,
  });

  const m = useMutation({
    mutationFn: (id: string) => apiPatch(`/instances/${encodeURIComponent(id)}/active`, {}),
    onSuccess: () => {
      // Easiest way to ensure all per-instance caches reflect the new active instance.
      window.location.reload();
    },
    onError: (err: any) => {
      toast({
        title: "Instance değiştirilemedi",
        description: err?.message ?? String(err),
        variant: "destructive",
      });
    },
  });

  const activeId = q.data?.activeId ?? "default";
  const instances = (q.data?.instances ?? []).filter((i) => !i.archivedAt);

  return (
    <div className="flex items-center gap-2">
      <Select value={activeId} onValueChange={(id) => m.mutate(id)} disabled={m.isPending || q.isLoading}>
        <SelectTrigger className="w-[220px]">
          <SelectValue placeholder="Instance" />
        </SelectTrigger>
        <SelectContent>
          {instances.map((i) => (
            <SelectItem key={i.id} value={i.id}>
              {i.displayName ?? i.id} ({i.id})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" asChild>
        <Link to="/instances">Manage</Link>
      </Button>
    </div>
  );
}
