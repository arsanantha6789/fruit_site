import pg from "pg";
import { randomUUID } from "node:crypto";

export const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL, max: 10 });

type Role = "customer" | "owner" | "admin";

/** Inserts an auth user (fires the profile trigger) and sets its role. */
export async function createUser(role: Role = "customer", phone = "9876543210") {
  const email = `${role}-${randomUUID()}@test.local`;
  const { rows } = await pool.query("insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id", [
    email,
    JSON.stringify({ full_name: `Test ${role}`, phone }),
  ]);
  const id: string = rows[0].id;
  if (role !== "customer") await pool.query("update public.profiles set role = $1 where id = $2", [role, id]);
  return id;
}

/** Runs fn exactly as PostgREST would for this user (or anon when null), with RLS applied. */
export async function as<T>(uid: string | null, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("begin");
    await c.query(`set local role ${uid ? "authenticated" : "anon"}`);
    await c.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(uid ? { sub: uid, role: "authenticated" } : { role: "anon" }),
    ]);
    const result = await fn(c);
    await c.query("commit");
    return result;
  } catch (err) {
    await c.query("rollback");
    throw err;
  } finally {
    c.release();
  }
}

/** Creates a category + product + two variants (500 g, 1 kg) with stock. */
export async function createProduct(opts: { stock?: number; price500?: number; price1kg?: number; active?: boolean } = {}) {
  const slug = `p-${randomUUID().slice(0, 8)}`;
  const cat = await pool.query("insert into public.categories (name, slug) values ($1, $1) returning id", [
    `c-${randomUUID().slice(0, 8)}`,
  ]);
  const prod = await pool.query(
    "insert into public.products (category_id, name, slug, base_unit, is_active) values ($1, $2, $3, 'kg', $4) returning id",
    [cat.rows[0].id, `Tomato ${slug}`, slug, opts.active ?? true],
  );
  const productId: string = prod.rows[0].id;
  const v = await pool.query(
    `insert into public.product_variants (product_id, label, quantity_in_base, price_paise, sort_order)
     values ($1, '500 g', 0.5, $2, 1), ($1, '1 kg', 1, $3, 2) returning id, label`,
    [productId, opts.price500 ?? 2500, opts.price1kg ?? 4500],
  );
  await pool.query("update public.inventory set stock_quantity = $1 where product_id = $2", [opts.stock ?? 10, productId]);
  const variant = (label: string) => v.rows.find((r) => r.label === label).id as string;
  return { categoryId: cat.rows[0].id as string, productId, v500: variant("500 g"), v1kg: variant("1 kg") };
}

export const contact = { name: "Asha Rao", phone: "9876543210", email: "asha@example.com" };
export const address = { line1: "12 MG Road", line2: "", landmark: "Near park", city: "Bengaluru", state: "Karnataka", pincode: "560001" };

export async function placeOrder(
  c: pg.PoolClient,
  items: { variant_id: string; quantity: number }[],
  overrides: { key?: string; contact?: object; address?: object; method?: string } = {},
) {
  const { rows } = await c.query("select public.place_order($1, $2, $3, $4, $5, $6) as id", [
    JSON.stringify(items),
    JSON.stringify(overrides.contact ?? contact),
    JSON.stringify(overrides.address ?? address),
    overrides.method ?? "cod",
    "Ring the bell",
    overrides.key ?? randomUUID(),
  ]);
  return rows[0].id as string;
}

export async function stockOf(productId: string) {
  const { rows } = await pool.query("select stock_quantity::float as s from public.inventory where product_id = $1", [productId]);
  return rows[0].s as number;
}
