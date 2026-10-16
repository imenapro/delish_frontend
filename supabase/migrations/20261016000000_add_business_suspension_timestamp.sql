ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS suspended_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS access_reactivated_at timestamp with time zone;
