-- Add custom_domain column to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS custom_domain text;

-- Add unique constraint to ensure a domain can only be used by one business
CREATE UNIQUE INDEX IF NOT EXISTS businesses_custom_domain_unique ON public.businesses(custom_domain);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_businesses_custom_domain ON public.businesses(custom_domain);
