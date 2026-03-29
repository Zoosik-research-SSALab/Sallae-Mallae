"use client";

import type { ReactNode } from "react";
import { cn } from "@/shared/utils/cn";

type Props = {
  active: boolean;
  children: ReactNode;
  className?: string;
  message?: string;
};

export default function StockSectionLoadingOverlay({
  active,
  children,
  className,
  message = "데이터를 불러오는 중입니다",
}: Props) {
  return (
    <div className={cn("relative", className)}>
      <div className={cn(active && "pointer-events-none blur-[3px] saturate-50")}>{children}</div>

      {active ? (
        <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-[color:var(--color-bg-primary)]/35 backdrop-blur-[2px]">
          <div className="rounded-full bg-[color:var(--color-bg-primary)] px-4 py-2 text-sm font-semibold text-[color:var(--color-text-primary)] shadow-[0px_8px_20px_-10px_rgba(0,0,0,0.24)]">
            {message}
          </div>
        </div>
      ) : null}
    </div>
  );
}
