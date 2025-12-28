create table if not exists public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  action text not null,
  details text,
  performed_by uuid references auth.users(id),
  ip_address text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.audit_logs enable row level security;

-- Policies
create policy "Super admins can view all audit logs"
  on public.audit_logs for select
  using (
    has_role(auth.uid(), 'super_admin'::app_role)
  );

create policy "Users can insert their own actions"
  on public.audit_logs for insert
  with check (
    auth.uid() = performed_by
  );
