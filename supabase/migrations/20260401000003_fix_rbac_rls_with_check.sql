DROP POLICY IF EXISTS "Only admins can manage roles" ON public.roles;
CREATE POLICY "Only admins can manage roles"
ON public.roles
FOR ALL
TO authenticated
USING (
  public.has_permission(auth.uid(), 'roles.manage')
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_permission(auth.uid(), 'roles.manage')
  OR public.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Only admins can manage permissions" ON public.permissions;
CREATE POLICY "Only admins can manage permissions"
ON public.permissions
FOR ALL
TO authenticated
USING (
  public.has_permission(auth.uid(), 'permissions.manage')
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_permission(auth.uid(), 'permissions.manage')
  OR public.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Only admins can manage role permissions" ON public.role_permissions;
CREATE POLICY "Only admins can manage role permissions"
ON public.role_permissions
FOR ALL
TO authenticated
USING (
  public.has_permission(auth.uid(), 'roles.manage')
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_permission(auth.uid(), 'roles.manage')
  OR public.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Admins can manage assignments" ON public.user_role_assignments;
CREATE POLICY "Admins can manage assignments"
ON public.user_role_assignments
FOR ALL
TO authenticated
USING (
  public.has_permission(auth.uid(), 'users.manage')
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_permission(auth.uid(), 'users.manage')
  OR public.has_role(auth.uid(), 'super_admin')
);

DROP POLICY IF EXISTS "Only admins can manage menus" ON public.menus;
CREATE POLICY "Only admins can manage menus"
ON public.menus
FOR ALL
TO authenticated
USING (
  public.has_permission(auth.uid(), 'menus.manage')
  OR public.has_role(auth.uid(), 'super_admin')
)
WITH CHECK (
  public.has_permission(auth.uid(), 'menus.manage')
  OR public.has_role(auth.uid(), 'super_admin')
);

