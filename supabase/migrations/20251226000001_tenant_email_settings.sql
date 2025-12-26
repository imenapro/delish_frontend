-- Create tenant_email_settings table
CREATE TABLE IF NOT EXISTS public.tenant_email_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    sender_email TEXT NOT NULL,
    smtp_host TEXT,
    smtp_port INTEGER,
    smtp_user TEXT,
    smtp_pass TEXT, -- In a real app, this should be encrypted or stored in Vault
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(business_id)
);

-- Enable RLS
ALTER TABLE public.tenant_email_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can do everything on tenant_email_settings"
    ON public.tenant_email_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles ur
            WHERE ur.user_id = auth.uid()
            AND ur.role = 'super_admin'
        )
    );

CREATE POLICY "Business owners can view their own settings"
    ON public.tenant_email_settings
    FOR SELECT
    USING (
        business_id IN (
            SELECT id FROM public.businesses WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Business owners can update their own settings"
    ON public.tenant_email_settings
    FOR UPDATE
    USING (
        business_id IN (
            SELECT id FROM public.businesses WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        business_id IN (
            SELECT id FROM public.businesses WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Business owners can insert their own settings"
    ON public.tenant_email_settings
    FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT id FROM public.businesses WHERE owner_id = auth.uid()
        )
    );

-- Add updated_at trigger
CREATE TRIGGER update_tenant_email_settings_updated_at
    BEFORE UPDATE ON public.tenant_email_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
