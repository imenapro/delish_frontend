-- Create pos_sessions table for tracking POS shifts
CREATE TABLE public.pos_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  shop_id UUID NOT NULL REFERENCES public.shops(id),
  business_id UUID NOT NULL REFERENCES public.businesses(id),
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  opening_cash NUMERIC NOT NULL DEFAULT 0,
  closing_cash NUMERIC,
  expected_cash NUMERIC,
  total_sales NUMERIC DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;

-- Staff can create their own sessions
CREATE POLICY "Users can create own sessions"
ON public.pos_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Staff can view and update their own sessions
CREATE POLICY "Users can view own sessions"
ON public.pos_sessions
FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'store_owner'::app_role)
  OR has_role(auth.uid(), 'branch_manager'::app_role)
  OR has_business_access(auth.uid(), business_id)
);

-- Staff can update their own open sessions
CREATE POLICY "Users can update own sessions"
ON public.pos_sessions
FOR UPDATE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_pos_sessions_shop_status ON public.pos_sessions(shop_id, status);
CREATE INDEX idx_pos_sessions_user_status ON public.pos_sessions(user_id, status);
CREATE INDEX idx_pos_sessions_business ON public.pos_sessions(business_id);