import { cn } from "@/shared/utils/cn";
import type { StockRankingMetric } from "../types/stocks";
import { STOCK_RANKING_TABS } from "../utils/stocksFilters";

type Props = {
  value: StockRankingMetric;
  onChange: (value: StockRankingMetric) => void;
  compact?: boolean;
};

export default function StocksSortTabs({ value, onChange, compact = false }: Props) {
  return (
    <div className="inline-flex w-full items-center overflow-x-auto border-b border-[color:var(--color-border-secondary)]">
      {STOCK_RANKING_TABS.map((tab) => {
        const isActive = tab.value === value;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              "relative inline-flex shrink-0 flex-col items-center justify-center px-4",
              compact ? "py-3" : "py-4",
              isActive ? "border-b-2 border-[color:var(--color-border-base)]" : "",
            )}
          >
            <span
              className={cn(
                compact ? "typo-body-sm" : "typo-body-md",
                "font-semibold",
                isActive ? "text-[color:var(--color-text-primary)]" : "text-[color:var(--color-text-tertiary)]",
              )}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
