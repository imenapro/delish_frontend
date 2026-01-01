create table if not exists public.tenant_taxes (
    id uuid default gen_random_uuid() primary key,
    business_id uuid references public.businesses(id) on delete cascade not null,
    shop_id uuid references public.shops(id) on delete set null,
    name text not null,
    description text,
    rate numeric not null check (rate >= 0),
    country text,
    region text,
    effective_from timestamp with time zone,
    effective_to timestamp with time zone,
    type text,
    category text,
    is_active boolean default true not null,
    is_compound boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Policies
alter table public.tenant_taxes enable row level security;

-- Policy for viewing taxes (allow read if user belongs to the business or is super_admin)
create policy "Users can view taxes for their business"
on public.tenant_taxes for select
using (
    exists (
        select 1 from public.user_roles
        where user_roles.business_id = tenant_taxes.business_id
        and user_roles.user_id = auth.uid()
    )
    OR
    has_role(auth.uid(), 'super_admin'::app_role)
);

-- Policy for managing taxes (allow insert/update/delete if user is admin/owner)
create policy "Admins can manage taxes for their business"
on public.tenant_taxes for all
using (
    (
        exists (
            select 1 from public.user_roles
            where user_roles.business_id = tenant_taxes.business_id
            and user_roles.user_id = auth.uid()
            and user_roles.role = 'admin'::app_role
        )
        OR is_business_owner(auth.uid(), tenant_taxes.business_id)
    )
    OR
    has_role(auth.uid(), 'super_admin'::app_role)
);

-- Trigger for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists handle_updated_at on public.tenant_taxes;
create trigger handle_updated_at
before update on public.tenant_taxes
for each row
execute procedure public.handle_updated_at();
