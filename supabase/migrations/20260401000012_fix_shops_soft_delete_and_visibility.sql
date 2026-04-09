DO $$
BEGIN
  IF to_regclass('public.shops') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Users can view accessible shops" ON public.shops;
  DROP POLICY IF EXISTS "Everyone can view active shops" ON public.shops;
  DROP POLICY IF EXISTS "Admins can manage shops" ON public.shops;
  DROP POLICY IF EXISTS "Users can view shops in their business" ON public.shops;
  DROP POLICY IF EXISTS "Users can view their shops" ON public.shops;
  DROP POLICY IF EXISTS "Shops select" ON public.shops;
  DROP POLICY IF EXISTS "Shops manage" ON public.shops;

  CREATE POLICY "Shops select"
  ON public.shops
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND (
      (EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role::text IN ('super_admin', 'admin', 'store_owner', 'Owner', 'branch_manager')
      ))
      OR id IN (
        SELECT shop_id FROM public.user_roles
        WHERE user_id = auth.uid()
          AND shop_id IS NOT NULL
      )
      OR business_id IN (
        SELECT business_id
        FROM public.user_roles
        WHERE user_id = auth.uid()
          AND business_id IS NOT NULL
          AND shop_id IS NULL
      )
    )
  );

  CREATE POLICY "Shops manage"
  ON public.shops
  FOR ALL
  TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('super_admin', 'admin', 'store_owner', 'Owner', 'branch_manager')
    ))
    OR (business_id IS NOT NULL AND has_business_access(auth.uid(), business_id))
  )
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role::text IN ('super_admin', 'admin', 'store_owner', 'Owner', 'branch_manager')
    ))
    OR (business_id IS NOT NULL AND has_business_access(auth.uid(), business_id))
  );
END;
$$;

