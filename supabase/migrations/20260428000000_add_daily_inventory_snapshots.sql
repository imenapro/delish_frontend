-- Create daily_inventory_snapshots table
CREATE TABLE IF NOT EXISTS public.daily_inventory_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    stock NUMERIC NOT NULL DEFAULT 0,
    price NUMERIC NOT NULL DEFAULT 0,
    snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(shop_id, product_id, snapshot_date)
);

-- Index for efficient retrieval
CREATE INDEX IF NOT EXISTS idx_daily_inventory_snapshots_date ON public.daily_inventory_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_daily_inventory_snapshots_shop_id ON public.daily_inventory_snapshots(shop_id);

-- Enable RLS
ALTER TABLE public.daily_inventory_snapshots ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for authenticated users" ON public.daily_inventory_snapshots
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.daily_inventory_snapshots
    FOR INSERT TO authenticated WITH CHECK (true);

-- Function to capture daily snapshots for all shops
-- This can be called by a cron job or manually
CREATE OR REPLACE FUNCTION public.capture_daily_inventory_snapshots()
RETURNS void AS $$
BEGIN
    INSERT INTO public.daily_inventory_snapshots (shop_id, product_id, stock, price, snapshot_date)
    SELECT 
        si.shop_id, 
        si.product_id, 
        si.stock, 
        si.price, 
        CURRENT_DATE
    FROM public.shop_inventory si
    ON CONFLICT (shop_id, product_id, snapshot_date) 
    DO UPDATE SET 
        stock = EXCLUDED.stock,
        price = EXCLUDED.price;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
