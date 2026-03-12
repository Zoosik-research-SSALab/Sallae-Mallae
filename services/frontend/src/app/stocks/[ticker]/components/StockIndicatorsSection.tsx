import type { ReactNode } from "react";
import type { StockIndicators } from "@/app/stocks/types/stockDetail";
import type { StockMetricInfoKey } from "../utils/stockMetricInfo";
import { formatMultiplier, formatPercent, formatWon } from "../utils/stockDetailFormatters";
import StockMetricInfoTrigger from "./common/StockMetricInfoTrigger";

type Props = {
  indicators?: StockIndicators;
  isLoading: boolean;
};

type IndicatorRowProps = {
  label: string;
  value: string;
  subValue?: string;
  hasBorder?: boolean;
  infoKey?: StockMetricInfoKey;
};

function IndicatorCardSkeleton() {
  return <div className="h-56 animate-pulse rounded-[20px] bg-[color:var(--color-bg-secondary)]" />;
}

type CompactMetricBoxProps = {
  label: string;
  value: string;
  subValue?: string;
  infoKey?: StockMetricInfoKey;
};

function CompactMetricBox({ label, value, subValue, infoKey }: CompactMetricBoxProps) {
  const content = (
    <div className="flex min-h-[88px] flex-1 flex-col items-center justify-center rounded-lg bg-[color:var(--color-bg-primary)] px-2 py-2 text-center outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)] transition-colors md:min-h-[96px]">
      <div className="inline-flex items-center justify-center gap-1">
        <div className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)] md:text-sm md:leading-5">{label}</div>
      </div>
      <div className="mt-1 text-xs font-semibold leading-4 text-[color:var(--color-text-primary)] md:text-sm md:leading-5">{value}</div>
      {subValue ? (
        <div className="mt-0.5 text-[10px] font-medium leading-4 text-[color:var(--color-text-tertiary)] md:text-xs">
          {subValue}
        </div>
      ) : null}
    </div>
  );

  if (!infoKey) {
    return content;
  }

  return (
    <StockMetricInfoTrigger
      metricKey={infoKey}
      className="group block rounded-lg hover:bg-[color:var(--color-bg-tertiary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-interactive-primary)]"
    >
      {content}
    </StockMetricInfoTrigger>
  );
}

function IndicatorRow({ label, value, subValue, hasBorder = true, infoKey }: IndicatorRowProps) {
  return (
    <div
      className={`flex min-h-[3.5rem] items-center justify-between gap-4 py-2 ${
        hasBorder ? "border-b border-[color:var(--color-border-secondary)]" : ""
      }`}
    >
      <div className="inline-flex min-w-0 items-center gap-1.5">
        <div className="text-base font-bold leading-6 text-[color:var(--color-text-secondary)]">{label}</div>
        {infoKey ? <StockMetricInfoTrigger metricKey={infoKey} variant="icon" /> : null}
      </div>
      <div className="text-right">
        <div className="text-base font-extrabold leading-6 text-[color:var(--color-text-primary)]">{value}</div>
        {subValue ? (
          <div className="mt-0.5 text-xs font-medium text-[color:var(--color-text-tertiary)]">{subValue}</div>
        ) : null}
      </div>
    </div>
  );
}

function IndicatorCard({
  title,
  rightLabel,
  children,
}: {
  title: string;
  rightLabel?: string;
  children: ReactNode;
}) {
  return (
    <article className="flex h-full flex-col rounded-[20px] bg-[color:var(--color-bg-secondary)] px-4 py-3 md:px-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-extrabold text-[color:var(--color-text-primary)]">{title}</h3>
        {rightLabel ? (
          <span className="text-sm font-semibold text-[color:var(--color-text-tertiary)]">{rightLabel}</span>
        ) : null}
      </div>
      <div className="mt-4 flex flex-1 flex-col justify-between">{children}</div>
    </article>
  );
}

