CREATE TABLE IF NOT EXISTS public.pos_session_inventory_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.pos_sessions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    product_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_pos_session_snapshots_session_id ON public.pos_session_inventory_snapshots(session_id);

ALTER TABLE public.pos_session_inventory_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.pos_session_inventory_snapshots
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON public.pos_session_inventory_snapshots
    FOR INSERT TO authenticated WITH CHECK (true);
