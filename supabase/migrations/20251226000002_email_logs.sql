-- Create email_logs table
CREATE TABLE IF NOT EXISTS public.email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    from_email TEXT NOT NULL,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL, -- 'sent', 'failed'
    error_message TEXT,
    provider TEXT, -- 'gmail', 'fallback', 'tenant_smtp'
    metadata JSONB, -- For any extra info like messageId
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can view all email logs"
    ON public.email_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'super_admin'
        )
    );

CREATE POLICY "Business owners can view their own email logs"
    ON public.email_logs
    FOR SELECT
    USING (
        business_id IN (
            SELECT id FROM public.businesses WHERE owner_id = auth.uid()
        )
    );

-- Index for rate limiting performance
CREATE INDEX IF NOT EXISTS idx_email_logs_business_created 
    ON public.email_logs(business_id, created_at);
