-- Global Super Admin RLS Bypass
-- This migration ensures that super_admin can bypass all RLS policies on critical tables.
-- It uses the enhanced has_permission and has_role functions from previous migrations.

-- 1. Businesses
DROP POLICY IF EXISTS "Super admins can manage all businesses" ON public.businesses;
CREATE POLICY "Super admins can manage all businesses" ON public.businesses FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 2. Shops
DROP POLICY IF EXISTS "Super admins can manage all shops" ON public.shops;
CREATE POLICY "Super admins can manage all shops" ON public.shops FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 3. Profiles
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.profiles;
CREATE POLICY "Super admins can manage all profiles" ON public.profiles FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 4. Roles & Permissions (Already have super_admin check in 20260107000001_rbac_system.sql, but we strengthen it)
DROP POLICY IF EXISTS "Super admins can manage roles bypass" ON public.roles;
CREATE POLICY "Super admins can manage roles bypass" ON public.roles FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can manage permissions bypass" ON public.permissions;
CREATE POLICY "Super admins can manage permissions bypass" ON public.permissions FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can manage role permissions bypass" ON public.role_permissions;
CREATE POLICY "Super admins can manage role permissions bypass" ON public.role_permissions FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 5. User Assignments
DROP POLICY IF EXISTS "Super admins can manage user roles bypass" ON public.user_roles;
CREATE POLICY "Super admins can manage user roles bypass" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can manage user role assignments bypass" ON public.user_role_assignments;
CREATE POLICY "Super admins can manage user role assignments bypass" ON public.user_role_assignments FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admins can manage user permissions bypass" ON public.user_permissions;
CREATE POLICY "Super admins can manage user permissions bypass" ON public.user_permissions FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 6. Menus
DROP POLICY IF EXISTS "Super admins can manage menus bypass" ON public.menus;
CREATE POLICY "Super admins can manage menus bypass" ON public.menus FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 7. Audit Logs
DROP POLICY IF EXISTS "Super admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Super admins can view all audit logs" ON public.audit_logs FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'));

-- 8. Products
DROP POLICY IF EXISTS "Super admins can manage all products" ON public.products;
CREATE POLICY "Super admins can manage all products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 9. Orders
DROP POLICY IF EXISTS "Super admins can manage all orders" ON public.orders;
CREATE POLICY "Super admins can manage all orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- 10. Invoices
DROP POLICY IF EXISTS "Super admins can manage all invoices" ON public.invoices;
CREATE POLICY "Super admins can manage all invoices" ON public.invoices FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
