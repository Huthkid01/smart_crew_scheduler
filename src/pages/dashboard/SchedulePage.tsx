import React, { useState, useEffect, useRef } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import type { View } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, ChevronLeft, ChevronRight, Send, Trash2, CalendarDays } from "lucide-react";
import { SmartCrewLogoMark } from "@/components/SmartCrewLogoMark";
import { getSessionSafe, supabase } from "@/supabase/client";
import { format, parseISO } from "date-fns";
import { DayPicker, type DateRange } from "react-day-picker";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Setup the localizer by providing the moment (or globalize, or Luxon) instance
// to the localizer accessor.
const localizer = momentLocalizer(moment);

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resourceId?: string;
  status: 'draft' | 'published';
  employeeId: string;
}

import { toast } from "sonner";

export default function SchedulePage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<View>(Views.WEEK);
  const [date, setDate] = useState(new Date());
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAddShiftOpen, setIsAddShiftOpen] = useState(false);
  const [addShiftEmployeeId, setAddShiftEmployeeId] = useState<string>("");
  const [addShiftDate, setAddShiftDate] = useState<Date | undefined>(undefined);
  const [addShiftDateOpen, setAddShiftDateOpen] = useState(false);
  const [addShiftStartTime, setAddShiftStartTime] = useState<string>("");
  const [addShiftEndTime, setAddShiftEndTime] = useState<string>("");
  const [isEditShiftOpen, setIsEditShiftOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<CalendarEvent | null>(null);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  const [aiDateRange, setAiDateRange] = useState<DateRange | undefined>(undefined);
  const [aiGoal, setAiGoal] = useState("balance");
  const [aiPickerOpen, setAiPickerOpen] = useState(false);
  const aiDateRangeRef = useRef<DateRange | undefined>(undefined);

  useEffect(() => {
    aiDateRangeRef.current = aiDateRange;
  }, [aiDateRange]);

  function handleAiPickerOpenChange(open: boolean) {
    if (open) {
      setAiPickerOpen(true);
      return;
    }
    const r = aiDateRangeRef.current;
    if (r?.from && r?.to) {
      setAiPickerOpen(false);
    }
  }

  /** Block Radix dismiss while range incomplete (fixes popover-in-dialog closing on first day click). */
  function blockAiPickerDismissIfIncomplete(e: Event) {
    const r = aiDateRangeRef.current;
    if (!r?.from || !r?.to) {
      e.preventDefault();
    }
  }

  useEffect(() => {
    void loadScheduleContext();
  }, []);

  useEffect(() => {
    if (userRole) {
        fetchShifts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  /** One auth + profile read, then employees — avoids waiting on separate role/employee fetches before showing the toolbar. */
  async function loadScheduleContext() {
    try {
      const { data: sessionData } = await getSessionSafe();
      const user = sessionData.session?.user ?? null;
      if (!user) {
        setIsRoleLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("role, org_id")
        .eq("id", user.id)
        .single();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = profileData as any;
      setUserRole(row?.role || "employee");

      if (row?.org_id) {
        const orgId = row.org_id as string;
        const { data: employeesData } = await supabase
          .from("employees")
          .select("id, name")
          .eq("org_id", orgId)
          .eq("is_active", true)
          .order("name");
        setEmployees(employeesData || []);
      }
    } catch (error) {
      console.error("Error loading schedule context:", error);
    } finally {
      setIsRoleLoading(false);
    }
  }

  async function handleAddShift(e: React.FormEvent) {
    e.preventDefault();
    
    try {
        if (!addShiftDate) {
            toast.error("Pick a date for the shift.");
            return;
        }

        if (!addShiftEmployeeId) {
            toast.error("Select an employee.");
            return;
        }

        if (!addShiftStartTime || !addShiftEndTime) {
            toast.error("Select a start and end time.");
            return;
        }

        const [sh, sm] = addShiftStartTime.split(":").map((n) => Number(n));
        const [eh, em] = addShiftEndTime.split(":").map((n) => Number(n));
        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;
        if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes)) {
            toast.error("Invalid time selected.");
            return;
        }
        if (endMinutes <= startMinutes) {
            toast.error("End time must be after start time.");
            return;
        }

        const { data: sessionData } = await getSessionSafe();
        const user = sessionData.session?.user ?? null;
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
            employee_id: addShiftEmployeeId,
            date: format(addShiftDate, "yyyy-MM-dd"),
            start_time: addShiftStartTime,
            end_time: addShiftEndTime,
            status: 'draft' // Default to draft for safety
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('shifts') as any)
            .insert([newShift]);

        if (error) throw error;

        setIsAddShiftOpen(false);
        fetchShifts();
        toast.success("Shift added to drafts!");
    } catch (error) {
        console.error("Error adding shift:", error);
        toast.error("Failed to add shift");
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
          status,
          employees (
            id,
            name,
            position
          )
        `);

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let filteredShifts = (shifts || []) as any[];

      // Employees only see published shifts
      if (userRole === 'employee') {
        filteredShifts = filteredShifts.filter(s => s.status === 'published');
      }

      const formattedEvents = filteredShifts.map(s => {
        // Combine date and time
        const startDateTime = parseISO(`${s.date}T${s.start_time}`);
        const endDateTime = parseISO(`${s.date}T${s.end_time}`);
        
        const employeeName = s.employees?.name || 'Unassigned';
        const position = s.employees?.position || '';

        return {
          id: s.id,
          title: `${employeeName} - ${position} ${s.status === 'draft' ? '(Draft)' : ''}`,
          start: startDateTime,
          end: endDateTime,
          resourceId: s.employees?.id,
          status: s.status,
          employeeId: s.employees?.id,
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

      if (!aiDateRange?.from || !aiDateRange?.to) {
        toast.error("Select a date range using the calendar.");
        return;
      }

      const startDate = format(aiDateRange.from, "yyyy-MM-dd");
      const endDate = format(aiDateRange.to, "yyyy-MM-dd");
      const goal = aiGoal;

      setIsLoading(true);

      try {
        const { data } = await getSessionSafe();
        const user = data.session?.user ?? null;
        if (!user) throw new Error("No user found");

        const { data: profile } = await supabase
            .from('profiles')
            .select('org_id')
            .eq('id', user.id)
            .single();
            
        if (!profile) throw new Error("No profile found");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orgId = (profile as any).org_id;

        // --- Client-Side AI Logic Start ---
        
        // 1. Fetch employees and their availability
        const { data: employeesData, error: empError } = await supabase
          .from('employees')
          .select(`
            *,
            employee_skills (
              skill_id,
              proficiency_level,
              skills (name)
            ),
            availability (*)
          `)
          .eq('org_id', orgId)
          .eq('is_active', true);

        if (empError) throw empError;

        // 2. Fetch existing shifts
        const { error: shiftError } = await supabase
            .from('shifts')
            .select('*')
            .eq('org_id', orgId)
            .gte('date', startDate)
            .lte('date', endDate);
        
        if (shiftError) throw shiftError;

        // 3. Construct prompt
        const prompt = `
          You are an expert scheduler. Generate an optimal work schedule for the following employees from ${startDate} to ${endDate}.
          
          Optimization Goal: ${goal}
          
          Employees:
          ${JSON.stringify(employeesData, null, 2)}
          
          Constraints:
          - Respect employee availability.
          - Ensure required skills are covered (assume generic requirement if not specified).
          - Do not schedule employees for more than 40 hours a week unless necessary.
          - Shifts should be between 4-8 hours.
          
          Return the schedule as a JSON array of objects with the following structure:
          [
            {
              "employee_id": 123,
              "date": "YYYY-MM-DD",
              "start_time": "HH:MM",
              "end_time": "HH:MM",
              "role": "Position Name"
            }
          ]
          Do not include any explanation, just the JSON.
        `;

        // 4. Call Groq API (replacing Gemini)
        const apiKey = import.meta.env.VITE_GROQ_API_KEY;
        if (!apiKey) {
            throw new Error("VITE_GROQ_API_KEY is not set in your .env file.");
        }

        const generateWithGroq = async (promptText: string) => {
            try {
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        messages: [
                            {
                                role: "user",
                                content: promptText
                            }
                        ],
                        model: "llama-3.3-70b-versatile",
                        temperature: 0.5,
                        max_tokens: 4096,
                        response_format: { type: "json_object" }
                    })
                });

                const data = await response.json();
                
                if (data.error) {
                    throw new Error(`Groq API Error: ${data.error.message}`);
                }

                return data.choices?.[0]?.message?.content || "";
            } catch (error) {
                console.error("Groq API call failed:", error);
                throw error;
            }
        };

        const textResponse = await generateWithGroq(prompt);
        
        // Extract JSON from response
        const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
        let generatedSchedule = [];
        
        if (jsonMatch) {
            try {
                generatedSchedule = JSON.parse(jsonMatch[0]);
            } catch (e) {
                console.error("Failed to parse JSON from AI response:", textResponse, e);
                throw new Error("AI returned invalid JSON format.");
            }
        } else {
             console.error("Failed to find JSON in AI response:", textResponse);
             throw new Error("AI did not return a valid schedule.");
        }

        // --- Client-Side AI Logic End ---

        // The AI returns a list of shifts. We need to save them to the database.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const shiftsToInsert = generatedSchedule.map((shift: any) => ({
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
            
            toast.success(`Successfully generated and saved ${shiftsToInsert.length} shifts!`);
            fetchShifts(); // Refresh calendar
            setIsAiModalOpen(false);
        } else {
            toast.warning("AI could not generate any shifts for this criteria.");
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        console.error("Error generating schedule:", error);
        toast.error(`Failed to generate schedule: ${errorMessage}`);
      } finally {
        setIsLoading(false);
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
      <div className="flex flex-col md:flex-row items-center justify-between mb-4 p-2 bg-zinc-900 rounded-lg border border-zinc-800 gap-4">
        <div className="flex items-center gap-2 order-2 md:order-1">
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
        
        <div className="text-center order-1 md:order-2">
            {label()}
        </div>

        <div className="flex items-center gap-2 order-3">
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
            <Dialog open={isEditShiftOpen} onOpenChange={setIsEditShiftOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] fixed w-[90vw] max-w-[425px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Shift</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Update or delete this shift.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateShift}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-employee" className="text-right">
                                Employee
                                </Label>
                                <div className="col-span-3">
                                    <Select name="employee" defaultValue={selectedShift?.employeeId}>
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
                                <Label htmlFor="edit-date" className="text-right">
                                Date
                                </Label>
                                <Input id="edit-date" name="date" type="date" defaultValue={selectedShift ? moment(selectedShift.start).format('YYYY-MM-DD') : ''} className="col-span-3 bg-zinc-950 border-zinc-800" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-start_time" className="text-right">
                                Start
                                </Label>
                                <Input id="edit-start_time" name="start_time" type="time" defaultValue={selectedShift ? moment(selectedShift.start).format('HH:mm') : ''} className="col-span-3 bg-zinc-950 border-zinc-800" required />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="edit-end_time" className="text-right">
                                End
                                </Label>
                                <Input id="edit-end_time" name="end_time" type="time" defaultValue={selectedShift ? moment(selectedShift.end).format('HH:mm') : ''} className="col-span-3 bg-zinc-950 border-zinc-800" required />
                            </div>
                        </div>
                        <DialogFooter className="flex gap-2 sm:justify-between">
                            <Button type="button" variant="destructive" onClick={handleDeleteShift} className="bg-red-900/20 text-red-500 hover:bg-red-900/40">
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                            <Button type="submit" className="bg-primary text-black hover:bg-primary/90">Update Shift</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
      </div>
    );
  };

  async function handlePublish() {
    if (!confirm("Are you sure you want to publish all draft shifts? This will make them visible to employees.")) return;
    
    setIsPublishing(true);
    try {
        const { data } = await getSessionSafe();
        const user = data.session?.user ?? null;
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
            
            toast.success("All draft shifts have been published!");
            fetchShifts();
        }
    } catch (error) {
        console.error("Error publishing shifts:", error);
        toast.error("Failed to publish shifts.");
    } finally {
        setIsPublishing(false);
    }
  }

  const handleEventClick = (event: CalendarEvent) => {
    // Only allow editing if not an employee
    if (userRole === 'employee') return;
    
    setSelectedShift(event);
    setIsEditShiftOpen(true);
  };

  const handleDeleteShift = async () => {
    if (!selectedShift) return;
    if (!confirm("Are you sure you want to delete this shift?")) return;

    try {
        const { error } = await supabase
            .from('shifts')
            .delete()
            .eq('id', selectedShift.id);

        if (error) throw error;

        toast.success("Shift deleted successfully");
        setIsEditShiftOpen(false);
        fetchShifts();
    } catch (error) {
        console.error("Error deleting shift:", error);
        toast.error("Failed to delete shift");
    }
  };

  const handleUpdateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShift) return;

    const formData = new FormData(e.target as HTMLFormElement);
    
    try {
        const updates = {
            employee_id: formData.get("employee") as string,
            date: formData.get("date") as string,
            start_time: formData.get("start_time") as string,
            end_time: formData.get("end_time") as string,
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase.from('shifts') as any)
            .update(updates)
            .eq('id', selectedShift.id);

        if (error) throw error;

        toast.success("Shift updated successfully");
        setIsEditShiftOpen(false);
        fetchShifts();
    } catch (error) {
        console.error("Error updating shift:", error);
        toast.error("Failed to update shift");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-white">Schedule</h1>
            <p className="text-zinc-400">Manage shifts and staffing.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 min-h-10">
            {isRoleLoading ? (
              <div
                className="flex flex-wrap justify-center gap-2 w-full sm:w-auto"
                aria-busy="true"
                aria-label="Loading schedule actions"
              >
                <div className="h-10 w-[148px] rounded-md bg-zinc-800 motion-safe:animate-pulse" />
                <div className="h-10 w-[132px] rounded-md bg-zinc-800 motion-safe:animate-pulse" />
                <div className="h-10 w-[124px] rounded-md bg-zinc-800 motion-safe:animate-pulse" />
              </div>
            ) : userRole !== "employee" ? (
                <>
                    <Button 
                        variant="outline" 
                        className="bg-zinc-800 hover:bg-zinc-700 transition-colors text-white hover:text-white border-zinc-700"
                        onClick={handlePublish}
                        disabled={isPublishing}
                    >
                        {isPublishing ? <SmartCrewLogoMark size="xs" className="mr-2" /> : <Send className="mr-2 h-4 w-4" />}
                        Publish Schedule
                    </Button>
                    <Dialog
                        open={isAiModalOpen}
                        onOpenChange={(open) => {
                            setIsAiModalOpen(open);
                            if (!open) {
                                setAiDateRange(undefined);
                                setAiPickerOpen(false);
                            }
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button className="bg-primary text-black hover:bg-primary/90 hover:text-black font-bold gap-2">
                                <Sparkles className="h-4 w-4" />
                                AI Scheduler
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-[425px] fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-h-[85vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>AI Scheduling Assistant</DialogTitle>
                                <DialogDescription className="text-zinc-400">
                                    Automatically generate an optimal schedule based on availability and skills.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleGenerateSchedule}>
                                <div className="grid gap-4 py-4">
                                    {isLoading && (
                                        <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center z-50 rounded-lg">
                                            <SmartCrewLogoMark size="md" className="mb-4" />
                                            <p className="text-white font-medium">Generating Schedule...</p>
                                            <p className="text-zinc-400 text-sm mt-2">This may take 10-20 seconds.</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-4 items-start gap-4">
                                        <Label className="text-right pt-2.5">Date range</Label>
                                        <div className="col-span-3 space-y-1">
                                            <Popover modal open={aiPickerOpen} onOpenChange={handleAiPickerOpenChange}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="w-full justify-start border-zinc-800 bg-zinc-950 text-left font-normal text-zinc-200 hover:bg-zinc-800 hover:text-white"
                                                    >
                                                        <CalendarDays className="mr-2 h-4 w-4 shrink-0 text-primary" />
                                                        {aiDateRange?.from ? (
                                                            aiDateRange.to ? (
                                                                <>
                                                                    {format(aiDateRange.from, "LLL d, yyyy")} –{" "}
                                                                    {format(aiDateRange.to, "LLL d, yyyy")}
                                                                </>
                                                            ) : (
                                                                format(aiDateRange.from, "LLL d, yyyy")
                                                            )
                                                        ) : (
                                                            <span className="text-zinc-500">Open calendar to choose dates</span>
                                                        )}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="w-auto border-zinc-800 bg-zinc-900 p-0"
                                                    align="start"
                                                    onInteractOutside={blockAiPickerDismissIfIncomplete}
                                                    onPointerDownOutside={blockAiPickerDismissIfIncomplete}
                                                    onFocusOutside={blockAiPickerDismissIfIncomplete}
                                                >
                                                    <DayPicker
                                                        mode="range"
                                                        weekStartsOn={1}
                                                        numberOfMonths={1}
                                                        selected={aiDateRange}
                                                        onSelect={(range) => {
                                                            aiDateRangeRef.current = range;
                                                            setAiDateRange(range);
                                                        }}
                                                        className="ai-schedule-picker"
                                                    />
                                                    <div className="flex justify-end border-t border-zinc-800 px-2 py-2">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 text-zinc-400 hover:bg-zinc-800 hover:text-white"
                                                            onClick={() => {
                                                                setAiDateRange(undefined);
                                                                setAiPickerOpen(false);
                                                            }}
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                            <p className="text-xs text-zinc-500">
                                                Pick a start date, then an end date. The calendar stays open until both are
                                                chosen; then click outside or press Esc to close. Use Cancel to clear and
                                                close early.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="goal" className="text-right">
                                        Goal
                                        </Label>
                                        <div className="col-span-3">
                                            <Select value={aiGoal} onValueChange={setAiGoal}>
                                                <SelectTrigger className="bg-zinc-950 border-zinc-800">
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
                                </div>
                                <DialogFooter>
                                    <Button type="submit" className="bg-primary text-black hover:bg-primary/90 w-full" disabled={isLoading}>
                                        {isLoading ? <SmartCrewLogoMark size="xs" className="mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />} 
                                        Generate Schedule
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Dialog
                        open={isAddShiftOpen}
                        onOpenChange={(open) => {
                            setIsAddShiftOpen(open);
                            if (!open) {
                                setAddShiftEmployeeId("");
                                setAddShiftDate(undefined);
                                setAddShiftDateOpen(false);
                                setAddShiftStartTime("");
                                setAddShiftEndTime("");
                            }
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button variant="outline" className="bg-zinc-800 hover:bg-zinc-700 transition-colors border-zinc-700 text-white hover:text-white gap-2">
                                <Plus className="h-4 w-4" />
                                Add Shift
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-zinc-900 border-zinc-800 text-white fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[90vw] max-h-[85vh] overflow-y-auto">
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
                                            <Select value={addShiftEmployeeId} onValueChange={setAddShiftEmployeeId}>
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
                                        <div className="col-span-3">
                                            <Popover open={addShiftDateOpen} onOpenChange={setAddShiftDateOpen}>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="w-full justify-start bg-zinc-950 border-zinc-800 text-white hover:bg-zinc-900"
                                                    >
                                                        <CalendarDays className="mr-2 h-4 w-4 text-zinc-400" />
                                                        {addShiftDate ? format(addShiftDate, "PPP") : "Pick a date"}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent align="start" className="w-auto p-2 bg-zinc-900 border-zinc-800 text-white">
                                                    <DayPicker
                                                        mode="single"
                                                        selected={addShiftDate}
                                                        onSelect={(d) => {
                                                            setAddShiftDate(d);
                                                            if (d) setAddShiftDateOpen(false);
                                                        }}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="start_time" className="text-right">
                                        Start
                                        </Label>
                                        <div className="col-span-3">
                                            <Select value={addShiftStartTime} onValueChange={setAddShiftStartTime}>
                                                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                                                    <SelectValue placeholder="Select time" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-800 border-zinc-700 text-white max-h-[240px] overflow-y-auto">
                                                    {Array.from({ length: 288 }, (_, i) => {
                                                        const totalMinutes = i * 5;
                                                        const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
                                                        const mm = String(totalMinutes % 60).padStart(2, "0");
                                                        const value = `${hh}:${mm}`;
                                                        const label = moment(value, "HH:mm").format("h:mm A");
                                                        return (
                                                            <SelectItem key={value} value={value}>
                                                                {label}
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="end_time" className="text-right">
                                        End
                                        </Label>
                                        <div className="col-span-3">
                                            <Select value={addShiftEndTime} onValueChange={setAddShiftEndTime}>
                                                <SelectTrigger className="bg-zinc-950 border-zinc-800">
                                                    <SelectValue placeholder="Select time" />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-800 border-zinc-700 text-white max-h-[240px] overflow-y-auto">
                                                    {Array.from({ length: 288 }, (_, i) => {
                                                        const totalMinutes = i * 5;
                                                        const hh = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
                                                        const mm = String(totalMinutes % 60).padStart(2, "0");
                                                        const value = `${hh}:${mm}`;
                                                        const label = moment(value, "HH:mm").format("h:mm A");
                                                        return (
                                                            <SelectItem key={value} value={value}>
                                                                {label}
                                                            </SelectItem>
                                                        );
                                                    })}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="submit" className="bg-primary text-black hover:bg-primary/90">Add Shift</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </>
            ) : null}
        </div>
      </div>

      <div className="h-[700px] bg-zinc-900 rounded-lg border border-zinc-800 p-4">
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
            eventPropGetter={(event) => {
                const isDraft = event.status === 'draft';
                return {
                    className: `${isDraft ? 'bg-zinc-800 border-zinc-500 text-zinc-400 border-l-4 border-dashed' : 'bg-zinc-800 border-l-4 border-primary text-white'} text-xs p-1 rounded-r-md overflow-hidden cursor-pointer hover:brightness-110 transition-all`
                };
            }}
            onSelectEvent={handleEventClick}
        />
      </div>
    </div>
  );
}
