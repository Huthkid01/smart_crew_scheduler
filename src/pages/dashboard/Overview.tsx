import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, DollarSign, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/supabase/client";
import { startOfWeek, endOfWeek, format, parse, differenceInMinutes } from "date-fns";

interface ShiftWithCost {
  start_time: string;
  end_time: string;
  break_minutes: number;
  employees: {
    hourly_rate: number;
  } | null;
}

interface UpcomingShift {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  employees: {
    name: string;
    position: string;
  } | null;
}

import { useNavigate } from "react-router-dom";

export default function Overview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    shiftsThisWeek: 0,
    laborCost: 0,
    pendingRequests: 0,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activeEmployees, setActiveEmployees] = useState<any[]>([]);
  const [upcomingShifts, setUpcomingShifts] = useState<UpcomingShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      setIsLoading(true);
      try {
        const today = new Date();
        const start = startOfWeek(today, { weekStartsOn: 1 }); // Monday start
        const end = endOfWeek(today, { weekStartsOn: 1 });
        
        const startStr = format(start, 'yyyy-MM-dd');
        const endStr = format(end, 'yyyy-MM-dd');

        // 1. Total Employees
        const { count: employeeCount } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true });

        // 2. Shifts This Week
        const { count: shiftCount } = await supabase
          .from('shifts')
          .select('*', { count: 'exact', head: true })
          .gte('date', startStr)
          .lte('date', endStr);

        // 3. Labor Cost (Fetch shifts with employee details)
        const { data: shiftsData } = await supabase
          .from('shifts')
          .select(`
            start_time,
            end_time,
            break_minutes,
            employees (
              hourly_rate
            )
          `)
          .gte('date', startStr)
          .lte('date', endStr);

        // 4. Live Attendance
        const { data: activeData } = await supabase
          .from('time_entries')
          .select(`
            id,
            clock_in,
            employees (
              name,
              position
            )
          `)
          .is('clock_out', null)
          .order('clock_in', { ascending: false });

        setActiveEmployees(activeData || []);
        
        let totalCost = 0;
        if (shiftsData) {
          (shiftsData as unknown as ShiftWithCost[]).forEach((shift) => {
            const employee = shift.employees;
            if (employee && employee.hourly_rate) {
              // Parse times
              const start = parse(shift.start_time, 'HH:mm:ss', new Date());
              const end = parse(shift.end_time, 'HH:mm:ss', new Date());
              
              // Calculate duration in minutes
              let durationMinutes = differenceInMinutes(end, start);
              
              // Handle overnight shifts (if end time is before start time)
              if (durationMinutes < 0) {
                durationMinutes += 24 * 60;
              }

              // Subtract break time
              durationMinutes -= (shift.break_minutes || 0);
              
              const hours = Math.max(0, durationMinutes / 60);
              const rate = Number(employee.hourly_rate);
              
              if (!isNaN(rate)) {
                totalCost += hours * rate;
              }
            }
          });
        }

        // 4. Pending Requests (Draft Shifts for now)
        const { count: pendingCount } = await supabase
          .from('shifts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'draft');

        // 5. Upcoming Shifts
        const { data: upcomingData } = await supabase
          .from('shifts')
          .select(`
            id,
            date,
            start_time,
            end_time,
            employees (
              name,
              position
            )
          `)
          .gte('date', format(today, 'yyyy-MM-dd'))
          .order('date', { ascending: true })
          .order('start_time', { ascending: true })
          .limit(5);

        setStats({
          totalEmployees: employeeCount || 0,
          shiftsThisWeek: shiftCount || 0,
          laborCost: Math.round(totalCost),
          pendingRequests: pendingCount || 0,
        });
        setUpcomingShifts((upcomingData as unknown as UpcomingShift[]) || []);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-white">Dashboard Overview</h1>
      
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            <p className="text-xs text-zinc-400">Active team members</p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shifts This Week</CardTitle>
            <Calendar className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.shiftsThisWeek}</div>
            <p className="text-xs text-zinc-400">Scheduled shifts</p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Labor Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.laborCost.toLocaleString()}</div>
            <p className="text-xs text-zinc-400">For current week</p>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Drafts</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-zinc-400">Unpublished shifts</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-7">
        <Card className="col-span-1 lg:col-span-4 bg-zinc-900 border-zinc-800 text-white">
          <CardHeader>
            <CardTitle>Upcoming Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                {upcomingShifts.length === 0 ? (
                    <p className="text-zinc-400 text-sm">No upcoming shifts scheduled.</p>
                ) : (
                    upcomingShifts.map((shift) => (
                        <div key={shift.id} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-2 last:border-0 gap-2">
                            <div>
                                <p className="font-medium">{shift.employees?.name || 'Unassigned'}</p>
                                <p className="text-sm text-zinc-400">{shift.employees?.position || 'N/A'}</p>
                            </div>
                            <div className="text-left sm:text-right">
                                <p className="font-medium">{format(new Date(shift.date), 'MMM dd')}</p>
                                <p className="text-sm text-zinc-400">
                                    {format(parse(shift.start_time, 'HH:mm:ss', new Date()), 'h:mm a')} - 
                                    {format(parse(shift.end_time, 'HH:mm:ss', new Date()), 'h:mm a')}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>
          </CardContent>
        </Card>
        
        <div className="col-span-1 lg:col-span-3 space-y-4">
            <Card className="bg-zinc-900 border-zinc-800 text-white">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        Live Attendance
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {activeEmployees.length === 0 ? (
                            <p className="text-zinc-500 text-sm">No one is currently clocked in.</p>
                        ) : (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            activeEmployees.map((entry: any) => (
                                <div key={entry.id} className="flex items-center justify-between border-b border-zinc-800 pb-2 last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-green-900/30 flex items-center justify-center text-green-500 font-bold text-xs">
                                            {entry.employees?.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{entry.employees?.name}</p>
                                            <p className="text-xs text-zinc-400">{entry.employees?.position}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-green-400 font-medium">Clocked In</p>
                                        <p className="text-xs text-zinc-500">
                                            {format(new Date(entry.clock_in), 'h:mm a')}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <button 
                        onClick={() => navigate('/dashboard/schedule')}
                        className="w-full text-left px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm"
                    >
                        + Create New Shift
                    </button>
                    <button 
                        onClick={() => navigate('/dashboard/employees')}
                        className="w-full text-left px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm"
                    >
                        + Add Employee
                    </button>
                    <button 
                        onClick={() => navigate('/dashboard/reports')}
                        className="w-full text-left px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm"
                    >
                        View Reports
                    </button>
                </div>
            </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
