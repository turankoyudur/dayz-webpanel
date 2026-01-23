import ActivityFeedCard from "@/components/dashboard/ActivityFeedCard";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardStatsGrid from "@/components/dashboard/DashboardStatsGrid";
import OnlinePlayersCard from "@/components/dashboard/OnlinePlayersCard";
import ServerControlsCard from "@/components/dashboard/ServerControlsCard";
import {
  onlinePlayers,
  recentActivity,
} from "@/components/dashboard/dashboardData";

export default function Dashboard() {
  return (
    <div className="p-6 lg:p-8">
      <DashboardHeader />
      <DashboardStatsGrid />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <OnlinePlayersCard players={onlinePlayers} />
        </div>
        <div>
          <ActivityFeedCard items={recentActivity} />
        </div>
      </div>

      <div className="mt-8">
        <ServerControlsCard />
      </div>
    </div>
  );
}
