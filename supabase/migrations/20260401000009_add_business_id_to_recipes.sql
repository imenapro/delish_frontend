DO $$
BEGIN
  IF to_regclass('public.recipes') IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'recipes'
      AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.recipes
      ADD COLUMN business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'recipes'
      AND column_name = 'tenant_id'
  ) THEN
    EXECUTE 'UPDATE public.recipes SET business_id = tenant_id WHERE business_id IS NULL AND tenant_id IS NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'recipes'
      AND column_name = 'shop_id'
  ) THEN
    EXECUTE '
      UPDATE public.recipes r
      SET business_id = s.business_id
      FROM public.shops s
      WHERE r.business_id IS NULL
        AND r.shop_id IS NOT NULL
        AND s.id = r.shop_id
        AND s.business_id IS NOT NULL
    ';
  END IF;

  CREATE INDEX IF NOT EXISTS idx_recipes_business_id ON public.recipes(business_id);
END;
$$;

