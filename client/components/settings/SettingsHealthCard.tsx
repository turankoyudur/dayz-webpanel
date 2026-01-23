import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type HealthCheck = {
  key: string;
  label: string;
  exists: boolean;
};

type SettingsHealthCardProps = {
  checks?: HealthCheck[];
};

export default function SettingsHealthCard({
  checks,
}: SettingsHealthCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Check</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        {checks?.map((check) => (
          <div
            key={check.key}
            className="flex items-center justify-between gap-3"
          >
            <div className="font-medium">{check.label}</div>
            <div
              className={`text-xs ${
                check.exists ? "text-status-online" : "text-status-offline"
              }`}
            >
              {check.exists ? "OK" : "Missing"}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          If a path is missing, fix it here. The panel is designed so you don't
          have to manually edit config files.
        </p>
      </CardContent>
    </Card>
  );
}
