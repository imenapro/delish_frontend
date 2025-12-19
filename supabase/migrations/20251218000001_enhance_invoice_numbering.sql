
-- Create a table to track daily invoice counts per shop
CREATE TABLE IF NOT EXISTS public.invoice_daily_shop_counter (
    date_key DATE DEFAULT CURRENT_DATE,
    shop_id UUID REFERENCES public.shops(id),
    current_count INTEGER DEFAULT 0,
    PRIMARY KEY (date_key, shop_id)
);

-- Enable RLS
ALTER TABLE public.invoice_daily_shop_counter ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users
CREATE POLICY "Allow all for authenticated" ON public.invoice_daily_shop_counter
    FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_shop_invoice_number(p_shop_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_shop_name TEXT;
    v_prefix TEXT;
    v_date_str TEXT;
    v_count INTEGER;
    v_invoice_number TEXT;
BEGIN
    -- Get shop name
    SELECT name INTO v_shop_name FROM public.shops WHERE id = p_shop_id;
    
    IF v_shop_name IS NULL THEN
        RAISE EXCEPTION 'Shop not found';
    END IF;

    -- Validate shop name length
    -- If less than 3, we can pad it or just error. 
    -- Requirement says: "Validate shop names to ensure they contain at least 3 characters"
    IF length(v_shop_name) < 3 THEN
        RAISE EXCEPTION 'Shop name must be at least 3 characters long to generate invoice number';
    END IF;

    -- Generate prefix (first 3 letters, uppercase)
    v_prefix := upper(substring(v_shop_name, 1, 3));
    
    -- Generate date string YYYYMMDD
    v_date_str := to_char(CURRENT_DATE, 'YYYYMMDD');

    -- Get and update counter
    INSERT INTO public.invoice_daily_shop_counter (date_key, shop_id, current_count)
    VALUES (CURRENT_DATE, p_shop_id, 1)
    ON CONFLICT (date_key, shop_id)
    DO UPDATE SET current_count = invoice_daily_shop_counter.current_count + 1
    RETURNING current_count INTO v_count;

    -- Format: INV-PREFIX-YYYYMMDD-XXX
    v_invoice_number := 'INV-' || v_prefix || '-' || v_date_str || '-' || lpad(v_count::text, 3, '0');

    RETURN v_invoice_number;
END;
$$;
