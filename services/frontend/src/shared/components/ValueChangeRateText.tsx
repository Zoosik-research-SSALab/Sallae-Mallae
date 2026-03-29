"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/shared/utils/cn";

type Props = {
  value: number;
  className?: string;
  padding?: "default" | "x-none";
  children: ReactNode;
};

export default function ValueChangeRateText({ value, className, padding = "default", children }: Props) {
  const previousValueRef = useRef<number | null>(null);
  const [flashTone, setFlashTone] = useState<"positive" | "negative" | null>(null);
  const [flashKey, setFlashKey] = useState(0);

  useEffect(() => {
    const previousValue = previousValueRef.current;
    previousValueRef.current = value;

    if (previousValue === null || previousValue === value) {
      return;
    }

    const nextTone = value > 0 ? "positive" : value < 0 ? "negative" : null;
    const animationFrame = window.requestAnimationFrame(() => {
      setFlashTone(nextTone);

      if (nextTone !== null) {
        setFlashKey((current) => current + 1);
      }
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [value]);

  const flashStyle =
    flashTone === null
      ? undefined
      : ({
          "--flash-bg-color":
            flashTone === "positive" ? "var(--color-bg-flash-positive)" : "var(--color-bg-flash-negative)",
        } as CSSProperties);

  return (
    <span
      key={flashKey}
      style={flashStyle}
      className={cn(
        "inline-flex rounded-md py-0.5",
        padding === "default" ? "px-1.5" : "",
        flashTone ? "value-change-flash" : "",
        className,
      )}
    >
      {children}
    </span>
  );
}
