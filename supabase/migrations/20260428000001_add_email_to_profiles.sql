
-- Add email column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update existing profiles with emails from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Update handle_new_user function to include email
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
  INSERT INTO public.profiles (id, name, email, phone, shop_id)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    v_shop_id
  );
  
  -- Create wallet
  BEGIN
    INSERT INTO public.wallets (user_id, balance, currency) 
    VALUES (NEW.id, 0.00, 'RWF');
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to create wallet for user %', NEW.id;
  END;
  
  -- Assign role from metadata or default to customer
  BEGIN
    INSERT INTO public.user_roles (user_id, role, business_id, shop_id) 
    VALUES (
      NEW.id, 
      COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', ''), 'customer'),
      NULLIF(NEW.raw_user_meta_data->>'business_id', '')::uuid,
      v_shop_id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to assign role for user %', NEW.id;
  END;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to handle user metadata updates
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sync name and phone to profiles
  UPDATE public.profiles
  SET 
    name = COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    phone = NEW.raw_user_meta_data->>'phone',
    email = NEW.email,
    updated_at = now()
  WHERE id = NEW.id;

  -- Sync role to user_roles if it exists in metadata
  IF NEW.raw_user_meta_data->>'role' IS NOT NULL AND NEW.raw_user_meta_data->>'role' <> '' THEN
    -- Update existing role for the business if business_id is in metadata
    IF NEW.raw_user_meta_data->>'business_id' IS NOT NULL AND NEW.raw_user_meta_data->>'business_id' <> '' THEN
      UPDATE public.user_roles
      SET 
        role = NEW.raw_user_meta_data->>'role',
        shop_id = NULLIF(NEW.raw_user_meta_data->>'shop_id', '')::uuid
      WHERE user_id = NEW.id AND business_id = (NEW.raw_user_meta_data->>'business_id')::uuid;
      
      -- If no row was updated, it might be a new role for this business
      IF NOT FOUND THEN
        INSERT INTO public.user_roles (user_id, role, business_id, shop_id)
        VALUES (
          NEW.id,
          NEW.raw_user_meta_data->>'role',
          (NEW.raw_user_meta_data->>'business_id')::uuid,
          NULLIF(NEW.raw_user_meta_data->>'shop_id', '')::uuid
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for user updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW 
  WHEN (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data OR OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.handle_user_update();
