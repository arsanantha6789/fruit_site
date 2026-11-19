"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { placeOrderAction } from "@/modules/checkout/actions";
import { useCartQuote } from "@/modules/cart/use-quote";
import type { Address } from "@/modules/customers/repo";
import { PAYMENT_METHOD_HINT, PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/modules/payments/methods";
import { Input, Textarea, Checkbox } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { LinkButton } from "@/components/ui/button";
import { OrderTotals } from "@/components/store/order-totals";
import { formatINR } from "@/lib/money";
import { cn } from "@/lib/utils";

interface Props {
  user: { name: string; phone: string; email: string };
  addresses: Address[];
  methods: PaymentMethod[];
  serviceablePincodes: string[];
}

const blank = { line1: "", line2: "", landmark: "", city: "", state: "", pincode: "" };

export function CheckoutForm({ user, addresses, methods, serviceablePincodes }: Props) {
  const router = useRouter();
  const { cart, result, loading } = useCartQuote();
  const [state, formAction] = useActionState(placeOrderAction, null);
  // One key per checkout visit: retries/double-clicks can never create two orders.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const initial = addresses.find((a) => a.isDefault) ?? addresses[0];
  const [selected, setSelected] = useState<string>(initial?.id ?? "new");
  const chosen = addresses.find((a) => a.id === selected);
  const [form, setForm] = useState(() => ({
    name: initial?.fullName ?? user.name,
    phone: initial?.phone ?? user.phone,
    ...(initial
      ? {
          line1: initial.line1,
          line2: initial.line2,
          landmark: initial.landmark,
          city: initial.city,
          state: initial.state,
          pincode: initial.pincode,
        }
      : blank),
  }));
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const pick = (id: string) => {
    setSelected(id);
    const a = addresses.find((x) => x.id === id);
    setForm((f) =>
      a
        ? {
            name: a.fullName,
            phone: a.phone,
            line1: a.line1,
            line2: a.line2,
            landmark: a.landmark,
            city: a.city,
            state: a.state,
            pincode: a.pincode,
          }
        : { ...f, ...blank },
    );
  };

  const done = useRef(false);
  const { clear } = cart;
  useEffect(() => {
    if (state?.ok && !done.current) {
      done.current = true;
      clear();
      (window as unknown as { plausible?: (e: string) => void }).plausible?.("Order placed");
      router.replace(`/orders/${state.data.orderId}?placed=1`);
    }
  }, [state, clear, router]);

  if (cart.ready && cart.lines.length === 0 && !state?.ok) {
    return (
      <div className="mt-8">
        <Alert tone="info">Your cart is empty.</Alert>
        <LinkButton href="/shop" className="mt-4">
          Go shopping
        </LinkButton>
      </div>
    );
  }

  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const q = result?.ok ? result.data : null;
  const blocked = !q || q.lines.some((l) => !l.available) || !q.acceptingOrders;
  const pinWarning = serviceablePincodes.length > 0 && /^\d{6}$/.test(form.pincode) && !serviceablePincodes.includes(form.pincode);

  return (
    <form action={formAction} className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_24rem]" noValidate>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="items" value={JSON.stringify(cart.lines)} />

      <div className="space-y-6">
        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6" aria-labelledby="addr-h">
          <h2 id="addr-h" className="text-lg font-bold">
            Delivery address
          </h2>
          {addresses.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Saved addresses">
              {addresses.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={selected === a.id}
                  onClick={() => pick(a.id)}
                  className={cn(
                    "rounded-xl border p-3.5 text-left text-sm transition-colors",
                    selected === a.id ? "border-primary bg-primary-soft" : "border-line hover:border-primary/50",
                  )}
                >
                  <span className="font-bold">{a.label}</span>
                  <span className="mt-1 block text-muted-strong">
                    {a.line1}, {a.city} {a.pincode}
                  </span>
                </button>
              ))}
              <button
                type="button"
                role="radio"
                aria-checked={selected === "new"}
                onClick={() => pick("new")}
                className={cn(
                  "rounded-xl border border-dashed p-3.5 text-left text-sm font-semibold",
                  selected === "new"
                    ? "border-primary bg-primary-soft text-forest"
                    : "border-line-strong text-muted-strong hover:border-primary/50",
                )}
              >
                + Use a new address
              </button>
            </div>
          )}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input label="Full name" name="name" autoComplete="name" required value={form.name} onChange={set("name")} errors={fe?.name} />
            <Input
              label="Mobile number"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              required
              value={form.phone}
              onChange={set("phone")}
              errors={fe?.phone}
              hint="We'll call this number if we can't find you"
            />
            <Input
              label="House / flat, street"
              name="line1"
              autoComplete="address-line1"
              required
              value={form.line1}
              onChange={set("line1")}
              errors={fe?.line1}
              wrapperClassName="sm:col-span-2"
            />
            <Input
              label="Area / locality"
              name="line2"
              autoComplete="address-line2"
              optional
              value={form.line2}
              onChange={set("line2")}
              errors={fe?.line2}
            />
            <Input label="Landmark" name="landmark" optional value={form.landmark} onChange={set("landmark")} errors={fe?.landmark} />
            <Input
              label="City"
              name="city"
              autoComplete="address-level2"
              required
              value={form.city}
              onChange={set("city")}
              errors={fe?.city}
            />
            <Input
              label="State"
              name="state"
              autoComplete="address-level1"
              required
              value={form.state}
              onChange={set("state")}
              errors={fe?.state}
            />
            <Input
              label="Pincode"
              name="pincode"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              required
              value={form.pincode}
              onChange={set("pincode")}
              errors={fe?.pincode ?? (pinWarning ? ["Sorry, we don't deliver to this pincode yet"] : undefined)}
            />
            <Input
              label="Email for order updates"
              name="email"
              type="email"
              autoComplete="email"
              optional
              defaultValue={user.email}
              errors={fe?.email}
            />
          </div>
          {!chosen && <Checkbox name="saveAddress" defaultChecked label="Save this address for next time" className="mt-5" />}
        </section>

        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6" aria-labelledby="pay-h">
          <h2 id="pay-h" className="text-lg font-bold">
            Payment
          </h2>
          <div className="mt-4 grid gap-2">
            {methods.map((m, i) => (
              <label
                key={m}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-line p-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
              >
                <input type="radio" name="paymentMethod" value={m} defaultChecked={i === 0} className="mt-1 size-4 accent-primary" />
                <span>
                  <span className="block font-semibold">{PAYMENT_METHOD_LABEL[m]}</span>
                  <span className="block text-sm text-muted-strong">{PAYMENT_METHOD_HINT[m]}</span>
                </span>
              </label>
            ))}
            {methods.length === 0 && <Alert tone="info">Payments are temporarily unavailable.</Alert>}
          </div>
          {fe?.paymentMethod && <p className="mt-2 text-sm font-medium text-danger">{fe.paymentMethod[0]}</p>}
        </section>

        <section className="rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6">
          <Textarea
            label="Delivery instructions"
            name="instructions"
            optional
            maxLength={500}
            placeholder="e.g. Ring the bell twice, leave with the security guard"
            errors={fe?.instructions}
          />
        </section>
      </div>

      <aside
        className="rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:p-6 lg:sticky lg:top-28"
        aria-label="Order summary"
      >
        <h2 className="text-lg font-bold">Your order</h2>
        {loading || !q ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-5" />
            <Skeleton className="h-5" />
            <Skeleton className="h-24" />
          </div>
        ) : (
          <>
            <ul className="mt-4 max-h-64 divide-y divide-line overflow-y-auto pr-1 text-sm">
              {q.lines.map((l) => (
                <li key={l.variantId} className="flex justify-between gap-3 py-2.5">
                  <span>
                    <span className="font-semibold">{l.productName}</span>
                    <span className="block text-muted-strong">
                      {l.variantLabel} × {l.quantity}
                    </span>
                    {!l.available && <span className="block font-medium text-danger">Not enough stock</span>}
                  </span>
                  <span className="font-semibold tabular-nums">{formatINR(l.lineTotalPaise)}</span>
                </li>
              ))}
            </ul>
            <OrderTotals
              subtotal={q.subtotalPaise}
              delivery={q.deliveryFeePaise}
              discount={0}
              total={q.totalPaise}
              className="mt-4 border-t border-line pt-4"
            />
          </>
        )}
        <div className="mt-6 space-y-3">
          {state && !state.ok && <Alert tone="error">{state.error}</Alert>}
          {q && q.lines.some((l) => !l.available) && (
            <Alert tone="error">
              Some items changed.{" "}
              <Link href="/cart" className="underline">
                Review your cart
              </Link>
              .
            </Alert>
          )}
          <SubmitButton
            size="lg"
            className="w-full"
            disabled={blocked || methods.length === 0 || pinWarning}
            pendingText="Placing your order…"
          >
            <Lock className="size-4" aria-hidden="true" /> Place order{q ? ` · ${formatINR(q.totalPaise)}` : ""}
          </SubmitButton>
          <p className="text-center text-xs text-muted-strong">
            By placing this order you agree to our{" "}
            <Link href="/terms" className="underline">
              Terms
            </Link>
            .
          </p>
        </div>
      </aside>
    </form>
  );
}
