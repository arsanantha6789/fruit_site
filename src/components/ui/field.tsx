"use client";

import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-[var(--radius-control)] border border-line-strong bg-surface px-3.5 text-[0.9375rem] text-ink placeholder:text-muted transition-colors focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/15 disabled:bg-canvas disabled:text-muted aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15";

interface FieldShellProps {
  label: string;
  hint?: ReactNode;
  errors?: string[];
  optional?: boolean;
  className?: string;
  children: (id: string, describedBy: string | undefined, invalid: boolean) => ReactNode;
}

/** Label + control + hint + inline error, wired up for screen readers. */
export function FieldShell({ label, hint, errors, optional, className, children }: FieldShellProps) {
  const id = useId();
  const invalid = Boolean(errors?.length);
  const describedBy = [hint ? `${id}-hint` : "", invalid ? `${id}-err` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
      </label>
      {children(id, describedBy, invalid)}
      {hint && !invalid && (
        <p id={`${id}-hint`} className="text-xs text-muted-strong">
          {hint}
        </p>
      )}
      {invalid && (
        <p id={`${id}-err`} className="text-xs font-medium text-danger" role="alert">
          {errors![0]}
        </p>
      )}
    </div>
  );
}

type InputProps = ComponentProps<"input"> & {
  label: string;
  hint?: ReactNode;
  errors?: string[];
  optional?: boolean;
  wrapperClassName?: string;
};

export function Input({ label, hint, errors, optional, wrapperClassName, className, ...rest }: InputProps) {
  return (
    <FieldShell label={label} hint={hint} errors={errors} optional={optional} className={wrapperClassName}>
      {(id, describedBy, invalid) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(control, "h-11", className)}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

type TextareaProps = ComponentProps<"textarea"> & {
  label: string;
  hint?: ReactNode;
  errors?: string[];
  optional?: boolean;
  wrapperClassName?: string;
};

export function Textarea({ label, hint, errors, optional, wrapperClassName, className, ...rest }: TextareaProps) {
  return (
    <FieldShell label={label} hint={hint} errors={errors} optional={optional} className={wrapperClassName}>
      {(id, describedBy, invalid) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(control, "min-h-24 py-2.5", className)}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

type SelectProps = ComponentProps<"select"> & { label: string; hint?: ReactNode; errors?: string[]; wrapperClassName?: string };

export function Select({ label, hint, errors, wrapperClassName, className, children, ...rest }: SelectProps) {
  return (
    <FieldShell label={label} hint={hint} errors={errors} className={wrapperClassName}>
      {(id, describedBy, invalid) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(control, "h-11 pr-8", className)}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...rest
}: ComponentProps<"input"> & { label: ReactNode; description?: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3 text-sm", className)}>
      <input type="checkbox" className="mt-0.5 size-[1.125rem] shrink-0 cursor-pointer rounded accent-primary" {...rest} />
      <span>
        <span className="font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-muted-strong">{description}</span>}
      </span>
    </label>
  );
}

export const controlClass = control;
