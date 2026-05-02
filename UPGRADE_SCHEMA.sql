-- =====================================================
-- FULL SCHEMA UPDATE FOR NEW PROJECT
-- =====================================================

-- 1. Update businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB,
ADD COLUMN IF NOT EXISTS custom_domain TEXT,
ADD COLUMN IF NOT EXISTS show_login_background BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS bg_image_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_template_id TEXT,
ADD COLUMN IF NOT EXISTS invoice_settings JSONB,
ADD COLUMN IF NOT EXISTS created_by UUID,
ADD COLUMN IF NOT EXISTS updated_by UUID,
ADD COLUMN IF NOT EXISTS deleted_by UUID,
ADD COLUMN IF NOT EXISTS deleted_status TEXT,
ADD COLUMN IF NOT EXISTS created_date DATE,
ADD COLUMN IF NOT EXISTS updated_date DATE,
ADD COLUMN IF NOT EXISTS deleted_date DATE,
ADD COLUMN IF NOT EXISTS disable_shift_opening_cash BOOLEAN DEFAULT false;

-- 2. Update shops table
ALTER TABLE public.shops
ADD COLUMN IF NOT EXISTS bg_image_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT,
ADD COLUMN IF NOT EXISTS secondary_color TEXT,
ADD COLUMN IF NOT EXISTS slogan TEXT,
ADD COLUMN IF NOT EXISTS owner_id UUID,
ADD COLUMN IF NOT EXISTS owner_email TEXT,
ADD COLUMN IF NOT EXISTS plan_type TEXT,
ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status TEXT,
ADD COLUMN IF NOT EXISTS grace_period_days INTEGER,
ADD COLUMN IF NOT EXISTS custom_domain TEXT,
ADD COLUMN IF NOT EXISTS locale TEXT,
ADD COLUMN IF NOT EXISTS shop_type TEXT,
ADD COLUMN IF NOT EXISTS linked_warehouse_id UUID,
ADD COLUMN IF NOT EXISTS linked_factory_id UUID,
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- 3. Update profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS suspended_by UUID,
ADD COLUMN IF NOT EXISTS email TEXT;

-- 4. Update products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS unit TEXT;

-- 5. Update inventory_transactions table
ALTER TABLE public.inventory_transactions
ADD COLUMN IF NOT EXISTS reason_id TEXT,
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS transfer_from_location TEXT,
ADD COLUMN IF NOT EXISTS transfer_to_location TEXT,
ADD COLUMN IF NOT EXISTS batch_number TEXT;

-- 6. Update shop_inventory table
ALTER TABLE public.shop_inventory
ADD COLUMN IF NOT EXISTS quota_per_day INTEGER,
ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);

-- 7. Update orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shop_id_origin UUID,
ADD COLUMN IF NOT EXISTS shop_id_fulfill UUID,
ADD COLUMN IF NOT EXISTS receipt_number TEXT,
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS sms_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS source TEXT,
ADD COLUMN IF NOT EXISTS pos_session_id UUID,
ADD COLUMN IF NOT EXISTS order_type TEXT,
ADD COLUMN IF NOT EXISTS advance_paid DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS remaining_due DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS customer_name TEXT;

-- 8. Update invoices table
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS staff_id UUID;

-- 9. Update pos_sessions table
ALTER TABLE public.pos_sessions
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id),
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS opening_cash DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS closing_cash DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS expected_cash DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS total_sales DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 10. Update parked_orders table
ALTER TABLE public.parked_orders
ADD COLUMN IF NOT EXISTS seller_id UUID,
ADD COLUMN IF NOT EXISTS code TEXT,
ADD COLUMN IF NOT EXISTS total DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'parked',
ADD COLUMN IF NOT EXISTS resumed_by UUID,
ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS seller_name TEXT;

-- 11. Update expenses table
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.businesses(id),
ADD COLUMN IF NOT EXISTS account_id UUID,
ADD COLUMN IF NOT EXISTS rejected_reason TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_by UUID,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID;

-- 12. Update stock_transfers table
ALTER TABLE public.stock_transfers
ADD COLUMN IF NOT EXISTS batch_number TEXT;
