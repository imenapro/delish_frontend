-- Add seller_name to parked_orders to avoid complex joins and fix relationship errors
ALTER TABLE public.parked_orders 
ADD COLUMN IF NOT EXISTS seller_name TEXT;

-- Update existing records if any (optional, best effort)
UPDATE public.parked_orders 
SET seller_name = (
    SELECT name FROM public.profiles WHERE id = parked_orders.seller_id
)
WHERE seller_name IS NULL AND seller_id IS NOT NULL;
