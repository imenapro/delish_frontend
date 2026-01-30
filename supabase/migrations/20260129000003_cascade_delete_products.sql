-- Make foreign keys referencing products cascade on delete so products can be deleted
-- even if referenced by these tables.

-- 1. pos_session_inventory_snapshots
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'pos_session_inventory_snapshots_product_id_fkey') THEN
    ALTER TABLE public.pos_session_inventory_snapshots DROP CONSTRAINT pos_session_inventory_snapshots_product_id_fkey;
  END IF;
END $$;

ALTER TABLE public.pos_session_inventory_snapshots
ADD CONSTRAINT pos_session_inventory_snapshots_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES public.products(id)
ON DELETE CASCADE;

-- 2. order_items
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'order_items_product_id_fkey') THEN
    ALTER TABLE public.order_items DROP CONSTRAINT order_items_product_id_fkey;
  END IF;
END $$;

ALTER TABLE public.order_items
ADD CONSTRAINT order_items_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES public.products(id)
ON DELETE CASCADE;

-- 3. inventory_transactions
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'inventory_transactions_product_id_fkey') THEN
    ALTER TABLE public.inventory_transactions DROP CONSTRAINT inventory_transactions_product_id_fkey;
  END IF;
END $$;

ALTER TABLE public.inventory_transactions
ADD CONSTRAINT inventory_transactions_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES public.products(id)
ON DELETE CASCADE;

-- 4. stock_transfers
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'stock_transfers_product_id_fkey') THEN
    ALTER TABLE public.stock_transfers DROP CONSTRAINT stock_transfers_product_id_fkey;
  END IF;
END $$;

ALTER TABLE public.stock_transfers
ADD CONSTRAINT stock_transfers_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES public.products(id)
ON DELETE CASCADE;

-- 5. product_requests
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'product_requests_product_id_fkey') THEN
    ALTER TABLE public.product_requests DROP CONSTRAINT product_requests_product_id_fkey;
  END IF;
END $$;

ALTER TABLE public.product_requests
ADD CONSTRAINT product_requests_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES public.products(id)
ON DELETE CASCADE;

-- 6. Ensure shop_inventory and kitchen_quotas are also cascading (re-applying to be sure)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'shop_inventory_product_id_fkey') THEN
    ALTER TABLE public.shop_inventory DROP CONSTRAINT shop_inventory_product_id_fkey;
  END IF;
END $$;

ALTER TABLE public.shop_inventory
ADD CONSTRAINT shop_inventory_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES public.products(id)
ON DELETE CASCADE;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'kitchen_quotas_product_id_fkey') THEN
    ALTER TABLE public.kitchen_quotas DROP CONSTRAINT kitchen_quotas_product_id_fkey;
  END IF;
END $$;

ALTER TABLE public.kitchen_quotas
ADD CONSTRAINT kitchen_quotas_product_id_fkey
FOREIGN KEY (product_id)
REFERENCES public.products(id)
ON DELETE CASCADE;
