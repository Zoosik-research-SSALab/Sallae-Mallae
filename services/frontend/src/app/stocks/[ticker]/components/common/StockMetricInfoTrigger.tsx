"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { FaDivide } from "react-icons/fa6";
import { cn } from "@/shared/utils/cn";
import { stockMetricInfoMap, type StockMetricInfo, type StockMetricInfoKey } from "../../utils/stockMetricInfo";

const DESKTOP_MEDIA_QUERY = "(min-width: 1280px)";

type Props = {
  metricKey: StockMetricInfoKey;
  children?: ReactNode;
  className?: string;
  variant?: "surface" | "icon";
};

function FormulaBlock({ info }: { info: StockMetricInfo }) {
  if (!info.formula) {
    return null;
  }

  return (
    <div className="w-full rounded-lg bg-[color:var(--color-bg-tertiary)] px-4 py-4">
      <div className="inline-flex items-center gap-3">
        <span className="text-lg font-extrabold leading-6 text-[color:var(--color-text-secondary)]">
          {info.formula.left}
        </span>
        <FaDivide className="h-3.5 w-3.5 text-[color:var(--color-border-interactive-secondary)]" aria-hidden />
        <span className="text-lg font-extrabold leading-6 text-[color:var(--color-text-secondary)]">
          {info.formula.right}
        </span>
      </div>
    </div>
  );
}

function MetricInfoPanel({
  info,
  showHandle = false,
  showConfirm = false,
  onConfirm,
  className,
}: {
  info: StockMetricInfo;
  showHandle?: boolean;
  showConfirm?: boolean;
  onConfirm?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-4 overflow-hidden rounded-[18px] bg-[color:var(--color-bg-primary)] px-6 py-4 shadow-[0px_8px_12px_-6px_rgba(0,0,0,0.16)]",
        className,
      )}
    >
      {showHandle ? (
        <div className="flex h-1 w-full justify-center overflow-hidden">
          <span className="h-full w-12 rounded-full bg-[color:var(--color-bg-disabled)]" />
        </div>
      ) : null}

      <div className="inline-flex items-center">
        <div className="text-2xl font-extrabold leading-7 text-[color:var(--color-text-primary)]">{info.title}</div>
      </div>

      <div className="flex w-full flex-col gap-6">
        <FormulaBlock info={info} />

        <div className="w-full">
          <div className="text-sm font-medium leading-5 whitespace-pre-line text-[color:var(--color-text-primary)]">
            {info.description}
          </div>
        </div>

        {showConfirm ? (
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex w-full cursor-pointer items-center justify-center rounded-lg bg-[color:var(--color-bg-interactive-primary)] px-4 py-2 text-sm font-semibold text-[color:var(--color-text-interactive-inverse)] transition-opacity hover:opacity-90"
          >
            확인
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function StockMetricInfoTrigger({
  metricKey,
  children,
  className,
  variant = "surface",
}: Props) {
  const info = stockMetricInfoMap[metricKey];
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isSheetOpen) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    const mediaQuery = window.matchMedia(DESKTOP_MEDIA_QUERY);
    const isDesktop = mediaQuery.matches;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSheetOpen(false);
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsSheetOpen(false);
      }
    };

    const handleMediaChange = () => {
      setIsSheetOpen(false);
    };

    if (!isDesktop) {
      document.body.style.overflow = "hidden";
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    mediaQuery.addEventListener("change", handleMediaChange);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      mediaQuery.removeEventListener("change", handleMediaChange);
    };
  }, [isSheetOpen]);

  const isDesktop = typeof window !== "undefined" && window.matchMedia(DESKTOP_MEDIA_QUERY).matches;

  if (variant === "icon") {
    return (
      <div ref={containerRef} className="group relative inline-flex items-center">
        <button
          type="button"
          aria-label={`${info.title} 설명 보기`}
          className={cn(
            "inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-[color:var(--color-border-interactive-secondary)] text-[11px] font-bold leading-none text-[color:var(--color-text-secondary)] transition-colors hover:bg-[color:var(--color-bg-tertiary)] hover:text-[color:var(--color-text-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-interactive-primary)]",
            className,
          )}
        >
          ?
        </button>

        <div className="pointer-events-none absolute left-1/2 top-full z-30 hidden w-[320px] max-w-[calc(100vw-4rem)] -translate-x-1/2 pt-3 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 xl:block">
          <MetricInfoPanel info={info} className="px-4 py-4" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setIsSheetOpen((prev) => !prev)}
          aria-label={`${info.title} 설명 보기`}
          className={cn(
            "w-full cursor-pointer text-left transition-colors",
            className,
          )}
        >
          {children ?? null}
        </button>

        {isSheetOpen && isDesktop ? (
          <div className="absolute left-1/2 top-full z-30 w-[320px] max-w-[calc(100vw-4rem)] -translate-x-1/2 pt-3">
            <MetricInfoPanel info={info} className="px-4 py-4" />
          </div>
        ) : null}
      </div>

      {isSheetOpen && !isDesktop ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 px-3 py-6 xl:hidden animate-[stock-detail-fade-in_180ms_ease-out]"
          onClick={() => setIsSheetOpen(false)}
        >
          <div
            className="w-full max-w-96 animate-[stock-detail-sheet-up_220ms_ease-out]"
            onClick={(event) => event.stopPropagation()}
          >
            <MetricInfoPanel info={info} showHandle showConfirm onConfirm={() => setIsSheetOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
