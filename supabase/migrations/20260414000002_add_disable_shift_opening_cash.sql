-- Add a business-level setting to disable opening cash entry when starting a POS shift
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS disable_shift_opening_cash BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.businesses.disable_shift_opening_cash IS
  'When true, opening cash is locked to 0 for all new POS shift opens.';
