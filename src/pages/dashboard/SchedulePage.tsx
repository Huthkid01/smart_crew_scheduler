import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer, Views } from "react-big-calendar";
import type { View } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, ChevronLeft, ChevronRight, Loader2, Send, Trash2 } from "lucide-react";
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
  const [isEditShiftOpen, setIsEditShiftOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<CalendarEvent | null>(null);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  useEffect(() => {
    fetchUserRole();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (userRole) {
        fetchShifts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole]);

  async function fetchUserRole() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
        const { data } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setUserRole((data as any)?.role || 'employee');
        }
    } catch (error) {
        console.error("Error fetching role:", error);
    } finally {
        setIsRoleLoading(false);
    }
  }

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
        <div className="flex flex-wrap justify-center gap-2">
            {!isRoleLoading && userRole !== 'employee' && (
                <>
                    <Button 
                        variant="outline" 
                        className="bg-zinc-800 hover:bg-zinc-700 transition-colors text-white hover:text-white border-zinc-700"
                        onClick={handlePublish}
                        disabled={isPublishing}
                    >
                        {isPublishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Publish Schedule
                    </Button>
                    <Dialog open={isAiModalOpen} onOpenChange={setIsAiModalOpen}>
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
                                            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                                            <p className="text-white font-medium">Generating Schedule...</p>
                                            <p className="text-zinc-400 text-sm mt-2">This may take 10-20 seconds.</p>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="date-range" className="text-right">
                                        Date Range
                                        </Label>
                                        <div className="col-span-3 flex gap-2">
                                            <Input name="start_date" type="date" className="bg-zinc-950 border-zinc-800" required />
                                            <span className="self-center">-</span>
                                            <Input name="end_date" type="date" className="bg-zinc-950 border-zinc-800" required />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="goal" className="text-right">
                                        Goal
                                        </Label>
                                        <div className="col-span-3">
                                            <Select name="goal" defaultValue="balance">
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
                                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />} 
                                        Generate Schedule
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Dialog open={isAddShiftOpen} onOpenChange={setIsAddShiftOpen}>
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
                </>
            )}
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
