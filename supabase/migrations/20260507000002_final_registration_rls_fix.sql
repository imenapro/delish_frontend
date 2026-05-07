-- Consolidated Fix for Registration RLS Issues
-- This migration ensures that all tables involved in the registration flow allow insertion and selection 
-- during the initial setup phase, even before email confirmation or role assignment is fully processed.

-- 1. Businesses
DROP POLICY IF EXISTS "Allow business creation during registration" ON public.businesses;
CREATE POLICY "Allow business creation during registration"
ON public.businesses
FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow business selection during registration" ON public.businesses;
CREATE POLICY "Allow business selection during registration"
ON public.businesses
FOR SELECT
TO public
USING (true);

-- 2. User Roles
DROP POLICY IF EXISTS "Allow role creation during registration" ON public.user_roles;
CREATE POLICY "Allow role creation during registration"
ON public.user_roles
FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow role selection during registration" ON public.user_roles;
CREATE POLICY "Allow role selection during registration"
ON public.user_roles
FOR SELECT
TO public
USING (true);

-- 3. Shops
-- Drop all existing insert policies to avoid conflicts
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'shops' AND schemaname = 'public' AND (cmd = 'INSERT' OR cmd = 'SELECT')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.shops', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Allow shop creation during registration"
ON public.shops
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow shop selection during registration"
ON public.shops
FOR SELECT
TO public
USING (true);

-- 4. Products
-- Drop all existing insert/select policies to avoid conflicts
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'products' AND schemaname = 'public' AND (cmd = 'INSERT' OR cmd = 'SELECT')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.products', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Allow product creation during registration"
ON public.products
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Allow product selection during registration"
ON public.products
FOR SELECT
TO public
USING (true);

-- 5. SMS Logs
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow sms log creation during registration" ON public.sms_logs;
CREATE POLICY "Allow sms log creation during registration"
ON public.sms_logs
FOR INSERT
TO public
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow sms log selection during registration" ON public.sms_logs;
CREATE POLICY "Allow sms log selection during registration"
ON public.sms_logs
FOR SELECT
TO public
USING (true);

-- 6. Ensure RLS is enabled on all target tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
