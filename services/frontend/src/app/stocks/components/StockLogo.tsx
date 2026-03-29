"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { resolveStockIconUrl } from "@/shared/lib/stockIcon";
import { cn } from "@/shared/utils/cn";

type Props = {
  label: string;
  iconUrl?: string | null;
  className?: string;
  labelClassName?: string;
  sizes?: string;
};

export default function StockLogo({
  label,
  iconUrl,
  className,
  labelClassName,
  sizes = "40px",
}: Props) {
  const resolvedIconUrl = useMemo(() => resolveStockIconUrl(iconUrl), [iconUrl]);
  const [failedIconUrl, setFailedIconUrl] = useState<string | null>(null);
  const hasImageError = Boolean(resolvedIconUrl && failedIconUrl === resolvedIconUrl);

  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color:var(--color-bg-interactive-primary)] text-[10px] font-semibold text-[color:var(--color-text-base)] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]",
        className,
      )}
    >
      {resolvedIconUrl && !hasImageError ? (
        <Image
          src={resolvedIconUrl}
          alt={`${label} 로고`}
          fill
          sizes={sizes}
          unoptimized
          className="object-contain"
          onError={() => setFailedIconUrl(resolvedIconUrl)}
        />
      ) : (
        <span className={cn("relative z-[1]", labelClassName)}>{label}</span>
      )}
    </div>
  );
}
