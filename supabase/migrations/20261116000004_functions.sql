-- =====================================================================
-- 0004 BUSINESS FUNCTIONS (the only way stock and orders change)
--
-- All functions are SECURITY DEFINER with an empty search_path and
-- perform their own authorisation checks with auth.uid(). Errors are
-- raised with a stable machine code in MESSAGE and a human detail in
-- DETAIL; the app maps codes to friendly text.
-- =====================================================================

-- ---------- internal: raise a coded error ------------------------------
create or replace function public._fail(p_code text, p_detail text default null)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using message = p_code, detail = coalesce(p_detail, ''), errcode = 'P0001';
end;
$$;

-- ---------- internal: put an order's stock back ------------------------
create or replace function public._restock_order(p_order_id uuid, p_actor uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select oi.product_id, sum(oi.quantity * oi.quantity_in_base) as qty
    from public.order_items oi
    where oi.order_id = p_order_id and oi.product_id is not null
    group by oi.product_id
    order by oi.product_id
  loop
    update public.inventory i
       set stock_quantity = i.stock_quantity + r.qty, updated_at = now()
     where i.product_id = r.product_id;
    if found then
      insert into public.inventory_movements (product_id, change, quantity_after, reason, order_id, created_by)
      select r.product_id, r.qty, i.stock_quantity, 'order_cancelled', p_order_id, p_actor
      from public.inventory i where i.product_id = r.product_id;
    end if;
  end loop;
end;
$$;

-- ---------- internal: cancel (shared by owner + customer paths) -------
create or replace function public._cancel_order(p_order_id uuid, p_reason text, p_actor uuid, p_role public.app_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from public.order_status;
begin
  select status into v_from from public.orders where id = p_order_id for update;
  if v_from in ('delivered', 'cancelled') then
    perform public._fail('ORDER_CLOSED', 'This order can no longer be changed.');
  end if;

  -- Lock affected inventory rows in a stable order (deadlock safety).
  perform 1 from public.inventory i
   where i.product_id in (select oi.product_id from public.order_items oi where oi.order_id = p_order_id)
   order by i.product_id
   for update;

  perform public._restock_order(p_order_id, p_actor);

  update public.orders
     set status = 'cancelled', cancelled_at = now(), cancel_reason = nullif(left(coalesce(p_reason, ''), 300), '')
   where id = p_order_id;

  insert into public.order_status_history (order_id, from_status, to_status, note, changed_by, changed_by_role)
  values (p_order_id, v_from, 'cancelled', nullif(left(coalesce(p_reason, ''), 300), ''), p_actor, p_role);
end;
$$;

-- =====================================================================
-- place_order: validates everything server-side, locks stock rows,
-- snapshots prices, decrements stock and records history atomically.
-- p_items:   [{"variant_id": uuid, "quantity": int}, ...]
-- p_contact: {"name", "phone", "email"}
-- p_address: {"line1","line2","landmark","city","state","pincode"}
-- =====================================================================
create or replace function public.place_order(
  p_items jsonb,
  p_contact jsonb,
  p_address jsonb,
  p_payment_method public.payment_method,
  p_instructions text,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_role      public.app_role;
  v_settings  public.business_settings;
  v_order_id  uuid;
  v_subtotal  bigint;
  v_fee       integer;
  v_bad       record;
  v_name      text := btrim(coalesce(p_contact ->> 'name', ''));
  v_phone     text := btrim(coalesce(p_contact ->> 'phone', ''));
  v_email     text := nullif(lower(btrim(coalesce(p_contact ->> 'email', ''))), '');
  v_pincode   text := btrim(coalesce(p_address ->> 'pincode', ''));
  v_address   jsonb;
begin
  if v_uid is null then
    perform public._fail('AUTH_REQUIRED', 'Please log in to place an order.');
  end if;
  v_role := public.current_app_role();

  -- Idempotency: a retried submit returns the original order.
  select o.id into v_order_id from public.orders o
   where o.customer_id = v_uid and o.idempotency_key = p_idempotency_key;
  if v_order_id is not null then
    return v_order_id;
  end if;

  -- Abuse guard: at most 5 orders per customer per 10 minutes.
  if (select count(*) from public.orders o
       where o.customer_id = v_uid and o.placed_at > now() - interval '10 minutes') >= 5 then
    perform public._fail('TOO_MANY_ORDERS', 'Too many orders in a short time. Please wait a few minutes.');
  end if;

  select * into v_settings from public.business_settings where id = 1;
  if not v_settings.accepting_orders then
    perform public._fail('STORE_CLOSED', 'We are not accepting orders right now.');
  end if;
  if (p_payment_method = 'cod' and not v_settings.cod_enabled)
     or (p_payment_method = 'upi_on_delivery' and not v_settings.upi_on_delivery_enabled) then
    perform public._fail('PAYMENT_METHOD_UNAVAILABLE', 'This payment method is not available.');
  end if;

  -- Contact + address validation (mirrors the app's zod schema).
  if char_length(v_name) not between 1 and 120 then perform public._fail('INVALID_INPUT', 'name'); end if;
  if v_phone !~ '^[6-9][0-9]{9}$' then perform public._fail('INVALID_INPUT', 'phone'); end if;
  if v_email is not null and (char_length(v_email) > 200 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    perform public._fail('INVALID_INPUT', 'email');
  end if;
  if char_length(btrim(coalesce(p_address ->> 'line1', ''))) not between 1 and 200
     or char_length(coalesce(p_address ->> 'line2', '')) > 200
     or char_length(coalesce(p_address ->> 'landmark', '')) > 120
     or char_length(btrim(coalesce(p_address ->> 'city', ''))) not between 1 and 80
     or char_length(btrim(coalesce(p_address ->> 'state', ''))) not between 1 and 80
     or v_pincode !~ '^[1-9][0-9]{5}$' then
    perform public._fail('INVALID_INPUT', 'address');
  end if;
  if char_length(coalesce(p_instructions, '')) > 500 then
    perform public._fail('INVALID_INPUT', 'instructions');
  end if;
  if cardinality(v_settings.serviceable_pincodes) > 0 and not (v_pincode = any (v_settings.serviceable_pincodes)) then
    perform public._fail('PINCODE_NOT_SERVICEABLE', v_pincode);
  end if;
  v_address := jsonb_build_object(
    'line1', btrim(p_address ->> 'line1'),
    'line2', btrim(coalesce(p_address ->> 'line2', '')),
    'landmark', btrim(coalesce(p_address ->> 'landmark', '')),
    'city', btrim(p_address ->> 'city'),
    'state', btrim(p_address ->> 'state'),
    'pincode', v_pincode
  );

  -- Items shape.
  if jsonb_typeof(p_items) is distinct from 'array'
     or jsonb_array_length(p_items) not between 1 and 50 then
    perform public._fail('INVALID_INPUT', 'items');
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) e
     where jsonb_typeof(e -> 'quantity') is distinct from 'number'
        or (e ->> 'quantity')::numeric <> floor((e ->> 'quantity')::numeric)
        or (e ->> 'quantity')::numeric not between 1 and 50
        or coalesce(e ->> 'variant_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    perform public._fail('INVALID_INPUT', 'items');
  end if;

  create temporary table if not exists pg_temp._req (
    variant_id uuid primary key, quantity integer not null
  ) on commit drop;
  truncate pg_temp._req;
  insert into pg_temp._req (variant_id, quantity)
  select (e ->> 'variant_id')::uuid, sum((e ->> 'quantity')::integer)
    from jsonb_array_elements(p_items) e
   group by 1;
  if exists (select 1 from pg_temp._req where quantity > 50) then
    perform public._fail('INVALID_INPUT', 'items');
  end if;

  -- Lock every inventory row we will touch, in a stable order.
  perform 1 from public.inventory i
   where i.product_id in (select v.product_id from public.product_variants v join pg_temp._req r on r.variant_id = v.id)
   order by i.product_id
   for update;

  -- Every variant must exist and be on sale.
  select r.variant_id, p.name into v_bad
    from pg_temp._req r
    left join public.product_variants v on v.id = r.variant_id
    left join public.products p on p.id = v.product_id
    left join public.categories c on c.id = p.category_id
   where v.id is null or not v.is_active or not p.is_active or not c.is_active
   limit 1;
  if found then
    perform public._fail('PRODUCT_UNAVAILABLE', coalesce(v_bad.name, 'An item in your cart'));
  end if;

  -- Stock check per product (variants of one product share stock).
  select p.name into v_bad
    from pg_temp._req r
    join public.product_variants v on v.id = r.variant_id
    join public.products p on p.id = v.product_id
    join public.inventory i on i.product_id = p.id
   group by p.id, p.name, i.stock_quantity, i.is_available
  having not i.is_available or sum(r.quantity * v.quantity_in_base) > i.stock_quantity
   limit 1;
  if found then
    perform public._fail('OUT_OF_STOCK', v_bad.name);
  end if;

  -- Totals from database prices only.
  select sum(r.quantity::bigint * v.price_paise) into v_subtotal
    from pg_temp._req r join public.product_variants v on v.id = r.variant_id;
  if v_subtotal > 2000000000 then
    perform public._fail('INVALID_INPUT', 'items');
  end if;
  if v_subtotal < v_settings.min_order_paise then
    perform public._fail('BELOW_MINIMUM_ORDER', v_settings.min_order_paise::text);
  end if;
  v_fee := case when v_subtotal >= v_settings.free_delivery_min_paise then 0 else v_settings.delivery_fee_paise end;

  insert into public.orders (
    customer_id, customer_name, customer_phone, customer_email, shipping_address, instructions,
    subtotal_paise, delivery_fee_paise, discount_paise, total_paise, payment_method, idempotency_key
  ) values (
    v_uid, v_name, v_phone, v_email, v_address, btrim(coalesce(p_instructions, '')),
    v_subtotal, v_fee, 0, v_subtotal + v_fee, p_payment_method, p_idempotency_key
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, product_id, variant_id, product_name, variant_label, unit,
    quantity_in_base, quantity, unit_price_paise, line_total_paise, image_url
  )
  select v_order_id, p.id, v.id, p.name, v.label, p.base_unit,
         v.quantity_in_base, r.quantity, v.price_paise, r.quantity * v.price_paise, p.image_url
    from pg_temp._req r
    join public.product_variants v on v.id = r.variant_id
    join public.products p on p.id = v.product_id;

  -- Decrement stock + ledger.
  with need as (
    select v.product_id, sum(r.quantity * v.quantity_in_base) as qty
      from pg_temp._req r join public.product_variants v on v.id = r.variant_id
     group by v.product_id
  ), upd as (
    update public.inventory i
       set stock_quantity = i.stock_quantity - need.qty, updated_at = now()
      from need
     where i.product_id = need.product_id
    returning i.product_id, need.qty, i.stock_quantity
  )
  insert into public.inventory_movements (product_id, change, quantity_after, reason, order_id, created_by)
  select upd.product_id, -upd.qty, upd.stock_quantity, 'order_placed', v_order_id, v_uid from upd;

  insert into public.payments (order_id, method, status, amount_paise)
  values (v_order_id, p_payment_method, 'pending', v_subtotal + v_fee);

  insert into public.order_status_history (order_id, from_status, to_status, changed_by, changed_by_role)
  values (v_order_id, null, 'new', v_uid, v_role);

  insert into public.notifications (audience, type, title, body, order_id)
  select 'staff', 'new_order', 'New order ' || o.order_number,
         o.customer_name || ' · ₹' || to_char(o.total_paise / 100.0, 'FM999999990.00'), o.id
    from public.orders o where o.id = v_order_id;

  return v_order_id;
end;
$$;

-- =====================================================================
-- update_order_status: staff only. Forward moves only (skipping steps is
-- allowed), or cancel. Every change is recorded with who made it.
-- =====================================================================
create or replace function public.update_order_status(p_order_id uuid, p_status public.order_status, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := auth.uid();
  v_role public.app_role := public.current_app_role();
  v_from public.order_status;
begin
  if v_uid is null or not public.is_staff() then
    perform public._fail('FORBIDDEN', 'Only the store team can update orders.');
  end if;
  if char_length(coalesce(p_note, '')) > 300 then
    perform public._fail('INVALID_INPUT', 'note');
  end if;

  select status into v_from from public.orders where id = p_order_id for update;
  if not found then
    perform public._fail('NOT_FOUND', 'Order not found.');
  end if;
  if v_from = p_status then
    return;
  end if;
  if v_from in ('delivered', 'cancelled') then
    perform public._fail('ORDER_CLOSED', 'This order can no longer be changed.');
  end if;

  if p_status = 'cancelled' then
    perform public._cancel_order(p_order_id, p_note, v_uid, v_role);
    insert into public.notifications (audience, user_id, type, title, order_id)
    select 'customer', o.customer_id, 'order_status', 'Order ' || o.order_number || ' was cancelled', o.id
      from public.orders o where o.id = p_order_id and o.customer_id is not null;
    return;
  end if;

  if public.order_status_rank(p_status) <= public.order_status_rank(v_from) then
    perform public._fail('INVALID_TRANSITION', 'Orders can only move forward.');
  end if;

  update public.orders
     set status = p_status,
         confirmed_at = case when p_status <> 'new' and confirmed_at is null then now() else confirmed_at end,
         delivered_at = case when p_status = 'delivered' then now() else delivered_at end
   where id = p_order_id;

  insert into public.order_status_history (order_id, from_status, to_status, note, changed_by, changed_by_role)
  values (p_order_id, v_from, p_status, nullif(btrim(coalesce(p_note, '')), ''), v_uid, v_role);

  insert into public.notifications (audience, user_id, type, title, order_id)
  select 'customer', o.customer_id, 'order_status', 'Order ' || o.order_number || ' is now ' || replace(p_status::text, '_', ' '), o.id
    from public.orders o where o.id = p_order_id and o.customer_id is not null;
end;
$$;

-- Customers may cancel their own order only while it is still "new".
create or replace function public.cancel_my_order(p_order_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid    uuid := auth.uid();
  v_status public.order_status;
begin
  if v_uid is null then
    perform public._fail('AUTH_REQUIRED', 'Please log in.');
  end if;
  select status into v_status from public.orders
   where id = p_order_id and customer_id = v_uid
   for update;
  if not found then
    perform public._fail('NOT_FOUND', 'Order not found.');
  end if;
  if v_status <> 'new' then
    perform public._fail('CANNOT_CANCEL', 'This order is already being prepared. Please call the store.');
  end if;
  perform public._cancel_order(p_order_id, coalesce(nullif(btrim(p_reason), ''), 'Cancelled by customer'), v_uid, 'customer');
  insert into public.notifications (audience, type, title, body, order_id)
  select 'staff', 'order_cancelled', 'Order ' || o.order_number || ' cancelled by customer', o.customer_name, o.id
    from public.orders o where o.id = p_order_id;
end;
$$;

-- =====================================================================
-- update_inventory: owner/admin set stock, availability, threshold.
-- Null arguments leave that field unchanged.
-- =====================================================================
create or replace function public.update_inventory(
  p_product_id uuid,
  p_stock numeric default null,
  p_is_available boolean default null,
  p_low_stock_threshold numeric default null,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_old numeric;
begin
  if v_uid is null or not public.is_staff() then
    perform public._fail('FORBIDDEN', 'Only the store team can update stock.');
  end if;
  if p_stock is not null and (p_stock < 0 or p_stock > 1000000) then
    perform public._fail('INVALID_INPUT', 'stock');
  end if;
  if p_low_stock_threshold is not null and (p_low_stock_threshold < 0 or p_low_stock_threshold > 1000000) then
    perform public._fail('INVALID_INPUT', 'threshold');
  end if;

  select stock_quantity into v_old from public.inventory where product_id = p_product_id for update;
  if not found then
    perform public._fail('NOT_FOUND', 'Product not found.');
  end if;

  update public.inventory
     set stock_quantity      = coalesce(round(p_stock, 3), stock_quantity),
         is_available        = coalesce(p_is_available, is_available),
         low_stock_threshold = coalesce(round(p_low_stock_threshold, 3), low_stock_threshold),
         updated_at          = now(),
         updated_by          = v_uid
   where product_id = p_product_id;

  if p_stock is not null and round(p_stock, 3) <> v_old then
    insert into public.inventory_movements (product_id, change, quantity_after, reason, note, created_by)
    values (p_product_id, round(p_stock, 3) - v_old, round(p_stock, 3), 'manual_set', nullif(left(btrim(coalesce(p_note, '')), 300), ''), v_uid);
  end if;
end;
$$;

-- Price edits: admins always; the owner only when an admin enabled it.
create or replace function public.set_variant_price(p_variant_id uuid, p_price_paise integer, p_mrp_paise integer default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_allowed boolean;
begin
  v_allowed := public.is_admin()
    or (public.current_app_role() = 'owner'
        and (select s.owner_can_edit_prices from public.business_settings s where s.id = 1));
  if auth.uid() is null or not coalesce(v_allowed, false) then
    perform public._fail('FORBIDDEN', 'You do not have permission to change prices.');
  end if;
  if p_price_paise is null or p_price_paise <= 0 or p_price_paise > 10000000
     or (p_mrp_paise is not null and p_mrp_paise < p_price_paise) then
    perform public._fail('INVALID_INPUT', 'price');
  end if;
  update public.product_variants set price_paise = p_price_paise, mrp_paise = p_mrp_paise where id = p_variant_id;
  if not found then
    perform public._fail('NOT_FOUND', 'Variant not found.');
  end if;
end;
$$;

-- Payment status (offline methods are confirmed by the owner).
create or replace function public.set_payment_status(p_order_id uuid, p_status public.payment_status, p_reference text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment_id uuid;
begin
  if auth.uid() is null or not public.is_staff() then
    perform public._fail('FORBIDDEN', 'Only the store team can update payments.');
  end if;
  select id into v_payment_id from public.payments
   where order_id = p_order_id order by created_at desc limit 1 for update;
  if not found then
    perform public._fail('NOT_FOUND', 'Payment not found.');
  end if;
  update public.payments
     set status = p_status,
         provider_reference = coalesce(nullif(left(btrim(coalesce(p_reference, '')), 120), ''), provider_reference),
         paid_at = case when p_status = 'paid' then coalesce(paid_at, now()) else null end,
         updated_by = auth.uid()
   where id = v_payment_id;
end;
$$;

-- ---------- Reports (security invoker: RLS decides what is visible) ----
create or replace function public.report_daily_sales(p_from date, p_to date)
returns table (day date, orders bigint, revenue_paise bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select d::date as day,
         count(o.id) as orders,
         coalesce(sum(o.total_paise), 0)::bigint as revenue_paise
    from generate_series(p_from, least(p_to, p_from + 366), interval '1 day') d
    left join public.orders o
      on (o.placed_at at time zone 'Asia/Kolkata')::date = d::date
     and o.status <> 'cancelled'
   group by d
   order by d;
$$;

create or replace function public.report_top_products(p_from date, p_to date, p_limit integer default 10)
returns table (product_name text, quantity_sold numeric, unit public.unit_type, revenue_paise bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select oi.product_name,
         sum(oi.quantity * oi.quantity_in_base) as quantity_sold,
         min(oi.unit) as unit,
         sum(oi.line_total_paise)::bigint as revenue_paise
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
   where o.status <> 'cancelled'
     and (o.placed_at at time zone 'Asia/Kolkata')::date between p_from and p_to
   group by oi.product_name
   order by revenue_paise desc
   limit least(greatest(p_limit, 1), 50);
$$;
