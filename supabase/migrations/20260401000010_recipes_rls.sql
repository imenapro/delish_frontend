DO $$
BEGIN
  IF to_regclass('public.recipes') IS NOT NULL THEN
    ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Recipes super admin" ON public.recipes;
    CREATE POLICY "Recipes super admin"
    ON public.recipes
    FOR ALL
    TO authenticated
    USING (has_role(auth.uid(), 'super_admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'recipes'
        AND column_name = 'business_id'
    ) THEN
      DROP POLICY IF EXISTS "Recipes business access" ON public.recipes;
      CREATE POLICY "Recipes business access"
      ON public.recipes
      FOR ALL
      TO authenticated
      USING (
        business_id IS NOT NULL
        AND (
          is_business_owner(auth.uid(), business_id)
          OR has_business_access(auth.uid(), business_id)
          OR has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'manager'::app_role)
          OR has_role(auth.uid(), 'branch_manager'::app_role)
          OR has_role(auth.uid(), 'store_owner'::app_role)
          OR has_role(auth.uid(), 'Owner'::app_role)
          OR has_role(auth.uid(), 'store_keeper'::app_role)
        )
      )
      WITH CHECK (
        business_id IS NOT NULL
        AND (
          is_business_owner(auth.uid(), business_id)
          OR has_business_access(auth.uid(), business_id)
          OR has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'manager'::app_role)
          OR has_role(auth.uid(), 'branch_manager'::app_role)
          OR has_role(auth.uid(), 'store_owner'::app_role)
          OR has_role(auth.uid(), 'Owner'::app_role)
          OR has_role(auth.uid(), 'store_keeper'::app_role)
        )
      );
    END IF;
  END IF;

  IF to_regclass('public.recipe_ingredients') IS NOT NULL THEN
    ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Recipe ingredients super admin" ON public.recipe_ingredients;
    CREATE POLICY "Recipe ingredients super admin"
    ON public.recipe_ingredients
    FOR ALL
    TO authenticated
    USING (has_role(auth.uid(), 'super_admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

    IF to_regclass('public.recipes') IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'recipes'
          AND column_name = 'business_id'
      ) THEN
      DROP POLICY IF EXISTS "Recipe ingredients business access" ON public.recipe_ingredients;
      CREATE POLICY "Recipe ingredients business access"
      ON public.recipe_ingredients
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1
          FROM public.recipes r
          WHERE r.id = recipe_ingredients.recipe_id
            AND r.business_id IS NOT NULL
            AND (
              is_business_owner(auth.uid(), r.business_id)
              OR has_business_access(auth.uid(), r.business_id)
              OR has_role(auth.uid(), 'admin'::app_role)
              OR has_role(auth.uid(), 'manager'::app_role)
              OR has_role(auth.uid(), 'branch_manager'::app_role)
              OR has_role(auth.uid(), 'store_owner'::app_role)
              OR has_role(auth.uid(), 'Owner'::app_role)
              OR has_role(auth.uid(), 'store_keeper'::app_role)
            )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.recipes r
          WHERE r.id = recipe_ingredients.recipe_id
            AND r.business_id IS NOT NULL
            AND (
              is_business_owner(auth.uid(), r.business_id)
              OR has_business_access(auth.uid(), r.business_id)
              OR has_role(auth.uid(), 'admin'::app_role)
              OR has_role(auth.uid(), 'manager'::app_role)
              OR has_role(auth.uid(), 'branch_manager'::app_role)
              OR has_role(auth.uid(), 'store_owner'::app_role)
              OR has_role(auth.uid(), 'Owner'::app_role)
              OR has_role(auth.uid(), 'store_keeper'::app_role)
            )
        )
      );
    END IF;
  END IF;
END;
$$;

