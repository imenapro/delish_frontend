-- Add logo_url and owner_email columns to shops table
-- These columns are needed for POS session queries

ALTER TABLE public.shops
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS owner_email text;
