import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } from "recharts";
import { DollarSign, Clock, TrendingUp, Users } from "lucide-react";
import { SmartCrewLogoMark } from "@/components/SmartCrewLogoMark";
import { supabase } from "@/supabase/client";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parse, differenceInMinutes } from "date-fns";

interface DailyReport {
  name: string;
  cost: number;
  hours: number;
}

interface ReportStats {
  totalCost: number;
  totalHours: number;
  avgHourlyRate: number;
  activeEmployees: number;
}

export default function ReportsPage() {
  const [data, setData] = useState<DailyReport[]>([]);
  const [stats, setStats] = useState<ReportStats>({
    totalCost: 0,
    totalHours: 0,
    avgHourlyRate: 0,
    activeEmployees: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  async function fetchReportData() {
    setIsLoading(true);
    try {
      const today = new Date();
      const last7Days = subDays(today, 6);
      const startStr = format(startOfDay(last7Days), 'yyyy-MM-dd');
      const endStr = format(endOfDay(today), 'yyyy-MM-dd');

      // 1. Fetch Active Employees & Avg Rate
      const { data: employees } = await supabase
        .from('employees')
        .select('hourly_rate')
        .eq('is_active', true);

      const activeEmployees = employees?.length || 0;
      const avgHourlyRate = activeEmployees > 0 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (employees?.reduce((sum, emp: any) => sum + (emp.hourly_rate || 0), 0) || 0) / activeEmployees
        : 0;

      // 2. Fetch Shifts for the last 7 days
      const { data: shifts } = await supabase
        .from('shifts')
        .select(`
          date,
          start_time,
          end_time,
          break_minutes,
          employees (
            hourly_rate
          )
        `)
        .gte('date', startStr)
        .lte('date', endStr);

      // 3. Process Daily Data
      const daysInterval = eachDayOfInterval({ start: last7Days, end: today });
      
      let totalCost = 0;
      let totalHours = 0;

      const chartData = daysInterval.map(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dayShifts = shifts?.filter((s: any) => s.date === dateStr) || [];
        
        let dayCost = 0;
        let dayHours = 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dayShifts.forEach((shift: any) => {
            if (shift.employees?.hourly_rate) {
                const start = parse(shift.start_time, 'HH:mm:ss', new Date());
                const end = parse(shift.end_time, 'HH:mm:ss', new Date());
                const durationMinutes = differenceInMinutes(end, start) - (shift.break_minutes || 0);
                const hours = durationMinutes / 60;
                
                if (hours > 0) {
                    dayHours += hours;
                    dayCost += hours * shift.employees.hourly_rate;
                }
            }
        });

        totalCost += dayCost;
        totalHours += dayHours;

        return {
            name: format(day, 'EEE'), // Mon, Tue...
            cost: Math.round(dayCost),
            hours: Math.round(dayHours),
        };
      });

      setData(chartData);
      setStats({
        totalCost: Math.round(totalCost),
        totalHours: Math.round(totalHours),
        avgHourlyRate: parseFloat(avgHourlyRate.toFixed(2)),
        activeEmployees,
      });

    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <SmartCrewLogoMark size="sm" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Reports & Analytics</h1>
            <p className="text-zinc-400">Monitor labor costs and employee performance (Last 7 Days).</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Labor Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalCost.toLocaleString()}</div>
            <p className="text-xs text-zinc-400">Last 7 days</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHours}</div>
            <p className="text-xs text-zinc-400">Last 7 days</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Hourly Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avgHourlyRate}</div>
            <p className="text-xs text-zinc-400">Across active employees</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold">{stats.activeEmployees}</div>
            <p className="text-xs text-zinc-400">Currently active</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
                <CardTitle>Daily Labor Cost</CardTitle>
                <CardDescription className="text-zinc-400">Labor expenses over the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <div className="h-[300px] w-full min-h-[300px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            stroke="#888888" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                        />
                        <YAxis 
                            stroke="#888888" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false}
                            tickFormatter={(value) => `$${value}`} 
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", color: "#fff" }}
                            itemStyle={{ color: "#fff" }}
                            cursor={{ fill: "#27272a" }}
                        />
                        <Bar dataKey="cost" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
        
        <Card className="bg-zinc-900 border-zinc-800 text-white">
            <CardHeader>
                <CardTitle>Hours Worked</CardTitle>
                <CardDescription className="text-zinc-400">Total hours scheduled/worked.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <div className="h-[300px] w-full min-h-[300px] min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis 
                            dataKey="name" 
                            stroke="#888888" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                        />
                        <YAxis 
                            stroke="#888888" 
                            fontSize={12} 
                            tickLine={false} 
                            axisLine={false} 
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", color: "#fff" }}
                            itemStyle={{ color: "#fff" }}
                        />
                        <Area type="monotone" dataKey="hours" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                    </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
