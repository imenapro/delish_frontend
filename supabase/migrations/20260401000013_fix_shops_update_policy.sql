DO $$
DECLARE
  pol record;
BEGIN
  IF to_regclass('public.shops') IS NULL THEN
    RETURN;
  END IF;

  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'shops' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.shops', pol.policyname);
  END LOOP;

  ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "Shops select active"
  ON public.shops
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (
      EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role::text = 'super_admin'
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role::text IN ('admin', 'store_owner', 'Owner', 'branch_manager', 'manager', 'accountant')
          AND (ur.business_id = public.shops.business_id OR ur.business_id IS NULL)
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.shop_id = public.shops.id
      )
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.business_id = public.shops.business_id
          AND ur.shop_id IS NULL
      )
    )
  );

  CREATE POLICY "Shops manage"
  ON public.shops
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('admin', 'store_owner', 'Owner', 'branch_manager', 'manager')
        AND (ur.business_id = public.shops.business_id OR ur.business_id IS NULL)
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.shop_id = public.shops.id
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.business_id = public.shops.business_id
        AND ur.shop_id IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text = 'super_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('admin', 'store_owner', 'Owner', 'branch_manager', 'manager')
        AND (ur.business_id = public.shops.business_id OR ur.business_id IS NULL)
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.shop_id = public.shops.id
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.business_id = public.shops.business_id
        AND ur.shop_id IS NULL
    )
  );
END;
$$;

