-- =====================================================================
-- 0002 CATALOGUE + INVENTORY
-- Modules: category management, product catalogue, inventory management
--
-- Design notes
-- * Stock is tracked per PRODUCT in its base unit (e.g. 25.000 kg of
--   tomatoes). Each variant consumes `quantity_in_base` of that stock
--   (a "500 g" pack consumes 0.5 kg). The owner therefore updates one
--   number per product, the way they think about their shop.
-- * Inventory lives in its own table so a future multi-branch release
--   can add `location_id` (inventory_levels per warehouse) without
--   touching the catalogue.
-- =====================================================================

create type public.unit_type as enum ('kg', 'g', 'piece', 'dozen', 'bunch', 'pack', 'litre');

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique check (char_length(name) between 1 and 80),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  description text not null default '' check (char_length(description) <= 500),
  image_url   text check (image_url is null or image_url ~ '^https://'),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index categories_active_sort_idx on public.categories (is_active, sort_order, name);
create trigger categories_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

create table public.products (
  id          uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name        text not null check (char_length(name) between 1 and 120),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  description text not null default '' check (char_length(description) <= 2000),
  image_url   text check (image_url is null or image_url ~ '^https://'),
  base_unit   public.unit_type not null default 'kg',
  origin      text not null default '' check (char_length(origin) <= 80),
  is_active   boolean not null default true,   -- false = hidden from store (archived)
  is_featured boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_active_featured_idx on public.products (is_active, is_featured);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_variants (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.products (id) on delete cascade,
  label            text not null check (char_length(label) between 1 and 40),   -- "500 g", "1 kg", "6 pcs"
  quantity_in_base numeric(10,3) not null check (quantity_in_base > 0),
  price_paise      integer not null check (price_paise > 0 and price_paise <= 10000000),
  mrp_paise        integer check (mrp_paise is null or mrp_paise >= price_paise),
  sort_order       integer not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (product_id, label)
);
create index product_variants_product_idx on public.product_variants (product_id, sort_order);
create trigger product_variants_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();

create table public.inventory (
  product_id          uuid primary key references public.products (id) on delete cascade,
  stock_quantity      numeric(12,3) not null default 0 check (stock_quantity >= 0),
  low_stock_threshold numeric(12,3) not null default 5 check (low_stock_threshold >= 0),
  is_available        boolean not null default true,  -- owner's manual "mark unavailable" switch
  updated_at          timestamptz not null default now(),
  updated_by          uuid references auth.users (id) on delete set null
);
create index inventory_low_stock_idx on public.inventory (stock_quantity) where is_available;

-- Every product automatically gets an inventory row.
create or replace function public.create_inventory_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.inventory (product_id, low_stock_threshold)
  select new.id, s.default_low_stock_threshold from public.business_settings s where s.id = 1
  on conflict do nothing;
  return new;
end;
$$;
create trigger products_create_inventory after insert on public.products
  for each row execute function public.create_inventory_row();
