"use client";

import { GoSearch } from "react-icons/go";
import { formatCategoryDisplayName, MARKET_CATEGORIES } from "@/shared/lib/marketCategories";
import { cn } from "@/shared/utils/cn";
import type { SignalMarketCapFilter, SignalQuerySort, SignalSectorName } from "../types/signals";

type Props = {
  selectedCategories: SignalSectorName[];
  marketCap: SignalMarketCapFilter;
  keyword: string;
  sort?: SignalQuerySort;
  className?: string;
  onToggleCategory: (value: SignalSectorName) => void;
  onResetCategories: () => void;
  onMarketCapChange: (value: SignalMarketCapFilter) => void;
  onKeywordChange: (value: string) => void;
  onSortChange?: (value: SignalQuerySort) => void;
  compact?: boolean;
};

type SelectionRowProps = {
  label: string;
  selected: boolean;
  onClick: () => void;
  shape: "square" | "circle";
  compact: boolean;
};

function SectionDivider() {
  return <div className="border-t border-[color:var(--color-border-primary)]" />;
}

function SelectionRow({ label, selected, onClick, shape, compact }: SelectionRowProps) {
  const indicatorClassName = shape === "square" ? "rounded-md border" : "rounded-full border";

  return (
    <button type="button" onClick={onClick} className="inline-flex w-full items-center gap-3 text-left">
      <span className="inline-flex h-5 w-8 shrink-0 items-center justify-start">
        <span
          className={cn(
            "inline-flex h-5 w-5 items-center justify-center",
            indicatorClassName,
            selected
              ? "border-[color:var(--color-border-interactive-primary)] bg-[color:var(--color-bg-interactive-primary)]"
              : "border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-secondary)]",
          )}
        >
          {selected ? (
            shape === "square" ? (
              <span className="h-2 w-2 -translate-y-px rotate-45 rounded-xs border-b-2 border-r-2 border-[color:var(--color-text-interactive-inverse)]" />
            ) : (
              <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-icon-interactive-inverse)]" />
            )
          ) : null}
        </span>
      </span>
      <span
        className={cn(
          compact ? "typo-body-xs" : "typo-body-sm",
          "font-medium",
          selected ? "text-[color:var(--color-text-primary)]" : "text-[color:var(--color-text-secondary)]",
        )}
      >
        {label}
      </span>
    </button>
  );
}

function CategoryChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "typo-body-xs rounded-lg px-3 py-1 font-semibold transition-colors",
        selected
          ? "bg-[color:var(--color-bg-interactive-primary)] text-[color:var(--color-text-base)]"
          : "bg-[color:var(--color-bg-interactive-secondary-hovered)] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]",
      )}
    >
      {label}
    </button>
  );
}

export default function SignalsFilterPanel({
  selectedCategories,
  marketCap,
  keyword,
  sort,
  onToggleCategory,
  onResetCategories,
  onMarketCapChange,
  onKeywordChange,
  onSortChange,
  compact = false,
  className,
}: Props) {
  const sectionTitleClassName = compact ? "typo-body-md font-extrabold" : "typo-heading-sm";
  const searchTextClassName = compact ? "typo-body-xs" : "typo-body-sm";

  return (
    <div
      className={cn(
        "w-full rounded-2xl bg-[color:var(--color-bg-secondary)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]",
        compact ? "p-6 shadow-[0px_2px_4px_0px_rgba(0,0,0,0.12)]" : "p-8 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.12)]",
        className,
      )}
    >
      <div className="flex flex-col gap-8">
        {compact && sort && onSortChange ? (
          <>
            <div className="flex flex-col gap-3">
              <h2 className={cn(sectionTitleClassName, "text-[color:var(--color-text-primary)]")}>정렬 기준</h2>
              <div className="flex flex-col gap-2">
                <SelectionRow label="시총순" selected={sort === "LATEST"} onClick={() => onSortChange("LATEST")} shape="circle" compact={compact} />
                <SelectionRow label="등락률순" selected={sort === "UP"} onClick={() => onSortChange("UP")} shape="circle" compact={compact} />
                <SelectionRow label="신뢰도순" selected={sort === "DOWN"} onClick={() => onSortChange("DOWN")} shape="circle" compact={compact} />
              </div>
            </div>
            <SectionDivider />
          </>
        ) : null}

        <div className="flex flex-col gap-3">
          <h3 className={cn(sectionTitleClassName, "text-[color:var(--color-text-primary)]")}>시가총액 규모</h3>
          <div className="flex flex-col gap-2">
            <SelectionRow label="전체보기" selected={marketCap === "ALL"} onClick={() => onMarketCapChange("ALL")} shape="circle" compact={compact} />
            <SelectionRow label="10조 이상 (대형)" selected={marketCap === "LARGE"} onClick={() => onMarketCapChange("LARGE")} shape="circle" compact={compact} />
            <SelectionRow label="1조 ~ 10조 (중형)" selected={marketCap === "MID"} onClick={() => onMarketCapChange("MID")} shape="circle" compact={compact} />
          </div>
        </div>

        <SectionDivider />

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h3 className={cn(sectionTitleClassName, "text-[color:var(--color-text-primary)]")}>주요 섹터</h3>
            <button type="button" onClick={onResetCategories} className="typo-body-xs font-semibold text-[color:var(--color-text-interactive-primary)]">
              전체 선택
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <CategoryChip label="전체" selected={selectedCategories.length === 0} onClick={onResetCategories} />
            {MARKET_CATEGORIES.map((category) => (
              <CategoryChip
                key={category.name}
                label={formatCategoryDisplayName(category.name)}
                selected={selectedCategories.includes(category.name)}
                onClick={() => onToggleCategory(category.name)}
              />
            ))}
          </div>
        </div>

        <SectionDivider />

        <div className="flex flex-col gap-3">
          <h3 className={cn(sectionTitleClassName, "text-[color:var(--color-text-primary)]")}>종목 검색하기</h3>
          <label className="inline-flex w-full items-center overflow-hidden rounded-lg bg-[color:var(--color-bg-secondary)] px-3 py-2 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.16)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]">
            <input
              type="search"
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="종목명 또는 코드 검색"
              className={cn(
                searchTextClassName,
                "min-w-0 flex-1 bg-transparent text-[color:var(--color-text-primary)] outline-none placeholder:text-[color:var(--color-text-tertiary)]",
              )}
            />
            <span className="pl-3 text-[color:var(--color-text-tertiary)]">
              <GoSearch className="h-4 w-4" />
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
