import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Loader2, MapPin, Briefcase, User } from "lucide-react";
import { supabase } from "@/supabase/client";
import { format, parse, isToday, isTomorrow, startOfWeek, endOfWeek, differenceInMinutes } from "date-fns";
import { useNavigate } from "react-router-dom";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface MyShift {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  break_minutes?: number;
  status: 'published' | 'draft';
}

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const [shifts, setShifts] = useState<MyShift[]>([]);
  const [weeklyHours, setWeeklyHours] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMyData() {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            console.log("No user found in EmployeeDashboard");
            return;
        }

        // 1. Get Employee Details
        console.log("Fetching employee record for:", user.id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: employee, error: empError } = await (supabase.from('employees') as any)
            .select('id, name')
            .eq('user_id', user.id)
            .single();

        if (empError) {
            console.warn("Could not find employee record:", empError);
        }

        if (employee) {
            setUserName(employee.name);
            setEmployeeId(employee.id);

            console.log("Employee found:", employee);

            // 4. Check Clock Status
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: openEntry } = await (supabase.from('time_entries') as any)
                .select('id')
                .eq('employee_id', employee.id)
                .is('clock_out', null)
                .single();
            
            if (openEntry) {
                setIsClockedIn(true);
                setCurrentEntryId(openEntry.id);
            }

            // 2. Get My Upcoming Shifts
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            console.log("Fetching shifts for employee:", employee.id, "from date:", todayStr);
            
            const { data: shiftsData, error: shiftError } = await supabase
                .from('shifts')
                .select('*')
                .eq('employee_id', employee.id)
                .eq('status', 'published') // Only show published shifts
                .gte('date', todayStr)
                .order('date', { ascending: true })
                .order('start_time', { ascending: true })
                .limit(10);
            
            if (shiftError) console.error("Error fetching shifts:", shiftError);
            console.log("Fetched Shifts:", shiftsData);
            
            setShifts(shiftsData || []);

            // 3. Calculate Weekly Hours
            const start = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday start
            const end = endOfWeek(new Date(), { weekStartsOn: 1 });
            
            const { data: weeklyShifts } = await supabase
                .from('shifts')
                .select('start_time, end_time, break_minutes')
                .eq('employee_id', employee.id)
                .eq('status', 'published')
                .gte('date', format(start, 'yyyy-MM-dd'))
                .lte('date', format(end, 'yyyy-MM-dd'));

            if (weeklyShifts) {
                let totalMinutes = 0;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (weeklyShifts as any[]).forEach(shift => {
                    const s = parse(shift.start_time, 'HH:mm:ss', new Date());
                    const e = parse(shift.end_time, 'HH:mm:ss', new Date());
                    let duration = differenceInMinutes(e, s);
                    if (duration < 0) duration += 24 * 60; // Handle overnight
                    duration -= (shift.break_minutes || 0);
                    totalMinutes += Math.max(0, duration);
                });
                setWeeklyHours(Math.round((totalMinutes / 60) * 10) / 10);
            }
        }
      } catch (error) {
        console.error("Error fetching employee dashboard:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMyData();
  }, []);

  const handleClockInOut = async () => {
      if (!employeeId) return;

      try {
          if (isClockedIn) {
              // Clock Out
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { error } = await (supabase.from('time_entries') as any)
                  .update({ clock_out: new Date().toISOString() })
                  .eq('id', currentEntryId);
              
              if (error) throw error;
              
              setIsClockedIn(false);
              setCurrentEntryId(null);
              toast.success("Clocked Out Successfully");
          } else {
              // Clock In
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data, error } = await (supabase.from('time_entries') as any)
                  .insert([{ 
                      employee_id: employeeId,
                      clock_in: new Date().toISOString()
                  }])
                  .select()
                  .single();
              
              if (error) throw error;
              
              setIsClockedIn(true);
              setCurrentEntryId(data.id);
              toast.success("Clocked In Successfully");
          }
      } catch (error) {
          console.error("Clock error:", error);
          toast.error("Failed to update clock status");
      }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const nextShift = shifts[0];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-white">
            Hello, {userName.split(' ')[0]}! 👋
        </h1>
        <p className="text-zinc-400">Welcome to your dashboard.</p>
      </div>

      {/* Clock In/Out Section */}
      <div className="w-full">
        <Card className="border-zinc-800 bg-zinc-900">
            <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" /> Time Clock
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-zinc-400 flex items-center">
                        Current Status: <span className={isClockedIn ? "text-green-500 font-bold ml-2" : "text-zinc-500 font-bold ml-2"}>
                            {isClockedIn ? "Clocked In" : "Clocked Out"}
                        </span>
                    </div>
                    <Button 
                        onClick={handleClockInOut} 
                        className={isClockedIn ? "bg-red-600 hover:bg-red-700 text-white font-bold w-full sm:w-auto" : "bg-green-600 hover:bg-green-700 text-white font-bold w-full sm:w-auto"}
                    >
                        {isClockedIn ? "Clock Out" : "Clock In"}
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stats Card */}
          <Card className="bg-zinc-900 border-zinc-800 text-white md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-zinc-400">Hours This Week</CardTitle>
                <Briefcase className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{weeklyHours} hrs</div>
                <p className="text-xs text-zinc-500 mt-1">Scheduled for {format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d')} - {format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'MMM d')}</p>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-zinc-900 border-zinc-800 text-white md:col-span-2">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-zinc-400">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4">
                <button 
                    onClick={() => navigate('/dashboard/profile')}
                    className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-left"
                >
                    <div className="bg-primary/10 p-2 rounded-md">
                        <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <div className="font-medium text-sm">My Profile</div>
                        <div className="text-xs text-zinc-400">Edit contact info</div>
                    </div>
                </button>
            </CardContent>
          </Card>
      </div>
      
      {/* Next Shift Highlight Card */}
      <h2 className="text-xl font-semibold text-white mt-4">Next Up</h2>
      {nextShift ? (
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-primary/50 border text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Calendar className="h-24 w-24 text-primary" />
          </div>
          <CardHeader>
            <CardTitle className="text-lg font-medium text-primary flex items-center gap-2">
                <Clock className="h-5 w-5" /> Next Shift
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 relative z-10">
                <div>
                    <div className="text-3xl font-bold">
                        {isToday(new Date(nextShift.date)) ? "Today" : 
                         isTomorrow(new Date(nextShift.date)) ? "Tomorrow" : 
                         format(new Date(nextShift.date), 'EEEE, MMM do')}
                    </div>
                    <div className="text-xl text-zinc-300 mt-1">
                        {format(parse(nextShift.start_time, 'HH:mm:ss', new Date()), 'h:mm a')} - 
                        {format(parse(nextShift.end_time, 'HH:mm:ss', new Date()), 'h:mm a')}
                    </div>
                </div>
                
                <div className="flex items-center gap-2 text-zinc-400 text-sm bg-black/20 p-2 rounded-lg w-fit">
                    <MapPin className="h-4 w-4" />
                    <span>Main Location</span>
                </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardContent className="pt-6 text-center py-12">
                <p className="text-zinc-400">No upcoming shifts scheduled. Enjoy your time off! 🎉</p>
            </CardContent>
        </Card>
      )}

      <h2 className="text-xl font-semibold text-white mt-8">Upcoming Schedule</h2>
      <div className="space-y-3">
        {shifts.slice(1).length === 0 && !nextShift && (
             <p className="text-zinc-500 text-sm">No other shifts found.</p>
        )}
        
        {shifts.slice(1).map((shift) => (
            <Card key={shift.id} className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-zinc-800 h-12 w-12 rounded-lg flex flex-col items-center justify-center text-center">
                            <span className="text-xs text-zinc-400 uppercase font-bold">{format(new Date(shift.date), 'MMM')}</span>
                            <span className="text-lg font-bold text-white leading-none">{format(new Date(shift.date), 'dd')}</span>
                        </div>
                        <div>
                            <p className="font-medium text-white">{format(new Date(shift.date), 'EEEE')}</p>
                            <p className="text-sm text-zinc-400">
                                {format(parse(shift.start_time, 'HH:mm:ss', new Date()), 'h:mm a')} - 
                                {format(parse(shift.end_time, 'HH:mm:ss', new Date()), 'h:mm a')}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>
    </div>
  );
}
