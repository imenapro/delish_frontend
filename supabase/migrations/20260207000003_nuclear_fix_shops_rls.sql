-- Dynamic drop of all policies on shops to ensure clean slate
DO $$ 
DECLARE 
    pol record; 
BEGIN 
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'shops' AND schemaname = 'public' 
    LOOP 
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.shops', pol.policyname); 
    END LOOP; 
END $$;

-- Re-enable RLS just in case
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- 1. Create the ROBUST policy that handles both business-wide and shop-specific access
-- explicitly casting to text to avoid "operator does not exist: text = app_role" errors
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
    AND ur.role::text IN ('admin', 'store_owner', 'Owner', 'branch_manager')
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
