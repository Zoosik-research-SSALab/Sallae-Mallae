import type { HTMLAttributes } from "react";
import { cn } from "@/shared/utils/cn";

export type BadgeTone = "default" | "ok" | "warn" | "danger";

const toneClassName: Record<BadgeTone, string> = {
  default: "border-[color:var(--color-border)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)]",
  ok: "border-[color:rgba(34,197,94,0.35)] bg-[color:rgba(34,197,94,0.16)] text-[#86efac]",
  warn: "border-[color:rgba(245,158,11,0.35)] bg-[color:rgba(245,158,11,0.16)] text-[#fde68a]",
  danger: "border-[color:rgba(239,68,68,0.35)] bg-[color:rgba(239,68,68,0.16)] text-[#fca5a5]",
};

export function getBadgeClassName(tone: BadgeTone = "default", className?: string) {
  return cn(
    "inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-medium leading-none",
    toneClassName[tone],
    className,
  );
}

type Props = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export default function Badge({ tone = "default", className, ...props }: Props) {
  return <span className={getBadgeClassName(tone, className)} {...props} />;
}

