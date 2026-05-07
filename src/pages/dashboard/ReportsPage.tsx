import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } from "recharts";
import { DollarSign, Clock, TrendingUp, Users } from "lucide-react";
import { SmartCrewLogoMark } from "@/components/SmartCrewLogoMark";
import { supabase } from "@/supabase/client";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, parse, differenceInMinutes } from "date-fns";
import { Button } from "@/components/ui/button";
import { useOrgSettings } from "@/contexts/orgSettings";
import { formatCurrency } from "@/lib/utils";

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

interface AttendanceRow {
  id: string;
  clock_in: string;
  clock_out: string | null;
  employees: {
    name: string;
    position: string;
  } | null;
}

export default function ReportsPage() {
  const { currencyCode } = useOrgSettings();
  const [data, setData] = useState<DailyReport[]>([]);
  const [stats, setStats] = useState<ReportStats>({
    totalCost: 0,
    totalHours: 0,
    avgHourlyRate: 0,
    activeEmployees: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    fetchReportData();
  }, []);

  const downloadCsv = (filename: string, rows: Array<Record<string, string | number | null | undefined>>) => {
    const headers = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row).forEach((k) => set.add(k));
        return set;
      }, new Set<string>())
    );

    const escapeCell = (value: unknown) => {
      const s = value === null || value === undefined ? "" : String(value);
      if (/[",\n\r]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
      return s;
    };

    const lines = [
      headers.map(escapeCell).join(","),
      ...rows.map((r) => headers.map((h) => escapeCell(r[h])).join(",")),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

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

      const { data: attendanceData } = await supabase
        .from("time_entries")
        .select(
          `
          id,
          clock_in,
          clock_out,
          employees (
            name,
            position
          )
        `
        )
        .order("clock_in", { ascending: false })
        .limit(200);

      setAttendance((attendanceData as AttendanceRow[]) || []);

    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleDownloadCsv = async () => {
    setIsDownloading(true);
    try {
      const now = new Date();
      const dateStamp = format(now, "yyyy-MM-dd_HH-mm");

      const activeAttendance = attendance.filter((a) => !a.clock_out);
      const attendanceRows = [
        ...activeAttendance.map((a) => ({
          section: "live_attendance",
          employee: a.employees?.name ?? "",
          position: a.employees?.position ?? "",
          status: "clocked_in",
          clock_in: a.clock_in,
          clock_out: "",
        })),
        ...attendance
          .filter((a) => Boolean(a.clock_out))
          .slice(0, 100)
          .map((a) => ({
            section: "recent_attendance",
            employee: a.employees?.name ?? "",
            position: a.employees?.position ?? "",
            status: a.clock_out ? "clocked_out" : "clocked_in",
            clock_in: a.clock_in,
            clock_out: a.clock_out ?? "",
          })),
      ];

      const summaryRows = [
        {
          section: "summary",
          range: "last_7_days",
          currency_code: currencyCode,
          total_labor_cost: stats.totalCost,
          total_hours: stats.totalHours,
          avg_hourly_rate: stats.avgHourlyRate,
          active_employees: stats.activeEmployees,
          exported_at: now.toISOString(),
        },
      ];

      const dailyRows = data.map((d) => ({
        section: "daily",
        day: d.name,
        cost: d.cost,
        hours: d.hours,
      }));

      downloadCsv(`smartcrew_report_${dateStamp}.csv`, [...summaryRows, ...dailyRows, ...attendanceRows]);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full pt-20">
        <SmartCrewLogoMark size="sm" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Reports & Analytics</h1>
            <p className="text-zinc-400">Monitor labor costs and employee performance (Last 7 Days).</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="border-white/15 bg-transparent hover:bg-white/10 text-white hover:text-white"
            onClick={handlePrintPdf}
          >
            Print / Save as PDF
          </Button>
          <Button
            type="button"
            className="bg-primary hover:bg-primary/90 text-black font-bold"
            onClick={handleDownloadCsv}
            disabled={isDownloading}
          >
            {isDownloading ? "Preparing..." : "Download CSV"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Labor Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalCost, currencyCode)}</div>
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
            <div className="text-2xl font-bold">{formatCurrency(stats.avgHourlyRate, currencyCode)}</div>
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
                <div className="w-full min-w-0">
                    <ResponsiveContainer width="100%" height={300}>
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
                            tickFormatter={(value) => formatCurrency(Number(value), currencyCode)} 
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
                <div className="w-full min-w-0">
                    <ResponsiveContainer width="100%" height={300}>
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

      <Card className="bg-zinc-900 border-zinc-800 text-white">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Live Attendance</CardTitle>
            <CardDescription className="text-zinc-400">Currently clocked-in employees.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white hover:text-white w-full sm:w-auto"
            onClick={fetchReportData}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {attendance.filter((a) => !a.clock_out).length === 0 ? (
            <div className="text-sm text-zinc-400">No one is clocked in right now.</div>
          ) : (
            attendance
              .filter((a) => !a.clock_out)
              .slice(0, 25)
              .map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{a.employees?.name ?? "Employee"}</div>
                    <div className="text-xs text-zinc-400">{a.employees?.position ?? "—"}</div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="inline-flex items-center rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-400">
                      clocked in
                    </span>
                    <div className="text-xs text-zinc-400">
                      {format(new Date(a.clock_in), "MMM d, h:mm a")}
                    </div>
                  </div>
                </div>
              ))
          )}
        </CardContent>
      </Card>

      <Card className="bg-zinc-900 border-zinc-800 text-white">
        <CardHeader>
          <CardTitle>Recent Attendance</CardTitle>
          <CardDescription className="text-zinc-400">Latest clock-ins and clock-outs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {attendance.length === 0 ? (
            <div className="text-sm text-zinc-400">No attendance data found.</div>
          ) : (
            attendance.slice(0, 40).map((a) => {
              const status = a.clock_out ? "clocked out" : "clocked in";
              const statusClass = a.clock_out
                ? "bg-zinc-700/30 text-zinc-200"
                : "bg-green-500/15 text-green-400";

              return (
                <div
                  key={a.id}
                  className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{a.employees?.name ?? "Employee"}</div>
                    <div className="text-xs text-zinc-400">{a.employees?.position ?? "—"}</div>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-zinc-400 sm:items-end">
                    <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass}`}>
                      {status}
                    </span>
                    <div>
                      In: {format(new Date(a.clock_in), "MMM d, h:mm a")}
                      {a.clock_out ? ` • Out: ${format(new Date(a.clock_out), "MMM d, h:mm a")}` : ""}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
