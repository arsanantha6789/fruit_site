-- =====================================================================
-- 0005 ROW LEVEL SECURITY + PRIVILEGES
-- Principle: deny by default. Every table has RLS enabled. Writes to
-- stock, orders and payments are only possible through the functions in
-- 0004. Explicit grants are used so behaviour does not depend on the
-- project's default privileges.
-- =====================================================================

-- ---------- Reset broad defaults --------------------------------------
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

alter table public.profiles             enable row level security;
alter table public.business_settings    enable row level security;
alter table public.rate_limits          enable row level security;
alter table public.categories           enable row level security;
alter table public.products             enable row level security;
alter table public.product_variants     enable row level security;
alter table public.inventory            enable row level security;
alter table public.inventory_movements  enable row level security;
alter table public.addresses            enable row level security;
alter table public.orders               enable row level security;
alter table public.order_items          enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payments             enable row level security;
alter table public.notifications        enable row level security;

-- ---------- Helper + RPC execute grants -------------------------------
grant execute on function public.current_app_role() to anon, authenticated;
grant execute on function public.is_staff()         to anon, authenticated;
grant execute on function public.is_admin()         to anon, authenticated;
grant execute on function public.order_status_rank(public.order_status) to anon, authenticated;

grant execute on function public.place_order(jsonb, jsonb, jsonb, public.payment_method, text, uuid) to authenticated;
grant execute on function public.update_order_status(uuid, public.order_status, text)            to authenticated;
grant execute on function public.cancel_my_order(uuid, text)                                     to authenticated;
grant execute on function public.update_inventory(uuid, numeric, boolean, numeric, text)         to authenticated;
grant execute on function public.set_variant_price(uuid, integer, integer)                       to authenticated;
grant execute on function public.set_payment_status(uuid, public.payment_status, text)           to authenticated;
grant execute on function public.report_daily_sales(date, date)                                  to authenticated;
grant execute on function public.report_top_products(date, date, integer)                        to authenticated;
-- Server-only (service role): rate limiting.
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
-- _fail/_restock_order/_cancel_order/handle_new_user/create_inventory_row:
-- no grants (internal only).

-- ---------- profiles --------------------------------------------------
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;   -- never role/email

create policy profiles_select on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------- business_settings ----------------------------------------
grant select on public.business_settings to anon, authenticated;
grant update (business_name, tagline, address_line, city, state, pincode, phone, email, gstin,
              delivery_fee_paise, free_delivery_min_paise, min_order_paise, serviceable_pincodes,
              accepting_orders, cod_enabled, upi_on_delivery_enabled, owner_can_edit_prices,
              default_low_stock_threshold, packing_slip_note, hero_image_url, promo_image_url, updated_by)
  on public.business_settings to authenticated;

create policy settings_read on public.business_settings for select to anon, authenticated using (true);
create policy settings_admin_update on public.business_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- rate_limits: no client access at all -----------------------

-- ---------- categories / products / variants (admin manages) ----------
grant select on public.categories, public.products, public.product_variants to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.product_variants to authenticated;

create policy categories_read on public.categories for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy categories_admin_insert on public.categories for insert to authenticated
  with check ((select public.is_admin()));
create policy categories_admin_update on public.categories for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy categories_admin_delete on public.categories for delete to authenticated
  using ((select public.is_admin()));

create policy products_read on public.products for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy products_admin_insert on public.products for insert to authenticated
  with check ((select public.is_admin()));
create policy products_admin_update on public.products for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy products_admin_delete on public.products for delete to authenticated
  using ((select public.is_admin()));

create policy variants_read on public.product_variants for select to anon, authenticated
  using (is_active or (select public.is_staff()));
create policy variants_admin_insert on public.product_variants for insert to authenticated
  with check ((select public.is_admin()));
create policy variants_admin_update on public.product_variants for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy variants_admin_delete on public.product_variants for delete to authenticated
  using ((select public.is_admin()));

-- ---------- inventory (read: everyone; write: functions only) ---------
grant select on public.inventory to anon, authenticated;
create policy inventory_read on public.inventory for select to anon, authenticated using (true);

grant select on public.inventory_movements to authenticated;
create policy inventory_movements_staff_read on public.inventory_movements for select to authenticated
  using ((select public.is_staff()));

-- ---------- addresses (owner of the row only) -------------------------
grant select, insert, update, delete on public.addresses to authenticated;
create policy addresses_own_select on public.addresses for select to authenticated
  using (user_id = (select auth.uid()));
create policy addresses_own_insert on public.addresses for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy addresses_own_update on public.addresses for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy addresses_own_delete on public.addresses for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------- orders and children (read only; writes via functions) -----
grant select on public.orders, public.order_items, public.order_status_history, public.payments to authenticated;

create policy orders_read on public.orders for select to authenticated
  using (customer_id = (select auth.uid()) or (select public.is_staff()));

create policy order_items_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.customer_id = (select auth.uid()) or (select public.is_staff()))));

create policy order_history_read on public.order_status_history for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.customer_id = (select auth.uid()) or (select public.is_staff()))));

create policy payments_read on public.payments for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.customer_id = (select auth.uid()) or (select public.is_staff()))));

-- ---------- notifications ---------------------------------------------
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy notifications_read on public.notifications for select to authenticated
  using ((audience = 'staff' and (select public.is_staff())) or user_id = (select auth.uid()));
create policy notifications_mark_read on public.notifications for update to authenticated
  using ((audience = 'staff' and (select public.is_staff())) or user_id = (select auth.uid()))
  with check ((audience = 'staff' and (select public.is_staff())) or user_id = (select auth.uid()));

-- ---------- service_role (server-side only) ---------------------------
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
