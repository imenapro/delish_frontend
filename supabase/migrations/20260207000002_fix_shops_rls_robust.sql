-- Fix shops RLS to allow users with business access to view shops
-- This allows sellers (and other roles) who are assigned to a business but not a specific shop to see the shops list
-- The frontend handles filtering if specific shops are assigned, but RLS was too restrictive
-- Uses explicit casting to text to avoid "operator does not exist: text = app_role" errors and avoids relying on has_role function

DROP POLICY IF EXISTS "Users can view accessible shops" ON public.shops;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.shops;

CREATE POLICY "Users can view accessible shops"
ON public.shops
FOR SELECT
USING (
  -- 1. Super Admin (Global)
  (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text = 'super_admin'
  ))
  OR 
  -- 2. Admin (Global or Business)
  (EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role::text = 'admin'
  ))
  OR 
  -- 3. Explicitly assigned shops (User has specific shop_id)
  id IN (
    SELECT shop_id FROM public.user_roles
    WHERE user_id = auth.uid()
    AND shop_id IS NOT NULL
  )
  OR 
  -- 4. Business-wide access (User has role in business with NULL shop_id)
  -- This allows them to see ALL shops in their business
  business_id IN (
      SELECT business_id 
      FROM public.user_roles 
      WHERE user_id = auth.uid()
      AND business_id IS NOT NULL
      AND shop_id IS NULL
  )
);
