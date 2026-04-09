DO $$
BEGIN
  IF to_regclass('public.shops') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Shops insert fallback" ON public.shops;
  CREATE POLICY "Shops insert fallback"
  ON public.shops
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IS NOT NULL
    AND (
      has_role(auth.uid(), 'super_admin')
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'store_owner')
      OR has_role(auth.uid(), 'Owner')
      OR has_role(auth.uid(), 'owner')
      OR has_role(auth.uid(), 'branch_manager')
      OR has_role(auth.uid(), 'manager')
      OR (business_id IS NOT NULL AND has_business_access(auth.uid(), business_id))
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND (ur.business_id = business_id OR ur.business_id IS NULL)
          AND ur.role::text IN ('super_admin', 'admin', 'store_owner', 'owner', 'branch_manager', 'manager')
      )
    )
  );
END;
$$;

