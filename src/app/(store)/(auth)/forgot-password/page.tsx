"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction } from "@/modules/auth/actions";
import { AuthCard } from "@/components/auth/auth-card";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(forgotPasswordAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we'll send you a secure link."
      footer={
        <Link href="/login" className="font-semibold text-primary hover:text-forest">
          Back to log in
        </Link>
      }
    >
      <form action={action} className="space-y-4" noValidate>
        <Input label="Email" name="email" type="email" autoComplete="email" required errors={fe?.email} />
        <FormMessage state={state} />
        {!state?.ok && (
          <SubmitButton className="w-full" size="lg" pendingText="Sending…">
            Send reset link
          </SubmitButton>
        )}
      </form>
    </AuthCard>
  );
}
