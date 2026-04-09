DO $$
BEGIN
  IF to_regclass('public.factory_stock') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.factory_stock ENABLE ROW LEVEL SECURITY;

  DROP POLICY IF EXISTS "Factory stock super admin" ON public.factory_stock;
  CREATE POLICY "Factory stock super admin"
  ON public.factory_stock
  FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'store_owner'::app_role)
    OR has_role(auth.uid(), 'Owner'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'store_owner'::app_role)
    OR has_role(auth.uid(), 'Owner'::app_role)
  );
END;
$$;
