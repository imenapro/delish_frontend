-- Fix RLS policies for parked_orders to ensure visibility

-- 1. Allow users to view their own parked orders (guarantees "My Parked Items" works)
DROP POLICY IF EXISTS "Users can view their own parked orders" ON public.parked_orders;
CREATE POLICY "Users can view their own parked orders"
ON public.parked_orders FOR SELECT
USING (
    seller_id = auth.uid()
);

-- 2. Simplify/Fix the shop-based access for colleagues
-- (This ensures "Colleagues' Parked Items" works for people in the same shop)
DROP POLICY IF EXISTS "Users can view parked orders from their shops" ON public.parked_orders;
CREATE POLICY "Users can view parked orders from their shops"
ON public.parked_orders FOR SELECT
USING (
    shop_id IN (
        -- Direct link via user_roles (if role is linked to shop_id)
        SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    shop_id IN (
        -- Link via business_id (for owners/admins)
        SELECT s.id FROM public.shops s
        JOIN public.user_roles ur ON s.business_id = ur.business_id
        WHERE ur.user_id = auth.uid()
    )
);

-- 3. Ensure INSERT allows the same logic
DROP POLICY IF EXISTS "Users can park orders" ON public.parked_orders;
CREATE POLICY "Users can park orders"
ON public.parked_orders FOR INSERT
WITH CHECK (
    shop_id IN (
        SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    shop_id IN (
        SELECT s.id FROM public.shops s
        JOIN public.user_roles ur ON s.business_id = ur.business_id
        WHERE ur.user_id = auth.uid()
    )
);

-- 4. Ensure UPDATE allows the same logic
DROP POLICY IF EXISTS "Users can update parked orders" ON public.parked_orders;
CREATE POLICY "Users can update parked orders"
ON public.parked_orders FOR UPDATE
USING (
    seller_id = auth.uid() -- Can always update own
    OR
    shop_id IN (
        SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    shop_id IN (
        SELECT s.id FROM public.shops s
        JOIN public.user_roles ur ON s.business_id = ur.business_id
        WHERE ur.user_id = auth.uid()
    )
);
