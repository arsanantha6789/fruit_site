"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/modules/auth/actions";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";
import { LinkButton } from "@/components/ui/button";

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPasswordAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  if (state?.ok) {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <LinkButton href="/" className="w-full">
          Continue shopping
        </LinkButton>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <Input
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        errors={fe?.password}
        hint="At least 8 characters"
      />
      <Input label="Confirm new password" name="confirm" type="password" autoComplete="new-password" required errors={fe?.confirm} />
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg" pendingText="Saving…">
        Save new password
      </SubmitButton>
    </form>
  );
}
