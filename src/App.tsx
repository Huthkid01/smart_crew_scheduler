import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import { supabase } from "@/supabase/client";

function clearAuthStorage() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  if (!url) return;
  const ref = new URL(url).hostname.split(".")[0];
  const storageKey = `sb-${ref}-auth-token`;
  try {
    localStorage.removeItem(storageKey);
  } catch {
    return;
  }
}

function AuthWatcher() {
  const navigate = useNavigate();

  useEffect(() => {
    const recover = async () => {
      const { error } = await supabase.auth.getSession();
      if (error && typeof error.message === "string" && error.message.toLowerCase().includes("invalid refresh token")) {
        await supabase.auth.signOut();
        clearAuthStorage();
        navigate("/login");
      }
    };

    void recover();

    const { data } = supabase.auth.onAuthStateChange(async (event) => {
      if ((event as unknown as string) === "TOKEN_REFRESH_FAILED") {
        await supabase.auth.signOut();
        clearAuthStorage();
        navigate("/login");
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
}

function App() {
  return (
    <Router>
      <Toaster />
      <AuthWatcher />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/dashboard/*" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}

export default App;
