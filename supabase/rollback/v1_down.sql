-- DANGER: removes EVERYTHING created by the v1 migrations, including all
-- orders, products and customer addresses. Only for a broken first deploy
-- on an empty project. Take a backup first (Supabase → Database → Backups).
-- Auth users (auth.users) are NOT touched.
begin;
drop policy if exists product_images_admin_insert on storage.objects;
drop policy if exists product_images_admin_update on storage.objects;
drop policy if exists product_images_admin_delete on storage.objects;
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.notifications, public.inventory_movements, public.payments, public.order_status_history,
  public.order_items, public.orders, public.addresses, public.inventory, public.product_variants, public.products,
  public.categories, public.rate_limits, public.business_settings, public.profiles cascade;
drop sequence if exists public.order_number_seq;
drop function if exists public.place_order, public.update_order_status, public.cancel_my_order, public.update_inventory,
  public.set_variant_price, public.set_payment_status, public.report_daily_sales, public.report_top_products,
  public._cancel_order, public._restock_order, public._fail, public.order_status_rank, public.rate_limit_hit,
  public.create_inventory_row, public.handle_new_user, public.is_admin, public.is_staff, public.current_app_role, public.set_updated_at cascade;
drop type if exists public.payment_status, public.payment_method, public.order_status, public.unit_type, public.app_role cascade;
commit;
