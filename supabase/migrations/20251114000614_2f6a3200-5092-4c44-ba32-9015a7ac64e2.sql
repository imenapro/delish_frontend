-- =====================================================
-- MULTI-TENANT SCHEMA: BUSINESSES & USER ROLES
-- =====================================================

-- 1. Update businesses table with all required fields
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS business_type text,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#3B82F6',
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#10B981',
ADD COLUMN IF NOT EXISTS slogan text,
ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS trial_start_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS trial_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_start_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS subscription_end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'UTC';

-- Make slug unique
CREATE UNIQUE INDEX IF NOT EXISTS businesses_slug_unique ON public.businesses(slug);

-- Add business_id to user_roles if not exists
ALTER TABLE public.user_roles
ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Add business_id to shops if not exists
ALTER TABLE public.shops
ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Add business_id to products if not exists
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;

-- =====================================================
-- SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Check if user has access to a business
CREATE OR REPLACE FUNCTION public.has_business_access(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND business_id = _business_id
  ) OR has_role(_user_id, 'super_admin'::app_role);
$$;

-- Get user's business IDs
CREATE OR REPLACE FUNCTION public.get_user_businesses(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT business_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND business_id IS NOT NULL;
$$;

-- Check if user is business owner
CREATE OR REPLACE FUNCTION public.is_business_owner(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND business_id = _business_id
      AND role = 'store_owner'::app_role
  );
$$;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Businesses table policies
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their businesses" ON public.businesses;
CREATE POLICY "Users can view their businesses"
ON public.businesses
FOR SELECT
USING (
  has_business_access(auth.uid(), id)
  OR owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Business owners can update their business" ON public.businesses;
CREATE POLICY "Business owners can update their business"
ON public.businesses
FOR UPDATE
USING (
  is_business_owner(auth.uid(), id)
  OR owner_id = auth.uid()
);

DROP POLICY IF EXISTS "Anyone can create a business" ON public.businesses;
CREATE POLICY "Anyone can create a business"
ON public.businesses
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Public access by slug for tenant subdomains/paths
DROP POLICY IF EXISTS "Public can view by slug" ON public.businesses;
CREATE POLICY "Public can view by slug"
ON public.businesses
FOR SELECT
USING (slug IS NOT NULL);

-- Update shops policies to include business_id
DROP POLICY IF EXISTS "Users can view shops in their business" ON public.shops;
CREATE POLICY "Users can view shops in their business"
ON public.shops
FOR SELECT
USING (
  is_active = true
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_business_access(auth.uid(), business_id)
    OR can_access_shop(auth.uid(), id)
  )
);

-- Update products policies to include business_id
DROP POLICY IF EXISTS "Users can view products in their business" ON public.products;
CREATE POLICY "Users can view products in their business"
ON public.products
FOR SELECT
USING (
  is_active = true
  AND (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (business_id IS NOT NULL AND has_business_access(auth.uid(), business_id))
  )
);

DROP POLICY IF EXISTS "Business users can manage products" ON public.products;
CREATE POLICY "Business users can manage products"
ON public.products
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (business_id IS NOT NULL AND has_business_access(auth.uid(), business_id))
);

-- Update user_roles policies
DROP POLICY IF EXISTS "Users can view roles in their business" ON public.user_roles;
CREATE POLICY "Users can view roles in their business"
ON public.user_roles
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'branch_manager'::app_role)
  OR (business_id IS NOT NULL AND is_business_owner(auth.uid(), business_id))
);

DROP POLICY IF EXISTS "Business owners can manage roles" ON public.user_roles;
CREATE POLICY "Business owners can manage roles"
ON public.user_roles
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (business_id IS NOT NULL AND is_business_owner(auth.uid(), business_id))
  OR has_role(auth.uid(), 'branch_manager'::app_role)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_business_id ON public.user_roles(business_id);
CREATE INDEX IF NOT EXISTS idx_shops_business_id ON public.shops(business_id);
CREATE INDEX IF NOT EXISTS idx_products_business_id ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_id ON public.businesses(owner_id);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON public.businesses(status);