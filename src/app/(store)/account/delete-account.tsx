"use client";

import { useActionState, useState } from "react";
import { deleteAccountAction } from "@/modules/auth/actions";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Alert } from "@/components/ui/alert";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(deleteAccountAction, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  if (!open) {
    return (
      <div className="space-y-3 text-sm text-muted-strong">
        <p>
          Your profile, saved addresses and login are deleted. Past orders are kept for the shop&apos;s records with your name, phone and
          address removed.
        </p>
        <Button
          variant="outline"
          className="border-danger/30 text-danger hover:border-danger hover:text-danger"
          onClick={() => setOpen(true)}
        >
          Delete my account
        </Button>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-4" noValidate>
      <Alert tone="error">This is permanent and cannot be undone.</Alert>
      <Input label="Your password" name="password" type="password" autoComplete="current-password" required errors={fe?.password} />
      <Input label='Type "DELETE" to confirm' name="confirmText" autoComplete="off" required errors={fe?.confirmText} />
      {state && !state.ok && !fe && <Alert tone="error">{state.error}</Alert>}
      {state && !state.ok && fe && <p className="text-sm font-medium text-danger">{state.error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setOpen(false)}>
          Keep my account
        </Button>
        <SubmitButton variant="danger" pendingText="Deleting…">
          Permanently delete
        </SubmitButton>
      </div>
    </form>
  );
}
