-- Fix permissions for the auth role and ensure public schema access
-- Run this in the Supabase SQL Editor

-- 1. Grant usage on public schema to all relevant roles
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
-- Note: supabase_auth_admin is the role used by GoTrue (Auth service)
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;

-- 2. Grant access to all tables in public
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role, supabase_auth_admin;

-- 3. Ensure future tables are accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role, supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role, supabase_auth_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role, supabase_auth_admin;

-- 4. Fix the handle_new_user function permissions and ownership
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, anon, authenticated, service_role, supabase_auth_admin;

-- 5. Refresh the schema cache (You still need to click the button in Dashboard, but this might help if run via client)
NOTIFY pgrst, 'reload schema';
