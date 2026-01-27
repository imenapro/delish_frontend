-- Create the get_user_shops function that is missing but used in RLS policies
-- This function returns the list of shop IDs that a user has access to based on their roles
-- It is required for the "Users can view accessible shops" policy on the shops table

CREATE OR REPLACE FUNCTION public.get_user_shops(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT DISTINCT shop_id
  FROM public.user_roles
  WHERE user_id = _user_id
  AND shop_id IS NOT NULL;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_shops(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_shops(UUID) TO service_role;
