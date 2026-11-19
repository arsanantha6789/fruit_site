import { cn } from "@/lib/utils";

/** Leaf-in-basket mark + wordmark. Pure SVG so it stays crisp and prints well. */
export function Logo({ name = "Fresh Basket", className, inverted }: { name?: string; className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden="true">
        <rect width="32" height="32" rx="10" fill={inverted ? "#F3EEDC" : "#164A32"} />
        <path d="M16 7c4.6 1.2 7 4.6 6.2 9.4C17.6 16 15 13 16 7Z" fill={inverted ? "#236B45" : "#8FC79F"} />
        <path
          d="M7.5 17.5h17l-1.8 6.3a2.5 2.5 0 0 1-2.4 1.8h-8.6a2.5 2.5 0 0 1-2.4-1.8l-1.8-6.3Z"
          fill={inverted ? "#164A32" : "#F3EEDC"}
        />
      </svg>
      <span className={cn("text-[1.15rem] leading-none font-extrabold tracking-tight", inverted ? "text-white" : "text-forest")}>
        {name}
      </span>
    </span>
  );
}
