"use client";

import { FaArrowTrendDown, FaArrowTrendUp } from "react-icons/fa6";
import WatchlistHeartButton from "@/shared/components/WatchlistHeartButton";
import { formatCategoryDisplayName } from "@/shared/lib/marketCategories";
import { formatPrice, formatSignedRate, getRateTone } from "@/shared/lib/stockFormatters";
import type { SignalItem, SignalQueryFilter } from "../types/signals";

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
      badgeBg: "var(--color-bg-danger-subtle)",
      badgeBorder: "var(--color-text-danger)",
      badgeText: "var(--color-text-danger-bold)",
      iconBg: "var(--color-bg-danger-subtle)",
      iconBorder: "var(--color-text-danger)",
      barFill: "var(--color-signal-confidence-buy)",
      Icon: FaArrowTrendUp,
      label: "매수 진입",
    };
  }

  return {
    badgeBg: "var(--color-bg-info-subtle)",
    badgeBorder: "var(--color-text-info)",
    badgeText: "var(--color-text-info)",
    iconBg: "var(--color-bg-info-subtle)",
    iconBorder: "var(--color-text-info)",
    barFill: "var(--color-signal-confidence-sell)",
    Icon: FaArrowTrendDown,
    label: "매도 주의",
  };
}

function TableTab({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex flex-col items-center justify-center p-4 ${isActive ? "border-b-2 border-[color:var(--color-border-base)]" : ""}`}
    >
      <span className={`typo-body-md font-semibold ${isActive ? "text-[color:var(--color-text-primary)]" : "text-[color:var(--color-text-tertiary)]"}`}>{label}</span>
    </button>
  );
}

type Props = {
  items: SignalItem[];
  activeFilter: SignalQueryFilter;
  onFilterChange: (value: SignalQueryFilter) => void;
  onLoadMore: () => void;
  hasNextPage: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  pageSize: number;
};

export default function SignalsDesktopTable({
  items,
  activeFilter,
  onFilterChange,
  onLoadMore,
  hasNextPage,
  isLoading,
  isFetchingNextPage,
  pageSize,
}: Props) {
  return (
    <div className="hidden w-full lg:flex lg:flex-col">
      <div className="overflow-hidden rounded-xl bg-[color:var(--color-bg-primary)] outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]">
        <div className="inline-flex w-full items-start border-b border-[color:var(--color-border-secondary)] px-6">
          <TableTab label="전체" isActive={activeFilter === "ALL"} onClick={() => onFilterChange("ALL")} />
          <TableTab label="매수 포착" isActive={activeFilter === "BUY"} onClick={() => onFilterChange("BUY")} />
          <TableTab label="매도 포착" isActive={activeFilter === "SELL"} onClick={() => onFilterChange("SELL")} />
        </div>

        <div className="grid grid-cols-[minmax(0,240px)_112px_225px_96px_72px] items-start gap-4 bg-[color:var(--color-bg-secondary)] px-8 py-4">
          <div className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">종목명 / 섹터</div>
          <div className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">현재가 / 등락률</div>
          <div className="typo-body-sm text-center font-semibold text-[color:var(--color-text-secondary)]">AI 매매신호 / 신뢰도</div>
          <div className="typo-body-sm text-center font-semibold text-[color:var(--color-text-secondary)]">발생 시각</div>
          <div className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">관심 추가</div>
        </div>

        <div className="flex flex-col">
          {isLoading ? (
            Array.from({ length: pageSize }).map((_, index) => (
              <div key={`signals-desktop-skeleton-${index}`} className="grid grid-cols-[minmax(0,240px)_112px_225px_96px_72px] items-center gap-4 border-b border-[color:var(--color-border-secondary)] px-8 py-6">
                <div className="h-12 rounded-lg bg-[color:var(--color-bg-secondary)]" />
                <div className="h-12 rounded-lg bg-[color:var(--color-bg-secondary)]" />
                <div className="h-12 rounded-lg bg-[color:var(--color-bg-secondary)]" />
                <div className="h-12 rounded-lg bg-[color:var(--color-bg-secondary)]" />
                <div className="h-12 rounded-lg bg-[color:var(--color-bg-secondary)]" />
              </div>
            ))
          ) : items.length > 0 ? (
            items.map((item) => {
              const signalUi = getSignalClasses(item.signal);

              return (
                <div
                  key={item.stockId}
                  className="grid grid-cols-[minmax(0,240px)_112px_225px_96px_72px] items-center gap-4 border-b border-[color:var(--color-border-secondary)] px-8 py-6"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div
                      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-lg shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] outline outline-1 outline-offset-[-1px]"
                      style={{ backgroundColor: signalUi.iconBg, outlineColor: signalUi.iconBorder }}
                    >
                      <signalUi.Icon className="h-5 w-5 text-[color:var(--color-text-primary)]" />
                    </div>

                    <div className="min-w-0">
                      <div className="typo-body-md truncate font-semibold text-[color:var(--color-text-primary)]">{item.name}</div>
                      <div className="typo-body-xs mt-0.5 truncate font-semibold text-[color:var(--color-text-tertiary)]">
                        {item.ticker} · {formatCategoryDisplayName(item.category)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <div className="typo-body-md font-extrabold text-[color:var(--color-text-primary)]">{formatPrice(item.price)}</div>
                    <div className={`typo-body-sm font-semibold ${getRateClassName(item.fluctuationRate)}`}>{formatSignedRate(item.fluctuationRate)}</div>
                  </div>

                  <div className="flex items-center justify-center gap-4">
                    <div className="flex min-w-[96px] justify-center">
                      <span
                        className="inline-flex rounded px-2.5 py-1.5 text-xs font-semibold"
                        style={{
                          backgroundColor: signalUi.badgeBg,
                          border: `1px solid ${signalUi.badgeBorder}`,
                          color: signalUi.badgeText,
                        }}
                      >
                        {signalUi.label}
                      </span>
                    </div>

                    <div className="flex w-24 flex-col items-center gap-1">
                      <div className="typo-body-md font-extrabold text-[color:var(--color-text-primary)]">{item.confidence}%</div>
                      <div className="h-1 w-12 overflow-hidden rounded-full bg-[color:var(--color-bg-disabled)]">
                        <div className="h-full rounded-full" style={{ width: `${item.confidence}%`, backgroundColor: signalUi.barFill }} />
                      </div>
                    </div>
                  </div>

                  <div className="typo-body-sm text-center font-semibold text-[color:var(--color-text-secondary)]">
                    {new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(item.createdAt))}
                  </div>

                  <div className="flex justify-end">
                    <WatchlistHeartButton stockId={item.stockId} stockName={item.name} size="sm" inactiveIconStyle="outline" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-8 py-16 text-center">
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
              className="typo-body-md inline-flex w-full justify-center py-4 font-bold text-[color:var(--color-text-tertiary)] transition-colors hover:text-[color:var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isFetchingNextPage ? "불러오는 중..." : `${pageSize}개 종목 더보기`}
            </button>
          ) : (
            <div className="typo-body-md inline-flex w-full justify-center py-4 font-bold text-[color:var(--color-text-tertiary)]">마지막 종목입니다</div>
          )}
        </div>
      </div>
    </div>
  );
}
