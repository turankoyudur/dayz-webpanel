import { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "emerald" | "cyan" | "amber" | "red";
}

const colorClasses = {
  emerald: "bg-emerald-500/10 text-emerald-400",
  cyan: "bg-cyan-500/10 text-cyan-400",
  amber: "bg-amber-500/10 text-amber-400",
  red: "bg-red-500/10 text-red-400",
};

export default function StatCard({
  label,
  value,
  icon,
  trend,
  color = "emerald",
}: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        {trend && (
          <div
            className={`text-sm font-semibold ${
              trend.isPositive ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {trend.isPositive ? "+" : "-"}
            {trend.value}%
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
