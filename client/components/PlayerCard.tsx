interface PlayerCardProps {
  name: string;
  playerId: string;
  playtime: string;
  status: "online" | "offline" | "idle";
  kills: number;
  deaths: number;
}

const statusColors = {
  online: "status-online",
  offline: "status-offline",
  idle: "status-warning",
};

const statusLabels = {
  online: "Online",
  offline: "Offline",
  idle: "Idle",
};

export default function PlayerCard({
  name,
  playerId,
  playtime,
  status,
  kills,
  deaths,
}: PlayerCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="font-semibold text-foreground truncate">{name}</p>
          <p className="text-xs text-muted-foreground">ID: {playerId}</p>
        </div>
        <span className={`status-badge ${statusColors[status]}`}>
          <div className="w-1.5 h-1.5 rounded-full bg-current" />
          {statusLabels[status]}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3 pb-3 border-b border-border">
        <div>
          <p className="text-xs text-muted-foreground">Playtime</p>
          <p className="text-sm font-semibold text-foreground">{playtime}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Kills</p>
          <p className="text-sm font-semibold text-emerald-400">{kills}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Deaths</p>
          <p className="text-sm font-semibold text-red-400">{deaths}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button className="flex-1 px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80 text-sm font-medium text-secondary-foreground transition-colors">
          Kick
        </button>
        <button className="flex-1 px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80 text-sm font-medium text-secondary-foreground transition-colors">
          Ban
        </button>
      </div>
    </div>
  );
}
