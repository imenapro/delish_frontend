DO $$
BEGIN
  IF to_regclass('public.factory_stock') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'factory_stock'
      AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.factory_stock
      ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'factory_stock'
      AND column_name = 'tenant_id'
  ) THEN
    EXECUTE 'UPDATE public.factory_stock SET business_id = tenant_id WHERE business_id IS NULL AND tenant_id IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'factory_stock'
      AND column_name = 'shop_id'
  ) THEN
    EXECUTE '
      UPDATE public.factory_stock fs
      SET business_id = s.business_id
      FROM public.shops s
      WHERE fs.business_id IS NULL
        AND fs.shop_id IS NOT NULL
        AND s.id = fs.shop_id
        AND s.business_id IS NOT NULL
    ';
  END IF;

  CREATE INDEX IF NOT EXISTS idx_factory_stock_business_id ON public.factory_stock(business_id);
END;
$$;

