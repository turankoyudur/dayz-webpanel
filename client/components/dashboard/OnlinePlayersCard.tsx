import PlayerCard from "@/components/PlayerCard";
import type { onlinePlayers } from "@/components/dashboard/dashboardData";

type OnlinePlayersCardProps = {
  players: typeof onlinePlayers;
};

export default function OnlinePlayersCard({
  players,
}: OnlinePlayersCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-foreground">Online Players</h3>
        <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-semibold">
          {players.length} Active
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {players.map((player) => (
          <PlayerCard
            key={player.id}
            name={player.name}
            playerId={player.playerId}
            playtime={player.playtime}
            status={player.status}
            kills={player.kills}
            deaths={player.deaths}
          />
        ))}
      </div>
    </div>
  );
}
