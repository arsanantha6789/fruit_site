import { beforeEach, describe, expect, it, vi } from "vitest";

// Server-only modules are mocked so actions can run in Node.
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), notFound: vi.fn() }));
const rpc = vi.fn(async () => ({ data: null, error: null }));
const from = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc, from }) }));
vi.mock("@/modules/notifications/service", () => ({ notifyCustomerStatus: vi.fn(), notifyNewOrder: vi.fn() }));

let currentUser: { id: string; role: "customer" | "owner" | "admin"; email: string; fullName: string; phone: null } | null = null;
vi.mock("@/modules/auth/session", () => ({
  getCurrentUser: async () => currentUser,
  staffOrNull: async () => (currentUser && currentUser.role !== "customer" ? currentUser : null),
  adminOrNull: async () => (currentUser?.role === "admin" ? currentUser : null),
}));

const { updateOrderStatusAction, setPaymentStatusAction } = await import("@/modules/orders/actions");
const { updateInventoryAction, setVariantPriceAction } = await import("@/modules/inventory/actions");
const { deleteProductAction, saveProductAction } = await import("@/modules/catalog/actions");
const { deleteCategoryAction } = await import("@/modules/categories/actions");
const { placeOrderAction } = await import("@/modules/checkout/actions");

const as = (role: "customer" | "owner" | "admin" | null) => {
  currentUser = role ? { id: "u1", role, email: "x@y.z", fullName: "X", phone: null } : null;
};
const ORDER = "6f1c1c64-2f43-4a51-9f0e-6c86c2d7f6a1";

beforeEach(() => {
  rpc.mockClear();
  from.mockClear();
});

describe("owner/admin actions reject everyone else", () => {
  it.each([null, "customer"] as const)("order status: %s is refused before touching the database", async (role) => {
    as(role);
    const r = await updateOrderStatusAction({ orderId: ORDER, status: "confirmed" });
    expect(r.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([null, "customer"] as const)("payment + stock + price: %s refused", async (role) => {
    as(role);
    expect((await setPaymentStatusAction({ orderId: ORDER, status: "paid" })).ok).toBe(false);
    expect((await updateInventoryAction({ productId: ORDER, stock: 5 })).ok).toBe(false);
    expect((await setVariantPriceAction({ variantId: ORDER, pricePaise: 100 })).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("owner cannot use admin-only catalogue actions", async () => {
    as("owner");
    expect((await deleteProductAction(ORDER)).ok).toBe(false);
    expect((await deleteCategoryAction(ORDER)).ok).toBe(false);
    expect((await saveProductAction(null, new FormData())).ok).toBe(false);
    expect(from).not.toHaveBeenCalled();
  });
  it("anonymous visitors cannot place orders", async () => {
    as(null);
    expect((await placeOrderAction(null, new FormData())).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("staff actions validate input", () => {
  it("rejects unknown statuses and malformed ids", async () => {
    as("owner");
    expect((await updateOrderStatusAction({ orderId: "not-a-uuid", status: "confirmed" })).ok).toBe(false);
    expect((await updateOrderStatusAction({ orderId: ORDER, status: "shipped" as never })).ok).toBe(false);
    expect((await updateOrderStatusAction({ orderId: ORDER, status: "confirmed", extra: 1 } as never)).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("requires a reason to cancel", async () => {
    as("owner");
    const r = await updateOrderStatusAction({ orderId: ORDER, status: "cancelled" });
    expect(r.ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("rejects negative stock", async () => {
    as("owner");
    expect((await updateInventoryAction({ productId: ORDER, stock: -1 })).ok).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("valid owner status change calls the database function", async () => {
    as("owner");
    const r = await updateOrderStatusAction({ orderId: ORDER, status: "confirmed" });
    expect(r.ok).toBe(true);
    expect(rpc).toHaveBeenCalledWith("update_order_status", { p_order_id: ORDER, p_status: "confirmed", p_note: null });
  });
  it("database errors become friendly messages without internals", async () => {
    as("owner");
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'relation "secret_table" does not exist', code: "42P01" } } as never);
    const r = await updateOrderStatusAction({ orderId: ORDER, status: "confirmed" });
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/Something went wrong/);
    expect(!r.ok && r.error).not.toMatch(/secret_table/);
  });
});
