"use client";

import { useState } from "react";
import { FaAngleDown, FaAngleUp } from "react-icons/fa6";
import type {
  StockChartPeriod,
  StockDetailOverview,
  StockPriceChartMode,
  StockPricePoint,
} from "@/app/stocks/types/stockDetail";
import WatchlistHeartButton from "@/shared/components/WatchlistHeartButton";
import ToggleSwitch from "@/shared/ui/ToggleSwitch";
import {
  formatBaseTime,
  formatSignedPercent,
  formatWon,
  getRateClassName,
  stockChartPeriods,
} from "../utils/stockDetailFormatters";
import StockPriceChart from "./StockPriceChart";

type Props = {
  overview: StockDetailOverview;
  prices: StockPricePoint[];
  currentPrice: number;
  changeRate: number;
  chartPeriod: StockChartPeriod;
  onChartPeriodChange: (value: StockChartPeriod) => void;
  isChartLoading: boolean;
};

export default function StockOverviewSection({
  overview,
  prices,
  currentPrice,
  changeRate,
  chartPeriod,
  onChartPeriodChange,
  isChartLoading,
}: Props) {
  const [chartMode, setChartMode] = useState<StockPriceChartMode>("line");
  const isPositive = changeRate > 0;
  const isNegative = changeRate < 0;
  const isCandlestick = chartMode === "candlestick";

  return (
    <section className="border-b border-[color:var(--color-border-primary)] pb-10 md:pb-12 xl:pb-14">
      <div className="flex flex-col gap-8 md:gap-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex min-w-0 flex-col gap-2.5 md:gap-3">
            <div className="flex flex-wrap items-center gap-1.5 md:gap-2.5">
              <span className="inline-flex rounded-md bg-[color:var(--color-bg-tertiary)] px-2.5 py-1 text-xs font-semibold text-[color:var(--color-text-secondary)] md:px-3 md:text-sm">
                {overview.category}
              </span>
              <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-tertiary)] md:text-sm md:leading-5">
                {overview.ticker}
              </span>
              <span className="hidden h-5 w-px bg-[color:var(--color-border-primary)] md:block" />
              <span className="text-xs font-medium leading-4 text-[color:var(--color-text-tertiary)] md:text-sm md:leading-5">
                {formatBaseTime(overview.baseTime)} 마감 기준
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
              <h1 className="text-4xl font-extrabold leading-10 tracking-[-0.03em] text-[color:var(--color-text-primary)] md:text-[2.75rem] md:leading-[3rem] xl:text-5xl xl:leading-[56px]">
                {overview.name}
              </h1>
              <WatchlistHeartButton
                stockId={overview.id}
                stockName={overview.name}
                size="lg"
                inactiveIconStyle="outline"
                className="rounded-full"
              />
            </div>

            <div className="flex items-center justify-between gap-3 xl:hidden">
              <div className="min-w-0 text-4xl font-extrabold leading-10 tracking-[-0.03em] text-[color:var(--color-text-primary)] md:text-[2.75rem] md:leading-[3rem]">
                {currentPrice > 0 ? formatWon(currentPrice) : "--"}
              </div>
              <div
                className={`inline-flex shrink-0 items-center gap-1.5 text-xl font-bold leading-8 ${
                  getRateClassName(changeRate)
                }`}
              >
                {isPositive ? <FaAngleUp className="h-5 w-5" /> : null}
                {isNegative ? <FaAngleDown className="h-5 w-5" /> : null}
                {!isPositive && !isNegative ? <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" /> : null}
                <span>{formatSignedPercent(changeRate, 2)}</span>
              </div>
            </div>
          </div>

          <div className="hidden min-w-0 flex-col items-start gap-2 xl:flex xl:items-end">
            <div className="text-4xl font-extrabold leading-[1.15] tracking-[-0.03em] text-[color:var(--color-text-primary)] md:text-5xl md:leading-[56px]">
              {currentPrice > 0 ? formatWon(currentPrice) : "--"}
            </div>
            <div className={`inline-flex items-center gap-1.5 text-xl font-extrabold ${getRateClassName(changeRate)}`}>
              {isPositive ? <FaAngleUp className="h-5 w-5" /> : null}
              {isNegative ? <FaAngleDown className="h-5 w-5" /> : null}
              {!isPositive && !isNegative ? <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" /> : null}
              <span>{formatSignedPercent(changeRate, 2)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1 overflow-x-auto">
              <div className="inline-flex min-w-max items-center gap-4 border-b border-[color:var(--color-border-primary)]">
                {stockChartPeriods.map((item) => {
                  const isActive = item.value === chartPeriod;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => onChartPeriodChange(item.value)}
                      className={`-mb-px border-b px-1 py-2 text-sm font-semibold transition-colors md:text-base ${
                        isActive
                          ? "border-[color:var(--color-border-base)] text-[color:var(--color-text-primary)]"
                          : "border-transparent text-[color:var(--color-text-tertiary)]"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="inline-flex shrink-0 items-center gap-2 md:gap-3">
              <span className="text-xs font-semibold text-[color:var(--color-text-secondary)] md:text-sm">캔들 차트로 보기</span>
              <ToggleSwitch
                enabled={isCandlestick}
                onToggle={() => setChartMode((prev) => (prev === "candlestick" ? "line" : "candlestick"))}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] bg-[color:var(--color-bg-primary)]">
            {isChartLoading ? (
              <div className="h-[320px] w-full animate-pulse bg-[color:var(--color-bg-secondary)] md:h-[340px] xl:h-[360px]" />
            ) : (
              <StockPriceChart prices={prices} period={chartPeriod} mode={chartMode} className="px-0" />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
