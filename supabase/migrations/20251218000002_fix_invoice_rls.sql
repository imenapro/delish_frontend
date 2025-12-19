
-- Update RLS policy for invoices to include store_owner and other roles
-- The previous policy was too restrictive, missing 'store_owner' and 'super_admin'

DROP POLICY IF EXISTS "Users can view invoices they created or if admin/manager" ON public.invoices;

CREATE POLICY "Users can view invoices" ON public.invoices
    FOR SELECT
    USING (
        auth.uid() = created_by OR 
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('super_admin', 'store_owner', 'admin', 'manager', 'branch_manager', 'accountant')
        )
    );
