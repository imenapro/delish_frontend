-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    price numeric(10, 2) NOT NULL DEFAULT 0,
    duration_days integer NOT NULL DEFAULT 30, -- Duration in days
    features jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT true,
    deleted_at timestamp with time zone, -- For soft delete
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create subscription_statuses table
-- This tracks the active subscription for a business
CREATE TABLE IF NOT EXISTS public.subscription_statuses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
    plan_id uuid REFERENCES public.subscription_plans(id),
    status text NOT NULL CHECK (status IN ('Active', 'Expired', 'Cancelled', 'Pending', 'Suspended', 'Bought')),
    start_date timestamp with time zone DEFAULT now(),
    end_date timestamp with time zone,
    deleted_at timestamp with time zone, -- For soft delete
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(business_id)
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_statuses ENABLE ROW LEVEL SECURITY;

-- Policies for subscription_plans
-- Everyone can view active plans
CREATE POLICY "Everyone can view active plans" ON public.subscription_plans
    FOR SELECT
    USING (deleted_at IS NULL AND is_active = true);

-- Super Admins can manage plans
CREATE POLICY "Super admins can manage plans" ON public.subscription_plans
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- Policies for subscription_statuses
-- Business owners can view their own status
CREATE POLICY "Business owners can view their own subscription status" ON public.subscription_statuses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.businesses
            WHERE id = subscription_statuses.business_id
            AND (owner_id = auth.uid() OR is_business_owner(auth.uid(), id))
        )
    );

-- Super Admins can manage statuses
CREATE POLICY "Super admins can manage statuses" ON public.subscription_statuses
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- Add 'Bought' to allowed statuses check if I missed it in the initial create (I added it above)
-- But just in case the prompt mentioned specific enums: 'Active','Expired','Cancelled','Pending','Suspended'.
-- The prompt explicitly listed those, but then in point 3 said "When a business has a subscription status marked as 'Bought'".
-- So 'Bought' MUST be a valid status.

-- Indexes for performance
CREATE INDEX idx_subscription_plans_is_active ON public.subscription_plans(is_active);
CREATE INDEX idx_subscription_statuses_business_id ON public.subscription_statuses(business_id);
CREATE INDEX idx_subscription_statuses_status ON public.subscription_statuses(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscription_plans_updated_at
    BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_statuses_updated_at
    BEFORE UPDATE ON public.subscription_statuses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
