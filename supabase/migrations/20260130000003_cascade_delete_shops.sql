-- Migration to enable cascading deletes for shops
-- This ensures that when a shop is deleted, all related data is also removed

-- 1. profiles
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_shop_id_fkey;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_shop_id_fkey
FOREIGN KEY (shop_id)
REFERENCES public.shops(id)
ON DELETE CASCADE;

-- 2. inventory_transactions
ALTER TABLE public.inventory_transactions
DROP CONSTRAINT IF EXISTS inventory_transactions_shop_id_fkey,
DROP CONSTRAINT IF EXISTS inventory_transactions_from_shop_id_fkey,
DROP CONSTRAINT IF EXISTS inventory_transactions_to_shop_id_fkey;

ALTER TABLE public.inventory_transactions
ADD CONSTRAINT inventory_transactions_shop_id_fkey
FOREIGN KEY (shop_id)
REFERENCES public.shops(id)
ON DELETE CASCADE;

ALTER TABLE public.inventory_transactions
ADD CONSTRAINT inventory_transactions_from_shop_id_fkey
FOREIGN KEY (from_shop_id)
REFERENCES public.shops(id)
ON DELETE CASCADE;

ALTER TABLE public.inventory_transactions
ADD CONSTRAINT inventory_transactions_to_shop_id_fkey
FOREIGN KEY (to_shop_id)
REFERENCES public.shops(id)
ON DELETE CASCADE;

-- 3. stock_transfers
ALTER TABLE public.stock_transfers
DROP CONSTRAINT IF EXISTS stock_transfers_from_shop_id_fkey,
DROP CONSTRAINT IF EXISTS stock_transfers_to_shop_id_fkey;

ALTER TABLE public.stock_transfers
ADD CONSTRAINT stock_transfers_from_shop_id_fkey
FOREIGN KEY (from_shop_id)
REFERENCES public.shops(id)
ON DELETE CASCADE;

ALTER TABLE public.stock_transfers
ADD CONSTRAINT stock_transfers_to_shop_id_fkey
FOREIGN KEY (to_shop_id)
REFERENCES public.shops(id)
ON DELETE CASCADE;

-- 4. expenses
ALTER TABLE public.expenses
DROP CONSTRAINT IF EXISTS expenses_shop_id_fkey;

ALTER TABLE public.expenses
ADD CONSTRAINT expenses_shop_id_fkey
FOREIGN KEY (shop_id)
REFERENCES public.shops(id)
ON DELETE CASCADE;

-- 5. orders
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS orders_shop_id_origin_fkey,
DROP CONSTRAINT IF EXISTS orders_shop_id_fulfill_fkey;

ALTER TABLE public.orders
ADD CONSTRAINT orders_shop_id_origin_fkey
FOREIGN KEY (shop_id_origin)
REFERENCES public.shops(id)
ON DELETE CASCADE;

ALTER TABLE public.orders
ADD CONSTRAINT orders_shop_id_fulfill_fkey
FOREIGN KEY (shop_id_fulfill)
REFERENCES public.shops(id)
ON DELETE CASCADE;

-- 6. product_requests
ALTER TABLE public.product_requests
DROP CONSTRAINT IF EXISTS product_requests_shop_id_fkey;

ALTER TABLE public.product_requests
ADD CONSTRAINT product_requests_shop_id_fkey
FOREIGN KEY (shop_id)
REFERENCES public.shops(id)
ON DELETE CASCADE;

-- 7. invoices
ALTER TABLE public.invoices
DROP CONSTRAINT IF EXISTS invoices_shop_id_fkey;

ALTER TABLE public.invoices
ADD CONSTRAINT invoices_shop_id_fkey
FOREIGN KEY (shop_id)
REFERENCES public.shops(id)
ON DELETE CASCADE;

-- 8. parked_orders
ALTER TABLE public.parked_orders
DROP CONSTRAINT IF EXISTS parked_orders_shop_id_fkey;

ALTER TABLE public.parked_orders
ADD CONSTRAINT parked_orders_shop_id_fkey
FOREIGN KEY (shop_id)
REFERENCES public.shops(id)
ON DELETE CASCADE;

-- 9. invoice_daily_shop_counter
ALTER TABLE public.invoice_daily_shop_counter
DROP CONSTRAINT IF EXISTS invoice_daily_shop_counter_shop_id_fkey;

ALTER TABLE public.invoice_daily_shop_counter
ADD CONSTRAINT invoice_daily_shop_counter_shop_id_fkey
FOREIGN KEY (shop_id)
REFERENCES public.shops(id)
ON DELETE CASCADE;

-- 10. pos_sessions
ALTER TABLE public.pos_sessions
DROP CONSTRAINT IF EXISTS pos_sessions_shop_id_fkey;

ALTER TABLE public.pos_sessions
ADD CONSTRAINT pos_sessions_shop_id_fkey
FOREIGN KEY (shop_id)
REFERENCES public.shops(id)
ON DELETE CASCADE;

-- 11. user_roles
-- Note: Check if constraint exists, if not add it.
-- We assume the column is named shop_id as seen in previous migrations.
ALTER TABLE public.user_roles
DROP CONSTRAINT IF EXISTS user_roles_shop_id_fkey;

ALTER TABLE public.user_roles
ADD CONSTRAINT user_roles_shop_id_fkey
FOREIGN KEY (shop_id)
REFERENCES public.shops(id)
ON DELETE CASCADE;
