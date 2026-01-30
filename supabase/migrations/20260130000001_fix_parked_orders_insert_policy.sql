-- Fix RLS policies for parked_orders to fully support Global Super Admins

-- 1. SELECT (Update shop-based access to include super_admin)
DROP POLICY IF EXISTS "Users can view parked orders from their shops" ON public.parked_orders;
CREATE POLICY "Users can view parked orders from their shops"
ON public.parked_orders FOR SELECT
USING (
    shop_id IN (
        SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    shop_id IN (
        SELECT s.id FROM public.shops s
        JOIN public.user_roles ur ON s.business_id = ur.business_id
        WHERE ur.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'super_admin'
    )
);

-- 2. INSERT
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
    OR
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'super_admin'
    )
);

-- 3. UPDATE
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
    OR
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'super_admin'
    )
);

-- 4. DELETE
DROP POLICY IF EXISTS "Users can delete parked orders" ON public.parked_orders;
CREATE POLICY "Users can delete parked orders"
ON public.parked_orders FOR DELETE
USING (
    shop_id IN (
        SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid()
    )
    OR
    shop_id IN (
        SELECT s.id FROM public.shops s
        JOIN public.user_roles ur ON s.business_id = ur.business_id
        WHERE ur.user_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'super_admin'
    )
);
