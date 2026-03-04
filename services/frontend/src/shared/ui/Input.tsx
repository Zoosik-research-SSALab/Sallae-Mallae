import type { InputHTMLAttributes } from "react";
import { cn } from "@/shared/utils/cn";

type Props = InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className, ...props }: Props) {
  return (
    <input
      className={cn(
        "w-full rounded-[10px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm text-[color:var(--color-text)] transition-colors placeholder:text-[color:var(--color-muted)] focus-visible:border-[color:var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-primary)]/25",
        className,
      )}
      {...props}
    />
  );
}

