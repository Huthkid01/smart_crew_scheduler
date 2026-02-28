-- Enable RLS updates for organizations
-- Currently only SELECT is allowed by "Users can view own organization"

CREATE POLICY "Admins can update own organization" ON organizations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND role = 'admin'
            AND org_id = organizations.id
        )
    );
