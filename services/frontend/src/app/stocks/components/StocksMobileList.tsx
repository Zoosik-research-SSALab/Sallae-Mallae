"use client";

import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import ValueChangeRateText from "@/shared/components/ValueChangeRateText";
import WatchlistHeartButton from "@/shared/components/WatchlistHeartButton";
import { formatPrice } from "@/shared/lib/stockFormatters";
import type { StockItem, StockRankingMetric } from "../types/stocks";
import { formatMetricValue, getRateClassName } from "../utils/stockMetrics";
import { rowLayoutTransition } from "../utils/rowLayoutTransition";
import StockLogo from "./StockLogo";
import StocksSortTabs from "./StocksSortTabs";

type Props = {
  items: StockItem[];
  activeMetric: StockRankingMetric;
  onMetricChange: (value: StockRankingMetric) => void;
  onLoadMore: () => void;
  hasNextPage: boolean;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  pageSize: number;
};

function MobileSkeletonRow() {
  return (
    <div className="border-b border-[color:var(--color-border-secondary)] px-4 py-4">
      <div className="h-20 rounded-xl bg-[color:var(--color-bg-secondary)]" />
    </div>
  );
}

export default function StocksMobileList({
  items,
  activeMetric,
  onMetricChange,
  onLoadMore,
  hasNextPage,
  isLoading,
  isFetchingNextPage,
  pageSize,
}: Props) {
  return (
    <div className="flex flex-col gap-6 lg:hidden">
      <div className="overflow-hidden rounded-xl bg-[color:var(--color-bg-primary)] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
        <StocksSortTabs value={activeMetric} onChange={onMetricChange} compact />

        <LayoutGroup id="stocks-mobile-list">
          <div className="flex flex-col">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, index) => <MobileSkeletonRow key={index} />)
            ) : items.length > 0 ? (
              items.map((item) => (
                <motion.article
                  key={item.id}
                  layout="position"
                  initial={false}
                  transition={rowLayoutTransition}
                  className="border-b border-[color:var(--color-border-secondary)] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-4">
                    <Link
                      href={`/stocks/${item.ticker}`}
                      className="flex min-w-0 flex-1 items-center gap-4 rounded-xl px-2 py-1 transition-colors hover:bg-[color:var(--color-bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-interactive-primary)]"
                    >
                      <div className="typo-body-md min-w-4 text-center font-black text-[color:var(--color-text-tertiary)]">{item.rank}</div>

                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <StockLogo label={item.name.slice(0, 2)} />

                        <div className="min-w-0 flex-1">
                          <div className="typo-body-sm truncate font-semibold text-[color:var(--color-text-primary)]">{item.name}</div>
                          <div className="mt-1 flex items-center gap-1">
                            <div className="typo-body-sm font-extrabold text-[color:var(--color-text-primary)]">{formatPrice(item.price)}</div>
                            <ValueChangeRateText
                              value={item.fluctuationRate}
                              padding="x-none"
                              className={`typo-body-xs font-semibold ${getRateClassName(item.fluctuationRate)}`}
                            >
                              {formatMetricValue(item, "RETURN")}
                            </ValueChangeRateText>
                          </div>
                        </div>
                      </div>
                    </Link>

                    <div className="flex items-center">
                      <WatchlistHeartButton
                        stockId={item.id}
                        stockName={item.name}
                        initialWatched={item.isWatchlisted}
                        inactiveIconStyle="outline"
                      />
                    </div>
                  </div>
                </motion.article>
              ))
            ) : (
              <div className="px-4 py-12 text-center">
                <p className="typo-body-md text-[color:var(--color-text-secondary)]">조건에 맞는 종목이 없습니다.</p>
              </div>
            )}
          </div>
        </LayoutGroup>

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
            <div className="typo-body-sm inline-flex w-full justify-center py-5 font-semibold text-[color:var(--color-text-tertiary)]">
              마지막 종목입니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
