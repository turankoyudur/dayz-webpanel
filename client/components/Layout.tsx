import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/http";
import {
  Menu,
  X,
  Zap,
  Users,
  Settings,
  BarChart3,
  Shield,
  LogOut,
  Layers,
} from "lucide-react";

import InstanceSelector from "./InstanceSelector";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: <BarChart3 className="w-5 h-5" /> },
  { label: "Instances", href: "/instances", icon: <Layers className="w-5 h-5" /> },
  { label: "Server", href: "/server", icon: <Zap className="w-5 h-5" /> },
  { label: "Mods", href: "/mods", icon: <Users className="w-5 h-5" /> },
  { label: "API Console", href: "/console", icon: <Zap className="w-5 h-5" /> },
  { label: "API Bridge", href: "/apibridge", icon: <Shield className="w-5 h-5" /> },
  { label: "Configs", href: "/configs", icon: <Shield className="w-5 h-5" /> },
  { label: "Logs", href: "/logs", icon: <BarChart3 className="w-5 h-5" /> },
  { label: "Settings", href: "/settings", icon: <Settings className="w-5 h-5" /> },
];

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const isActive = (href: string) => location.pathname === href;

  const serverStatus = useQuery({
    queryKey: ["server-status"],
    queryFn: () => api<{ running: boolean }>("/server/status"),
    refetchInterval: 3000,
  });

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-sidebar transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-6 py-8 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center">
                <Shield className="w-6 h-6 text-sidebar-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-sidebar-foreground">
                  DayZ
                </h1>
                <p className="text-xs text-sidebar-foreground/60">Server Panel</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`nav-link ${
                  isActive(item.href) ? "nav-link-active" : ""
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border space-y-4">
            <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200">
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
            <div className="px-4 py-3 bg-sidebar-accent/20 rounded-lg border border-sidebar-border">
              <p className="text-xs font-semibold text-sidebar-foreground mb-1">
                Server Status
              </p>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    serverStatus.data?.running ? "bg-status-online animate-pulse" : "bg-status-offline"
                  }`}
                />
                <span className="text-xs text-sidebar-foreground/70">
                  {serverStatus.data?.running ? "Running" : "Stopped"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4 lg:py-6 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-secondary rounded-lg transition-colors"
          >
            {sidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>

          <div className="hidden lg:block text-lg font-semibold text-foreground">
            DayZ Server Management
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:block">
              <InstanceSelector />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">Administrator</p>
              <p className="text-xs text-muted-foreground">Connected</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
