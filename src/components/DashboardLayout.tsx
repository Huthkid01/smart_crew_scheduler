import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { supabase } from "@/supabase/client";
import { Menu, PanelLeftOpen, Zap } from "lucide-react";
import { SmartCrewLogoMark } from "@/components/SmartCrewLogoMark";
import { Button } from "@/components/ui/button";

export function DashboardLayout() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/login");
      }
      setIsLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isLoading) {
    return (
      <div
        className="min-h-screen bg-black flex flex-col items-center justify-center gap-3 text-white"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading SmartCrew"
      >
        <SmartCrewLogoMark size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 sticky top-0 z-50">
        <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">SmartCrew</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      <Sidebar
        isOpen={isSidebarOpen}
        desktopOpen={isDesktopSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onDesktopToggle={() => setIsDesktopSidebarOpen((v) => !v)}
      />

      {!isDesktopSidebarOpen && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="hidden md:inline-flex fixed top-4 left-4 z-50 bg-zinc-950/80 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900"
          onClick={() => setIsDesktopSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </Button>
      )}
      
      <div className={isDesktopSidebarOpen ? "flex-1 md:ml-64 bg-zinc-950 min-h-screen" : "flex-1 md:ml-0 bg-zinc-950 min-h-screen"}>
        <main className="p-4 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
