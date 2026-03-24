import type {
  StockAnnouncementItem,
  StockFinancialItem,
  StockFinancialType,
} from "@/app/stocks/types/stockDetail";
import {
  financialTypeOptions,
  formatFinancialLabel,
  formatFinancialValue,
  getFinancialDisplayUnit,
  getVisibleFinancials,
} from "../utils/stockDetailFormatters";
import StockSectionLoadingOverlay from "./common/StockSectionLoadingOverlay";
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
  const selectableFinancialTypes = financialTypeOptions.filter((item) => item.value === "QUARTERLY");
  const visibleFinancials = getVisibleFinancials(financials, type);
  const revenueUnit = getFinancialDisplayUnit(visibleFinancials.map((item) => item.revenue));
  const operatingProfitUnit = getFinancialDisplayUnit(
    visibleFinancials.map((item) => item.operatingProfit),
  );

  return (
    <section className="py-10 md:py-12">
      <StockSectionLoadingOverlay active={isLoading}>
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <h2 className="text-lg font-extrabold leading-6 text-[color:var(--color-text-primary)] md:text-2xl md:leading-7">
              분기 실적 분석
            </h2>

            {selectableFinancialTypes.length > 1 ? (
              <div className="flex items-center gap-4">
                {selectableFinancialTypes.map((item) => {
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
            ) : null}
          </div>

          <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.92fr)] xl:items-start xl:gap-16">
            <div className="overflow-hidden bg-[color:var(--color-bg-primary)] xl:rounded-[24px] xl:p-4">
              <div className="mb-4 flex items-center justify-end gap-4">
                <div className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[color:var(--color-icon-disabled)]" />
                  <span className="text-sm font-medium leading-5 text-[color:var(--color-text-secondary)]">
                    매출
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[color:var(--color-icon-interactive-primary)]" />
                  <span className="text-sm font-medium leading-5 text-[color:var(--color-text-secondary)]">
                    영업이익
                  </span>
                </div>
              </div>

              {isLoading ? (
                <div className="h-64 animate-pulse rounded-[20px] bg-[color:var(--color-bg-secondary)] md:h-72" />
              ) : (
                <StockFinancialChart financials={financials} type={type} />
              )}
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-[color:var(--color-bg-primary)]">
                <div className="grid grid-cols-3 border-b border-[color:var(--color-border-base)] bg-[color:var(--color-bg-primary)] px-[1px] py-3.5 text-xs font-semibold text-[color:var(--color-text-primary)] md:text-sm">
                  <span>{selectableFinancialTypes[0]?.label ?? "분기"}</span>
                  <span className="text-right">{`매출 (${revenueUnit})`}</span>
                  <span className="text-right">{`영업익 (${operatingProfitUnit})`}</span>
                </div>

                <div className="flex flex-col">
                  {isLoading
                    ? Array.from({ length: 2 }).map((_, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-3 gap-4 border-t border-[color:var(--color-border-secondary)] px-[1px] py-4"
                        >
                          <div className="h-5 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
                          <div className="h-5 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
                          <div className="h-5 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
                        </div>
                      ))
                    : visibleFinancials.map((item, index) => (
                        <div
                          key={`${item.year}-${item.quarter ?? "Y"}`}
                          className={`grid grid-cols-3 gap-4 border-b border-[color:var(--color-border-secondary)] px-[1px] py-4 ${
                            index === visibleFinancials.length - 1
                              ? "bg-[color:var(--color-bg-secondary)]"
                              : ""
                          }`}
                        >
                          <span className="text-sm font-medium leading-5 text-[color:var(--color-text-secondary)]">
                            {formatFinancialLabel(item)}
                          </span>
                          <span className="text-right text-sm font-extrabold leading-5 text-[color:var(--color-text-primary)]">
                            {formatFinancialValue(item.revenue, revenueUnit)}
                          </span>
                          <span className="text-right text-sm font-extrabold leading-5 text-[color:var(--color-text-primary)]">
                            {formatFinancialValue(item.operatingProfit, operatingProfitUnit)}
                          </span>
                        </div>
                      ))}
                </div>
              </div>

              {latestAnnouncement ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center">
                    <div className="text-sm font-semibold leading-5 text-[color:var(--color-text-secondary)]">
                      실적 관련 최신 공시
                    </div>
                  </div>
                  <div className="inline-flex items-center justify-between gap-4 rounded-lg bg-[color:var(--color-bg-tertiary)] p-4">
                    <div className="min-w-0 overflow-hidden">
                      <div className="truncate text-sm font-semibold leading-5 text-[color:var(--color-text-primary)]">
                        {latestAnnouncement.title}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-medium leading-5 text-[color:var(--color-text-tertiary)]">
                      원문보기
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </StockSectionLoadingOverlay>
    </section>
  );
}
