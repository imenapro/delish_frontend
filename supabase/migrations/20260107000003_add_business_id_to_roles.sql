-- Add business_id to roles table to support tenant-specific roles
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Update RLS policies for roles
DROP POLICY IF EXISTS "Roles are viewable by everyone" ON public.roles;
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.roles;

-- View policy: Users can see system roles (business_id is NULL) AND their own business roles
CREATE POLICY "Users can view system and own business roles" ON public.roles
FOR SELECT
USING (
    business_id IS NULL 
    OR 
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND business_id = roles.business_id
    )
    OR
    EXISTS (
        SELECT 1 FROM public.businesses
        WHERE id = roles.business_id
        AND owner_id = auth.uid()
    )
);

-- Manage policy: Admins/Owners can manage roles for their business
CREATE POLICY "Admins can manage their business roles" ON public.roles
FOR ALL
USING (
    business_id IS NOT NULL AND (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND business_id = roles.business_id
            AND role IN ('admin', 'super_admin', 'store_owner', 'Owner')
        )
        OR
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE id = roles.business_id
            AND owner_id = auth.uid()
        )
    )
)
WITH CHECK (
    business_id IS NOT NULL AND (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()
            AND business_id = roles.business_id
            AND role IN ('admin', 'super_admin', 'store_owner', 'Owner')
        )
        OR
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE id = roles.business_id
            AND owner_id = auth.uid()
        )
    )
);
