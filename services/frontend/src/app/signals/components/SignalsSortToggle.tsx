"use client";

import { cn } from "@/shared/utils/cn";
import type { SignalQuerySort } from "../types/signals";

type SortOption = {
  value: SignalQuerySort;
  label: string;
};

const sortOptions: SortOption[] = [
  { value: "LATEST", label: "시총순" },
  { value: "UP", label: "등락률순" },
  { value: "DOWN", label: "신뢰도순" },
];

type Props = {
  value: SignalQuerySort;
  onChange: (value: SignalQuerySort) => void;
  compact?: boolean;
};

export default function SignalsSortToggle({ value, onChange, compact = false }: Props) {
  return (
    <div className="inline-flex items-start rounded-xl bg-[color:var(--color-bg-tertiary)] p-1">
      {sortOptions.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-xl px-4 py-1.5 transition-colors",
              compact ? "typo-body-xs font-semibold" : "typo-body-sm font-semibold",
              isActive
                ? "bg-[color:var(--color-bg-primary)] text-[color:var(--color-text-primary)] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.16)]"
                : "text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
