-- =====================================================================
-- 0001 CORE: roles, profiles, business configuration, shared helpers
-- Module ownership: auth & authorization, customer management,
--                   business configuration
-- =====================================================================

-- ---------- Roles ----------------------------------------------------
-- customer : shops on the storefront
-- owner    : business owner (stock, availability, orders, packing slips)
-- admin    : development team (catalogue, categories, prices, settings)
-- Future roles (delivery_partner, branch_manager) are added with
-- ALTER TYPE ... ADD VALUE without touching existing data.
create type public.app_role as enum ('customer', 'owner', 'admin');

-- ---------- Shared trigger: updated_at -------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- Profiles (1:1 with auth.users) ---------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  phone       text check (phone is null or phone ~ '^[6-9][0-9]{9}$'),
  role        public.app_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_staff_idx on public.profiles (role) where role <> 'customer';

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- New sign-ups always become customers. Role is NEVER read from user
-- metadata (users can edit their own metadata).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text := left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120);
  v_phone text := new.raw_user_meta_data ->> 'phone';
begin
  if v_phone is not null and v_phone !~ '^[6-9][0-9]{9}$' then
    v_phone := null;
  end if;
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, lower(new.email), v_name, v_phone);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Role helpers (used by RLS + functions) -------------------
-- SECURITY DEFINER so policies on profiles don't recurse.
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() in ('owner', 'admin'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

-- ---------- Business configuration (single row) ----------------------
create table public.business_settings (
  id                        smallint primary key default 1 check (id = 1),
  business_name             text not null default 'Fresh Basket' check (char_length(business_name) between 1 and 120),
  tagline                   text not null default '' check (char_length(tagline) <= 200),
  address_line              text not null default '' check (char_length(address_line) <= 300),
  city                      text not null default '' check (char_length(city) <= 80),
  state                     text not null default '' check (char_length(state) <= 80),
  pincode                   text not null default '' check (pincode = '' or pincode ~ '^[1-9][0-9]{5}$'),
  phone                     text not null default '' check (char_length(phone) <= 20),
  email                     text not null default '' check (char_length(email) <= 200),
  gstin                     text not null default '' check (char_length(gstin) <= 20),
  -- money is always stored in paise (integer)
  delivery_fee_paise        integer not null default 3000 check (delivery_fee_paise between 0 and 100000),
  free_delivery_min_paise   integer not null default 49900 check (free_delivery_min_paise between 0 and 10000000),
  min_order_paise           integer not null default 0 check (min_order_paise between 0 and 10000000),
  serviceable_pincodes      text[] not null default '{}',
  accepting_orders          boolean not null default true,
  cod_enabled               boolean not null default true,
  upi_on_delivery_enabled   boolean not null default true,
  owner_can_edit_prices     boolean not null default false,
  default_low_stock_threshold numeric(12,3) not null default 5 check (default_low_stock_threshold >= 0),
  hero_image_url            text check (hero_image_url is null or hero_image_url ~ '^https://'),
  promo_image_url           text check (promo_image_url is null or promo_image_url ~ '^https://'),
  packing_slip_note         text not null default 'Thank you for shopping fresh with us!' check (char_length(packing_slip_note) <= 300),
  updated_at                timestamptz not null default now(),
  updated_by                uuid references auth.users (id) on delete set null
);

create trigger business_settings_updated_at
  before update on public.business_settings
  for each row execute function public.set_updated_at();

insert into public.business_settings (id) values (1) on conflict do nothing;

-- ---------- Rate limiting (fixed window, server-side only) -----------
create table public.rate_limits (
  key          text primary key check (char_length(key) <= 200),
  window_start timestamptz not null,
  hits         integer not null
);

-- Returns TRUE when the call is allowed. Only callable with the
-- service-role key from server code (see grants in 0005).
create or replace function public.rate_limit_hit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hits integer;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;

  -- opportunistic cleanup of stale keys
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;

  return v_hits <= p_max;
end;
$$;
