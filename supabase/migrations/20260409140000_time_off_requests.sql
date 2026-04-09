-- Persisted time-off requests (replaces mock-only UI)

CREATE TABLE IF NOT EXISTS public.time_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT time_off_dates_valid CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_time_off_requests_employee ON public.time_off_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_status ON public.time_off_requests(status);

ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own time off requests"
  ON public.time_off_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = time_off_requests.employee_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can view org time off requests"
  ON public.time_off_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      INNER JOIN public.employees e ON e.org_id = p.org_id
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'manager')
        AND e.id = time_off_requests.employee_id
    )
  );

CREATE POLICY "Employees can insert own time off requests"
  ON public.time_off_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = time_off_requests.employee_id AND e.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and managers can insert time off for org employees"
  ON public.time_off_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      INNER JOIN public.employees e ON e.org_id = p.org_id
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'manager')
        AND e.id = time_off_requests.employee_id
    )
  );

CREATE POLICY "Admins and managers can update org time off requests"
  ON public.time_off_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      INNER JOIN public.employees e ON e.org_id = p.org_id
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'manager')
        AND e.id = time_off_requests.employee_id
    )
  );
