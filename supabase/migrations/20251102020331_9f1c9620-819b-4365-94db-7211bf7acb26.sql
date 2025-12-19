-- Add shop_id to profiles for shop association during signup
ALTER TABLE public.profiles ADD COLUMN shop_id uuid REFERENCES public.shops(id);

-- Create system_settings table for admin configurations
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value jsonb NOT NULL,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view settings"
ON public.system_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage settings"
ON public.system_settings FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create salary_settings table
CREATE TABLE public.salary_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'RWF',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.salary_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view salaries"
ON public.salary_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can manage salaries"
ON public.salary_settings FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create time_tracking table for login/logout tracking
CREATE TYPE attendance_method AS ENUM ('qr_code', 'sms_otp', 'image_snap');

CREATE TABLE public.time_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  check_in timestamp with time zone NOT NULL DEFAULT now(),
  check_out timestamp with time zone,
  method attendance_method NOT NULL,
  verification_data text,
  image_url text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.time_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own time tracking"
ON public.time_tracking FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own time tracking"
ON public.time_tracking FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own time tracking"
ON public.time_tracking FOR UPDATE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Create shop_documents table for legal documents
CREATE TABLE public.shop_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  document_url text NOT NULL,
  document_name text NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.shop_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all shop documents"
ON public.shop_documents FOR SELECT
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

CREATE POLICY "Admins can manage shop documents"
ON public.shop_documents FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Create product_requests table for shops requesting products
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected', 'fulfilled');

CREATE TABLE public.product_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL,
  status request_status DEFAULT 'pending',
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.product_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Shop users can view own requests"
ON public.product_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND shop_id = product_requests.shop_id
  ) OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager')
);

CREATE POLICY "Shop users can create requests"
ON public.product_requests FOR INSERT
WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Admins can manage requests"
ON public.product_requests FOR ALL
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Add receipt fields to orders
ALTER TABLE public.orders ADD COLUMN receipt_number text;
ALTER TABLE public.orders ADD COLUMN receipt_url text;
ALTER TABLE public.orders ADD COLUMN customer_phone text;
ALTER TABLE public.orders ADD COLUMN sms_sent boolean DEFAULT false;

-- Add currency field to wallets (default RWF)
ALTER TABLE public.wallets ADD COLUMN currency text DEFAULT 'RWF';

-- Create triggers for updated_at
CREATE TRIGGER update_system_settings_updated_at
BEFORE UPDATE ON public.system_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_salary_settings_updated_at
BEFORE UPDATE ON public.salary_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_requests_updated_at
BEFORE UPDATE ON public.product_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();