-- Add user_id to employees table to link with auth.users
ALTER TABLE employees 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add status column to track invitation state
ALTER TABLE employees 
ADD COLUMN invite_status TEXT CHECK (invite_status IN ('pending', 'accepted', 'active')) DEFAULT 'active';

-- Add invite_token to verify invitation
ALTER TABLE employees 
ADD COLUMN invite_token UUID DEFAULT uuid_generate_v4();

-- Update RLS policies to allow employees to view their own record
CREATE POLICY "Employees can view own record" ON employees
    FOR SELECT USING (auth.uid() = user_id);

-- Update RLS policies to allow employees to update their own record
CREATE POLICY "Employees can update own record" ON employees
    FOR UPDATE USING (auth.uid() = user_id);
