"use client";

import { FaArrowTrendDown, FaArrowTrendUp } from "react-icons/fa6";
import { HiOutlineFilter } from "react-icons/hi";
import { useRouter } from "next/navigation";
import WatchlistHeartButton from "@/shared/components/WatchlistHeartButton";
import { formatPrice, formatSignedRate, getRateTone } from "@/shared/lib/stockFormatters";
import { cn } from "@/shared/utils/cn";
import type { SignalItem, SignalQueryFilter } from "../types/signals";
import { formatSignalCategory } from "../utils/signalFormatters";

function getRateClassName(value: number) {
  const tone = getRateTone(value);

  if (tone === "positive") {
    return "text-[color:var(--color-text-danger)]";
  }

  if (tone === "negative") {
    return "text-[color:var(--color-text-info)]";
  }

  return "text-[color:var(--color-text-tertiary)]";
}

function getSignalClasses(signal: SignalItem["signal"]) {
  if (signal === "BUY") {
    return {
      Icon: FaArrowTrendUp,
      label: "매수 진입",
      bg: "var(--color-bg-danger-subtle)",
      border: "var(--color-text-danger)",
      text: "var(--color-text-danger-bold)",
      bar: "var(--color-signal-confidence-buy)",
    };
  }

  return {
    Icon: FaArrowTrendDown,
    label: "매도 주의",
    bg: "var(--color-bg-info-subtle)",
    border: "var(--color-text-info)",
    text: "var(--color-text-info)",
    bar: "var(--color-signal-confidence-sell)",
  };
}

function TableTab({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("inline-flex flex-col items-center justify-center p-4", isActive ? "border-b-2 border-[color:var(--color-text-primary)]" : "")}
    >
      <span className={cn("typo-body-sm font-semibold", isActive ? "text-[color:var(--color-text-primary)]" : "text-[color:var(--color-text-tertiary)]")}>{label}</span>
    </button>
  );
}

type Props = {
  items: SignalItem[];
  activeFilter: SignalQueryFilter;
  onFilterChange: (value: SignalQueryFilter) => void;
  onOpenFilters: () => void;
  onLoadMore: () => void;
  hasNextPage: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  pageSize: number;
};

export default function SignalsMobileList({
  items,
  activeFilter,
  onFilterChange,
  onOpenFilters,
  onLoadMore,
  hasNextPage,
  isLoading,
  isFetchingNextPage,
  pageSize,
}: Props) {
  const router = useRouter();

  return (
    <div className="flex flex-col gap-6 lg:hidden">
      <button
        type="button"
        onClick={onOpenFilters}
        className="inline-flex items-center gap-2 self-end rounded-xl bg-[color:var(--color-bg-tertiary)] px-4 py-2 text-[color:var(--color-text-secondary)]"
      >
        <HiOutlineFilter className="h-4 w-4" />
        <span className="typo-body-xs font-semibold">검색 필터링</span>
      </button>

      <div className="overflow-hidden rounded-xl bg-[color:var(--color-bg-primary)] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]">
        <div className="inline-flex w-full items-start overflow-hidden border-b border-[color:var(--color-border-secondary)] px-4">
          <TableTab label="전체" isActive={activeFilter === "ALL"} onClick={() => onFilterChange("ALL")} />
          <TableTab label="매수 포착" isActive={activeFilter === "BUY"} onClick={() => onFilterChange("BUY")} />
          <TableTab label="매도 포착" isActive={activeFilter === "SELL"} onClick={() => onFilterChange("SELL")} />
        </div>

        <div className="flex flex-col">
          {isLoading ? (
            Array.from({ length: pageSize }).map((_, index) => (
              <div key={`signals-mobile-skeleton-${index}`} className="border-b border-[color:var(--color-border-secondary)] px-4 py-4">
                <div className="h-32 rounded-xl bg-[color:var(--color-bg-secondary)]" />
              </div>
            ))
          ) : items.length > 0 ? (
            items.map((item) => {
              const signalUi = getSignalClasses(item.signal);

              return (
                <div
                  key={item.stockId}
                  role="link"
                  tabIndex={0}
                  onClick={() => router.push(`/report/${item.stockId}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/report/${item.stockId}`);
                    }
                  }}
                  className="cursor-pointer border-b border-[color:var(--color-border-secondary)] px-4 py-3 transition-colors hover:bg-[color:var(--color-bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-base)] focus-visible:ring-inset"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px]"
                          style={{ backgroundColor: signalUi.bg, outlineColor: signalUi.border }}
                        >
                          <signalUi.Icon className="h-4 w-4 text-[color:var(--color-text-primary)]" />
                        </div>

                        <div className="min-w-0">
                          <div className="typo-body-md truncate font-bold text-[color:var(--color-text-primary)]">{item.name}</div>
                          <div className="typo-body-xs mt-0.5 truncate font-semibold text-[color:var(--color-text-tertiary)]">
                            {formatSignalCategory(item.category, item.ticker)}
                          </div>
                        </div>
                      </div>

                      <span
                        className="inline-flex shrink-0 rounded px-2 py-1 text-[10px] font-semibold"
                        style={{ backgroundColor: signalUi.bg, border: `1px solid ${signalUi.border}`, color: signalUi.text }}
                      >
                        {signalUi.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="flex flex-col items-center gap-1">
                        <div className="typo-body-xs font-semibold text-[color:var(--color-text-secondary)]">현재가</div>
                        <div className="flex flex-col items-center gap-1">
                          <div className="typo-body-sm font-extrabold text-[color:var(--color-text-primary)]">{formatPrice(item.price)}</div>
                          <div className={`typo-body-xs font-semibold ${getRateClassName(item.fluctuationRate)}`}>{formatSignedRate(item.fluctuationRate)}</div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-between gap-1 px-3 pb-2">
                        <div className="typo-body-xs font-semibold text-[color:var(--color-text-secondary)]">신뢰도</div>
                        <div className="typo-body-sm font-extrabold text-[color:var(--color-text-primary)]">{item.confidence}%</div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-[color:var(--color-bg-disabled)]">
                          <div className="h-full rounded-full" style={{ width: `${item.confidence}%`, backgroundColor: signalUi.bar }} />
                        </div>
                      </div>

                      <div
                        className="flex flex-col items-center justify-center gap-2"
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <div className="typo-body-xs font-semibold text-[color:var(--color-text-secondary)]">관심추가</div>
                        <WatchlistHeartButton stockId={item.stockId} stockName={item.name} size="sm" inactiveIconStyle="outline" />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-12 text-center">
              <p className="typo-body-md text-[color:var(--color-text-secondary)]">조건에 맞는 매매신호가 없습니다.</p>
            </div>
          )}
        </div>

        <div className="border-t border-[color:var(--color-border-secondary)] bg-[color:var(--color-bg-secondary)] p-4">
          {hasNextPage ? (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isFetchingNextPage}
              className="typo-body-sm inline-flex w-full justify-center py-5 font-semibold text-[color:var(--color-text-tertiary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isFetchingNextPage ? "불러오는 중..." : `${pageSize}개 종목 더보기`}
            </button>
          ) : (
            <div className="typo-body-sm inline-flex w-full justify-center py-5 font-semibold text-[color:var(--color-text-tertiary)]">마지막 종목입니다</div>
          )}
        </div>
      </div>
    </div>
  );
}