export default function StockIndicatorsSection({ indicators, isLoading }: Props) {
  return (
    <section className="border-b border-[color:var(--color-border-primary)] py-10 md:py-12 xl:border-b-0">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-extrabold leading-6 text-[color:var(--color-text-primary)] md:text-2xl md:leading-7">
            투자 주요 지표
          </h2>
        </div>

        <div className="xl:hidden">
          {isLoading || !indicators ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <IndicatorCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            <div className="grid gap-3">
              <article className="flex flex-col gap-3 rounded-lg bg-[color:var(--color-bg-secondary)] px-4 py-3">
                <h3 className="text-sm font-extrabold leading-5 text-[color:var(--color-text-primary)]">가치평가</h3>
                <div className="grid grid-cols-3 gap-2">
                  <CompactMetricBox label="PER" value={formatMultiplier(indicators.valuation.per)} infoKey="PER" />
                  <CompactMetricBox label="PSR" value={formatMultiplier(indicators.valuation.psr)} infoKey="PSR" />
                  <CompactMetricBox label="PBR" value={formatMultiplier(indicators.valuation.pbr)} infoKey="PBR" />
                </div>
              </article>

              <article className="flex flex-col gap-3 rounded-lg bg-[color:var(--color-bg-secondary)] px-4 py-3">
                <h3 className="text-sm font-extrabold leading-5 text-[color:var(--color-text-primary)]">수익</h3>
                <div className="grid grid-cols-3 gap-2">
                  <CompactMetricBox label="EPS" value={formatWon(indicators.earnings.eps)} infoKey="EPS" />
                  <CompactMetricBox label="BPS" value={formatWon(indicators.earnings.bps)} infoKey="BPS" />
                  <CompactMetricBox label="ROE" value={formatPercent(indicators.earnings.roe)} infoKey="ROE" />
                </div>
              </article>

              <article className="flex flex-col gap-3 rounded-lg bg-[color:var(--color-bg-secondary)] px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-extrabold leading-5 text-[color:var(--color-text-primary)]">배당</h3>
                  <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-tertiary)]">
                    {indicators.dividend.periodLabel}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <CompactMetricBox
                    label="횟수"
                    value={`${indicators.dividend.paymentCount}번`}
                    subValue={indicators.dividend.paymentMonths}
                  />
                  <CompactMetricBox
                    label="주당 배당금"
                    value={`연 ${formatWon(indicators.dividend.annualDividendPerShare)}`}
                  />
                  <CompactMetricBox
                    label="수익률"
                    value={`연 ${formatPercent(indicators.dividend.dividendYield, 2)}`}
                  />
                </div>
              </article>
            </div>
          )}
        </div>

        <div className="hidden gap-3 xl:grid xl:grid-cols-3">
          {isLoading || !indicators ? (
            Array.from({ length: 3 }).map((_, index) => <IndicatorCardSkeleton key={index} />)
          ) : (
            <>
              <IndicatorCard title="가치평가">
                <IndicatorRow label="PER" value={formatMultiplier(indicators.valuation.per)} infoKey="PER" />
                <IndicatorRow label="PSR" value={formatMultiplier(indicators.valuation.psr)} infoKey="PSR" />
                <IndicatorRow label="PBR" value={formatMultiplier(indicators.valuation.pbr)} infoKey="PBR" hasBorder={false} />
              </IndicatorCard>

              <IndicatorCard title="수익">
                <IndicatorRow label="EPS" value={formatWon(indicators.earnings.eps)} infoKey="EPS" />
                <IndicatorRow label="BPS" value={formatWon(indicators.earnings.bps)} infoKey="BPS" />
                <IndicatorRow label="ROE" value={formatPercent(indicators.earnings.roe)} infoKey="ROE" hasBorder={false} />
              </IndicatorCard>

              <IndicatorCard title="배당" rightLabel={indicators.dividend.periodLabel}>
                <IndicatorRow
                  label="횟수"
                  value={`${indicators.dividend.paymentCount}번`}
                  subValue={indicators.dividend.paymentMonths}
                />
                <IndicatorRow label="주당 배당금" value={`연 ${formatWon(indicators.dividend.annualDividendPerShare)}`} />
                <IndicatorRow
                  label="수익률"
                  value={`연 ${formatPercent(indicators.dividend.dividendYield, 2)}`}
                  infoKey="DIVIDEND_YIELD"
                  hasBorder={false}
                />
              </IndicatorCard>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
