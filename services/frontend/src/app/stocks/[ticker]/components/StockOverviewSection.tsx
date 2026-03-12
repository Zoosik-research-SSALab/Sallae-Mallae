import type { StockChartPeriod, StockDetailOverview, StockPricePoint } from "@/app/stocks/types/stockDetail";
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
  return (
    <section className="border-b border-[color:var(--color-border-primary)] pb-10 md:pb-12">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-md bg-[color:var(--color-bg-tertiary)] px-3 py-1 text-xs font-semibold text-[color:var(--color-text-secondary)] md:text-sm">
                {overview.category}
              </span>
              <span className="typo-body-sm font-semibold text-[color:var(--color-text-tertiary)]">{overview.ticker}</span>
              <span className="hidden h-5 w-px bg-[color:var(--color-border-primary)] md:block" />
              <span className="typo-body-sm text-[color:var(--color-text-tertiary)]">
                {formatBaseTime(overview.baseTime)} 마감 기준
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <h1 className="typo-heading-2xl text-[color:var(--color-text-primary)] md:typo-heading-3xl">{overview.name}</h1>
              <span className="inline-flex rounded-full bg-[color:var(--color-bg-secondary)] px-3 py-1 text-sm font-semibold text-[color:var(--color-text-secondary)]">
                {overview.marketType} · {overview.gicsSector}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start gap-1 xl:items-end">
            <div className="typo-heading-2xl text-[color:var(--color-text-primary)] md:typo-heading-3xl">
              {currentPrice > 0 ? formatWon(currentPrice) : "--원"}
            </div>
            <div className={`typo-heading-sm ${getRateClassName(changeRate)}`}>{formatSignedPercent(changeRate, 2)}</div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2 border-b border-[color:var(--color-border-primary)]">
              {stockChartPeriods.map((item) => {
                const isActive = item.value === chartPeriod;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => onChartPeriodChange(item.value)}
                    className={`border-b px-1 py-2 text-sm font-semibold transition-colors md:text-base ${
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

            <div className="typo-body-sm inline-flex items-center gap-2 text-[color:var(--color-text-secondary)]">
              <span>캔들 차트로 보기</span>
              <span className="relative inline-flex h-6 w-10 rounded-full bg-[color:var(--color-bg-tertiary)]">
                <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-[color:var(--color-bg-primary)] shadow-[0px_1px_2px_rgba(0,0,0,0.16)]" />
              </span>
            </div>
          </div>

          {isChartLoading ? (
            <div className="h-[320px] w-full animate-pulse rounded-2xl bg-[color:var(--color-bg-secondary)] md:h-[360px]" />
          ) : (
            <StockPriceChart prices={prices} period={chartPeriod} />
          )}
        </div>
      </div>
    </section>
  );
}
