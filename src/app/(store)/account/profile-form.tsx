"use client";

import { useActionState } from "react";
import { updateProfileAction } from "@/modules/customers/actions";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string }) {
  const [state, action] = useActionState(updateProfileAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Input label="Full name" name="fullName" defaultValue={fullName} autoComplete="name" required errors={fe?.fullName} />
      <Input
        label="Mobile number"
        name="phone"
        type="tel"
        inputMode="numeric"
        defaultValue={phone}
        autoComplete="tel-national"
        required
        errors={fe?.phone}
      />
      <div className="space-y-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
      </div>
    </form>
  );
}
