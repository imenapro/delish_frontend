-- SQL Script to create or update the Super Admin user
-- Run this in your Supabase Dashboard SQL Editor

-- Enable pgcrypto for password hashing
create extension if not exists pgcrypto;

DO $$
DECLARE
  new_user_id uuid;
  user_email text := 'admin@storesync.com';
  user_password text := 'admin123';
  encrypted_pw text;
BEGIN
  -- Generate hashed password
  encrypted_pw := crypt(user_password, gen_salt('bf'));
  
  -- Check if user exists
  SELECT id INTO new_user_id FROM auth.users WHERE email = user_email;

  IF new_user_id IS NULL THEN
    -- Generate new UUID
    new_user_id := gen_random_uuid();
    
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      new_user_id,
      'authenticated',
      'authenticated',
      user_email,
      encrypted_pw,
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Super Admin", "role": "super_admin"}',
      now(),
      now(),
      '',
      ''
    );
    
    -- Insert into auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      new_user_id,
      format('{"sub": "%s", "email": "%s"}', new_user_id, user_email)::jsonb,
      'email',
      now(),
      now(),
      now()
    );
    
  ELSE
    -- Update password if user exists
    UPDATE auth.users
    SET encrypted_password = encrypted_pw,
        updated_at = now(),
        raw_user_meta_data = '{"name": "Super Admin", "role": "super_admin"}'::jsonb
    WHERE id = new_user_id;
  END IF;

  -- Upsert Profile
  INSERT INTO public.profiles (id, name, created_at, updated_at)
  VALUES (new_user_id, 'Super Admin', now(), now())
  ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      updated_at = now();

  -- Upsert User Role
  -- First remove existing super_admin role for this user to avoid potential duplicates if schema allows
  DELETE FROM public.user_roles WHERE user_id = new_user_id AND role = 'super_admin';
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'super_admin');

END $$;
