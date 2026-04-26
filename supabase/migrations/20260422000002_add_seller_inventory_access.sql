-- Allow sellers to view inventory only for their assigned shop
-- This migration updates shop_inventory RLS policy to restrict sellers to their own shop

-- Update shop_inventory policy to restrict sellers to their assigned shop only
DROP POLICY IF EXISTS "Everyone can view inventory" ON public.shop_inventory;
DROP POLICY IF EXISTS "Users can view inventory for their assigned shop" ON public.shop_inventory;

CREATE POLICY "Users can view inventory for their assigned shop" ON public.shop_inventory
  FOR SELECT USING (
    shop_id IN (SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid() AND shop_id IS NOT NULL) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'Owner'::app_role) OR
    public.has_role(auth.uid(), 'store_owner'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'branch_manager'::app_role) OR
    public.has_role(auth.uid(), 'store_keeper'::app_role)
  );

DROP POLICY IF EXISTS "Managers and admins can manage inventory" ON public.shop_inventory;

CREATE POLICY "Managers and admins can manage inventory" ON public.shop_inventory
  FOR ALL
  USING (
    shop_id IN (SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid() AND shop_id IS NOT NULL) OR
    public.has_role(auth.uid(), 'admin'::app_role) OR
    public.has_role(auth.uid(), 'super_admin'::app_role) OR
    public.has_role(auth.uid(), 'Owner'::app_role) OR
    public.has_role(auth.uid(), 'store_owner'::app_role) OR
    public.has_role(auth.uid(), 'manager'::app_role) OR
    public.has_role(auth.uid(), 'branch_manager'::app_role) OR
    public.has_role(auth.uid(), 'store_keeper'::app_role)
  );
