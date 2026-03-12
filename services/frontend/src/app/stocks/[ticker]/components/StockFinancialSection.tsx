import type { StockAnnouncementItem, StockFinancialItem, StockFinancialType } from "@/app/stocks/types/stockDetail";
import {
  financialTypeOptions,
  formatAnnouncementDate,
  formatFinancialLabel,
  formatFinancialValue,
} from "../utils/stockDetailFormatters";
import StockFinancialChart from "./StockFinancialChart";

type Props = {
  type: StockFinancialType;
  onTypeChange: (value: StockFinancialType) => void;
  financials: StockFinancialItem[];
  latestAnnouncement?: StockAnnouncementItem;
  isLoading: boolean;
};

export default function StockFinancialSection({
  type,
  onTypeChange,
  financials,
  latestAnnouncement,
  isLoading,
}: Props) {
  const visibleFinancials = financials.slice(-2);

  return (
    <section className="border-t border-[color:var(--color-border-primary)] py-10 md:py-12">
      <div className="flex flex-col gap-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="typo-heading-md text-[color:var(--color-text-primary)]">연간/분기 실적 분석</h2>

          <div className="flex items-center gap-4">
            {financialTypeOptions.map((item) => {
              const isActive = item.value === type;

              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onTypeChange(item.value)}
                  className={`border-b pb-1 text-sm font-semibold transition-colors md:text-base ${
                    isActive
                      ? "border-[color:var(--color-border-base)] text-[color:var(--color-text-primary)]"
                      : "border-transparent text-[color:var(--color-text-secondary)]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] xl:items-start">
          <div className="rounded-2xl bg-[color:var(--color-bg-primary)]">
            {isLoading ? (
              <div className="h-72 animate-pulse rounded-2xl bg-[color:var(--color-bg-secondary)]" />
            ) : (
              <StockFinancialChart financials={financials} />
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-2xl border border-[color:var(--color-border-primary)]">
              <div className="grid grid-cols-3 bg-[color:var(--color-bg-primary)] px-4 py-3 text-sm font-semibold text-[color:var(--color-text-primary)]">
                <span>기준</span>
                <span className="text-right">매출 (조)</span>
                <span className="text-right">영업익 (조)</span>
              </div>

              <div className="flex flex-col">
                {isLoading
                  ? Array.from({ length: 2 }).map((_, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-3 gap-4 border-t border-[color:var(--color-border-secondary)] px-4 py-4"
                      >
                        <div className="h-5 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
                        <div className="h-5 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
                        <div className="h-5 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
                      </div>
                    ))
                  : visibleFinancials.map((item, index) => (
                      <div
                        key={`${item.year}-${item.quarter ?? "Y"}`}
                        className={`grid grid-cols-3 gap-4 border-t border-[color:var(--color-border-secondary)] px-4 py-4 ${
                          index === visibleFinancials.length - 1 ? "bg-[color:var(--color-bg-secondary)]" : ""
                        }`}
                      >
                        <span className="typo-body-md text-[color:var(--color-text-secondary)]">{formatFinancialLabel(item)}</span>
                        <span className="typo-body-md text-right font-extrabold text-[color:var(--color-text-primary)]">
                          {formatFinancialValue(item.revenue)}
                        </span>
                        <span className="typo-body-md text-right font-extrabold text-[color:var(--color-text-primary)]">
                          {formatFinancialValue(item.operatingProfit)}
                        </span>
                      </div>
                    ))}
              </div>
            </div>

            {latestAnnouncement ? (
              <div className="rounded-2xl bg-[color:var(--color-bg-tertiary)] p-4">
                <div className="typo-body-sm mb-3 font-semibold text-[color:var(--color-text-secondary)]">실적 관련 최신 공시</div>
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="typo-body-md truncate font-semibold text-[color:var(--color-text-primary)]">
                      {latestAnnouncement.title}
                    </div>
                    <div className="typo-body-xs mt-1 text-[color:var(--color-text-tertiary)]">
                      {formatAnnouncementDate(latestAnnouncement.announcedAt)}
                    </div>
                  </div>
                  <span className="typo-body-sm shrink-0 text-[color:var(--color-text-tertiary)]">원문보기</span>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
