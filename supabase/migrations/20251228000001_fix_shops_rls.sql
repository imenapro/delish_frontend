-- Fix shops RLS to allow business owners to view their shops
-- This resolves the issue where invoices were hidden because the joined shop was not accessible

DROP POLICY IF EXISTS "Users can view accessible shops" ON public.shops;

CREATE POLICY "Users can view accessible shops"
ON public.shops
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR id IN (SELECT public.get_user_shops(auth.uid()))
);
