-- =====================================================
-- FIX SECURITY LINTER ISSUES
-- =====================================================

-- Enable RLS on tables that don't have it
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_businesses ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for notification_settings
CREATE POLICY "Shop admins can manage notification settings"
ON public.notification_settings
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (shop_id IS NOT NULL AND can_access_shop(auth.uid(), shop_id))
);

-- Add RLS policies for payments
CREATE POLICY "Super admins can view all payments"
ON public.payments
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Shop owners can view their shop payments"
ON public.payments
FOR SELECT
USING (shop_id IS NOT NULL AND can_access_shop(auth.uid(), shop_id));

CREATE POLICY "Super admins can manage payments"
ON public.payments
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add RLS policies for subscription_plans
CREATE POLICY "Everyone can view active subscription plans"
ON public.subscription_plans
FOR SELECT
USING (is_active = true);

CREATE POLICY "Super admins can manage subscription plans"
ON public.subscription_plans
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add RLS policies for roles_catalog
CREATE POLICY "Everyone can view roles catalog"
ON public.roles_catalog
FOR SELECT
USING (true);

CREATE POLICY "Super admins can manage roles catalog"
ON public.roles_catalog
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Add RLS policies for user_businesses
CREATE POLICY "Users can view their own business memberships"
ON public.user_businesses
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_business_access(auth.uid(), business_id)
);

CREATE POLICY "Business owners can manage memberships"
ON public.user_businesses
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR is_business_owner(auth.uid(), business_id)
);

-- Fix function search paths for existing functions
CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;