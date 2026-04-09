CREATE OR REPLACE FUNCTION public.is_business_owner(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $func$
  SELECT EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE id = _business_id
      AND owner_id = _user_id
  );
$func$;

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
      has_role(auth.uid(), 'super_admin')
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'store_owner')
      OR has_role(auth.uid(), 'Owner')
      OR has_role(auth.uid(), 'branch_manager')
      OR has_role(auth.uid(), 'manager')
      OR has_role(auth.uid(), 'accountant')
      OR can_access_shop(auth.uid(), id)
      OR (business_id IS NOT NULL AND has_business_access(auth.uid(), business_id))
    )
  );

  CREATE POLICY "Shops insert"
  ON public.shops
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (business_id IS NOT NULL)
    AND (
      has_role(auth.uid(), 'super_admin')
      OR has_role(auth.uid(), 'admin')
      OR has_role(auth.uid(), 'store_owner')
      OR has_role(auth.uid(), 'Owner')
      OR has_role(auth.uid(), 'branch_manager')
      OR has_role(auth.uid(), 'manager')
      OR has_business_access(auth.uid(), business_id)
    )
  );

  CREATE POLICY "Shops update"
  ON public.shops
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'store_owner')
    OR has_role(auth.uid(), 'Owner')
    OR has_role(auth.uid(), 'branch_manager')
    OR has_role(auth.uid(), 'manager')
    OR can_access_shop(auth.uid(), id)
    OR (business_id IS NOT NULL AND has_business_access(auth.uid(), business_id))
    OR (business_id IS NOT NULL AND is_business_owner(auth.uid(), business_id))
    OR owner_id = auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin')
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'store_owner')
    OR has_role(auth.uid(), 'Owner')
    OR has_role(auth.uid(), 'branch_manager')
    OR has_role(auth.uid(), 'manager')
    OR can_access_shop(auth.uid(), id)
    OR (business_id IS NOT NULL AND has_business_access(auth.uid(), business_id))
    OR (business_id IS NOT NULL AND is_business_owner(auth.uid(), business_id))
    OR owner_id = auth.uid()
  );
END;
$$;

