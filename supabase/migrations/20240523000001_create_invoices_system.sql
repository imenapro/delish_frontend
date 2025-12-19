-- Create a table to track daily invoice counts for sequential numbering
CREATE TABLE IF NOT EXISTS public.invoice_daily_counter (
    date_key DATE PRIMARY KEY DEFAULT CURRENT_DATE,
    current_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.invoice_daily_counter ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to access/update the counter (needed for generating invoices)
CREATE POLICY "Allow all authenticated to update counter" ON public.invoice_daily_counter
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');


-- Create Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL UNIQUE,
    order_id UUID NOT NULL REFERENCES public.orders(id),
    customer_info JSONB, -- Stores snapshot of customer details (name, phone, etc.)
    items_snapshot JSONB, -- Stores snapshot of items at time of purchase
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method TEXT,
    status TEXT DEFAULT 'issued', -- issued, paid, void, refunded
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT fk_order UNIQUE (order_id) -- One invoice per order
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Policies for invoices
CREATE POLICY "Users can view invoices they created or if admin/manager" ON public.invoices
    FOR SELECT
    USING (
        auth.uid() = created_by OR 
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'manager', 'branch_manager')
        )
    );

CREATE POLICY "Users can insert invoices" ON public.invoices
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');


-- Add source column to orders if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'source') THEN
        ALTER TABLE public.orders ADD COLUMN source TEXT DEFAULT 'pos';
    END IF;
END $$;


-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    today DATE := CURRENT_DATE;
    next_seq INTEGER;
    formatted_seq TEXT;
    invoice_num TEXT;
BEGIN
    -- Insert/Update counter for today
    INSERT INTO public.invoice_daily_counter (date_key, current_count)
    VALUES (today, 0)
    ON CONFLICT (date_key) DO NOTHING;

    -- Increment and get value
    UPDATE public.invoice_daily_counter
    SET current_count = current_count + 1
    WHERE date_key = today
    RETURNING current_count INTO next_seq;

    -- Format: INV-YYYYMMDD-001
    formatted_seq := LPAD(next_seq::TEXT, 3, '0');
    invoice_num := 'INV-' || TO_CHAR(today, 'YYYYMMDD') || '-' || formatted_seq;

    RETURN invoice_num;
END;
$$;
