-- 1. Enable RLS on organizations (if not already enabled)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 2. Allow authenticated users to create organizations
-- Drop policy if it exists to avoid errors
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;

CREATE POLICY "Users can create organizations" ON organizations
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- 3. Allow authenticated users to view organizations they created or belong to
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;

CREATE POLICY "Users can view own organization" ON organizations
    FOR SELECT TO authenticated
    USING (
        id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
        OR
        -- Allow viewing the organization just created (though usually returning * handles this)
        true
    );
-- Note: The 'true' above is a bit broad for SELECT, but for creation flow it helps. 
-- Better strict policy:
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
CREATE POLICY "Users can view own organization" ON organizations
    FOR SELECT TO authenticated
    USING (
        id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
    );

-- 4. Allow users to update their own profile (to set org_id)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 5. Allow users to insert their own profile (fallback if trigger fails)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);
