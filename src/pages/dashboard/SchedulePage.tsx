import { useState, useEffect } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import type { View } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, ChevronLeft, ChevronRight, Loader2, Send } from "lucide-react";
import { supabase } from "@/supabase/client";
import { parseISO } from "date-fns";
// import type { Database } from "@/supabase/types";

interface Profile {
  org_id: string;
}

// type ShiftUpdate = Database['public']['Tables']['shifts']['Update'];
// type ShiftInsert = Database['public']['Tables']['shifts']['Insert'];

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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// Setup the localizer by providing the moment (or globalize, or Luxon) instance
// to the localizer accessor.
const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId?: string;
}

export default function SchedulePage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(new Date());
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    fetchShifts();
    fetchEmployees();
  }, []);

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
        const orgId = (profile as Profile).org_id;
        const { data: employeesData } = await supabase
          .from('employees')
          .select('id, name')
          .eq('org_id', orgId)
          .eq('is_active', true)
          .order('name');

        setEmployees(employeesData || []);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  }

  async function handleAddShift(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single();
            
        if (!profile) return;

        const orgId = (profile as Profile).org_id;

        const newShift = {
            org_id: orgId,
            employee_id: formData.get("employee") as string,
            date: formData.get("date") as string,
            start_time: formData.get("start_time") as string,
            end_time: formData.get("end_time") as string,
            status: 'published'
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('shifts') as any)
            .insert([newShift]);

        if (error) throw error;

        setIsAddShiftOpen(false);
        fetchShifts();
        alert("Shift added successfully!");
    } catch (error) {
        console.error("Error adding shift:", error);
        alert("Failed to add shift");
    }
  }

  async function fetchShifts() {
    try {
      const { data: shifts, error } = await supabase
        .from('shifts')
        .select(`
          id,
          date,
          start_time,
          end_time,
          employees (
            id,
            name,
            position
          )
        `);

      if (error) throw error;

      const formattedEvents = (shifts || []).map(shift => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const s = shift as any;
        // Combine date and time
        const startDateTime = parseISO(`${s.date}T${s.start_time}`);
        const endDateTime = parseISO(`${s.date}T${s.end_time}`);
        
        const employeeName = s.employees?.name || 'Unassigned';
        const position = s.employees?.position || '';

        return {
          id: s.id,
          title: `${employeeName} - ${position}`,
          start: startDateTime,
          end: endDateTime,
          resourceId: s.employees?.id,
        };
      });

      setEvents(formattedEvents);
    } catch (error) {
      console.error("Error fetching shifts:", error);
    }
  }

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const handleViewChange = (newView: View) => {
    setView(newView);
  };

  const handleGenerateSchedule = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsLoading(true);
      
      const formData = new FormData(e.target as HTMLFormElement);
      const startDate = formData.get("start_date") as string;
      const endDate = formData.get("end_date") as string;
      const goal = formData.get("goal") as string;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("No user found");

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single();
            
        if (!profile) throw new Error("No profile found");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orgId = (profile as any).org_id;

        const { data, error } = await supabase.functions.invoke('generate-schedule', {
            body: {
                org_id: orgId,
                start_date: startDate,
                end_date: endDate,
                optimization_goal: goal
            }
        });

        if (error) throw error;

        // The AI returns a list of shifts. We need to save them to the database.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const shiftsToInsert = data.map((shift: any) => ({
            org_id: orgId,
            employee_id: shift.employee_id,
            date: shift.date,
            start_time: shift.start_time,
            end_time: shift.end_time,
            status: 'draft' // Mark as draft initially
        }));

        if (shiftsToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('shifts')
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .insert(shiftsToInsert as any);
            
            if (insertError) throw insertError;
            
            alert(`Successfully generated and saved ${shiftsToInsert.length} shifts!`);
            fetchShifts(); // Refresh calendar
        } else {
            alert("AI could not generate any shifts for this criteria.");
        }

      } catch (error) {
        console.error("Error generating schedule:", error);
        alert("Failed to generate schedule. Please try again.");
      } finally {
        setIsLoading(false);
        setIsAiModalOpen(false);
      }
  };

  // Custom toolbar component
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomToolbar = (toolbar: any) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const goToCurrent = () => {
      toolbar.onNavigate('TODAY');
    };

    const label = () => {
      const date = moment(toolbar.date);
      return (
        <span className="text-lg font-semibold text-white">
          {date.format('MMMM YYYY')}
        </span>
      );
    };

    return (
      <div className="flex items-center justify-between mb-4 p-2 bg-zinc-900 rounded-lg border border-zinc-800">
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToBack} className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToCurrent} className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-xs">
                Today
            </Button>
            <Button variant="outline" size="sm" onClick={goToNext} className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700">
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
        
        <div className="text-center">
            {label()}
        </div>

        <div className="flex items-center gap-2">
             <Select value={view} onValueChange={(v) => handleViewChange(v as View)}>
                <SelectTrigger className="w-[120px] bg-zinc-800 border-zinc-700 h-9">
                    <SelectValue placeholder="View" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectItem value={Views.MONTH}>Month</SelectItem>
                    <SelectItem value={Views.WEEK}>Week</SelectItem>
                    <SelectItem value={Views.DAY}>Day</SelectItem>
                    <SelectItem value={Views.AGENDA}>Agenda</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>
    );
  };

  async function handlePublish() {
    if (!confirm("Are you sure you want to publish all draft shifts? This will make them visible to employees.")) return;
    
    setIsPublishing(true);
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single();

        if (profile) {
            const orgId = (profile as Profile).org_id;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase.from('shifts') as any)
                .update({ status: 'published' })
                .eq('org_id', orgId)
                .eq('status', 'draft');

            if (error) throw error;
            
            alert("All draft shifts have been published!");
            fetchShifts();
        }
    } catch (error) {
        console.error("Error publishing shifts:", error);
        alert("Failed to publish shifts.");
    } finally {
        setIsPublishing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Schedule</h1>
            <p className="text-zinc-400">Manage shifts and staffing.</p>
        </div>
        <div className="flex gap-2">
            <Button 
                variant="outline" 
                className="bg-transparent text-white border-zinc-700 hover:bg-zinc-800"
                onClick={handlePublish}
                disabled={isPublishing}
            >
                {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Publish Schedule
            </Button>
            <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-primary text-black hover:bg-primary/90 font-bold gap-2">
                        <Sparkles className="h-4 w-4" />
                        AI Scheduler
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>AI Scheduling Assistant</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Automatically generate an optimal schedule based on availability and skills.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleGenerateSchedule}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="date-range" className="text-right">
                                Date Range
                                </Label>
                                <div className="col-span-3 flex gap-2">
                                    <Input type="date" className="bg-zinc-950 border-zinc-800" required />
                                    <span className="self-center">-</span>
                                    <Input type="date" className="bg-zinc-950 border-zinc-800" required />
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="goal" className="text-right">
                                Goal
                                </Label>
                                <Select defaultValue="balance">
                                    <SelectTrigger className="col-span-3 bg-zinc-950 border-zinc-800">
                                        <SelectValue placeholder="Select optimization goal" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                        <SelectItem value="minimize_cost">Minimize Cost</SelectItem>
                                        <SelectItem value="maximize_coverage">Maximize Coverage</SelectItem>
                                        <SelectItem value="balance">Balance Both</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" className="bg-primary text-black hover:bg-primary/90 w-full" disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} 
                                Generate Schedule
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddShiftOpen} onOpenChange={setIsAddShiftOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" className="bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 gap-2">
                        <Plus className="h-4 w-4" />
                        Add Shift
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Add New Shift</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Schedule a new shift for an employee.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddShift}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="employee" className="text-right">
                                Employee
                                </Label>
                                <div className="col-span-3">
                                    <Select name="employee" required>
                                        <SelectTrigger className="bg-zinc-950 border-zinc-800">
                                            <SelectValue placeholder="Select employee" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-zinc-800 border-zinc-700 text-white">
                                            {employees.map((emp) => (
                                                <SelectItem key={emp.id} value={emp.id}>{emp.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="date" className="text-right">
                                Date
                                </Label>
                                <Input id="date" name="date" type="date" className="col-span-3 bg-zinc-950 border-zinc-800" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="start_time" className="text-right">
                                Start
                                </Label>
                                <Input id="start_time" name="start_time" type="time" className="col-span-3 bg-zinc-950 border-zinc-800" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="end_time" className="text-right">
                                End
                                </Label>
                                <Input id="end_time" name="end_time" type="time" className="col-span-3 bg-zinc-950 border-zinc-800" required />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" className="bg-primary text-black hover:bg-primary/90">Add Shift</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
      </div>

      <div className="flex-1 bg-zinc-900 rounded-lg border border-zinc-800 p-4 min-h-[600px]">
        <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "100%" }}
            view={view}
            date={date}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            components={{
                toolbar: CustomToolbar
            }}
            eventPropGetter={() => ({
                className: "bg-zinc-800 border-l-4 border-primary text-white text-xs p-1 rounded-r-md overflow-hidden"
            })}
        />
      </div>
    </div>
  );
}
