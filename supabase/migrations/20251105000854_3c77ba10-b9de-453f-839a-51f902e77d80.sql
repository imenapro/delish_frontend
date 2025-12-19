-- Phase 2: Shop-Based Access Control & Management

-- Add helper function to get user's shop(s)
CREATE OR REPLACE FUNCTION public.get_user_shops(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT shop_id 
  FROM public.user_roles 
  WHERE user_id = _user_id 
    AND shop_id IS NOT NULL;
$$;

-- Add helper function to check if user can access a shop
CREATE OR REPLACE FUNCTION public.can_access_shop(_user_id uuid, _shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id 
      AND (shop_id = _shop_id OR shop_id IS NULL)
  ) OR has_role(_user_id, 'super_admin'::app_role);
$$;

-- Update shop_inventory RLS policies for shop-based access
DROP POLICY IF EXISTS "Everyone can view inventory" ON public.shop_inventory;
DROP POLICY IF EXISTS "Managers and admins can manage inventory" ON public.shop_inventory;

CREATE POLICY "Users can view inventory for their shops"
ON public.shop_inventory
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR can_access_shop(auth.uid(), shop_id)
);

CREATE POLICY "Managers and store keepers can manage shop inventory"
ON public.shop_inventory
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (can_access_shop(auth.uid(), shop_id) AND (
    has_role(auth.uid(), 'branch_manager'::app_role)
    OR has_role(auth.uid(), 'store_keeper'::app_role)
  ))
);

-- Update kitchen_quotas RLS policies for shop-based access
DROP POLICY IF EXISTS "Everyone can view quotas" ON public.kitchen_quotas;
DROP POLICY IF EXISTS "Managers and admins can manage quotas" ON public.kitchen_quotas;

CREATE POLICY "Users can view quotas for their shops"
ON public.kitchen_quotas
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR can_access_shop(auth.uid(), shop_id)
);

CREATE POLICY "Branch managers can manage shop quotas"
ON public.kitchen_quotas
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (can_access_shop(auth.uid(), shop_id) AND has_role(auth.uid(), 'branch_manager'::app_role))
);

-- Update orders RLS policies for shop-based access
DROP POLICY IF EXISTS "Users can view own orders or related orders" ON public.orders;

CREATE POLICY "Users can view accessible orders"
ON public.orders
FOR SELECT
USING (
  auth.uid() = customer_id
  OR auth.uid() = seller_id
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR can_access_shop(auth.uid(), shop_id_origin)
  OR can_access_shop(auth.uid(), shop_id_fulfill)
);

-- Update product_requests RLS for shop-based access
DROP POLICY IF EXISTS "Shop users can view own requests" ON public.product_requests;

CREATE POLICY "Users can view requests for their shops"
ON public.product_requests
FOR SELECT
USING (
  can_access_shop(auth.uid(), shop_id)
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Update shop_documents RLS for shop-based access
DROP POLICY IF EXISTS "Admins can view all shop documents" ON public.shop_documents;

CREATE POLICY "Users can view documents for their shops"
ON public.shop_documents
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (can_access_shop(auth.uid(), shop_id) AND has_role(auth.uid(), 'branch_manager'::app_role))
);

-- Update shops RLS to allow branch managers to view their shops
DROP POLICY IF EXISTS "Everyone can view active shops" ON public.shops;

CREATE POLICY "Users can view accessible shops"
ON public.shops
FOR SELECT
USING (
  is_active = true AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND shop_id = shops.id
    )
  )
);