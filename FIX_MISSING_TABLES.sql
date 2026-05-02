-- =====================================================
-- FIX MISSING CORE TABLES
-- =====================================================

-- 1. Create businesses table
CREATE TABLE IF NOT EXISTS public.businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    business_type TEXT,
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3B82F6',
    secondary_color TEXT DEFAULT '#10B981',
    slogan TEXT,
    bg_image_url TEXT,
    plan_type TEXT DEFAULT 'trial',
    trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
    subscription_start_date TIMESTAMP WITH TIME ZONE,
    subscription_end_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'trial',
    owner_id UUID REFERENCES auth.users(id),
    country TEXT,
    timezone TEXT DEFAULT 'UTC',
    currency TEXT DEFAULT 'RWF',
    locale TEXT DEFAULT 'en',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to businesses
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS bg_image_url TEXT;

-- Insert required businesses for product import
INSERT INTO public.businesses (id, name, slug) VALUES 
('fd3e0f65-cdd0-4dff-8af8-48c06810867e', 'Delish Main', 'delish-main'),
('24cb5d0a-6a95-4c41-a983-ad186968f1a6', 'Business 2', 'business-2'),
('3732454e-ec45-45ad-9d12-43e2e9f8cd69', 'Business 3', 'business-3'),
('0786aa56-625c-4fd1-a2d6-728ce45f89ed', 'Business 4', 'business-4'),
('f9b1f082-9165-4f2d-a7cc-2c9c249a2aba', 'Business 5', 'business-5'),
('4ced75fe-ab45-4521-aafd-d2f50073e9e9', 'Business 6', 'business-6'),
('388652b8-75f3-4e82-a71a-27d92457b6db', 'Business 7', 'business-7'),
('a87bf02a-6b1e-495e-adf1-55efdbdf1bd5', 'Business 8', 'business-8'),
('c944ce7f-cc13-42ec-91e8-e20529107710', 'Business 9', 'business-9'),
('b83c6cfb-196a-4b35-8715-ef479198ca7b', 'Business 10', 'business-10'),
('8433d963-7138-494e-8b9b-d3b74263556f', 'Business 11', 'business-11'),
('ccae3cd3-c863-410e-ab1b-0ffa4d6c8be1', 'Business 12', 'business-12'),
('06e200be-bd93-4c61-a47d-1965a0ec59c7', 'Business 13', 'business-13')
ON CONFLICT (id) DO NOTHING;

-- 2. Create user_businesses junction table
CREATE TABLE IF NOT EXISTS public.user_businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'staff',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, business_id)
);

-- 3. Create pos_sessions table
CREATE TABLE IF NOT EXISTS public.pos_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id),
    shop_id UUID NOT NULL, -- References shops which will be created by migrations
    user_id UUID REFERENCES auth.users(id),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    opening_balance DECIMAL(10,2) DEFAULT 0.00,
    closing_balance DECIMAL(10,2),
    status TEXT DEFAULT 'open', -- 'open', 'closed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create parked_orders table
CREATE TABLE IF NOT EXISTS public.parked_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT,
    shop_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    customer_name TEXT,
    items JSONB NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Ensure app_role enum exists (needed by many migrations)
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'seller', 'manager', 'delivery', 'customer', 'super_admin', 'store_owner', 'manpower', 'distributor', 'Logistics', 'finance', 'warehouse', 'owner', 'production', 'kitchen', 'logistics');
EXCEPTION
    WHEN duplicate_object THEN 
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'distributor';
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'Logistics';
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'logistics';
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'warehouse';
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner';
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'production';
        ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'kitchen';
END $$;

-- 6. Fix audit_logs table (missing table_name, operation, and changed_by column used in many migrations)
-- Make them nullable to avoid constraint violations during migration
ALTER TABLE IF EXISTS public.audit_logs ADD COLUMN IF NOT EXISTS table_name TEXT;
ALTER TABLE IF EXISTS public.audit_logs ADD COLUMN IF NOT EXISTS operation TEXT;
ALTER TABLE IF EXISTS public.audit_logs ADD COLUMN IF NOT EXISTS changed_by UUID;
ALTER TABLE IF EXISTS public.audit_logs ADD COLUMN IF NOT EXISTS record_id UUID;
ALTER TABLE IF EXISTS public.audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE IF EXISTS public.audit_logs ADD COLUMN IF NOT EXISTS old_data JSONB;
ALTER TABLE IF EXISTS public.audit_logs ADD COLUMN IF NOT EXISTS new_data JSONB;
ALTER TABLE IF EXISTS public.audit_logs ADD COLUMN IF NOT EXISTS performed_by UUID;
ALTER TABLE IF EXISTS public.audit_logs ADD COLUMN IF NOT EXISTS details TEXT;
ALTER TABLE IF EXISTS public.audit_logs ADD COLUMN IF NOT EXISTS target_id UUID;

-- Ensure action and other columns are nullable
ALTER TABLE IF EXISTS public.audit_logs ALTER COLUMN action DROP NOT NULL;
ALTER TABLE IF EXISTS public.audit_logs ALTER COLUMN operation DROP NOT NULL;
ALTER TABLE IF EXISTS public.audit_logs ALTER COLUMN table_name DROP NOT NULL;
