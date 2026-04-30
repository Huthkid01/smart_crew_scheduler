import { Routes, Route, Navigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import Overview from "./Overview";
import SchedulePage from "./SchedulePage";
import EmployeesPage from "./EmployeesPage";
import AvailabilityPage from "./AvailabilityPage";
import ReportsPage from "./ReportsPage";
import ProfilePage from "./ProfilePage";
import SettingsPage from "./SettingsPage";
import EmployeeDashboard from "./EmployeeDashboard";
import { useEffect, useState } from "react";
import { getSessionSafe, supabase } from "@/supabase/client";
import { SmartCrewLogoMark } from "@/components/SmartCrewLogoMark";

export default function DashboardPage() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data } = await getSessionSafe();
        const user = data.session?.user ?? null;
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const role =
          (profile as unknown as { role?: string | null } | null)?.role ?? "employee";
        setUserRole(role);
      } catch (error) {
        console.error("Error checking role:", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkRole();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <SmartCrewLogoMark size="sm" />
      </div>
    );
  }

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        {/* Redirect root /dashboard to appropriate sub-route */}
        <Route index element={<Navigate to={userRole === 'employee' ? "home" : "overview"} replace />} />
        
        {/* Explicit Routes for Dashboards */}
        <Route path="home" element={userRole === 'employee' ? <EmployeeDashboard /> : <Navigate to="/dashboard/overview" replace />} />
        <Route path="overview" element={userRole !== 'employee' ? <Overview /> : <Navigate to="/dashboard/home" replace />} />

        {/* Shared Routes */}
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />

        {/* Admin Only Routes */}
        {userRole !== 'employee' && (
            <>
                <Route path="schedule" element={<SchedulePage />} />
                <Route path="availability" element={<AvailabilityPage />} />
                <Route path="employees" element={<EmployeesPage />} />
                <Route path="reports" element={<ReportsPage />} />
            </>
        )}
      </Route>
    </Routes>
  );
}
