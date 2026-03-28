"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ValueChangeRateText from "@/shared/components/ValueChangeRateText";
import WatchlistHeartButton from "@/shared/components/WatchlistHeartButton";
import type { TopStockItem } from "../types/main";
import { formatPrice, formatSignalLabel, formatSignedRate, getRateTone } from "../utils/formatters";

const mutedBackgroundRanks = new Set([1, 4, 5, 8, 9]);

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

function getSignalBadgeClassName(signal: string) {
  const normalized = signal.trim().toLowerCase();

  if (normalized === "buy" || normalized === "strong_buy" || normalized === "매수") {
    return "bg-[color:var(--color-bg-danger-subtle)] text-[color:var(--color-text-danger)]";
  }

  if (normalized === "sell" || normalized === "매도") {
    return "bg-[color:var(--color-bg-info-subtle)] text-[color:var(--color-text-info)]";
  }

  return "bg-[color:var(--color-bg-tertiary)] text-[color:var(--color-text-secondary)]";
}

type Props = {
  stocks: TopStockItem[];
  isLoading: boolean;
};

export default function TopStocksSection({ stocks, isLoading }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const router = useRouter();
  const featured = stocks[0];
  const visibleItems = isExpanded ? stocks.slice(1) : stocks.slice(1, 5);
  const visibleRows = Array.from({ length: Math.ceil(visibleItems.length / 2) }, (_, rowIndex) =>
    visibleItems.slice(rowIndex * 2, rowIndex * 2 + 2),
  );

  const handleNavigateToStock = (stockId: number) => {
    router.push(`/stocks/${stockId}`);
  };

  const handleCardKeyDown = (
    event: React.KeyboardEvent<HTMLDivElement>,
    stockId: number,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    handleNavigateToStock(stockId);
  };

  return (
    <section className="flex flex-col gap-5 md:gap-6">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="typo-heading-md w-full text-[color:var(--color-text-primary)] md:[font-size:var(--typo-heading-lg-font-size)] md:[line-height:var(--typo-heading-lg-line-height)]">
          오늘의 살래 TOP10
        </h1>
        <p className="typo-body-md w-full text-[color:var(--color-text-secondary)]">
          살래말래위원회가 선정한 가장 유망한 종목입니다.
        </p>
      </div>

      {isLoading && !featured ? (
        <div className="rounded-2xl bg-[color:var(--color-bg-tertiary)] p-6">
          <div className="h-6 w-40 rounded bg-[color:var(--color-border-primary)]" />
          <div className="mt-4 h-28 rounded-xl bg-[color:var(--color-bg-primary)]" />
        </div>
      ) : null}

      <div className="flex flex-col gap-0">
        {featured ? (
          <div
            role="link"
            tabIndex={0}
            onClick={() => handleNavigateToStock(featured.stockId)}
            onKeyDown={(event) => handleCardKeyDown(event, featured.stockId)}
            className="cursor-pointer rounded-2xl bg-[color:var(--color-bg-tertiary)] px-6 py-5 shadow-[0px_1px_2px_rgba(0,0,0,0.05)] transition-colors hover:bg-[color:var(--color-bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-base)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg-primary)]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-5">
                <span className="typo-heading-3xl text-[color:var(--color-text-interactive-primary)]">
                  {featured.rank}
                </span>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="typo-heading-sm text-[color:var(--color-text-primary)]">
                      {featured.name}
                    </span>
                    <span className={`typo-body-xs rounded px-2 py-1 font-semibold ${getSignalBadgeClassName(featured.signal)}`}>
                      {formatSignalLabel(featured.signal)}
                    </span>
                  </div>
                  <span className="typo-body-sm text-[color:var(--color-text-secondary)]">
                    신뢰도 {featured.confidence}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-1">
                  <span className="typo-heading-sm text-[color:var(--color-text-primary)]">
                    {formatPrice(featured.price)}
                  </span>
                  <ValueChangeRateText
                    value={featured.fluctuationRate}
                    className={`typo-body-md font-semibold ${getRateClassName(featured.fluctuationRate)}`}
                  >
                    {formatSignedRate(featured.fluctuationRate)}
                  </ValueChangeRateText>
                </div>
                <div
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <WatchlistHeartButton
                    stockId={featured.stockId}
                    stockName={featured.name}
                    initialWatched={featured.isWatchlisted}
                    size="md"
                    surface="muted"
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col">
          {visibleRows.map((row) => {
            const isMutedRow = row.length === 2 && row.every((item) => mutedBackgroundRanks.has(item.rank));

            return (
              <div
                key={row.map((item) => item.stockId).join("-")}
                className={`grid md:grid-cols-2 ${isMutedRow ? "md:rounded-xl md:bg-[color:var(--color-bg-tertiary)]" : ""}`}
              >
                {row.map((item) => {
                  const isMutedBackground = mutedBackgroundRanks.has(item.rank);
                  const isOddRank = item.rank % 2 === 1;

                  return (
                    <div
                      key={item.stockId}
                      role="link"
                      tabIndex={0}
                      onClick={() => handleNavigateToStock(item.stockId)}
                      onKeyDown={(event) => handleCardKeyDown(event, item.stockId)}
                      className={`cursor-pointer rounded-xl px-4 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-base)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg-primary)] hover:bg-[color:var(--color-bg-secondary)] ${
                        isOddRank ? "bg-[color:var(--color-bg-tertiary)]" : "bg-[color:var(--color-bg-primary)]"
                      } ${
                        isMutedRow
                          ? "md:bg-transparent"
                          : isMutedBackground
                            ? "md:bg-[color:var(--color-bg-tertiary)]"
                            : "md:bg-[color:var(--color-bg-primary)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <span className="typo-heading-sm w-6 text-center text-[color:var(--color-text-tertiary)]">
                            {item.rank}
                          </span>
                          <span className="typo-heading-sm text-[color:var(--color-text-primary)]">
                            {item.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <div className="flex flex-col items-end gap-1">
                            <span className="typo-body-md font-semibold text-[color:var(--color-text-primary)]">
                              {formatPrice(item.price)}
                            </span>
                            <ValueChangeRateText
                              value={item.fluctuationRate}
                              className={`typo-body-sm font-semibold ${getRateClassName(item.fluctuationRate)}`}
                            >
                              {formatSignedRate(item.fluctuationRate)}
                            </ValueChangeRateText>
                          </div>
                          <div
                            onClick={(event) => event.stopPropagation()}
                            onKeyDown={(event) => event.stopPropagation()}
                          >
                            <WatchlistHeartButton
                              stockId={item.stockId}
                              stockName={item.name}
                              initialWatched={item.isWatchlisted}
                              size="sm"
                              surface={isMutedRow || isMutedBackground ? "muted" : "default"}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {stocks.length > 5 ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="typo-body-sm rounded-xl px-6 py-3 font-medium text-[color:var(--color-text-secondary)] transition-colors hover:bg-[color:var(--color-bg-tertiary)] hover:text-[color:var(--color-text-primary)]"
          >
            {isExpanded ? "접기" : "더보기"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
