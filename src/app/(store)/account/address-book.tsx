"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import type { Address } from "@/modules/customers/repo";
import { deleteAddressAction, saveAddressAction } from "@/modules/customers/actions";
import { Checkbox, Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";

export function AddressBook({ addresses }: { addresses: Address[] }) {
  const [editing, setEditing] = useState<Address | "new" | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();

  return (
    <div className="space-y-3">
      {addresses.length === 0 && !editing && (
        <p className="text-sm text-muted-strong">No saved addresses yet. Add one to check out faster.</p>
      )}
      {addresses.map((a) =>
        editing !== "new" && editing?.id === a.id ? (
          <AddressForm key={a.id} address={a} onDone={() => setEditing(null)} />
        ) : (
          <div key={a.id} className="flex items-start gap-3 rounded-xl border border-line p-4">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="flex items-center gap-2 font-bold">
                {a.label} {a.isDefault && <Badge tone="brand">Default</Badge>}
              </p>
              <p className="mt-1 text-muted-strong">
                {a.fullName} · {a.phone}
              </p>
              <p className="text-muted-strong">
                {[a.line1, a.line2, a.landmark].filter(Boolean).join(", ")}, {a.city}, {a.state} {a.pincode}
              </p>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                className="rounded-full p-2 text-muted-strong hover:bg-primary-soft hover:text-forest"
                onClick={() => setEditing(a)}
                aria-label={`Edit ${a.label} address`}
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                className="rounded-full p-2 text-muted-strong hover:bg-danger-soft hover:text-danger"
                onClick={() => setDeleting(a)}
                aria-label={`Delete ${a.label} address`}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ),
      )}
      {editing === "new" ? (
        <AddressForm onDone={() => setEditing(null)} />
      ) : (
        addresses.length < 10 && (
          <Button variant="outline" size="sm" icon={<Plus className="size-4" />} onClick={() => setEditing("new")}>
            Add address
          </Button>
        )
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove this address?"
        description={deleting ? `${deleting.label}: ${deleting.line1}, ${deleting.city}` : undefined}
        confirmLabel="Remove"
        tone="danger"
        loading={pending}
        onCancel={() => setDeleting(null)}
        onConfirm={() =>
          start(async () => {
            const r = await deleteAddressAction(deleting!.id);
            setDeleting(null);
            toast(r.ok ? (r.message ?? "Removed") : r.error, r.ok ? "success" : "error");
          })
        }
      />
    </div>
  );
}

function AddressForm({ address, onDone }: { address?: Address; onDone: () => void }) {
  const [state, action] = useActionState(saveAddressAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const toast = useToast();
  useEffect(() => {
    if (state?.ok) {
      toast(state.message ?? "Saved");
      onDone();
    }
  }, [state, onDone, toast]);
  return (
    <form action={action} className="grid gap-4 rounded-xl border border-primary/30 bg-canvas p-4 sm:grid-cols-2" noValidate>
      {address && <input type="hidden" name="addressId" value={address.id} />}
      <Input label="Label" name="label" defaultValue={address?.label ?? "Home"} placeholder="Home, Work…" errors={fe?.label} />
      <Input label="Recipient name" name="fullName" defaultValue={address?.fullName} autoComplete="name" required errors={fe?.fullName} />
      <Input label="Mobile number" name="phone" type="tel" inputMode="numeric" defaultValue={address?.phone} required errors={fe?.phone} />
      <Input
        label="Pincode"
        name="pincode"
        inputMode="numeric"
        maxLength={6}
        defaultValue={address?.pincode}
        required
        errors={fe?.pincode}
      />
      <Input
        label="House / flat, street"
        name="line1"
        defaultValue={address?.line1}
        required
        errors={fe?.line1}
        wrapperClassName="sm:col-span-2"
      />
      <Input label="Area / locality" name="line2" defaultValue={address?.line2} optional errors={fe?.line2} />
      <Input label="Landmark" name="landmark" defaultValue={address?.landmark} optional errors={fe?.landmark} />
      <Input label="City" name="city" defaultValue={address?.city} required errors={fe?.city} />
      <Input label="State" name="state" defaultValue={address?.state} required errors={fe?.state} />
      <Checkbox name="isDefault" defaultChecked={address?.isDefault} label="Use as my default address" className="sm:col-span-2" />
      <div className="space-y-3 sm:col-span-2">
        <FormMessage state={state && !state.ok ? state : null} />
        <div className="flex gap-2">
          <SubmitButton size="sm" pendingText="Saving…">
            Save address
          </SubmitButton>
          <Button variant="ghost" size="sm" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
