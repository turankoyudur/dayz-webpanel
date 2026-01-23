import type { recentActivity } from "@/components/dashboard/dashboardData";

type ActivityFeedCardProps = {
  items: typeof recentActivity;
};

export default function ActivityFeedCard({
  items,
}: ActivityFeedCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 h-full">
      <h3 className="text-xl font-bold text-foreground mb-6">
        Recent Activity
      </h3>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="pb-4 border-b border-border last:pb-0 last:border-0"
          >
            <p className="text-sm font-medium text-foreground">
              {item.action}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{item.player}</p>
            <p className="text-xs text-muted-foreground/60 mt-2">
              {item.time}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
