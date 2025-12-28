-- ==============================================================================
-- SUPER ADMIN SETUP SCRIPT
-- ==============================================================================
-- This script helps you set up a Super Admin user for the dashboard.
-- You can execute this in the Supabase SQL Editor.

-- OPTION 1: Grant Super Admin access to an EXISTING user
-- Replace 'your-email@example.com' with the email address you used to register.

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE email = 'your-email@example.com' -- <--- CHANGE THIS EMAIL
ON CONFLICT (id) DO NOTHING; -- Assuming id is the primary key or there is a constraint

-- OPTION 2: If you want to use the default 'admin@storesync.com' user
-- Ensure you have signed up this user via the /register page first, then run:

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'
FROM auth.users
WHERE email = 'admin@storesync.com'
ON CONFLICT DO NOTHING;

-- Verify the role was assigned
SELECT u.email, ur.role 
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'super_admin';
