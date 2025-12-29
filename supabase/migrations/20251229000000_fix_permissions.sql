-- Fix permissions for system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  setting_key text PRIMARY KEY,
  setting_value jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone (authenticated and anon if needed for login page etc)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.system_settings;
CREATE POLICY "Enable read access for all users" ON public.system_settings
  FOR SELECT USING (true);

-- Allow insert/update for authenticated users (Admins/Super Admins)
-- Note: In strict production, verify specific roles using a has_role function
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.system_settings;
CREATE POLICY "Enable write access for authenticated users" ON public.system_settings
  FOR ALL USING (auth.role() = 'authenticated');


-- Ensure audit_logs table exists and has permissions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  action text NOT NULL,
  details text,
  performed_by uuid REFERENCES auth.users(id),
  ip_address text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.audit_logs;
CREATE POLICY "Enable read access for all users" ON public.audit_logs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.audit_logs;
CREATE POLICY "Enable insert for authenticated users" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() = performed_by);
