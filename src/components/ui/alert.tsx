import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const styles = {
  error: { box: "bg-danger-soft text-danger border-danger/15", Icon: AlertCircle },
  success: { box: "bg-primary-soft text-forest border-primary/15", Icon: CheckCircle2 },
  info: { box: "bg-beige text-forest border-beige-deep", Icon: Info },
};

export function Alert({ tone = "info", children, className }: { tone?: keyof typeof styles; children: ReactNode; className?: string }) {
  const { box, Icon } = styles[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-[var(--radius-control)] border px-4 py-3 text-sm font-medium", box, className)}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
