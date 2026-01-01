
-- Create enum for payment method types
CREATE TYPE payment_method_type AS ENUM ('visa', 'mastercard', 'mobile_money', 'bank_transfer', 'paypal');

-- Create table for tenant payment methods
CREATE TABLE IF NOT EXISTS tenant_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    type payment_method_type NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Stores non-sensitive config
    encrypted_data TEXT, -- For sensitive data if not using external tokenization entirely
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ
);

-- Add index for faster lookups
CREATE INDEX idx_tenant_payment_methods_business_id ON tenant_payment_methods(business_id);

-- Enable Row Level Security
ALTER TABLE tenant_payment_methods ENABLE ROW LEVEL SECURITY;

-- Policies
-- Tenants can view their own payment methods
CREATE POLICY "Tenants can view own payment methods" ON tenant_payment_methods
    FOR SELECT
    USING (auth.uid() IN (
        SELECT owner_id FROM businesses WHERE id = tenant_payment_methods.business_id
    ));

-- Tenants can insert their own payment methods
CREATE POLICY "Tenants can insert own payment methods" ON tenant_payment_methods
    FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT owner_id FROM businesses WHERE id = tenant_payment_methods.business_id
    ));

-- Tenants can update their own payment methods
CREATE POLICY "Tenants can update own payment methods" ON tenant_payment_methods
    FOR UPDATE
    USING (auth.uid() IN (
        SELECT owner_id FROM businesses WHERE id = tenant_payment_methods.business_id
    ));

-- Tenants can delete their own payment methods
CREATE POLICY "Tenants can delete own payment methods" ON tenant_payment_methods
    FOR DELETE
    USING (auth.uid() IN (
        SELECT owner_id FROM businesses WHERE id = tenant_payment_methods.business_id
    ));

-- Audit Log Trigger (assuming an audit_logs table exists, otherwise placeholder)
-- CREATE TRIGGER payment_method_audit AFTER INSERT OR UPDATE OR DELETE ON tenant_payment_methods
-- FOR EACH ROW EXECUTE FUNCTION log_audit_event();
