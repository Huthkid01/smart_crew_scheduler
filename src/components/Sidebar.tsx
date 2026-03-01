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
  Building
} from "lucide-react";
import { supabase } from "@/supabase/client";

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
  { name: 'Schedule', href: '/dashboard/schedule', icon: Calendar },
  { name: 'Employees', href: '/dashboard/employees', icon: Users, roles: ['admin', 'manager'] },
  { name: 'Availability', href: '/dashboard/availability', icon: Clock },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3, roles: ['admin', 'manager'] },
];

export function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    async function getUserRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (data) {
          const profile = data as UserProfile;
          setUserRole(profile.role);
        }
      }
    }
    getUserRole();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const filteredNavigation = navigation.filter(item => {
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
        "flex h-screen flex-col bg-zinc-950 border-r border-zinc-800 w-64 fixed left-0 top-0 z-50 transition-transform duration-300 md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-white">SmartCrew</span>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {filteredNavigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.end}
              onClick={onClose} // Close sidebar on mobile when link is clicked
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800 space-y-1">
          {userRole === 'admin' && (
               <NavLink 
               to="/dashboard/settings"
               onClick={onClose}
               className={({ isActive }) =>
                 cn(
                   "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                   isActive
                     ? "bg-primary/10 text-primary"
                     : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                 )
               }
             >
               <Building className="h-5 w-5" />
               Organization
             </NavLink>
          )}
          <NavLink 
            to="/dashboard/profile"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
              )
            }
          >
            <Settings className="h-5 w-5" />
            Profile
          </NavLink>
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white w-full rounded-md hover:bg-zinc-900 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
