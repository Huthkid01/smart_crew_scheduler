import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { getSessionSafe, supabase } from "@/supabase/client";
import { Menu, Zap } from "lucide-react";
import { SmartCrewLogoMark } from "@/components/SmartCrewLogoMark";
import { Button } from "@/components/ui/button";
import { OrgSettingsContext } from "@/contexts/orgSettings";

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "manager" | "employee" | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [currencyCode, setCurrencyCode] = useState<string>("USD");
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const highlightSelectorRef = useRef<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await getSessionSafe();
      if (!session) {
        navigate("/login");
        return;
      }
      setUserId(session.user.id);
      setIsLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/login");
        return;
      }
      setUserId(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const api = (window as unknown as { Tawk_API?: { hideWidget?: () => void; minimize?: () => void; onLoad?: () => void } }).Tawk_API;
    api?.minimize?.();
    api?.hideWidget?.();

    if (api) {
      api.onLoad = () => {
        api.minimize?.();
        api.hideWidget?.();
      };
    }
  }, [location.pathname]);

  useEffect(() => {
    const loadRole = async () => {
      if (!userId) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, org_id")
        .eq("id", userId)
        .maybeSingle();

      const role =
        (profile as unknown as { role?: "admin" | "manager" | "employee" | null } | null)?.role ?? "employee";
      setUserRole(role);

      const orgId = (profile as unknown as { org_id?: string | null } | null)?.org_id ?? null;
      if (orgId) {
        const { data: org } = await supabase
          .from("organizations")
          .select("name, currency_code")
          .eq("id", orgId)
          .maybeSingle();
        const name = (org as unknown as { name?: string | null } | null)?.name ?? null;
        const currency = (org as unknown as { currency_code?: string | null } | null)?.currency_code ?? "USD";
        setOrgName(name);
        setCurrencyCode(currency);
      } else {
        setOrgName(null);
        setCurrencyCode("USD");
      }
    };

    void loadRole();
  }, [userId]);

  useEffect(() => {
    const onOrgSettingsUpdated = () => {
      if (!userId) return;
      const load = async () => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("org_id")
          .eq("id", userId)
          .maybeSingle();
        const orgId = (profile as unknown as { org_id?: string | null } | null)?.org_id ?? null;
        if (!orgId) return;
        const { data: org } = await supabase
          .from("organizations")
          .select("name, currency_code")
          .eq("id", orgId)
          .maybeSingle();
        const name = (org as unknown as { name?: string | null } | null)?.name ?? null;
        const currency = (org as unknown as { currency_code?: string | null } | null)?.currency_code ?? "USD";
        setOrgName(name);
        setCurrencyCode(currency);
      };
      void load();
    };

    window.addEventListener("smartcrew:orgSettingsUpdated", onOrgSettingsUpdated as EventListener);
    return () => window.removeEventListener("smartcrew:orgSettingsUpdated", onOrgSettingsUpdated as EventListener);
  }, [userId]);

  const tourSteps = useMemo(() => {
    type Step = { id: string; title: string; body: string; selector?: string; path?: string };
    const steps: Step[] = [
      {
        id: "welcome",
        title: "Welcome to SmartCrew",
        body: "This quick tour will show you where everything is. You can skip it anytime.",
      },
    ];

    if (userRole === "employee") {
      steps.push(
        {
          id: "home",
          title: "Your Home",
          body: "This is your dashboard home. You’ll see your next shifts and key actions here.",
          selector: '[data-tour="nav-home"]',
          path: "/dashboard/home",
        },
        {
          id: "profile",
          title: "Profile",
          body: "Update your personal details here.",
          selector: '[data-tour="nav-profile"]',
          path: "/dashboard/profile",
        },
        {
          id: "settings",
          title: "Organization Settings",
          body: "View your organization details here.",
          selector: '[data-tour="nav-organization-settings"]',
          path: "/dashboard/settings",
        },
      );
    } else if (userRole === "admin" || userRole === "manager") {
      steps.push(
        {
          id: "overview",
          title: "Home",
          body: "Start here for a quick snapshot of your team and operations.",
          selector: '[data-tour="nav-overview"]',
          path: "/dashboard/overview",
        },
        {
          id: "schedule",
          title: "Schedule",
          body: "Create, publish, and manage shifts here.",
          selector: '[data-tour="nav-schedule"]',
          path: "/dashboard/schedule",
        },
        {
          id: "employees",
          title: "Employees",
          body: "Add employees, invite them, and manage roles.",
          selector: '[data-tour="nav-employees"]',
          path: "/dashboard/employees",
        },
        {
          id: "availability",
          title: "Time Off Requests",
          body: "Approve or decline employee time off requests here.",
          selector: '[data-tour="nav-availability"]',
          path: "/dashboard/availability",
        },
        {
          id: "reports",
          title: "Reports",
          body: "Track hours, costs, and performance trends.",
          selector: '[data-tour="nav-reports"]',
          path: "/dashboard/reports",
        },
        {
          id: "settings",
          title: "Organization Settings",
          body: "Update organization details and currency here.",
          selector: '[data-tour="nav-organization-settings"]',
          path: "/dashboard/settings",
        },
        {
          id: "profile",
          title: "Profile",
          body: "Update your profile details here.",
          selector: '[data-tour="nav-profile"]',
          path: "/dashboard/profile",
        },
      );
    }

    return steps;
  }, [userRole]);

  useEffect(() => {
    if (!userId) return;
    if (!userRole) return;
    if (tourSteps.length <= 1) return;

    const key = `smartcrew:quickTour:v1:${userId}`;
    const alreadyDone = window.localStorage.getItem(key) === "done";
    if (alreadyDone) return;

    const id = window.setTimeout(() => {
      setTourOpen(true);
      setTourStepIndex(0);
    }, 0);
    return () => window.clearTimeout(id);
  }, [tourSteps.length, userId, userRole]);

  useEffect(() => {
    if (!tourOpen) return;

    const step = tourSteps[tourStepIndex];
    if (!step) return;

    if (step.path && location.pathname !== step.path) {
      navigate(step.path);
    }
  }, [location.pathname, navigate, tourOpen, tourStepIndex, tourSteps]);

  useEffect(() => {
    if (!tourOpen) return;

    const step = tourSteps[tourStepIndex];
    const selector = step?.selector ?? null;
    highlightSelectorRef.current = selector;

    const ensureNavVisible = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(true);
      } else {
        setIsDesktopSidebarOpen(true);
      }
    };

    const updateRect = () => {
      const s = highlightSelectorRef.current;
      if (!s) {
        setHighlightRect(null);
        return;
      }
      const el = document.querySelector(s) as HTMLElement | null;
      if (!el) {
        setHighlightRect(null);
        return;
      }
      el.scrollIntoView({ block: "center", inline: "nearest", behavior: "smooth" });
      setHighlightRect(el.getBoundingClientRect());
    };

    ensureNavVisible();
    const start = window.setTimeout(updateRect, 50);

    const onResize = () => updateRect();
    const onScroll = () => updateRect();
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });

    return () => {
      window.clearTimeout(start);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [tourOpen, tourStepIndex, tourSteps]);

  const dismissTour = () => {
    if (userId) {
      window.localStorage.setItem(`smartcrew:quickTour:v1:${userId}`, "done");
    }
    setHighlightRect(null);
    highlightSelectorRef.current = null;
    setTourOpen(false);
  };

  const nextTourStep = () => {
    if (tourStepIndex >= tourSteps.length - 1) {
      dismissTour();
      return;
    }
    setTourStepIndex((i) => Math.min(tourSteps.length - 1, i + 1));
  };

  const prevTourStep = () => {
    setTourStepIndex((i) => Math.max(0, i - 1));
  };

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

  const currentTourStep = tourSteps[tourStepIndex];
  const tooltipPos = (() => {
    const fallback = { left: 16, top: 16, anchor: "top-left" as const };
    if (!highlightRect) return fallback;

    const padding = 16;
    const preferredLeft = highlightRect.right + 16;
    const preferredTop = highlightRect.top + highlightRect.height * 0.2;
    const maxLeft = window.innerWidth - 360 - padding;
    const maxTop = window.innerHeight - 240 - padding;

    const left = Math.max(padding, Math.min(maxLeft, preferredLeft));
    const top = Math.max(padding, Math.min(maxTop, preferredTop));
    return { left, top, anchor: "near" as const };
  })();

  return (
    <OrgSettingsContext.Provider value={{ orgName, currencyCode }}>
      <div className="min-h-screen bg-black text-white flex flex-col md:flex-row">
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950 sticky top-0 z-50">
          <button
            type="button"
            className="flex items-center gap-2"
            onClick={() => navigate("/")}
            aria-label="Go to main home"
          >
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">SmartCrew</span>
          </button>
          <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        <Sidebar
          isOpen={isSidebarOpen}
          desktopOpen={isDesktopSidebarOpen}
          orgName={orgName ?? undefined}
          onClose={() => setIsSidebarOpen(false)}
          onDesktopToggle={() => setIsDesktopSidebarOpen((v) => !v)}
        />

      {tourOpen && currentTourStep && (
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/65" />
          {highlightRect && (
            <div
              className="absolute rounded-lg ring-2 ring-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] pointer-events-none"
              style={{
                left: Math.max(0, highlightRect.left - 8),
                top: Math.max(0, highlightRect.top - 8),
                width: Math.max(0, highlightRect.width + 16),
                height: Math.max(0, highlightRect.height + 16),
              }}
            />
          )}

          <div
            className="absolute w-[min(360px,calc(100vw-32px))] rounded-xl border border-white/10 bg-zinc-950/95 backdrop-blur-md p-4 text-white shadow-xl"
            style={{ left: tooltipPos.left, top: tooltipPos.top }}
            role="dialog"
            aria-modal="true"
            aria-label="Quick tour"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-primary">
                  Step {Math.min(tourSteps.length, tourStepIndex + 1)} of {tourSteps.length}
                </div>
                <div className="mt-1 text-base font-semibold">{currentTourStep.title}</div>
              </div>
              <button
                type="button"
                onClick={dismissTour}
                className="text-zinc-400 hover:text-white"
                aria-label="Close tour"
              >
                ✕
              </button>
            </div>

            <div className="mt-2 text-sm text-zinc-300">{currentTourStep.body}</div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={dismissTour}
                className="text-sm text-zinc-400 hover:text-white"
              >
                Skip
              </button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/15 bg-transparent hover:bg-white/10 text-white hover:text-white"
                  onClick={prevTourStep}
                  disabled={tourStepIndex === 0}
                >
                  Back
                </Button>
                <Button type="button" className="bg-primary hover:bg-primary/90 text-black" onClick={nextTourStep}>
                  {tourStepIndex >= tourSteps.length - 1 ? "Finish" : "Next"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
        <div className={isDesktopSidebarOpen ? "flex-1 md:ml-64 bg-zinc-950 min-h-screen" : "flex-1 md:ml-16 bg-zinc-950 min-h-screen"}>
          <main className="p-4 md:p-8 max-w-7xl mx-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </OrgSettingsContext.Provider>
  );
}
