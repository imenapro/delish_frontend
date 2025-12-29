-- Create parked_orders table
CREATE TABLE IF NOT EXISTS public.parked_orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_id UUID NOT NULL REFERENCES public.shops(id),
    seller_id UUID REFERENCES auth.users(id),
    code TEXT NOT NULL,
    items JSONB NOT NULL, -- Array of cart items
    note TEXT,
    total NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resumed', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resumed_by UUID REFERENCES auth.users(id),
    resumed_at TIMESTAMPTZ
);

-- Add RLS policies
ALTER TABLE public.parked_orders ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users belonging to the same shop/business
-- (Assuming standard RBAC or shop_id check)
CREATE POLICY "Users can view parked orders from their shops"
ON public.parked_orders FOR SELECT
USING (
    shop_id IN (
        SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.shops s
        JOIN public.user_roles ur ON s.business_id = ur.business_id
        WHERE s.id = parked_orders.shop_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'admin', 'store_owner')
    )
);

-- Allow insert
CREATE POLICY "Users can park orders"
ON public.parked_orders FOR INSERT
WITH CHECK (
    shop_id IN (
        SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.shops s
        JOIN public.user_roles ur ON s.business_id = ur.business_id
        WHERE s.id = parked_orders.shop_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'admin', 'store_owner')
    )
);

-- Allow update (for resuming or soft deleting)
CREATE POLICY "Users can update parked orders"
ON public.parked_orders FOR UPDATE
USING (
    shop_id IN (
        SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.shops s
        JOIN public.user_roles ur ON s.business_id = ur.business_id
        WHERE s.id = parked_orders.shop_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'admin', 'store_owner')
    )
);

-- Allow delete (if hard delete is needed, though we prefer soft delete via status)
CREATE POLICY "Users can delete parked orders"
ON public.parked_orders FOR DELETE
USING (
    shop_id IN (
        SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.shops s
        JOIN public.user_roles ur ON s.business_id = ur.business_id
        WHERE s.id = parked_orders.shop_id
        AND ur.user_id = auth.uid()
        AND ur.role IN ('super_admin', 'admin', 'store_owner')
    )
);

-- Add realtime subscription
ALTER PUBLICATION supabase_realtime ADD TABLE public.parked_orders;
