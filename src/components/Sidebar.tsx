import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  BarChart3,
  Settings,
  LogOut,
  Zap,
  Building,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { getSessionSafe, supabase } from "@/supabase/client";
import { Button } from "@/components/ui/button";

interface UserProfile {
  role: 'admin' | 'manager' | 'employee';
}

interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  end?: boolean;
  roles?: string[];
}

const navigation: NavItem[] = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard, end: true },
  { name: 'Schedule', href: '/dashboard/schedule', icon: Calendar, roles: ['admin', 'manager'] },
  { name: 'Employees', href: '/dashboard/employees', icon: Users, roles: ['admin', 'manager'] },
  { name: 'Availability', href: '/dashboard/availability', icon: Clock, roles: ['admin', 'manager'] },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3, roles: ['admin', 'manager'] },
];

export function Sidebar({
  isOpen,
  desktopOpen = true,
  onClose,
  onDesktopToggle,
}: {
  isOpen?: boolean;
  desktopOpen?: boolean;
  onClose?: () => void;
  onDesktopToggle?: () => void;
}) {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    async function getUserRole() {
      try {
        const { data } = await getSessionSafe();
        const user = data.session?.user ?? null;
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          const p = profile as UserProfile;
          setUserRole(p.role);
        }
      } catch (error) {
        console.error("Error loading sidebar role:", error);
      }
    }
    getUserRole();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const filteredNavigation = navigation
    .map(item => {
      if (item.name === 'Overview') {
        if (userRole === 'employee') {
          return { ...item, name: 'Home', href: '/dashboard/home', end: false };
        }
        return { ...item, href: '/dashboard/overview', end: false };
      }
      return item;
    })
    .filter(item => {
      if (!item.roles) return true;
      if (!userRole) return false;
      return item.roles.includes(userRole);
    });

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}
      
      <div className={cn(
        "flex h-screen flex-col bg-zinc-950 border-r border-zinc-800 fixed left-0 top-0 z-50 transition-all duration-300",
        desktopOpen ? "w-64" : "w-16",
        isOpen ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0"
      )}>
        <div className={desktopOpen ? "p-6" : "p-4"}>
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className={desktopOpen ? "text-xl font-bold text-white" : "hidden"}>SmartCrew</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex text-zinc-400 hover:text-white hover:bg-zinc-900"
              onClick={() => onDesktopToggle?.()}
              aria-label={desktopOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {desktopOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
            </Button>
          </div>
        </div>
        
        <nav className={desktopOpen ? "flex-1 px-4 space-y-2 mt-4" : "flex-1 px-2 space-y-2 mt-4"}>
          {filteredNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.end}
              onClick={() => onClose?.()} // Close sidebar on mobile when link is clicked
              title={!desktopOpen ? item.name : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white",
                  !desktopOpen && "justify-center px-0"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className={desktopOpen ? "inline" : "hidden"}>{item.name}</span>
            </NavLink>
          ))}
        </nav>

        <div className={desktopOpen ? "p-4 border-t border-zinc-800 space-y-1" : "p-2 border-t border-zinc-800 space-y-1"}>
          {userRole === 'admin' && (
               <NavLink 
               to="/dashboard/settings"
               onClick={() => onClose?.()}
               title={!desktopOpen ? "Organization" : undefined}
               className={({ isActive }) =>
                 cn(
                   "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                   isActive
                     ? "bg-primary/10 text-primary"
                     : "text-zinc-400 hover:bg-zinc-900 hover:text-white",
                    !desktopOpen && "justify-center px-0"
                 )
               }
             >
               <Building className="h-5 w-5" />
               <span className={desktopOpen ? "inline" : "hidden"}>Organization</span>
             </NavLink>
          )}
          <NavLink 
            to="/dashboard/profile"
            onClick={() => onClose?.()}
            title={!desktopOpen ? "Profile" : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white",
                !desktopOpen && "justify-center px-0"
              )
            }
          >
            <Settings className="h-5 w-5" />
            <span className={desktopOpen ? "inline" : "hidden"}>Profile</span>
          </NavLink>
          <button 
            onClick={handleSignOut}
            title={!desktopOpen ? "Sign Out" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white w-full rounded-md hover:bg-zinc-900 transition-colors",
              !desktopOpen && "justify-center px-0"
            )}
          >
            <LogOut className="h-5 w-5" />
            <span className={desktopOpen ? "inline" : "hidden"}>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}
