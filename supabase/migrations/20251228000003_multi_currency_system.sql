-- Multi-currency system implementation

-- 1. Create country_currency_mapping table
CREATE TABLE IF NOT EXISTS public.country_currency_mapping (
  country_code text PRIMARY KEY, -- ISO 3166-1 alpha-2 (e.g., RW, MZ)
  currency_code text NOT NULL,   -- ISO 4217 (e.g., RWF, MZN)
  currency_symbol text,          -- e.g., FRW, MT
  locale text,                   -- e.g., rw-RW, pt-MZ (for formatting)
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.country_currency_mapping ENABLE ROW LEVEL SECURITY;

-- Policies for country_currency_mapping
-- Everyone can view active mappings
DROP POLICY IF EXISTS "Everyone can view active country mappings" ON public.country_currency_mapping;
CREATE POLICY "Everyone can view active country mappings"
  ON public.country_currency_mapping
  FOR SELECT
  USING (true);

-- Only Super Admins can manage mappings
DROP POLICY IF EXISTS "Super Admins can manage country mappings" ON public.country_currency_mapping;
CREATE POLICY "Super Admins can manage country mappings"
  ON public.country_currency_mapping
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));


-- 2. Create currency_rates table
CREATE TABLE IF NOT EXISTS public.currency_rates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_currency text NOT NULL,
  to_currency text NOT NULL,
  rate decimal(20, 10) NOT NULL,
  effective_date timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(from_currency, to_currency)
);

-- Enable RLS
ALTER TABLE public.currency_rates ENABLE ROW LEVEL SECURITY;

-- Policies for currency_rates
DROP POLICY IF EXISTS "Everyone can view currency rates" ON public.currency_rates;
CREATE POLICY "Everyone can view currency rates"
  ON public.currency_rates
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Super Admins can manage currency rates" ON public.currency_rates;
CREATE POLICY "Super Admins can manage currency rates"
  ON public.currency_rates
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role));


-- 3. Add currency and locale to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'RWF',
ADD COLUMN IF NOT EXISTS locale text DEFAULT 'en';

-- 4. Seed default data
INSERT INTO public.country_currency_mapping (country_code, currency_code, currency_symbol, locale, is_active)
VALUES
  ('RW', 'RWF', 'FRW', 'rw-RW', true),
  ('MZ', 'MZN', 'MT', 'pt-MZ', true),
  ('US', 'USD', '$', 'en-US', true),
  ('KE', 'KES', 'KSh', 'en-KE', true),
  ('TZ', 'TZS', 'TSh', 'sw-TZ', true),
  ('UG', 'UGX', 'USh', 'en-UG', true)
ON CONFLICT (country_code) DO UPDATE
SET currency_code = EXCLUDED.currency_code,
    currency_symbol = EXCLUDED.currency_symbol,
    locale = EXCLUDED.locale;
