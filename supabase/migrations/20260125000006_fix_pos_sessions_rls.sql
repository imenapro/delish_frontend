-- Fix RLS policies for pos_sessions table to allow Open Shift
-- This fixes the "new row violates row-level security policy" error

BEGIN;

-- 1. Ensure RLS is enabled
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Grant permissions to authenticated users
GRANT ALL ON public.pos_sessions TO authenticated;

-- 3. Drop existing policies to ensure clean slate
DROP POLICY IF EXISTS "Users can create own sessions" ON public.pos_sessions;
DROP POLICY IF EXISTS "Users can view own sessions" ON public.pos_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.pos_sessions;
DROP POLICY IF EXISTS "Authenticated users can create sessions" ON public.pos_sessions;

-- 4. Create permissive policies

-- INSERT: Allow users to create sessions for themselves
CREATE POLICY "Users can create own sessions"
ON public.pos_sessions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- SELECT: Allow users to view their own sessions or if they have admin roles
CREATE POLICY "Users can view own sessions"
ON public.pos_sessions
FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'store_owner'::public.app_role)
  OR public.has_role(auth.uid(), 'branch_manager'::public.app_role)
);

-- UPDATE: Allow users to update (close) their own sessions
CREATE POLICY "Users can update own sessions"
ON public.pos_sessions
FOR UPDATE
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'super_admin'::public.app_role)
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'store_owner'::public.app_role)
  OR public.has_role(auth.uid(), 'branch_manager'::public.app_role)
);

COMMIT;
