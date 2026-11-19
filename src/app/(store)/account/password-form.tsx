"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/modules/auth/actions";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <Input
        label="Current password"
        name="current"
        type="password"
        autoComplete="current-password"
        required
        errors={fe?.current}
        wrapperClassName="sm:col-span-2"
      />
      <Input
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={8}
        required
        errors={fe?.password}
      />
      <Input label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required errors={fe?.confirm} />
      <div className="space-y-3 sm:col-span-2">
        <FormMessage state={state} />
        <SubmitButton variant="outline" pendingText="Updating…">
          Change password
        </SubmitButton>
      </div>
    </form>
  );
}
