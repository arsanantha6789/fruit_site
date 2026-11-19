"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/modules/auth/actions";
import { Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormMessage } from "@/components/ui/form-message";

export function LoginForm({ next }: { next: string }) {
  const [state, action] = useActionState(loginAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Input label="Email" name="email" type="email" autoComplete="email" required errors={fe?.email} />
      <Input label="Password" name="password" type="password" autoComplete="current-password" required errors={fe?.password} />
      <div className="text-right">
        <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:text-forest">
          Forgot password?
        </Link>
      </div>
      <FormMessage state={state} />
      <SubmitButton className="w-full" size="lg" pendingText="Logging in…">
        Log in
      </SubmitButton>
    </form>
  );
}
