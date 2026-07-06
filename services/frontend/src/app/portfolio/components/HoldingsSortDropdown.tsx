"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { cn } from "@/shared/utils/cn";

export type HoldingsSortType = "holdingQuantityDesc" | "returnRateDesc";

type HoldingsSortDropdownOption = {
  id: HoldingsSortType;
  label: string;
};

type Props = {
  value: HoldingsSortType;
  options: HoldingsSortDropdownOption[];
  onChange: (value: HoldingsSortType) => void;
};

export default function HoldingsSortDropdown({ value, options, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((option) => option.id === value) ?? options[0];

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label="현재 보유 종목 정렬"
          className={cn(
            "flex min-w-[200px] items-center justify-between gap-3 rounded-xl border border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-primary)] px-4 py-3 text-left text-sm font-semibold text-[color:var(--color-text-primary)] transition-colors",
            "hover:border-[color:var(--color-border-base)] hover:bg-[color:var(--color-bg-secondary)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-base)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg-primary)]",
          )}
        >
          <span className="truncate">{selectedOption.label}</span>
          <span className="flex h-4 w-4 items-center justify-center text-[color:var(--color-text-tertiary)]">
            <span
              className={cn(
                "relative block h-3 w-3 transition-transform duration-200 ease-out",
                open ? "rotate-180" : "rotate-0",
              )}
            >
              <span className="absolute left-0 top-[5px] h-[1.5px] w-[7px] origin-right rotate-45 rounded-full bg-current transition-transform duration-200 ease-out" />
              <span className="absolute right-0 top-[5px] h-[1.5px] w-[7px] origin-left -rotate-45 rounded-full bg-current transition-transform duration-200 ease-out" />
            </span>
          </span>
        </button>
      </PopoverPrimitive.Trigger>

      <AnimatePresence>
        {open ? (
          <PopoverPrimitive.Portal forceMount>
            <PopoverPrimitive.Content asChild align="end" sideOffset={6}>
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="z-50 min-w-[200px] overflow-hidden rounded-2xl border border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-primary)] p-1"
              >
                {options.map((option) => {
                  const selected = option.id === value;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        onChange(option.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors",
                        selected
                          ? "bg-[color:var(--color-bg-secondary)] text-[color:var(--color-text-primary)]"
                          : "text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-bg-secondary)] hover:text-[color:var(--color-text-primary)]",
                      )}
                    >
                      <span className="truncate">{option.label}</span>
                    </button>
                  );
                })}
              </motion.div>
            </PopoverPrimitive.Content>
          </PopoverPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </PopoverPrimitive.Root>
  );
}
