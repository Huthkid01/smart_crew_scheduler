import { Toaster } from "@/components/ui/sonner";
import { useEffect, type ReactNode } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate, Link, Navigate } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import LoginPage from "@/pages/auth/LoginPage";
import SignupPage from "@/pages/auth/SignupPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/auth/ResetPasswordPage";
import DashboardPage from "@/pages/dashboard/DashboardPage";
import { getSessionSafe, supabase } from "@/supabase/client";

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
      try {
        const { error } = await getSessionSafe();
        if (error && typeof error.message === "string" && error.message.toLowerCase().includes("invalid refresh token")) {
          await supabase.auth.signOut();
          clearAuthStorage();
          navigate("/login");
        }
      } catch (error) {
        const messageValue =
          error && typeof error === "object" && "message" in error
            ? (error as { message?: unknown }).message
            : undefined;
        const message = typeof messageValue === "string" ? messageValue : "";
        if (message.toLowerCase().includes("invalid refresh token")) {
          await supabase.auth.signOut();
          clearAuthStorage();
          navigate("/login");
        }
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

function LegalPageShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link to="/" className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Back to Home
          </Link>
          <Link to="/signup" className="text-sm text-primary hover:underline">
            Get Started
          </Link>
        </div>

        <div className="rounded-xl border border-white/10 bg-zinc-900 p-6 md:p-10">
          <h1 className="text-3xl font-bold">{title}</h1>
          <div className="mt-2 text-sm text-gray-400">Last updated: May 2026</div>
          <div className="mt-8 space-y-6 text-sm text-gray-300 leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

function PrivacyPolicyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <div>
        SmartCrew Scheduler respects your privacy. This policy explains what we collect, how we use it, and your choices.
      </div>
      <div>
        <div className="font-semibold text-white">What we collect</div>
        <div className="mt-2">
          Account details (email, name), organization details, scheduling data, time tracking entries, and basic usage
          information required to operate the service.
        </div>
      </div>
      <div>
        <div className="font-semibold text-white">How we use data</div>
        <div className="mt-2">
          To provide authentication, create schedules, track time, generate reports, send transactional emails, and
          improve reliability and security.
        </div>
      </div>
      <div>
        <div className="font-semibold text-white">Data sharing</div>
        <div className="mt-2">
          We do not sell personal data. We may use trusted service providers to run core features (for example, email
          delivery and infrastructure).
        </div>
      </div>
      <div>
        <div className="font-semibold text-white">Contact</div>
        <div className="mt-2">
          Email us at{" "}
          <a className="text-primary hover:underline" href="mailto:smartcrewscheduler@gmail.com">
            smartcrewscheduler@gmail.com
          </a>
          .
        </div>
      </div>
    </LegalPageShell>
  );
}

function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service">
      <div>
        By using SmartCrew Scheduler, you agree to these terms. If you do not agree, do not use the service.
      </div>
      <div>
        <div className="font-semibold text-white">Accounts</div>
        <div className="mt-2">
          You are responsible for your account, keeping credentials secure, and ensuring your organization users follow
          these terms.
        </div>
      </div>
      <div>
        <div className="font-semibold text-white">Acceptable use</div>
        <div className="mt-2">
          Do not abuse the service, attempt unauthorized access, or use the platform for unlawful activities.
        </div>
      </div>
      <div>
        <div className="font-semibold text-white">Availability</div>
        <div className="mt-2">
          The service is provided on an “as is” basis. We work to keep it reliable, but outages may occur.
        </div>
      </div>
      <div>
        <div className="font-semibold text-white">Contact</div>
        <div className="mt-2">
          Questions about these terms? Email{" "}
          <a className="text-primary hover:underline" href="mailto:smartcrewscheduler@gmail.com">
            smartcrewscheduler@gmail.com
          </a>
          .
        </div>
      </div>
    </LegalPageShell>
  );
}

function TawkRouteWatcher() {
  const location = useLocation();

  useEffect(() => {
    const isHome = location.pathname === "/";

    const apply = () => {
      const api = (window as unknown as { Tawk_API?: { showWidget?: () => void; hideWidget?: () => void; minimize?: () => void } }).Tawk_API;
      if (!api) return;
      if (isHome) {
        api.showWidget?.();
      } else {
        api.minimize?.();
        api.hideWidget?.();
      }
    };

    apply();
    const t1 = window.setTimeout(apply, 300);
    const t2 = window.setTimeout(apply, 1200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [location.pathname]);

  return null;
}

function App() {
  return (
    <Router>
      <Toaster />
      <AuthWatcher />
      <TawkRouteWatcher />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/dashboard/*" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
