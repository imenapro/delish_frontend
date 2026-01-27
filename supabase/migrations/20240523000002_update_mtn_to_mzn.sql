
-- Migration: Update MTN currency to MZN
-- Description: Replaces all instances of 'MTN' or 'MTn' with 'MZN' in the businesses table and system settings.

-- 1. Update businesses table
UPDATE businesses 
SET currency = 'MZN' 
WHERE currency ILIKE 'MTN' OR currency = 'MT';

-- 2. Update system settings (if any default currency is stored as MTN)
UPDATE system_settings
SET setting_value = '"MZN"'
WHERE setting_key = 'default_currency' AND (setting_value::text ILIKE '%MTN%' OR setting_value::text ILIKE '%MT%');

-- 3. Update JSONB currency configs if they exist in system_settings
-- This is more complex depending on JSON structure, but for simple string replacements:
-- Note: Supabase/Postgres JSONB replacement is safer with specific paths, but here we assume general cleanup.

