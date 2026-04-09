DO $$
BEGIN
  IF to_regclass('public.factory_stock') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'factory_stock'
      AND column_name = 'business_id'
  ) THEN
    RETURN;
  END IF;

  DROP POLICY IF EXISTS "Factory stock super admin" ON public.factory_stock;
  DROP POLICY IF EXISTS "Factory stock business access" ON public.factory_stock;

  CREATE POLICY "Factory stock super admin"
  ON public.factory_stock
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

  CREATE POLICY "Factory stock business access"
  ON public.factory_stock
  FOR ALL
  TO authenticated
  USING (
    business_id IS NOT NULL
    AND (
      is_business_owner(auth.uid(), business_id)
      OR has_business_access(auth.uid(), business_id)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'branch_manager'::app_role)
      OR has_role(auth.uid(), 'store_owner'::app_role)
      OR has_role(auth.uid(), 'Owner'::app_role)
      OR has_role(auth.uid(), 'store_keeper'::app_role)
    )
  )
  WITH CHECK (
    business_id IS NOT NULL
    AND (
      is_business_owner(auth.uid(), business_id)
      OR has_business_access(auth.uid(), business_id)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'manager'::app_role)
      OR has_role(auth.uid(), 'branch_manager'::app_role)
      OR has_role(auth.uid(), 'store_owner'::app_role)
      OR has_role(auth.uid(), 'Owner'::app_role)
      OR has_role(auth.uid(), 'store_keeper'::app_role)
    )
  );
END;
$$;

