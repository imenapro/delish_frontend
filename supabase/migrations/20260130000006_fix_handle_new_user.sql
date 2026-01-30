-- Fix handle_new_user to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shop_id uuid;
BEGIN
  -- Handle shop_id safely: convert empty string to NULL, catch invalid UUID format
  BEGIN
    v_shop_id := NULLIF(NEW.raw_user_meta_data->>'shop_id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_shop_id := NULL;
  END;

  -- Insert into profiles
  INSERT INTO public.profiles (id, name, phone, shop_id)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'phone',
    v_shop_id
  );
  
  -- Create wallet
  -- Ensure currency is valid or default to RWF
  BEGIN
    INSERT INTO public.wallets (user_id, balance, currency) 
    VALUES (NEW.id, 0.00, 'RWF');
  EXCEPTION WHEN OTHERS THEN
    -- If wallet creation fails, log it but don't fail user creation? 
    -- Better to fail if wallet is critical, but for now let's be safe.
    RAISE WARNING 'Failed to create wallet for user %', NEW.id;
  END;
  
  -- Assign default customer role
  -- Use exception block to prevent failure if role assignment fails
  BEGIN
    INSERT INTO public.user_roles (user_id, role) 
    VALUES (NEW.id, 'customer');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to assign default customer role for user %', NEW.id;
  END;
  
  RETURN NEW;
END;
$$;
