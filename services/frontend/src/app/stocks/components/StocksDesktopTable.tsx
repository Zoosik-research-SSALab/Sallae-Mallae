"use client";

import { LayoutGroup, motion } from "motion/react";
import Link from "next/link";
import ValueChangeRateText from "@/shared/components/ValueChangeRateText";
import WatchlistHeartButton from "@/shared/components/WatchlistHeartButton";
import { formatPrice } from "@/shared/lib/stockFormatters";
import type { StockItem, StockRankingMetric } from "../types/stocks";
import {
  formatMetricValue,
  getMetricColumnLabel,
  getMetricValue,
  getRateClassName,
} from "../utils/stockMetrics";
import { rowLayoutTransition } from "../utils/rowLayoutTransition";
import { formatStockSectorLabel } from "../utils/stockSectorLabels";
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

function DesktopSkeletonRow() {
  return (
    <div className="border-b border-[color:var(--color-border-secondary)] px-4 py-4">
      <div className="h-14 rounded-xl bg-[color:var(--color-bg-secondary)]" />
    </div>
  );
}

export default function StocksDesktopTable({
  items,
  activeMetric,
  onMetricChange,
  onLoadMore,
  hasNextPage,
  isLoading,
  isFetchingNextPage,
  pageSize,
}: Props) {
  const metricColumnLabel = getMetricColumnLabel(activeMetric);

  return (
    <div className="hidden w-full flex-col gap-6 lg:flex">
      <div className="overflow-hidden rounded-xl bg-bg-primary">
        <StocksSortTabs value={activeMetric} onChange={onMetricChange} />
        <div className="h-6" />

        <div className="flex items-start justify-between gap-6 bg-bg-secondary px-4 py-4">
          <div className="flex flex-1 items-center gap-6">
            <div className="typo-body-sm min-w-6 font-semibold text-text-secondary">순위</div>
            <div className="typo-body-sm font-semibold text-text-secondary">종목명</div>
          </div>

          <div className="flex flex-1 items-center justify-between gap-4">
            <div className="typo-body-sm w-28 text-right font-semibold text-text-secondary">현재가 / 등락률</div>
            <div className="typo-body-sm w-28 text-center font-semibold text-text-secondary">{metricColumnLabel}</div>
            <div className="typo-body-sm w-16 text-right font-semibold text-text-secondary">관심 추가</div>
          </div>
        </div>

        <LayoutGroup id="stocks-desktop-list">
          <div className="flex flex-col">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, index) => <DesktopSkeletonRow key={index} />)
            ) : items.length > 0 ? (
              items.map((item) => (
                <motion.article
                  key={item.id}
                  layout="position"
                  initial={false}
                  transition={rowLayoutTransition}
                  className="border-b border-border-secondary px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-6">
                    <Link
                      href={`/stocks/${item.id}`}
                      className="flex min-w-0 flex-1 items-center justify-between gap-6 rounded-xl px-2 py-1 transition-colors hover:bg-[color:var(--color-bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-interactive-primary)]"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-6">
                        <div className="typo-body-md min-w-6 text-center font-black text-[color:var(--color-text-tertiary)]">{item.rank}</div>

                        <div className="flex min-w-0 items-center gap-4">
                          <StockLogo label={item.name.slice(0, 2)} />

                          <div className="min-w-0">
                            <div className="typo-body-md truncate font-semibold text-[color:var(--color-text-primary)]">{item.name}</div>
                            <div className="typo-body-xs mt-1 truncate font-semibold text-[color:var(--color-text-tertiary)]">
                              {item.ticker} · {formatStockSectorLabel(item.gicsSector)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-1 items-center justify-between gap-4">
                        <div className="flex w-28 flex-col items-end">
                          <div className="typo-body-md text-right font-extrabold text-[color:var(--color-text-primary)]">
                            {formatPrice(item.price)}
                          </div>
                          <ValueChangeRateText
                            value={item.fluctuationRate}
                            padding="x-none"
                            className={`typo-body-sm justify-end font-semibold ${getRateClassName(item.fluctuationRate)}`}
                          >
                            {formatMetricValue(item, "RETURN")}
                          </ValueChangeRateText>
                        </div>

                        <div className="flex w-28 justify-center">
                          <ValueChangeRateText
                            value={getMetricValue(item, activeMetric)}
                            className="typo-body-md font-black text-[color:var(--color-text-primary)]"
                          >
                            <span className={activeMetric === "RETURN" ? getRateClassName(item.fluctuationRate) : ""}>
                              {formatMetricValue(item, activeMetric)}
                            </span>
                          </ValueChangeRateText>
                        </div>
                      </div>
                    </Link>

                    <div className="flex w-16 justify-end">
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
              <div className="px-6 py-16 text-center">
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
              className="typo-body-md inline-flex w-full justify-center py-5 font-semibold text-[color:var(--color-text-tertiary)] transition-colors hover:text-[color:var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isFetchingNextPage ? "불러오는 중..." : `${pageSize}개 종목 더보기`}
            </button>
          ) : (
            <div className="typo-body-md inline-flex w-full justify-center py-5 font-semibold text-[color:var(--color-text-tertiary)]">
              마지막 종목입니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
