-- Function to securely complete password change
-- This function is SECURITY DEFINER, meaning it runs with the privileges of the creator (usually superadmin/postgres)
-- It bypasses RLS on the profiles table to ensure the update always succeeds for the calling user.

CREATE OR REPLACE FUNCTION public.complete_password_change()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    must_change_password = false,
    password_changed_at = now()
  WHERE id = auth.uid();
END;
$$;
