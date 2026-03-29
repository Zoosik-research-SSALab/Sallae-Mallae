import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/utils/cn";

export type ButtonVariant = "default" | "primary" | "soft";

const variantClassName: Record<ButtonVariant, string> = {
  default:
    "border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-text)] hover:bg-[color:var(--color-surface-elevated)]",
  primary:
    "border-[color:var(--color-primary)] bg-[color:var(--color-primary)] text-[color:var(--color-primary-contrast)] hover:opacity-90",
  soft: "border-[color:var(--color-border)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)] hover:bg-[color:var(--color-surface)]",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export default function Button({ className, variant = "default", type = "button", ...props }: Props) {
  return (
    <button
      type={type}
      className={cn(
        "typo-body-sm inline-flex cursor-pointer items-center justify-center rounded-[10px] border px-3.5 py-2 font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variantClassName[variant],
        className,
      )}
      {...props}
    />
  );
}

