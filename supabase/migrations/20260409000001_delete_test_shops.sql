-- Soft-delete test/temporary shops by marking them as inactive
-- This prevents hard deletion which would violate foreign key constraints
-- The following shops are deactivated:
-- - gfgfg
-- - Eastside Bakery
-- - Downtown Bakery
-- - Westside Bakery
-- - Rubirizi Factory
-- - Rubirizi Warehouse

UPDATE public.shops
SET is_active = false
WHERE name IN ('gfgfg', 'Eastside Bakery', 'Downtown Bakery', 'Westside Bakery', 'Rubirizi Factory', 'Rubirizi Warehouse');
