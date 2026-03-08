create table if not exists time_entries (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references employees(id) not null,
  shift_id uuid references shifts(id), -- optional link to scheduled shift
  clock_in timestamp with time zone default now() not null,
  clock_out timestamp with time zone,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table time_entries enable row level security;

-- Policies
create policy "Employees can view own time entries"
on time_entries for select
using (
  auth.uid() in (
    select user_id from employees where id = time_entries.employee_id
  )
);

create policy "Employees can insert own time entries"
on time_entries for insert
with check (
  auth.uid() in (
    select user_id from employees where id = time_entries.employee_id
  )
);

create policy "Employees can update own time entries"
on time_entries for update
using (
  auth.uid() in (
    select user_id from employees where id = time_entries.employee_id
  )
);

create policy "Admins can view all time entries"
on time_entries for select
using (
  auth.uid() in (
    select id from profiles where role in ('admin', 'manager') and org_id = (
      select org_id from employees where id = time_entries.employee_id
    )
  )
);
