-- Fix shops RLS to allow users with business access to view shops
-- This allows sellers (and other roles) who are assigned to a business but not a specific shop to see the shops list
-- The frontend handles filtering if specific shops are assigned, but RLS was too restrictive

DROP POLICY IF EXISTS "Users can view accessible shops" ON public.shops;

CREATE POLICY "Users can view accessible shops"
ON public.shops
FOR SELECT
USING (
  -- 1. Super Admin
  has_role(auth.uid(), 'super_admin'::app_role)
  OR 
  -- 2. Admin
  has_role(auth.uid(), 'admin'::app_role)
  OR 
  -- 3. Explicitly assigned shops (legacy or specific shop roles)
  id IN (SELECT public.get_user_shops(auth.uid()))
  OR 
  -- 4. Business-wide access (Sellers, etc assigned to business)
  business_id IN (
      SELECT business_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid()
      AND business_id IS NOT NULL
      -- We don't filter by role here to be permissive for all business members
      -- The frontend can restrict further if needed
  )
);
