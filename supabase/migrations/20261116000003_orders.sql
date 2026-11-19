-- =====================================================================
-- 0003 ORDERS, PAYMENTS, NOTIFICATIONS
-- Modules: customer addresses, order management, order tracking,
--          payment management, notifications, inventory ledger
--
-- Extensibility hooks (not used in v1, reserved by design):
-- * orders.branch_id / delivery assignment -> new nullable columns or a
--   separate `delivery_assignments` table keyed by order_id.
-- * subscriptions/recurring orders -> `subscriptions` table that calls
--   the same place_order() logic, orders.source distinguishes them.
-- * online payments -> new payment_method value + provider columns that
--   already exist on `payments` (1 order : many payment attempts).
-- =====================================================================

create type public.order_status as enum (
  'new', 'confirmed', 'preparing', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'cancelled'
);
create type public.payment_method as enum ('cod', 'upi_on_delivery');
create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');

-- Position of each status in the forward lifecycle (cancelled is special).
create or replace function public.order_status_rank(s public.order_status)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case s
    when 'new' then 1 when 'confirmed' then 2 when 'preparing' then 3
    when 'ready_for_delivery' then 4 when 'out_for_delivery' then 5
    when 'delivered' then 6 when 'cancelled' then 99 end;
$$;

-- ---------- Saved customer addresses ---------------------------------
create table public.addresses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  label      text not null default 'Home' check (char_length(label) between 1 and 40),
  full_name  text not null check (char_length(full_name) between 1 and 120),
  phone      text not null check (phone ~ '^[6-9][0-9]{9}$'),
  line1      text not null check (char_length(line1) between 1 and 200),
  line2      text not null default '' check (char_length(line2) <= 200),
  landmark   text not null default '' check (char_length(landmark) <= 120),
  city       text not null check (char_length(city) between 1 and 80),
  state      text not null check (char_length(state) between 1 and 80),
  pincode    text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id, is_default desc, created_at desc);
create trigger addresses_updated_at before update on public.addresses
  for each row execute function public.set_updated_at();

-- ---------- Orders ----------------------------------------------------
create sequence public.order_number_seq start 10001;

create table public.orders (
  id                 uuid primary key default gen_random_uuid(),
  order_number       text not null unique default ('FB' || nextval('public.order_number_seq')::text),
  customer_id        uuid references auth.users (id) on delete set null,
  status             public.order_status not null default 'new',
  -- Snapshots: what the customer entered at checkout, never re-derived.
  customer_name      text not null check (char_length(customer_name) between 1 and 120),
  customer_phone     text not null check (customer_phone ~ '^[6-9][0-9]{9}$'),
  customer_email     text check (customer_email is null or char_length(customer_email) <= 200),
  shipping_address   jsonb not null check (jsonb_typeof(shipping_address) = 'object'),
  instructions       text not null default '' check (char_length(instructions) <= 500),
  subtotal_paise     integer not null check (subtotal_paise >= 0),
  delivery_fee_paise integer not null check (delivery_fee_paise >= 0),
  discount_paise     integer not null default 0 check (discount_paise >= 0),
  total_paise        integer not null check (total_paise >= 0),
  payment_method     public.payment_method not null,
  idempotency_key    uuid not null,
  cancel_reason      text check (cancel_reason is null or char_length(cancel_reason) <= 300),
  placed_at          timestamptz not null default now(),
  confirmed_at       timestamptz,
  delivered_at       timestamptz,
  cancelled_at       timestamptz,
  updated_at         timestamptz not null default now(),
  constraint orders_total_matches check (total_paise = subtotal_paise + delivery_fee_paise - discount_paise),
  constraint orders_idempotency_unique unique (customer_id, idempotency_key)
);
create index orders_customer_placed_idx on public.orders (customer_id, placed_at desc);
create index orders_status_placed_idx on public.orders (status, placed_at desc);
create index orders_placed_idx on public.orders (placed_at desc);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- Line items carry full snapshots so history is unaffected by later
-- catalogue edits or deletions.
create table public.order_items (
  id                uuid primary key default gen_random_uuid(),
  order_id          uuid not null references public.orders (id) on delete cascade,
  product_id        uuid references public.products (id) on delete set null,
  variant_id        uuid references public.product_variants (id) on delete set null,
  product_name      text not null,
  variant_label     text not null,
  unit              public.unit_type not null,
  quantity_in_base  numeric(10,3) not null check (quantity_in_base > 0),
  quantity          integer not null check (quantity between 1 and 50),
  unit_price_paise  integer not null check (unit_price_paise > 0),
  line_total_paise  integer not null,
  image_url         text,
  created_at        timestamptz not null default now(),
  constraint order_items_line_total check (line_total_paise = quantity * unit_price_paise)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);
create index order_items_variant_idx on public.order_items (variant_id);

create table public.order_status_history (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete cascade,
  from_status     public.order_status,
  to_status       public.order_status not null,
  note            text check (note is null or char_length(note) <= 300),
  changed_by      uuid references auth.users (id) on delete set null,
  changed_by_role public.app_role,
  created_at      timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);
create index order_status_history_changed_by_idx on public.order_status_history (changed_by);

-- ---------- Payments --------------------------------------------------
create table public.payments (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders (id) on delete cascade,
  method             public.payment_method not null,
  status             public.payment_status not null default 'pending',
  amount_paise       integer not null check (amount_paise >= 0),
  provider           text,            -- e.g. 'razorpay' in a future release
  provider_reference text,
  paid_at            timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  updated_by         uuid references auth.users (id) on delete set null
);
create index payments_order_idx on public.payments (order_id, created_at desc);
create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------- Inventory ledger -----------------------------------------
create table public.inventory_movements (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  change         numeric(12,3) not null,
  quantity_after numeric(12,3) not null,
  reason         text not null check (reason in ('order_placed', 'order_cancelled', 'manual_set', 'correction')),
  order_id       uuid references public.orders (id) on delete set null,
  note           text check (note is null or char_length(note) <= 300),
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index inventory_movements_product_idx on public.inventory_movements (product_id, created_at desc);
create index inventory_movements_order_idx on public.inventory_movements (order_id);

-- ---------- Notifications ---------------------------------------------
-- audience 'staff' = owner/admin inbox; 'customer' rows target user_id.
-- Channels beyond in-app (email now, WhatsApp later) are delivered by
-- the application's notifications module, not by the database.
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  audience   text not null check (audience in ('staff', 'customer')),
  user_id    uuid references auth.users (id) on delete cascade,
  type       text not null check (char_length(type) <= 40),
  title      text not null check (char_length(title) <= 160),
  body       text not null default '' check (char_length(body) <= 500),
  order_id   uuid references public.orders (id) on delete cascade,
  read_at    timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_customer_has_user check (audience = 'staff' or user_id is not null)
);
create index notifications_staff_unread_idx on public.notifications (created_at desc) where audience = 'staff' and read_at is null;
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_order_idx on public.notifications (order_id);
