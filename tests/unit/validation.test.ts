import { describe, expect, it } from "vitest";
import { SignupInput, indianPhone } from "@/modules/auth/schema";
import { CheckoutInput, CHECKOUT_FIELDS } from "@/modules/checkout/schema";
import { CartLines } from "@/modules/cart/schema";
import { parseForm } from "@/lib/form";
import { safeNextPath, slugify, formatQty } from "@/lib/utils";
import { formatINR, rupeesToPaise } from "@/lib/money";
import { nextStatus, isOpen } from "@/modules/orders/status";
import { deliveryFeeFor } from "@/modules/settings/types";

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  Object.entries(o).forEach(([k, v]) => f.set(k, v));
  return f;
};

describe("phone numbers", () => {
  it.each(["9876543210", "+91 98765 43210", "098765-43210", "919876543210"])("accepts %s", (p) =>
    expect(indianPhone.parse(p)).toBe("9876543210"),
  );
  it.each(["12345", "5876543210", "98765432101", "abcdefghij"])("rejects %s", (p) => expect(indianPhone.safeParse(p).success).toBe(false));
});

describe("signup validation", () => {
  const good = { fullName: "Asha Rao", email: "ASHA@Example.com ", phone: "9876543210", password: "long-enough", acceptTerms: "on" };
  it("normalises email", () => expect(SignupInput.parse(good).email).toBe("asha@example.com"));
  it("requires accepting the terms", () => expect(SignupInput.safeParse({ ...good, acceptTerms: undefined }).success).toBe(false));
  it("rejects short passwords", () => expect(SignupInput.safeParse({ ...good, password: "short" }).success).toBe(false));
  it("ignores fields that aren't on the allow-list (mass assignment)", () => {
    const r = parseForm(SignupInput, fd({ ...good, role: "admin" }), ["fullName", "email", "phone", "password", "acceptTerms"]);
    expect(r.success).toBe(true);
    expect(r.success && "role" in r.data).toBe(false);
  });
});

describe("checkout validation", () => {
  const base = {
    name: "Asha",
    phone: "9876543210",
    email: "",
    line1: "12 MG Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    instructions: "",
    paymentMethod: "cod",
    idempotencyKey: "6f1c1c64-2f43-4a51-9f0e-6c86c2d7f6a1",
    items: "[]",
  };
  it("accepts a valid checkout", () => expect(parseForm(CheckoutInput, fd(base), CHECKOUT_FIELDS).success).toBe(true));
  it("rejects bad pincode with a field error", () => {
    const r = parseForm(CheckoutInput, fd({ ...base, pincode: "0123" }), CHECKOUT_FIELDS);
    expect(r.success).toBe(false);
    expect(!r.success && r.fieldErrors.pincode?.[0]).toMatch(/pincode/);
  });
  it("rejects unknown payment methods", () =>
    expect(parseForm(CheckoutInput, fd({ ...base, paymentMethod: "free" }), CHECKOUT_FIELDS).success).toBe(false));
  it("cart lines: integers 1..50, uuids, max 50 lines", () => {
    const id = "6f1c1c64-2f43-4a51-9f0e-6c86c2d7f6a1";
    expect(CartLines.safeParse([{ variantId: id, quantity: 2 }]).success).toBe(true);
    expect(CartLines.safeParse([{ variantId: id, quantity: 0 }]).success).toBe(false);
    expect(CartLines.safeParse([{ variantId: id, quantity: 1.5 }]).success).toBe(false);
    expect(CartLines.safeParse([{ variantId: "x", quantity: 1 }]).success).toBe(false);
    expect(CartLines.safeParse([{ variantId: id, quantity: 1, price: 1 }]).success).toBe(false);
    expect(CartLines.safeParse(Array.from({ length: 51 }, () => ({ variantId: id, quantity: 1 }))).success).toBe(false);
  });
});

describe("open-redirect protection", () => {
  it.each([
    ["/checkout", "/checkout"],
    ["//evil.com", "/"],
    ["https://evil.com", "/"],
    ["/\\evil.com", "/"],
    [undefined, "/"],
  ])("%s -> %s", (input, out) => expect(safeNextPath(input)).toBe(out));
});

describe("helpers", () => {
  it("money is integer paise", () => {
    expect(rupeesToPaise(45.5)).toBe(4550);
    expect(rupeesToPaise(0.1 + 0.2)).toBe(30);
    expect(formatINR(49900)).toBe("₹499");
  });
  it("slugify", () => expect(slugify("Lady Finger (Bhindi)")).toBe("lady-finger-bhindi"));
  it("formatQty trims zeros", () => expect([formatQty("1.500"), formatQty(2)]).toEqual(["1.5", "2"]));
  it("order lifecycle", () => {
    expect(nextStatus("new")).toBe("confirmed");
    expect(nextStatus("out_for_delivery")).toBe("delivered");
    expect(nextStatus("delivered")).toBeNull();
    expect(nextStatus("cancelled")).toBeNull();
    expect(isOpen("preparing")).toBe(true);
  });
  it("delivery fee rule", () => {
    const s = { deliveryFeePaise: 3000, freeDeliveryMinPaise: 49900 };
    expect(deliveryFeeFor(10000, s)).toBe(3000);
    expect(deliveryFeeFor(49900, s)).toBe(0);
    expect(deliveryFeeFor(0, s)).toBe(0);
  });
});
