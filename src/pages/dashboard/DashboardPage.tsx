import { Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import Overview from "./Overview";
import SchedulePage from "./SchedulePage";
import EmployeesPage from "./EmployeesPage";
import AvailabilityPage from "./AvailabilityPage";
import ReportsPage from "./ReportsPage";
import ProfilePage from "./ProfilePage";
import SettingsPage from "./SettingsPage";

export default function DashboardPage() {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Overview />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="availability" element={<AvailabilityPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
