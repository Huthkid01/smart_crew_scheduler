import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon, Clock, Loader2, Save } from "lucide-react";
import { supabase } from "@/supabase/client";

const DAYS_OF_WEEK = [
  { name: "Sunday", value: 0 },
  { name: "Monday", value: 1 },
  { name: "Tuesday", value: 2 },
  { name: "Wednesday", value: 3 },
  { name: "Thursday", value: 4 },
  { name: "Friday", value: 5 },
  { name: "Saturday", value: 6 },
];

// Re-order to start with Monday for display, but keep values consistent
const DISPLAY_DAYS = [
  DAYS_OF_WEEK[1], // Mon
  DAYS_OF_WEEK[2], // Tue
  DAYS_OF_WEEK[3], // Wed
  DAYS_OF_WEEK[4], // Thu
  DAYS_OF_WEEK[5], // Fri
  DAYS_OF_WEEK[6], // Sat
  DAYS_OF_WEEK[0], // Sun
];

interface Availability {
  id?: string;
  day_of_week: number;
  is_available: boolean;
  start_time: string | null;
  end_time: string | null;
}

interface Employee {
  id: string;
  name: string;
}

export default function AvailabilityPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTimeOffOpen, setIsTimeOffOpen] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchAvailability(selectedEmployeeId);
    } else {
        setAvailability([]);
    }
  }, [selectedEmployeeId]);

  async function fetchEmployees() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orgId = (profile as any).org_id;
        const { data: employeesData } = await supabase
          .from('employees')
          .select('id, name')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .order('name');

        setEmployees(employeesData || []);
        if (employeesData && employeesData.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setSelectedEmployeeId((employeesData[0] as any).id);
        }
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchAvailability(employeeId: string) {
    setIsLoading(true);
    try {
        const { data, error } = await supabase
            .from('availability')
            .select('*')
            .eq('employee_id', employeeId);

        if (error) throw error;

        // Initialize with defaults if missing
        const fullAvailability = DISPLAY_DAYS.map(day => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const existing = data?.find((a: any) => a.day_of_week === day.value);
            return existing || {
                day_of_week: day.value,
                is_available: true,
                start_time: "09:00:00",
                end_time: "17:00:00"
            };
        });

        setAvailability(fullAvailability);
    } catch (error) {
        console.error("Error fetching availability:", error);
    } finally {
        setIsLoading(false);
    }
  }

  const handleAvailabilityChange = (dayValue: number, field: keyof Availability, value: boolean | string) => {
    setAvailability(prev => prev.map(item => {
        if (item.day_of_week === dayValue) {
            return { ...item, [field]: value };
        }
        return item;
    }));
  };

  const handleSaveAvailability = async () => {
    if (!selectedEmployeeId) return;
    setIsSaving(true);
    try {
        const updates = availability.map(item => ({
            employee_id: selectedEmployeeId,
            day_of_week: item.day_of_week,
            is_available: item.is_available,
            start_time: item.is_available ? item.start_time : null,
            end_time: item.is_available ? item.end_time : null,
        }));

        // Upsert one by one or batch? Supabase upsert works with array.
        // But we need to handle the 'id' if it exists to update, or omit to insert?
        // Actually, if we use upsert with a unique constraint (employee_id, day_of_week), it should work.
        // The schema has UNIQUE(employee_id, day_of_week).
        
        const { error } = await supabase
            .from('availability')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .upsert(updates as any, { onConflict: 'employee_id,day_of_week' });

        if (error) throw error;
        alert("Availability saved successfully!");
        
        // Refresh to get IDs
        fetchAvailability(selectedEmployeeId);

    } catch (error) {
        console.error("Error saving availability:", error);
        alert("Failed to save availability.");
    } finally {
        setIsSaving(false);
    }
  };

  const handleSubmitTimeOff = (e: React.FormEvent) => {
      e.preventDefault();
      setIsTimeOffOpen(false);
      alert("Time off request submitted! (Mock functionality)");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Availability</h1>
            <p className="text-zinc-400">Manage weekly availability for your team.</p>
        </div>
        <div className="flex gap-2">
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger className="w-[200px] bg-zinc-900 border-zinc-800 text-white">
                    <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                    {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Dialog open={isTimeOffOpen} onOpenChange={setIsTimeOffOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800">
                <CalendarIcon className="mr-2 h-4 w-4" /> Request Time Off
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                {/* Time Off Dialog Content (Keep as is for now) */}
                <DialogHeader>
                <DialogTitle>Request Time Off</DialogTitle>
                <DialogDescription className="text-zinc-400">
                    Submit a request for time off.
                </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmitTimeOff}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="start-date" className="text-right">Start Date</Label>
                            <Input id="start-date" type="date" className="col-span-3 bg-zinc-950 border-zinc-800" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="end-date" className="text-right">End Date</Label>
                            <Input id="end-date" type="date" className="col-span-3 bg-zinc-950 border-zinc-800" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="reason" className="text-right">Reason</Label>
                            <Input id="reason" placeholder="Vacation, etc." className="col-span-3 bg-zinc-950 border-zinc-800" required />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" className="bg-primary text-black hover:bg-primary/90">Submit Request</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
            </Dialog>
        </div>
      </div>

      {isLoading && employees.length === 0 ? (
          <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      ) : (
        <div className="grid gap-6">
            {DISPLAY_DAYS.map((day) => {
                const dayData = availability.find(a => a.day_of_week === day.value) || { 
                    day_of_week: day.value, is_available: true, start_time: "09:00:00", end_time: "17:00:00" 
                };
                
                return (
                <Card key={day.name} className="bg-zinc-900 border-zinc-800 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-medium">{day.name}</CardTitle>
                    <Switch 
                        checked={dayData.is_available}
                        onCheckedChange={(checked) => handleAvailabilityChange(day.value, "is_available", checked)}
                    />
                    </CardHeader>
                    <CardContent>
                    {dayData.is_available ? (
                        <div className="flex items-center gap-4 mt-2">
                        <div className="grid gap-1.5 flex-1">
                            <Label htmlFor={`start-${day.name}`} className="text-xs text-zinc-400">Start Time</Label>
                            <div className="relative">
                            <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                            <Input 
                                id={`start-${day.name}`}
                                type="time" 
                                className="pl-9 bg-zinc-950 border-zinc-800 h-9" 
                                value={dayData.start_time?.slice(0, 5) || "09:00"}
                                onChange={(e) => handleAvailabilityChange(day.value, "start_time", e.target.value)}
                            />
                            </div>
                        </div>
                        <div className="grid gap-1.5 flex-1">
                            <Label htmlFor={`end-${day.name}`} className="text-xs text-zinc-400">End Time</Label>
                            <div className="relative">
                            <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                            <Input 
                                id={`end-${day.name}`}
                                type="time" 
                                className="pl-9 bg-zinc-950 border-zinc-800 h-9" 
                                value={dayData.end_time?.slice(0, 5) || "17:00"}
                                onChange={(e) => handleAvailabilityChange(day.value, "end_time", e.target.value)}
                            />
                            </div>
                        </div>
                        </div>
                    ) : (
                        <div className="mt-2 py-2 text-sm text-zinc-500 italic">
                        Unavailable
                        </div>
                    )}
                    </CardContent>
                </Card>
                );
            })}
            
            <div className="flex justify-end pt-4">
                <Button 
                    onClick={handleSaveAvailability} 
                    className="bg-primary hover:bg-primary/90 text-black font-bold"
                    disabled={isSaving || !selectedEmployeeId}
                >
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Changes
                </Button>
            </div>
        </div>
      )}
    </div>
  );
}
