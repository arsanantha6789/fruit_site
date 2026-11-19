"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Button } from "./button";

/** Disables itself while the surrounding form submits (prevents double submits). */
export function SubmitButton({ children, pendingText, ...rest }: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending} {...rest}>
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
