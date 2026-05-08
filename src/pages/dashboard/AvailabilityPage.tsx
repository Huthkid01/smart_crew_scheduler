import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmartCrewLogoMark } from "@/components/SmartCrewLogoMark";
import { supabase } from "@/supabase/client";
import { toast } from "sonner";
import { devError } from "@/lib/utils";

type TimeOffStatus = "pending" | "approved" | "rejected";
type TimeOffFilter = TimeOffStatus | "all";

interface TimeOffRequestRow {
  id: string;
  employee_id: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: TimeOffStatus;
  created_at: string;
  employees?: { name?: string | null; position?: string | null } | null;
}

export default function AvailabilityPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequestRow[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(false);
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TimeOffFilter>("pending");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, org_id')
          .eq('id', user.id)
          .single();

        if (!profile || cancelled) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const role = (profile as any).role || 'employee';
        if (!cancelled) setUserRole(role);
      } catch (error) {
        devError("Error fetching user data:", error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchTimeOffRequests = async (status: TimeOffFilter) => {
    setIsLoadingRequests(true);
    try {
      let query = supabase
        .from("time_off_requests")
        .select("id, employee_id, start_date, end_date, reason, status, created_at, employees(name, position)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (status !== "all") {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTimeOffRequests((data as TimeOffRequestRow[]) || []);
    } catch (error) {
      devError("Error fetching time off requests:", error);
      toast.error("Could not load time-off requests.");
    } finally {
      setIsLoadingRequests(false);
    }
  };

  useEffect(() => {
    if (!userRole) return;
    if (userRole === "employee") return;
    fetchTimeOffRequests(filter);
  }, [filter, userRole]);

  const updateRequestStatus = async (requestId: string, status: TimeOffStatus) => {
    setUpdatingRequestId(requestId);
    try {
      const { error } = await supabase
        .from("time_off_requests")
        .update({ status })
        .eq("id", requestId);

      if (error) throw error;
      toast.success(status === "approved" ? "Request approved." : "Request declined.");
      fetchTimeOffRequests(filter);
    } catch (error) {
      devError("Error updating request:", error);
      toast.error("Could not update the request.");
    } finally {
      setUpdatingRequestId(null);
    }
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
          <div className="flex items-center justify-center h-64">
              <SmartCrewLogoMark size="sm" />
          </div>
      ) : userRole === "employee" ? (
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader>
            <CardTitle>Time-off Requests</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-zinc-400">
            This section is available to admins/managers. Employees can request time off from their dashboard home.
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-zinc-900 border-zinc-800 text-white">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-white">Time-off Requests</CardTitle>
              <div className="mt-1 text-sm text-zinc-400">Approve or decline employee time off requests.</div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Select value={filter} onValueChange={(v) => setFilter(v as TimeOffFilter)}>
                <SelectTrigger className="w-full sm:w-[200px] bg-zinc-900 border-zinc-800 text-white">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white hover:text-white w-full sm:w-auto"
                onClick={() => fetchTimeOffRequests(filter)}
                disabled={isLoadingRequests}
              >
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoadingRequests ? (
              <div className="flex items-center justify-center py-10">
                <SmartCrewLogoMark size="sm" />
              </div>
            ) : timeOffRequests.length === 0 ? (
              <div className="text-sm text-zinc-400">No time-off requests found.</div>
            ) : (
              timeOffRequests.map((req) => {
                const statusClass =
                  req.status === "approved"
                    ? "bg-green-500/15 text-green-400"
                    : req.status === "rejected"
                      ? "bg-red-500/15 text-red-400"
                      : "bg-yellow-500/15 text-yellow-300";

                const isUpdating = updatingRequestId === req.id;
                const disableActions = isUpdating || req.status !== "pending";

                return (
                  <div
                    key={req.id}
                    className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-white">
                          {(req.employees?.name ?? "Employee")}
                        </div>
                        <div
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass}`}
                        >
                          {req.status}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">
                        {req.start_date} → {req.end_date} • {req.employees?.position ?? "—"}
                      </div>
                      <div className="mt-1 text-sm text-zinc-300 break-words">{req.reason}</div>
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                      <Button
                        type="button"
                        className="bg-primary hover:bg-primary/90 text-black font-bold"
                        onClick={() => updateRequestStatus(req.id, "approved")}
                        disabled={disableActions}
                      >
                        {isUpdating ? <SmartCrewLogoMark size="xs" /> : "Approve"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-zinc-700 bg-transparent hover:bg-white/10 text-white hover:text-white"
                        onClick={() => updateRequestStatus(req.id, "rejected")}
                        disabled={disableActions}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
