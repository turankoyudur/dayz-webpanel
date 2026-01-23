import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "@/lib/http";
import type { SettingsModel } from "@/types/settings";

type Props = {
  children: React.ReactNode;
};

export default function SetupGuard({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();

  const settings = useQuery({
    queryKey: ["settings"],
    queryFn: () => api<SettingsModel>("/settings"),
  });

  useEffect(() => {
    if (!settings.data) return;
    const setupComplete = !!settings.data.setupComplete;
    if (setupComplete) return;
    // Allow the user to access Settings during first-run, otherwise they can't fix paths.
    if (location.pathname.startsWith("/setup")) return;
    if (location.pathname.startsWith("/settings")) return;
    // Multi-instance management should be reachable even before setup is complete.
    if (location.pathname.startsWith("/instances")) return;

    navigate("/setup", { replace: true });
  }, [settings.data, location.pathname, navigate]);

  return <>{children}</>;
}
