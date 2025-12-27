-- Create sms_logs table
CREATE TABLE IF NOT EXISTS public.sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    phone_number TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL, -- 'sent', 'failed'
    error_message TEXT,
    cost NUMERIC,
    units INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Admins can view all sms logs" ON public.sms_logs;
CREATE POLICY "Admins can view all sms logs"
    ON public.sms_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "Business owners can view their own sms logs" ON public.sms_logs;
CREATE POLICY "Business owners can view their own sms logs"
    ON public.sms_logs
    FOR SELECT
    USING (
        business_id IN (
            SELECT business_id FROM public.user_businesses WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert sms logs" ON public.sms_logs;
CREATE POLICY "Users can insert sms logs"
    ON public.sms_logs
    FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM public.user_businesses WHERE user_id = auth.uid()
        )
    );
