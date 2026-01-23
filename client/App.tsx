import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import SetupGuard from "./components/SetupGuard";
import Dashboard from "./pages/Dashboard";
import Console from "./pages/Console";
import Server from "./pages/Server";
import Mods from "./pages/Mods";
import Configs from "./pages/Configs";
import Logs from "./pages/Logs";
import ApiBridge from "./pages/ApiBridge";
import Settings from "./pages/Settings";
import Setup from "./pages/Setup";
import Instances from "./pages/Instances";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SetupGuard>
            <Layout>
              <Routes>
                <Route path="/setup" element={<Setup />} />
                <Route path="/instances" element={<Instances />} />
                <Route path="/" element={<Dashboard />} />
                <Route path="/server" element={<Server />} />
                <Route path="/mods" element={<Mods />} />
                <Route path="/console" element={<Console />} />
                <Route path="/configs" element={<Configs />} />
                <Route path="/logs" element={<Logs />} />
                <Route path="/apibridge" element={<ApiBridge />} />
                <Route path="/settings" element={<Settings />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </SetupGuard>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
