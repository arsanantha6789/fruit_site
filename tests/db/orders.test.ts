import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { address, as, createProduct, createUser, placeOrder, pool, stockOf } from "./helpers";

const run = describe.skipIf(!process.env.TEST_DATABASE_URL);

run("order placement and lifecycle", () => {
  let alice: string, owner: string;

  beforeAll(async () => {
    owner = await createUser("owner");
    await pool.query(
      "update public.business_settings set delivery_fee_paise = 3000, free_delivery_min_paise = 49900, min_order_paise = 0, serviceable_pincodes = '{}', accepting_orders = true where id = 1",
    );
  });
  // A fresh shopper per test so the 5-orders-per-10-minutes guard never interferes.
  beforeEach(async () => {
    alice = await createUser("customer");
  });
  afterAll(() => pool.end());

  it("places an order with server-side prices, snapshots, stock decrement and history", async () => {
    const p = await createProduct({ stock: 10, price500: 2500, price1kg: 4500 });
    const id = await as(alice, (c) =>
      placeOrder(c, [
        { variant_id: p.v500, quantity: 2 },
        { variant_id: p.v1kg, quantity: 1 },
      ]),
    );
    const {
      rows: [order],
    } = await pool.query("select * from public.orders where id = $1", [id]);
    expect(order).toMatchObject({
      customer_id: alice,
      status: "new",
      subtotal_paise: 9500,
      delivery_fee_paise: 3000,
      discount_paise: 0,
      total_paise: 12500,
      payment_method: "cod",
      instructions: "Ring the bell",
    });
    expect(order.order_number).toMatch(/^FB\d+$/);
    expect(order.shipping_address).toMatchObject({ pincode: "560001", city: "Bengaluru" });
    expect(await stockOf(p.productId)).toBe(8); // 10 - (2 x 0.5 + 1 x 1)

    const items = await pool.query(
      "select variant_label, quantity, unit_price_paise, line_total_paise, unit from public.order_items where order_id = $1 order by variant_label",
      [id],
    );
    expect(items.rows).toEqual([
      { variant_label: "1 kg", quantity: 1, unit_price_paise: 4500, line_total_paise: 4500, unit: "kg" },
      { variant_label: "500 g", quantity: 2, unit_price_paise: 2500, line_total_paise: 5000, unit: "kg" },
    ]);
    const hist = await pool.query("select to_status, changed_by, changed_by_role from public.order_status_history where order_id = $1", [
      id,
    ]);
    expect(hist.rows).toEqual([{ to_status: "new", changed_by: alice, changed_by_role: "customer" }]);
    const pay = await pool.query("select method, status, amount_paise from public.payments where order_id = $1", [id]);
    expect(pay.rows).toEqual([{ method: "cod", status: "pending", amount_paise: 12500 }]);
    const mov = await pool.query("select change::float c, reason from public.inventory_movements where order_id = $1", [id]);
    expect(mov.rows).toEqual([{ c: -2, reason: "order_placed" }]);
  });

  it("keeps historical order items unchanged after catalogue edits", async () => {
    const p = await createProduct({ stock: 10, price1kg: 4500 });
    const id = await as(alice, (c) => placeOrder(c, [{ variant_id: p.v1kg, quantity: 1 }]));
    await pool.query("update public.product_variants set price_paise = 9900, label = '1 kilo' where id = $1", [p.v1kg]);
    await pool.query("update public.products set name = 'Renamed' where id = $1", [p.productId]);
    const { rows } = await pool.query("select product_name, variant_label, unit_price_paise from public.order_items where order_id = $1", [
      id,
    ]);
    expect(rows[0].product_name).toMatch(/^Tomato/);
    expect(rows[0]).toMatchObject({ variant_label: "1 kg", unit_price_paise: 4500 });
    // and deleting the product keeps the order line
    await pool.query("delete from public.products where id = $1", [p.productId]);
    const after = await pool.query("select product_id, product_name from public.order_items where order_id = $1", [id]);
    expect(after.rows[0].product_id).toBeNull();
    expect(after.rows[0].product_name).toMatch(/^Tomato/);
  });

  it("free delivery above the threshold", async () => {
    const p = await createProduct({ stock: 50, price1kg: 25000 });
    const id = await as(alice, (c) => placeOrder(c, [{ variant_id: p.v1kg, quantity: 2 }]));
    const { rows } = await pool.query("select delivery_fee_paise, total_paise from public.orders where id = $1", [id]);
    expect(rows[0]).toEqual({ delivery_fee_paise: 0, total_paise: 50000 });
  });

  it("rejects orders that exceed stock (variants share product stock)", async () => {
    const p = await createProduct({ stock: 1 });
    await expect(
      as(alice, (c) =>
        placeOrder(c, [
          { variant_id: p.v500, quantity: 1 },
          { variant_id: p.v1kg, quantity: 1 },
        ]),
      ),
    ).rejects.toThrow("OUT_OF_STOCK");
    expect(await stockOf(p.productId)).toBe(1);
  });

  it("prevents overselling under concurrent checkouts", async () => {
    const p = await createProduct({ stock: 3 });
    const buyers = await Promise.all(Array.from({ length: 6 }, () => createUser("customer")));
    const results = await Promise.allSettled(buyers.map((b) => as(b, (c) => placeOrder(c, [{ variant_id: p.v1kg, quantity: 1 }]))));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected");
    expect(ok).toBe(3);
    expect(failed).toHaveLength(3);
    for (const f of failed) expect(String((f as PromiseRejectedResult).reason)).toMatch("OUT_OF_STOCK");
    expect(await stockOf(p.productId)).toBe(0);
  });

  it("rejects unavailable products and products marked unavailable by the owner", async () => {
    const p = await createProduct({ stock: 10 });
    await as(owner, (c) => c.query("select public.update_inventory($1, null, false)", [p.productId]));
    await expect(as(alice, (c) => placeOrder(c, [{ variant_id: p.v1kg, quantity: 1 }]))).rejects.toThrow("OUT_OF_STOCK");
    await pool.query("update public.product_variants set is_active = false where id = $1", [p.v500]);
    await expect(as(alice, (c) => placeOrder(c, [{ variant_id: p.v500, quantity: 1 }]))).rejects.toThrow("PRODUCT_UNAVAILABLE");
    await expect(as(alice, (c) => placeOrder(c, [{ variant_id: randomUUID(), quantity: 1 }]))).rejects.toThrow("PRODUCT_UNAVAILABLE");
  });

  it("validates input on the server", async () => {
    const p = await createProduct({ stock: 100 });
    const bad = [
      () => as(alice, (c) => placeOrder(c, [{ variant_id: p.v1kg, quantity: 0 }])),
      () => as(alice, (c) => placeOrder(c, [{ variant_id: p.v1kg, quantity: 51 }])),
      () => as(alice, (c) => placeOrder(c, [{ variant_id: p.v1kg, quantity: 1.5 }])),
      () => as(alice, (c) => placeOrder(c, [])),
      () => as(alice, (c) => placeOrder(c, [{ variant_id: p.v1kg, quantity: 1 }], { contact: { name: "A", phone: "12345" } })),
      () => as(alice, (c) => placeOrder(c, [{ variant_id: p.v1kg, quantity: 1 }], { address: { ...address, pincode: "abc" } })),
    ];
    for (const attempt of bad) await expect(attempt()).rejects.toThrow("INVALID_INPUT");
    expect(await stockOf(p.productId)).toBe(100);
  });

  it("enforces serviceable pincodes and store closure", async () => {
    const p = await createProduct({ stock: 10 });
    await pool.query("update public.business_settings set serviceable_pincodes = '{560002}' where id = 1");
    await expect(as(alice, (c) => placeOrder(c, [{ variant_id: p.v1kg, quantity: 1 }]))).rejects.toThrow("PINCODE_NOT_SERVICEABLE");
    await pool.query("update public.business_settings set serviceable_pincodes = '{}', accepting_orders = false where id = 1");
    await expect(as(alice, (c) => placeOrder(c, [{ variant_id: p.v1kg, quantity: 1 }]))).rejects.toThrow("STORE_CLOSED");
    await pool.query("update public.business_settings set accepting_orders = true where id = 1");
  });

  it("is idempotent: a double submit creates one order", async () => {
    const p = await createProduct({ stock: 10 });
    const key = randomUUID();
    const a = await as(alice, (c) => placeOrder(c, [{ variant_id: p.v1kg, quantity: 2 }], { key }));
    const b = await as(alice, (c) => placeOrder(c, [{ variant_id: p.v1kg, quantity: 2 }], { key }));
    expect(a).toBe(b);
    expect(await stockOf(p.productId)).toBe(8);
  });

  it("limits a customer to 5 orders in 10 minutes", async () => {
    const shopper = await createUser("customer");
    const p = await createProduct({ stock: 100 });
    for (let i = 0; i < 5; i++) await as(shopper, (c) => placeOrder(c, [{ variant_id: p.v500, quantity: 1 }]));
    await expect(as(shopper, (c) => placeOrder(c, [{ variant_id: p.v500, quantity: 1 }]))).rejects.toThrow("TOO_MANY_ORDERS");
  });

  it("moves through the lifecycle forward only and records who changed it", async () => {
    const p = await createProduct({ stock: 10 });
    const id = await as(alice, (c) => placeOrder(c, [{ variant_id: p.v1kg, quantity: 1 }]));
    for (const s of ["confirmed", "preparing", "ready_for_delivery", "out_for_delivery"]) {
      await as(owner, (c) => c.query("select public.update_order_status($1, $2)", [id, s]));
    }
    await expect(as(owner, (c) => c.query("select public.update_order_status($1, 'preparing')", [id]))).rejects.toThrow(
      "INVALID_TRANSITION",
    );
    await as(owner, (c) => c.query("select public.update_order_status($1, 'delivered', 'Left with guard')", [id]));
    const { rows } = await pool.query(
      "select from_status, to_status, changed_by, changed_by_role from public.order_status_history where order_id = $1 order by created_at, to_status",
      [id],
    );
    expect(rows.map((r) => r.to_status)).toEqual(["new", "confirmed", "preparing", "ready_for_delivery", "out_for_delivery", "delivered"]);
    expect(rows.slice(1).every((r) => r.changed_by === owner && r.changed_by_role === "owner")).toBe(true);
    const o = await pool.query("select delivered_at, confirmed_at from public.orders where id = $1", [id]);
    expect(o.rows[0].delivered_at).not.toBeNull();
    await expect(as(owner, (c) => c.query("select public.update_order_status($1, 'cancelled')", [id]))).rejects.toThrow("ORDER_CLOSED");
    // the customer can follow progress
    const seen = await as(alice, async (c) => (await c.query("select status from public.orders where id = $1", [id])).rows[0].status);
    expect(seen).toBe("delivered");
  });

  it("owner cancellation restores stock exactly once", async () => {
    const p = await createProduct({ stock: 5 });
    const id = await as(alice, (c) => placeOrder(c, [{ variant_id: p.v500, quantity: 4 }]));
    expect(await stockOf(p.productId)).toBe(3);
    await as(owner, (c) => c.query("select public.update_order_status($1, 'confirmed')", [id]));
    await as(owner, (c) => c.query("select public.update_order_status($1, 'cancelled', 'Customer unreachable')", [id]));
    expect(await stockOf(p.productId)).toBe(5);
    await as(owner, (c) => c.query("select public.update_order_status($1, 'cancelled')", [id])); // no-op
    expect(await stockOf(p.productId)).toBe(5);
    const o = await pool.query("select status, cancel_reason from public.orders where id = $1", [id]);
    expect(o.rows[0]).toEqual({ status: "cancelled", cancel_reason: "Customer unreachable" });
  });

  it("customers can cancel only while the order is new", async () => {
    const p = await createProduct({ stock: 5 });
    const a = await as(alice, (c) => placeOrder(c, [{ variant_id: p.v1kg, quantity: 1 }]));
    await as(alice, (c) => c.query("select public.cancel_my_order($1, 'Changed my mind')", [a]));
    expect(await stockOf(p.productId)).toBe(5);

    const b = await as(alice, (c) => placeOrder(c, [{ variant_id: p.v1kg, quantity: 1 }]));
    await as(owner, (c) => c.query("select public.update_order_status($1, 'confirmed')", [b]));
    await expect(as(alice, (c) => c.query("select public.cancel_my_order($1)", [b]))).rejects.toThrow("CANNOT_CANCEL");
  });

  it("owner records payment status", async () => {
    const p = await createProduct({ stock: 5 });
    const id = await as(alice, (c) => placeOrder(c, [{ variant_id: p.v1kg, quantity: 1 }], { method: "upi_on_delivery" }));
    await as(owner, (c) => c.query("select public.set_payment_status($1, 'paid', 'UPI ref 1234')", [id]));
    const { rows } = await pool.query("select status, provider_reference, paid_at from public.payments where order_id = $1", [id]);
    expect(rows[0]).toMatchObject({ status: "paid", provider_reference: "UPI ref 1234" });
    expect(rows[0].paid_at).not.toBeNull();
    await expect(as(alice, (c) => c.query("select public.set_payment_status($1, 'refunded')", [id]))).rejects.toThrow("FORBIDDEN");
  });

  it("reports aggregate non-cancelled sales for staff only", async () => {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const staff = await as(
      owner,
      async (c) => (await c.query("select sum(orders)::int n from public.report_daily_sales($1::date, $1::date)", [today])).rows[0].n,
    );
    const all = await pool.query("select count(*)::int n from public.orders where status <> 'cancelled'");
    expect(staff).toBe(all.rows[0].n);
    const top = await as(
      owner,
      async (c) => (await c.query("select * from public.report_top_products($1::date, $1::date, 5)", [today])).rows,
    );
    expect(top.length).toBeGreaterThan(0);
  });
});
