
DO $$ 
BEGIN
  -- Add currency column to businesses table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'currency') THEN
    ALTER TABLE public.businesses ADD COLUMN currency text DEFAULT 'USD';
  END IF;
END $$;
