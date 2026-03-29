import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/utils/cn";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  enabled: boolean;
  onToggle: () => void;
};

export default function ToggleSwitch({
  enabled,
  onToggle,
  type = "button",
  className,
  ...props
}: Props) {
  return (
    <button
      type={type}
      onClick={onToggle}
      aria-pressed={enabled}
      className={cn(
        "relative inline-flex h-7 w-12 cursor-pointer items-center rounded-full transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60",
        enabled
          ? "bg-[color:var(--color-bg-interactive-primary)]"
          : "bg-[color:var(--color-border-primary)]",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-300",
          enabled ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}
