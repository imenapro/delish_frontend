
-- Create inventory_reasons table
CREATE TABLE IF NOT EXISTS public.inventory_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('in', 'out', 'both')),
    is_system BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add new columns to inventory_transactions
ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS reason_id UUID REFERENCES public.inventory_reasons(id),
ADD COLUMN IF NOT EXISTS purchase_price NUMERIC,
ADD COLUMN IF NOT EXISTS transfer_from_location TEXT,
ADD COLUMN IF NOT EXISTS transfer_to_location TEXT;

-- Insert default reasons
INSERT INTO public.inventory_reasons (name, type, is_system) VALUES
('Purchase', 'in', true),
('Transfer In', 'in', true),
('Sort', 'both', true),
('Exchange', 'both', true),
('Typing Error', 'both', true),
('Transfer Out', 'out', true);

-- Enable RLS on inventory_reasons
ALTER TABLE public.inventory_reasons ENABLE ROW LEVEL SECURITY;

-- Create policy for reading reasons (all authenticated users)
CREATE POLICY "Enable read access for authenticated users" ON public.inventory_reasons
    FOR SELECT
    TO authenticated
    USING (true);

-- Create policy for managing reasons (only admins/owners - simplistic check for now, matching other tables if possible)
-- For now allowing all authenticated to insert/update for simplicity unless specific roles are enforced strictly in other tables.
-- Based on previous context, usually checks for business ownership. 
-- But this is a system-wide or business-wide setting? 
-- Assuming business-wide, but the table doesn't have business_id. 
-- If reasons are global system-wide, then only super-admins should edit.
-- If reasons are per-business, I should add business_id.
-- The user said "Create a dedicated settings menu... Inventory Reasons configuration".
-- This implies tenants might want to configure their own.
-- Let's add business_id to inventory_reasons to make it multi-tenant compatible.

ALTER TABLE public.inventory_reasons ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id);

-- Update RLS to filter by business_id or system reasons
DROP POLICY "Enable read access for authenticated users" ON public.inventory_reasons;

CREATE POLICY "Read access for system or business reasons" ON public.inventory_reasons
    FOR SELECT
    TO authenticated
    USING (is_system = true OR business_id IN (
        SELECT business_id FROM public.user_businesses WHERE user_id = auth.uid()
    ));

CREATE POLICY "Manage access for business reasons" ON public.inventory_reasons
    FOR ALL
    TO authenticated
    USING (business_id IN (
        SELECT business_id FROM public.user_businesses WHERE user_id = auth.uid()
    ));

