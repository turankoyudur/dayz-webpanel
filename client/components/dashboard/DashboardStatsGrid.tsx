import { Users, Zap, Clock, Activity } from "lucide-react";
import StatCard from "@/components/StatCard";

export default function DashboardStatsGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        label="Players Online"
        value="3/32"
        icon={<Users className="w-6 h-6" />}
        trend={{ value: 15, isPositive: true }}
        color="emerald"
      />
      <StatCard
        label="Server Uptime"
        value="12d 8h"
        icon={<Clock className="w-6 h-6" />}
        color="cyan"
      />
      <StatCard
        label="CPU Usage"
        value="24%"
        icon={<Zap className="w-6 h-6" />}
        trend={{ value: 5, isPositive: true }}
        color="amber"
      />
      <StatCard
        label="Network"
        value="145 Mbps"
        icon={<Activity className="w-6 h-6" />}
        trend={{ value: 2, isPositive: false }}
        color="cyan"
      />
    </div>
  );
}
