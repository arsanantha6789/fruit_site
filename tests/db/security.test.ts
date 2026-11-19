import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, createProduct, createUser, placeOrder, pool } from "./helpers";

const run = describe.skipIf(!process.env.TEST_DATABASE_URL);

run("row level security and permissions", () => {
  let alice: string, bob: string, owner: string, admin: string;
  let product: Awaited<ReturnType<typeof createProduct>>;
  let aliceOrder: string;

  beforeAll(async () => {
    [alice, bob, owner, admin] = await Promise.all([
      createUser("customer"),
      createUser("customer"),
      createUser("owner"),
      createUser("admin"),
    ]);
    product = await createProduct({ stock: 20 });
    aliceOrder = await as(alice, (c) => placeOrder(c, [{ variant_id: product.v1kg, quantity: 1 }]));
  });
  afterAll(() => pool.end());

  it("anonymous visitors can read the active catalogue but not hidden products", async () => {
    const hidden = await createProduct({ active: false });
    const rows = await as(
      null,
      async (c) => (await c.query("select id from public.products where id = any($1)", [[product.productId, hidden.productId]])).rows,
    );
    expect(rows.map((r) => r.id)).toEqual([product.productId]);
  });

  it("anonymous visitors cannot read orders or place orders", async () => {
    await expect(as(null, (c) => c.query("select * from public.orders"))).rejects.toThrow(/permission denied/);
    await expect(as(null, (c) => placeOrder(c, [{ variant_id: product.v500, quantity: 1 }]))).rejects.toThrow(/permission denied/);
  });

  it("IDOR: a customer cannot see or touch another customer's order", async () => {
    const seen = await as(bob, async (c) => ({
      orders: (await c.query("select id from public.orders where id = $1", [aliceOrder])).rowCount,
      items: (await c.query("select id from public.order_items where order_id = $1", [aliceOrder])).rowCount,
      history: (await c.query("select id from public.order_status_history where order_id = $1", [aliceOrder])).rowCount,
      payments: (await c.query("select id from public.payments where order_id = $1", [aliceOrder])).rowCount,
    }));
    expect(seen).toEqual({ orders: 0, items: 0, history: 0, payments: 0 });
    await expect(as(bob, (c) => c.query("select public.cancel_my_order($1, 'x')", [aliceOrder]))).rejects.toThrow("NOT_FOUND");
  });

  it("a customer sees their own order", async () => {
    const n = await as(alice, async (c) => (await c.query("select id from public.orders where id = $1", [aliceOrder])).rowCount);
    expect(n).toBe(1);
  });

  it("IDOR: addresses are private to their owner", async () => {
    const addressId = await as(
      alice,
      async (c) =>
        (
          await c.query(
            `insert into public.addresses (user_id, full_name, phone, line1, city, state, pincode)
         values ($1, 'Alice', '9876543210', 'Line 1', 'Pune', 'MH', '411001') returning id`,
            [alice],
          )
        ).rows[0].id,
    );
    const r = await as(bob, async (c) => ({
      read: (await c.query("select id from public.addresses where id = $1", [addressId])).rowCount,
      upd: (await c.query("update public.addresses set city = 'X' where id = $1", [addressId])).rowCount,
      del: (await c.query("delete from public.addresses where id = $1", [addressId])).rowCount,
    }));
    expect(r).toEqual({ read: 0, upd: 0, del: 0 });
    // and Bob cannot create an address in Alice's name
    await expect(
      as(bob, (c) =>
        c.query(
          `insert into public.addresses (user_id, full_name, phone, line1, city, state, pincode)
           values ($1, 'Mallory', '9876543210', 'L', 'Pune', 'MH', '411001')`,
          [alice],
        ),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("customers cannot change their own role, or other people's profiles", async () => {
    await expect(as(alice, (c) => c.query("update public.profiles set role = 'admin' where id = $1", [alice]))).rejects.toThrow(
      /permission denied/,
    );
    const n = await as(alice, async (c) => (await c.query("update public.profiles set full_name = 'x' where id = $1", [bob])).rowCount);
    expect(n).toBe(0);
  });

  it("customers cannot edit the catalogue, stock or order status", async () => {
    await expect(
      as(alice, (c) => c.query("update public.product_variants set price_paise = 1 where id = $1", [product.v500])),
    ).resolves.toMatchObject({ rowCount: 0 });
    await expect(as(alice, (c) => c.query("update public.inventory set stock_quantity = 999"))).rejects.toThrow(/permission denied/);
    await expect(as(alice, (c) => c.query("select public.update_inventory($1, 999)", [product.productId]))).rejects.toThrow("FORBIDDEN");
    await expect(as(alice, (c) => c.query("select public.update_order_status($1, 'delivered')", [aliceOrder]))).rejects.toThrow(
      "FORBIDDEN",
    );
    await expect(as(alice, (c) => c.query("update public.orders set total_paise = 1"))).rejects.toThrow(/permission denied/);
  });

  it("owner manages stock and orders but cannot edit the catalogue", async () => {
    await as(owner, (c) => c.query("select public.update_inventory($1, 42.5, false, 3, 'morning delivery')", [product.productId]));
    const inv = await pool.query("select stock_quantity::float s, is_available, updated_by from public.inventory where product_id = $1", [
      product.productId,
    ]);
    expect(inv.rows[0]).toMatchObject({ s: 42.5, is_available: false, updated_by: owner });
    await as(owner, (c) => c.query("select public.update_inventory($1, null, true)", [product.productId]));

    const ownerOrders = await as(owner, async (c) => (await c.query("select id from public.orders where id = $1", [aliceOrder])).rowCount);
    expect(ownerOrders).toBe(1);

    const upd = await as(
      owner,
      async (c) => (await c.query("update public.products set name = 'x' where id = $1", [product.productId])).rowCount,
    );
    expect(upd).toBe(0);
    await expect(as(owner, (c) => c.query("insert into public.categories (name, slug) values ('Owner cat', 'owner-cat')"))).rejects.toThrow(
      /row-level security/,
    );
  });

  it("owner price editing is controlled by an admin setting", async () => {
    await expect(as(owner, (c) => c.query("select public.set_variant_price($1, 3000)", [product.v500]))).rejects.toThrow("FORBIDDEN");
    await as(admin, (c) => c.query("update public.business_settings set owner_can_edit_prices = true where id = 1"));
    await as(owner, (c) => c.query("select public.set_variant_price($1, 3000)", [product.v500]));
    const { rows } = await pool.query("select price_paise from public.product_variants where id = $1", [product.v500]);
    expect(rows[0].price_paise).toBe(3000);
    await as(admin, (c) => c.query("update public.business_settings set owner_can_edit_prices = false where id = 1"));
  });

  it("owner cannot change business settings; admin can", async () => {
    const n = await as(
      owner,
      async (c) => (await c.query("update public.business_settings set delivery_fee_paise = 0 where id = 1")).rowCount,
    );
    expect(n).toBe(0);
    const m = await as(
      admin,
      async (c) => (await c.query("update public.business_settings set tagline = 'Fresh daily' where id = 1")).rowCount,
    );
    expect(m).toBe(1);
  });

  it("admin manages the catalogue", async () => {
    const id = await as(
      admin,
      async (c) => (await c.query("insert into public.categories (name, slug) values ('Exotic', 'exotic') returning id")).rows[0].id,
    );
    expect(id).toBeTruthy();
  });

  it("staff notifications are invisible to customers", async () => {
    const customerView = await as(
      alice,
      async (c) => (await c.query("select id from public.notifications where audience = 'staff'")).rowCount,
    );
    expect(customerView).toBe(0);
    const ownerView = await as(
      owner,
      async (c) => (await c.query("select id from public.notifications where audience = 'staff' and order_id = $1", [aliceOrder])).rowCount,
    );
    expect(ownerView).toBe(1);
  });

  it("rate limiter is not callable from the browser roles", async () => {
    await expect(as(alice, (c) => c.query("select public.rate_limit_hit('k', 60, 5)"))).rejects.toThrow(/permission denied/);
    await expect(as(null, (c) => c.query("select public.rate_limit_hit('k', 60, 5)"))).rejects.toThrow(/permission denied/);
    await expect(as(alice, (c) => c.query("select * from public.rate_limits"))).rejects.toThrow(/permission denied/);
  });

  it("rate limiter allows up to the max then blocks (service role)", async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const { rows } = await pool.query("select public.rate_limit_hit('test:login:1.2.3.4', 60, 3) as ok");
      results.push(rows[0].ok);
    }
    expect(results).toEqual([true, true, true, false]);
  });

  it("internal helper functions cannot be called directly", async () => {
    await expect(as(alice, (c) => c.query("select public._restock_order($1, $2)", [aliceOrder, alice]))).rejects.toThrow(
      /permission denied/,
    );
    await expect(as(alice, (c) => c.query("select public._cancel_order($1, 'x', $2, 'customer')", [aliceOrder, alice]))).rejects.toThrow(
      /permission denied/,
    );
  });
});
