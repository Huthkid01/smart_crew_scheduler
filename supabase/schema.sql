-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations Table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    subscription_tier TEXT DEFAULT 'free',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles Table (Supabase Auth Users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT CHECK (role IN ('admin', 'manager', 'employee')) DEFAULT 'employee',
    email TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Employees Table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    position TEXT,
    skills TEXT[] DEFAULT '{}',
    hourly_rate DECIMAL(10, 2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shifts Table
CREATE TABLE shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_minutes INTEGER DEFAULT 0,
    status TEXT CHECK (status IN ('draft', 'published', 'completed')) DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Availability Table
CREATE TABLE availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6),
    is_available BOOLEAN DEFAULT true,
    start_time TIME,
    end_time TIME,
    UNIQUE(employee_id, day_of_week)
);

-- Skills Table (Catalog of skills)
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    category TEXT
);

-- Employee Skills (Join Table for detailed tracking)
CREATE TABLE employee_skills (
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level INTEGER CHECK (proficiency_level BETWEEN 1 AND 5),
    PRIMARY KEY (employee_id, skill_id)
);

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_skills ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles: Users can view their own profile and profiles in their organization
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Organizations: Users can view their own organization
CREATE POLICY "Users can view own organization" ON organizations
    FOR SELECT USING (id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
    ));

-- Employees: Users can view employees in their organization
CREATE POLICY "Users can view org employees" ON employees
    FOR SELECT USING (org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
    ));

-- Managers and Admins can manage employees
CREATE POLICY "Admins and Managers can manage employees" ON employees
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
            AND org_id = employees.org_id
        )
    );

-- Shifts: Users can view shifts in their organization
CREATE POLICY "Users can view org shifts" ON shifts
    FOR SELECT USING (org_id IN (
        SELECT org_id FROM profiles WHERE id = auth.uid()
    ));

-- Managers and Admins can manage shifts
CREATE POLICY "Admins and Managers can manage shifts" ON shifts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
            AND org_id = shifts.org_id
        )
    );

-- Availability: Users can view availability in their organization
CREATE POLICY "Users can view org availability" ON availability
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM employees
            WHERE id = availability.employee_id
            AND org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
        )
    );

-- Users can manage their own availability (via linked employee record)
-- Note: This requires linking auth.uid() to employee_id, which isn't explicitly in the schema yet.
-- For now, we'll allow managers to manage availability.
CREATE POLICY "Admins and Managers can manage availability" ON availability
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
            AND org_id IN (
                SELECT org_id FROM employees WHERE id = availability.employee_id
            )
        )
    );

-- Helper function to handle new user signup (and invited users: see migrations for latest body)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  meta jsonb := COALESCE(new.raw_user_meta_data, '{}'::jsonb);
  v_org_id uuid;
  v_org_text text;
  v_full_name text;
BEGIN
  v_full_name := NULLIF(trim(COALESCE(meta->>'full_name', meta->>'name', '')), '');
  IF v_full_name IS NULL THEN
    v_full_name := split_part(new.email, '@', 1);
  END IF;

  v_org_text := NULLIF(trim(COALESCE(meta->>'org_id', '')), '');
  IF v_org_text IS NOT NULL THEN
    BEGIN
      v_org_id := v_org_text::uuid;
    EXCEPTION
      WHEN invalid_text_representation THEN
        v_org_id := NULL;
    END;
  ELSE
    v_org_id := NULL;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, org_id)
  VALUES (new.id, new.email, v_full_name, 'employee', v_org_id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
