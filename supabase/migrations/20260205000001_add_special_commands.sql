-- Add support for special commands with advance payments

-- 1. Add order_type to orders table to distinguish commands from regular orders
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'order_type') THEN
        ALTER TABLE public.orders ADD COLUMN order_type TEXT DEFAULT 'regular'; -- 'regular' or 'command'
    END IF;
END $$;

-- 2. Add payment tracking fields to orders table for advance payments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'advance_paid') THEN
        ALTER TABLE public.orders ADD COLUMN advance_paid DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'remaining_due') THEN
        ALTER TABLE public.orders ADD COLUMN remaining_due DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_name') THEN
        ALTER TABLE public.orders ADD COLUMN customer_name TEXT;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'customer_phone') THEN
        ALTER TABLE public.orders ADD COLUMN customer_phone TEXT;
    END IF;
END $$;

-- 3. Create command_payments table to track advance and final payments
CREATE TABLE IF NOT EXISTS public.command_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_type TEXT NOT NULL, -- 'advance' or 'final'
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL, -- 'cash', 'mobile_money', 'card', 'wallet'
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on command_payments
ALTER TABLE public.command_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for command_payments
DO $$
BEGIN
    -- Drop existing policies if they exist
    EXECUTE 'DROP POLICY IF EXISTS "Users can view command payments for accessible orders" ON public.command_payments';
    EXECUTE 'DROP POLICY IF EXISTS "Authorized users can record command payments" ON public.command_payments';
END $$;

CREATE POLICY "Users can view command payments for accessible orders"
ON public.command_payments
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = command_payments.order_id
        AND (
            orders.customer_id = auth.uid()
            OR orders.seller_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_roles
                WHERE user_id = auth.uid()
                AND role IN ('super_admin', 'admin', 'manager', 'accountant','store_owner','owner')
            )
        )
    )
);

CREATE POLICY "Authorized users can record command payments"
ON public.command_payments
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.orders
        WHERE orders.id = command_payments.order_id
        AND (
            orders.seller_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.user_roles
                WHERE user_id = auth.uid()
                AND role IN ('super_admin', 'admin', 'manager','store_owner','owner')
            )
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_command_payments_order_id ON public.command_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_command_payments_payment_type ON public.command_payments(payment_type);

-- 4. Create RPC function to create a command with advance payment
CREATE OR REPLACE FUNCTION public.create_command_with_advance(
    p_shop_id UUID,
    p_user_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_items JSONB,
    p_total_amount NUMERIC,
    p_advance_paid NUMERIC,
    p_payment_method TEXT,
    p_pos_session_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_order_code TEXT;
    v_item JSONB;
    v_remaining_due NUMERIC;
    v_invoice_number TEXT;
BEGIN
    -- Calculate remaining due
    v_remaining_due := p_total_amount - COALESCE(p_advance_paid, 0);

    -- Generate Order Code
    v_order_code := 'CMD-' || to_char(now(), 'YYYYMMDDHH24MISS') || '-' || floor(random() * 1000)::text;

    -- Insert Command Order
    INSERT INTO orders (
        order_code,
        customer_id,
        seller_id,
        shop_id_origin,
        shop_id_fulfill,
        total_amount,
        payment_method,
        customer_phone,
        customer_name,
        status,
        order_type,
        advance_paid,
        remaining_due,
        confirmed_at,
        source,
        notes,
        pos_session_id
    ) VALUES (
        v_order_code,
        p_user_id,
        p_user_id,
        p_shop_id,
        p_shop_id,
        p_total_amount,
        p_payment_method::payment_method,
        p_customer_phone,
        p_customer_name,
        'pending',
        'command',
        p_advance_paid,
        v_remaining_due,
        now(),
        'pos',
        COALESCE(p_notes, ''),
        p_pos_session_id
    ) RETURNING id INTO v_order_id;

    -- Process Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO order_items (
            order_id,
            product_id,
            quantity,
            unit_price,
            subtotal
        ) VALUES (
            v_order_id,
            (v_item->>'product_id')::UUID,
            (v_item->>'quantity')::NUMERIC,
            (v_item->>'unit_price')::NUMERIC,
            ((v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC)
        );
    END LOOP;

    -- Record Advance Payment
    IF p_advance_paid > 0 THEN
        INSERT INTO command_payments (
            order_id,
            payment_type,
            amount,
            payment_method,
            created_by,
            notes
        ) VALUES (
            v_order_id,
            'advance',
            p_advance_paid,
            p_payment_method,
            p_user_id,
            'Advance payment received'
        );
    END IF;

    -- Generate Invoice
    BEGIN
        SELECT * FROM generate_shop_invoice_number(p_shop_id) INTO v_invoice_number;
        
        INSERT INTO invoices (
            invoice_number,
            order_id,
            shop_id,
            staff_id,
            created_by,
            customer_info,
            items_snapshot,
            subtotal,
            tax_amount,
            total_amount,
            payment_method,
            status
        ) VALUES (
            v_invoice_number,
            v_order_id,
            p_shop_id,
            p_user_id,
            p_user_id,
            jsonb_build_object(
                'name', p_customer_name,
                'phone', p_customer_phone
            ),
            p_items,
            p_total_amount,
            0,
            p_total_amount,
            p_payment_method,
            CASE WHEN p_advance_paid >= p_total_amount THEN 'paid' ELSE 'partial' END
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to generate invoice: %', SQLERRM;
    END;

    RETURN jsonb_build_object(
        'order_id', v_order_id,
        'order_code', v_order_code,
        'invoice_number', v_invoice_number,
        'total_amount', p_total_amount,
        'advance_paid', p_advance_paid,
        'remaining_due', v_remaining_due,
        'created_at', now(),
        'success', true
    );
END;
$$;

-- 5. Create RPC function to settle command (record final payment)
CREATE OR REPLACE FUNCTION public.settle_command(
    p_order_id UUID,
    p_final_payment NUMERIC,
    p_payment_method TEXT,
    p_user_id UUID,
    p_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_new_remaining NUMERIC;
BEGIN
    -- Get the order
    SELECT * INTO v_order FROM orders WHERE id = p_order_id AND order_type = 'command';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Command not found'
        );
    END IF;

    -- Validate final payment amount
    IF p_final_payment > v_order.remaining_due THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Final payment exceeds remaining due amount',
            'remaining_due', v_order.remaining_due
        );
    END IF;

    -- Calculate new remaining
    v_new_remaining := v_order.remaining_due - p_final_payment;

    -- Record Final Payment
    INSERT INTO command_payments (
        order_id,
        payment_type,
        amount,
        payment_method,
        created_by,
        notes
    ) VALUES (
        p_order_id,
        'final',
        p_final_payment,
        p_payment_method,
        p_user_id,
        COALESCE(p_notes, 'Final payment received')
    );

    -- Update Order
    UPDATE orders
    SET 
        remaining_due = v_new_remaining,
        status = CASE 
            WHEN v_new_remaining <= 0 THEN 'confirmed'
            ELSE 'pending'
        END,
        payment_method = p_payment_method::payment_method
    WHERE id = p_order_id;

    -- Update Invoice status if fully paid
    UPDATE invoices
    SET status = 'paid'
    WHERE order_id = p_order_id AND v_new_remaining <= 0;

    RETURN jsonb_build_object(
        'order_id', p_order_id,
        'final_payment', p_final_payment,
        'remaining_due', GREATEST(0, v_new_remaining),
        'status', CASE WHEN v_new_remaining <= 0 THEN 'confirmed' ELSE 'pending' END,
        'success', true
    );
END;
$$;
