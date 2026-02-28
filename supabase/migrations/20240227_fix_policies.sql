-- Allow authenticated users to create organizations
CREATE POLICY "Users can create organizations" ON organizations
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Allow authenticated users to insert their own profile (fallback if trigger fails)
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);
