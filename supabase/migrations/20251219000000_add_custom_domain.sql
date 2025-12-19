alter table "public"."businesses" add column "custom_domain" text;
create unique index businesses_custom_domain_key on businesses (custom_domain) where custom_domain is not null;
