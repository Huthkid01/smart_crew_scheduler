import React, { useState, useEffect } from "react";
import { Plus, Search, MoreHorizontal, Trash2 } from "lucide-react";
import { SmartCrewLogoMark } from "@/components/SmartCrewLogoMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/supabase/client";
import type { Database } from "@/supabase/types";
import { toast } from "sonner";

interface Profile {
  org_id: string;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  position: string;
  hourly_rate: number;
  is_active: boolean;
  skills: string[];
}

type EmployeeInsert = Database['public']['Tables']['employees']['Insert'];
// type EmployeeUpdate = Database['public']['Tables']['employees']['Update'];
type EmployeeUpdate = Database["public"]["Tables"]["employees"]["Update"];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    try {
      setIsLoading(true);
      // Get current user's org_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        const p = profile as Profile;
        setOrgId(p.org_id);
        
        const { data: employeesData, error } = await supabase
          .from('employees')
          .select('*')
          .eq('org_id', p.org_id)
          .eq("is_active", true)
          .order('name');

        if (error) throw error;
        setEmployees(employeesData || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      console.log("EmployeesPage: fetchEmployees finished, setting isLoading false");
      setIsLoading(false);
    }
  }

  // Filter employees
  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const skillsString = formData.get("skills") as string;
    const skills = skillsString ? skillsString.split(',').map(s => s.trim()) : [];
    const email = formData.get("email") as string;

    const employeeData: EmployeeInsert = {
        org_id: orgId,
        name: formData.get("name") as string,
        email: email,
        position: formData.get("position") as string,
        hourly_rate: parseFloat(formData.get("rate") as string),
        is_active: true,
        skills: skills
    };
    
    try {
        if (editingEmployee) {
            // Update existing employee
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase.from('employees') as any)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .update(employeeData as any)
                .eq('id', editingEmployee.id)
                .select()
                .single();

            if (error) throw error;

            setEmployees(employees.map(emp => emp.id === editingEmployee.id ? data : emp));
            toast.success("Employee updated successfully!");
        } else {
            // 1. Create new employee record
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase.from('employees') as any)
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .insert([{ ...employeeData, invite_status: 'pending' }] as any)
                .select()
                .single();

            if (error) throw error;

            // 2. Trigger invitation (via Edge Function)
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const inviteResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-employee`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`,
                    },
                    body: JSON.stringify({
                        email: email,
                        employee_id: data.id,
                        org_id: orgId,
                        full_name: employeeData.name,
                    })
                });

                if (!inviteResponse.ok) {
                    const errorData = await inviteResponse.json();
                    throw new Error(errorData.error || 'Failed to send invitation');
                }

                toast.success("Employee added and invitation sent!");
            } catch (inviteError) {
                console.error("Invitation failed:", inviteError);
                toast.warning("Employee added, but invitation failed to send. Please retry.");
            }

            setEmployees([...employees, data]);
        }
        
        setIsAddOpen(false);
        setEditingEmployee(null);
    } catch (error) {
        console.error('Error saving employee:', error);
        toast.error('Failed to save employee');
    }
  };

  const handleDeleteEmployee = async (id: string) => {
      if (!confirm("Remove this employee from your team? (Their time records will be kept.)")) return;

      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            toast.error("You must be signed in to delete employees.");
            return;
          }

          const { data: profile } = await supabase
            .from("profiles")
            .select("role, org_id")
            .eq("id", user.id)
            .maybeSingle();

          const role = (profile as unknown as { role?: string | null } | null)?.role ?? null;
          const currentOrgId = (profile as unknown as { org_id?: string | null } | null)?.org_id ?? null;

          if (!currentOrgId || (role !== "admin" && role !== "manager")) {
            toast.error("Only an admin/manager can delete employees. Finish account setup and try again.");
            return;
          }

          // 1. Get user_id to delete from Auth
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: empData } = await (supabase.from('employees') as any)
            .select('user_id')
            .eq('id', id)
            .single();

          // 2. Delete from Auth (if linked)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if ((empData as any)?.user_id) {
             const { data: { session } } = await supabase.auth.getSession();
             try {
                 const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`,
                    },
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    body: JSON.stringify({ user_id: (empData as any).user_id })
                 });
                 if (!resp.ok) {
                   const body = await resp.json().catch(() => ({}));
                   console.error("Failed to delete auth user:", body);
                 }
             } catch (err) {
                 console.error("Failed to delete auth user:", err);
                 // We continue to delete the record so they are removed from the list
             }
          }

          // Keep history (time_entries references employees). So we soft-delete by marking inactive.
          const updateData: EmployeeUpdate = { is_active: false };
          const { error } = await supabase
              .from('employees')
              .update(updateData)
              .eq('id', id);
          
          if (error) throw error;

          setEmployees(employees.filter(emp => emp.id !== id));
          toast.success("Employee removed successfully!");
      } catch (error) {
          console.error('Error deleting employee:', error);
          const messageValue =
            error && typeof error === "object" && "message" in error
              ? (error as { message?: unknown }).message
              : undefined;
          const msg = typeof messageValue === "string" ? messageValue : "Failed to delete employee";
          toast.error(msg);
      }
  };

  const handleResendInvitation = async (employee: Employee) => {
    try {
      if (!orgId) {
        toast.error("Finish account setup first, then try again.");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("You must be signed in to resend invitations.");
        return;
      }

      const inviteResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-employee`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: employee.email,
            employee_id: employee.id,
            org_id: orgId,
            full_name: employee.name,
          }),
        }
      );

      if (!inviteResponse.ok) {
        const errorData = await inviteResponse.json().catch(() => ({}));
        const message =
          typeof (errorData as { error?: unknown }).error === "string"
            ? (errorData as { error: string }).error
            : "Failed to send invitation";
        throw new Error(message);
      }

      toast.success(`Invitation resent to ${employee.email}`);
    } catch (error) {
      console.error("Invitation resend failed:", error);
      toast.error(error instanceof Error ? error.message : "Failed to resend invitation");
    }
  };

  const openAddDialog = () => {
      setEditingEmployee(null);
      setIsAddOpen(true);
  };

  const openEditDialog = (employee: Employee) => {
      setEditingEmployee(employee);
      setIsAddOpen(true);
  };

  const handleRevokeAccess = async (e: React.FormEvent) => {
      e.preventDefault();
      const formData = new FormData(e.target as HTMLFormElement);
      const email = formData.get("email") as string;
      
      try {
          const { data: { session } } = await supabase.auth.getSession();
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ email })
          });

          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Failed to revoke access");

          toast.success(`Login access revoked for ${email}`);
          setIsRevokeOpen(false);
      } catch (error) {
          console.error("Error revoking access:", error);
          toast.error(error instanceof Error ? error.message : "Failed to revoke access");
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold tracking-tight text-white">Employees</h1>
            <p className="text-zinc-400">Manage your team members and their roles.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Dialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
                <DialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto">
                        <Trash2 className="mr-2 h-4 w-4" /> Revoke Access
                    </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Revoke Login Access</DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Enter the email of the deleted employee to remove their login access.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRevokeAccess}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="revoke-email" className="text-right">
                                    Email
                                </Label>
                                <Input id="revoke-email" name="email" type="email" placeholder="jane@example.com" className="col-span-3 bg-zinc-950 border-zinc-800" required />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="submit" variant="destructive">
                                Revoke Access
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddOpen} onOpenChange={(open) => {
                setIsAddOpen(open);
                if (!open) setEditingEmployee(null);
            }}>
            <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary/90 text-black font-bold w-full sm:w-auto" onClick={openAddDialog}>
                <Plus className="mr-2 h-4 w-4" /> Add Employee
                </Button>
            </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
            <DialogHeader>
              <DialogTitle>{editingEmployee ? "Edit Employee" : "Add New Employee"}</DialogTitle>
              <DialogDescription className="text-zinc-400">
                {editingEmployee ? "Update employee details." : "Enter the details of the new team member here."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveEmployee}>
                <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                    Name
                    </Label>
                    <Input id="name" name="name" defaultValue={editingEmployee?.name} placeholder="Jane Doe" className="col-span-3 bg-zinc-950 border-zinc-800" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="email" className="text-right">
                    Email
                    </Label>
                    <Input id="email" name="email" type="email" defaultValue={editingEmployee?.email} placeholder="jane@example.com" className="col-span-3 bg-zinc-950 border-zinc-800" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="position" className="text-right">
                    Position
                    </Label>
                     <div className="col-span-3">
                        <Select name="position" defaultValue={editingEmployee?.position} required>
                            <SelectTrigger className="bg-zinc-950 border-zinc-800">
                                <SelectValue placeholder="Select a position" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                <SelectItem value="Front of House">Front of House</SelectItem>
                                <SelectItem value="Kitchen Staff">Kitchen Staff</SelectItem>
                                <SelectItem value="Manager">Manager</SelectItem>
                                <SelectItem value="Bartender">Bartender</SelectItem>
                            </SelectContent>
                        </Select>
                     </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="rate" className="text-right">
                    Hourly Rate
                    </Label>
                    <Input id="rate" name="rate" type="number" step="0.01" defaultValue={editingEmployee?.hourly_rate} placeholder="20.00" className="col-span-3 bg-zinc-950 border-zinc-800" required />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="skills" className="text-right">
                    Skills
                    </Label>
                    <Input 
                        id="skills" 
                        name="skills" 
                        defaultValue={editingEmployee?.skills?.join(", ")} 
                        placeholder="e.g. Cooking, Inventory (comma separated)" 
                        className="col-span-3 bg-zinc-950 border-zinc-800" 
                    />
                </div>
                </div>
                <DialogFooter>
                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-black font-bold">
                        {editingEmployee ? "Save Changes" : "Add Employee"}
                    </Button>
                </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <SmartCrewLogoMark size="sm" />
        </div>
      ) : (
        <div className="rounded-md border border-zinc-800 bg-zinc-900">
        <div className="p-4">
            <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
                placeholder="Search employees..."
                className="pl-8 bg-zinc-950 border-zinc-800 text-white w-full md:w-[300px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
            </div>
        </div>
        <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm text-left min-w-[800px]">
            <thead className="[&_tr]:border-b [&_tr]:border-zinc-800">
                <tr className="border-b transition-colors hover:bg-zinc-900/50 data-[state=selected]:bg-zinc-900">
                <th className="h-12 px-4 align-middle font-medium text-zinc-400">Name</th>
                <th className="h-12 px-4 align-middle font-medium text-zinc-400">Email</th>
                <th className="h-12 px-4 align-middle font-medium text-zinc-400">Position</th>
                <th className="h-12 px-4 align-middle font-medium text-zinc-400">Skills</th>
                <th className="h-12 px-4 align-middle font-medium text-zinc-400">Hourly Rate</th>
                <th className="h-12 px-4 align-middle font-medium text-zinc-400">Status</th>
                <th className="h-12 px-4 align-middle font-medium text-zinc-400 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
                {filteredEmployees.map((employee) => (
                <tr
                    key={employee.id}
                    className="border-b border-zinc-800 transition-colors hover:bg-zinc-900/50 data-[state=selected]:bg-zinc-900"
                >
                    <td className="p-4 align-middle font-medium text-white">{employee.name}</td>
                    <td className="p-4 align-middle text-zinc-400">{employee.email}</td>
                    <td className="p-4 align-middle text-zinc-300">{employee.position}</td>
                    <td className="p-4 align-middle text-zinc-300">
                      {employee.skills && employee.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {employee.skills.slice(0, 3).map((skill, i) => (
                            <span key={i} className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-400">
                              {skill}
                            </span>
                          ))}
                          {employee.skills.length > 3 && (
                            <span className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-400">
                              +{employee.skills.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-500 text-xs">No skills</span>
                      )}
                    </td>
                    <td className="p-4 align-middle text-zinc-300">${employee.hourly_rate.toFixed(2)}/hr</td>
                    <td className="p-4 align-middle">
                    <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        employee.is_active
                            ? "bg-green-500/10 text-green-500"
                            : "bg-red-500/10 text-red-500"
                        }`}
                    >
                        {employee.is_active ? "Active" : "Inactive"}
                    </span>
                    </td>
                    <td className="p-4 align-middle text-right">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-800">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Open menu</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 text-white">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem className="hover:bg-zinc-800 cursor-pointer" onClick={() => openEditDialog(employee)}>
                                    Edit employee
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="hover:bg-zinc-800 cursor-pointer"
                                  onClick={() => handleResendInvitation(employee)}
                                >
                                  Resend invitation
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-zinc-800" />
                                <DropdownMenuItem className="text-red-500 hover:bg-red-900/20 hover:text-red-400 cursor-pointer" onClick={() => handleDeleteEmployee(employee.id)}>
                                    Delete employee
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        </div>
      )}
    </div>
  );
}
