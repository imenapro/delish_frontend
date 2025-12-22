-- Thoroughly clean up triggers on inventory_transactions to prevent double counting
-- This block finds ALL triggers on the table and drops them to ensure no "zombie" triggers exist
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_table = 'inventory_transactions'
        AND event_object_schema = 'public'
    LOOP
        -- Log for debugging (visible in Postgres logs)
        RAISE NOTICE 'Dropping trigger: %', t_name;
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(t_name) || ' ON public.inventory_transactions';
    END LOOP;
END $$;

-- Now re-create the single source of truth trigger
DROP TRIGGER IF EXISTS on_inventory_transaction_created ON public.inventory_transactions;

CREATE TRIGGER on_inventory_transaction_created
AFTER INSERT ON public.inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_inventory_transaction();
