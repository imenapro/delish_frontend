DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'source') THEN
        ALTER TABLE public.orders ADD COLUMN source TEXT DEFAULT 'online';
    END IF;
END $$;
