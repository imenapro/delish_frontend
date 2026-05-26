-- Money Collection System (MCS) Migration
-- This migration adds tables for daily sales collection reporting and acknowledgment.

-- 1. Create Collection Status Enum
DO $$ BEGIN
    CREATE TYPE public.collection_status AS ENUM ('pending', 'acknowledged', 'discrepancy_reported', 'resolved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add MCS toggle to businesses table
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS enable_money_collection BOOLEAN DEFAULT FALSE;

-- 3. Create daily_collections table
CREATE TABLE IF NOT EXISTS public.daily_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
    session_id UUID REFERENCES public.pos_sessions(id) ON DELETE SET NULL,
    seller_id UUID NOT NULL REFERENCES auth.users(id),
    collector_id UUID REFERENCES auth.users(id), -- Acknowledged by
    
    reported_amount NUMERIC NOT NULL DEFAULT 0,
    expected_amount NUMERIC NOT NULL DEFAULT 0, -- From POS session sales
    actual_received_amount NUMERIC, -- Filled by collector
    
    cash_amount NUMERIC NOT NULL DEFAULT 0,
    momo_amount NUMERIC NOT NULL DEFAULT 0,
    card_amount NUMERIC NOT NULL DEFAULT 0,
    
    status public.collection_status DEFAULT 'pending',
    
    seller_notes TEXT,
    collector_notes TEXT,
    
    discrepancy_amount NUMERIC GENERATED ALWAYS AS (reported_amount - expected_amount) STORED,
    
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    
    evidence_urls TEXT[], -- Array of URLs for receipts, deposit slips, etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create collection_documents table for better management
CREATE TABLE IF NOT EXISTS public.collection_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collection_id UUID NOT NULL REFERENCES public.daily_collections(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT, -- 'receipt', 'deposit_slip', 'cash_sheet'
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE public.daily_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_documents ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for daily_collections
-- Sellers can view their own reported collections
DROP POLICY IF EXISTS "Sellers can view own collections" ON public.daily_collections;
CREATE POLICY "Sellers can view own collections"
ON public.daily_collections FOR SELECT
USING (auth.uid() = seller_id OR public.is_super_admin(auth.uid()) OR (business_id IS NOT NULL AND (public.is_business_owner(auth.uid(), business_id) OR public.is_business_manager(auth.uid(), business_id))));

-- Sellers can insert their collections
DROP POLICY IF EXISTS "Sellers can report collections" ON public.daily_collections;
CREATE POLICY "Sellers can report collections"
ON public.daily_collections FOR INSERT
WITH CHECK (auth.uid() = seller_id);

-- Authorized personnel can update (acknowledge) collections
DROP POLICY IF EXISTS "Authorized personnel can acknowledge collections" ON public.daily_collections;
CREATE POLICY "Authorized personnel can acknowledge collections"
ON public.daily_collections FOR UPDATE
USING (
  public.is_super_admin(auth.uid()) 
  OR (business_id IS NOT NULL AND (
    public.is_business_owner(auth.uid(), business_id) 
    OR public.is_business_manager(auth.uid(), business_id)
    OR EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND business_id = daily_collections.business_id 
      AND role::text = 'accountant'
    )
  ))
);

-- 7. RLS Policies for collection_documents
DROP POLICY IF EXISTS "Users can view relevant documents" ON public.collection_documents;
CREATE POLICY "Users can view relevant documents"
ON public.collection_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.daily_collections c
    WHERE c.id = collection_documents.collection_id
    AND (
      c.seller_id = auth.uid()
      OR public.is_super_admin(auth.uid())
      OR (c.business_id IS NOT NULL AND (public.is_business_owner(auth.uid(), c.business_id) OR public.is_business_manager(auth.uid(), c.business_id)))
    )
  )
);

DROP POLICY IF EXISTS "Users can upload documents" ON public.collection_documents;
CREATE POLICY "Users can upload documents"
ON public.collection_documents FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

-- 8. Add Money Collection Permission
INSERT INTO public.permissions (code, description, module)
VALUES ('finance.collections.manage', 'Manage and acknowledge daily money collections', 'finance')
ON CONFLICT (code) DO NOTHING;

-- 9. Add Menu Item for Collections (Initially inactive, enabled by business setting)
INSERT INTO public.menus (label, path, icon, sort_order, permission_required_id, is_active)
SELECT 'Collections', 'finance/collections', 'Wallet', 8, (SELECT id FROM public.permissions WHERE code = 'finance.manage'), true
WHERE NOT EXISTS (SELECT 1 FROM public.menus WHERE path = 'finance/collections');

-- Ensure the menu is active if it already exists
UPDATE public.menus SET is_active = true WHERE path = 'finance/collections';

-- 10. Storage Bucket for Collection Evidence
INSERT INTO storage.buckets (id, name, public) 
VALUES ('collection-evidence', 'collection-evidence', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
DROP POLICY IF EXISTS "Users can upload evidence" ON storage.objects;
CREATE POLICY "Users can upload evidence" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'collection-evidence');


DROP POLICY IF EXISTS "Users can view own evidence" ON storage.objects;
CREATE POLICY "Users can view own evidence" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'collection-evidence');
