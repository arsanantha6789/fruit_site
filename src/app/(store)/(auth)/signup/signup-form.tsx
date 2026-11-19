"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { signupAction } from "@/modules/auth/actions";
import { Checkbox, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function SignupForm() {
  const [state, action] = useActionState(signupAction, null);
  if (state?.ok) {
    return (
      <div className="text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary-soft text-primary">
          <MailCheck className="size-7" aria-hidden="true" />
        </div>
        <p className="mt-4 font-semibold">Check your inbox</p>
        <p className="mt-1 text-sm text-muted-strong">{state.message}</p>
        <p className="mt-4 text-xs text-muted-strong">
          Didn&apos;t get it? Check spam, or wait a minute and sign up again with the same email.
        </p>
      </div>
    );
  }
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Input label="Full name" name="fullName" autoComplete="name" required errors={fe?.fullName} />
      <Input label="Email" name="email" type="email" autoComplete="email" required errors={fe?.email} />
      <Input
        label="Mobile number"
        name="phone"
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        required
        errors={fe?.phone}
        hint="10-digit number, used only for delivery updates"
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        errors={fe?.password}
        hint="At least 8 characters"
      />
      <Checkbox
        name="acceptTerms"
        required
        label={
          <>
            I agree to the{" "}
            <Link href="/terms" className="text-primary underline" target="_blank">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary underline" target="_blank">
              Privacy Policy
            </Link>
          </>
        }
      />
      {fe?.acceptTerms && <p className="text-xs font-medium text-danger">{fe.acceptTerms[0]}</p>}
      {state && !state.ok && <Alert tone="error">{state.error}</Alert>}
      <SubmitButton className="w-full" size="lg" pendingText="Creating account…">
        Create account
      </SubmitButton>
    </form>
  );
}
