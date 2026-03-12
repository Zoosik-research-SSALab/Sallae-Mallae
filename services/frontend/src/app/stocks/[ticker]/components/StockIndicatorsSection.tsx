import type { StockIndicators } from "@/app/stocks/types/stockDetail";
import {
  formatMultiplier,
  formatPercent,
  formatSignedPercent,
  getRateClassName,
} from "../utils/stockDetailFormatters";

type Props = {
  indicators?: StockIndicators;
  isLoading: boolean;
};

function IndicatorCardSkeleton() {
  return <div className="h-40 animate-pulse rounded-2xl bg-[color:var(--color-bg-secondary)]" />;
}

type MetricKey = "per" | "pbr" | "roe" | "debtRatio";

const metricMeta: Array<{
  key: MetricKey;
  label: string;
  unit: "multiplier" | "percent";
}> = [
  { key: "per", label: "PER", unit: "multiplier" },
  { key: "pbr", label: "PBR", unit: "multiplier" },
  { key: "roe", label: "ROE", unit: "percent" },
  { key: "debtRatio", label: "부채비율", unit: "percent" },
];

function formatMetricValue(unit: "multiplier" | "percent", value: number) {
  return unit === "multiplier" ? formatMultiplier(value) : formatPercent(value);
}

export default function StockIndicatorsSection({ indicators, isLoading }: Props) {
  return (
    <section className="py-10 md:py-12">
      <div className="flex flex-col gap-8">
        <div>
          <h2 className="typo-heading-md text-[color:var(--color-text-primary)]">투자 주요 지표</h2>
          <p className="typo-body-sm mt-2 text-[color:var(--color-text-secondary)]">
            현재 지표와 업종 평균, 전분기 대비 변화를 함께 확인할 수 있습니다.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {isLoading || !indicators
            ? Array.from({ length: 4 }).map((_, index) => <IndicatorCardSkeleton key={index} />)
            : metricMeta.map((metric) => {
                const value = indicators[metric.key];
                const sectorAverage = indicators.sectorAvg[metric.key];
                const diff = indicators.prevQuarterDiff[metric.key];

                return (
                  <article
                    key={metric.key}
                    className="flex min-h-40 flex-col justify-between rounded-2xl bg-[color:var(--color-bg-secondary)] p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="typo-body-md font-extrabold text-[color:var(--color-text-primary)]">{metric.label}</h3>
                      <span className="typo-body-xs rounded-full bg-[color:var(--color-bg-primary)] px-2 py-1 font-semibold text-[color:var(--color-text-secondary)]">
                        업종 평균 {formatMetricValue(metric.unit, sectorAverage)}
                      </span>
                    </div>

                    <div className="typo-heading-lg text-[color:var(--color-text-primary)]">{formatMetricValue(metric.unit, value)}</div>

                    <div className="flex flex-col gap-1">
                      <span className="typo-body-xs text-[color:var(--color-text-secondary)]">전분기 대비</span>
                      <span className={`typo-body-md font-bold ${getRateClassName(diff)}`}>{formatSignedPercent(diff, 1)}</span>
                    </div>
                  </article>
                );
              })}
        </div>
      </div>
    </section>
  );
}
