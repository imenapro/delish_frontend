-- Fix pos_sessions user_id foreign key constraint to ensure proper relationship recognition
-- This ensures the foreign key constraint is properly named for Supabase to recognize the relationship

-- Drop existing inline constraint if it exists
ALTER TABLE public.pos_sessions
DROP CONSTRAINT IF EXISTS pos_sessions_user_id_fkey;

-- Add explicit foreign key constraint with proper name
ALTER TABLE public.pos_sessions
ADD CONSTRAINT pos_sessions_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;
