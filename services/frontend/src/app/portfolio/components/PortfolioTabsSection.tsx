"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type {
  PortfolioBoardTab,
  PortfolioHolding,
  PortfolioMonthlyReturn,
  PortfolioTodayTrade,
} from "../types/portfolio";
import {
  formatCurrency,
  formatInteger,
  formatSignedValue,
  getDeltaChartBarClassName,
  getDeltaTextClassName,
  getTradeActionLabel,
} from "../utils/portfolioFormatters";
import { cn } from "@/shared/utils/cn";
import Pagination from "@/shared/ui/Pagination";

type Props = {
  holdings: PortfolioHolding[];
  todayTrades: PortfolioTodayTrade[];
  monthlyReturns: PortfolioMonthlyReturn[];
};

type HoldingsSortType = "holdingQuantityDesc" | "returnRateDesc";

const tabs: Array<{ id: PortfolioBoardTab; label: string }> = [
  { id: "holdings", label: "현재 보유 종목" },
  { id: "todayTrades", label: "오늘 매매 내역" },
  { id: "monthlyReturns", label: "월간 수익률 추이" },
];

const holdingsSortOptions: Array<{ id: HoldingsSortType; label: string }> = [
  { id: "holdingQuantityDesc", label: "보유 수량 내림차순" },
  { id: "returnRateDesc", label: "수익률 내림차순" },
];

const holdingsPageSize = 6;

function compareNullableNumberDesc(left: number | null, right: number | null) {
  const leftValue = left ?? Number.NEGATIVE_INFINITY;
  const rightValue = right ?? Number.NEGATIVE_INFINITY;

  return rightValue - leftValue;
}

function sortHoldings(items: PortfolioHolding[], sortType: HoldingsSortType) {
  const sorted = [...items];

  sorted.sort((left, right) => {
    if (sortType === "holdingQuantityDesc") {
      const quantityCompare = compareNullableNumberDesc(left.holdingQuantity, right.holdingQuantity);
      if (quantityCompare !== 0) {
        return quantityCompare;
      }

      return compareNullableNumberDesc(left.returnRate, right.returnRate);
    }

    const returnRateCompare = compareNullableNumberDesc(left.returnRate, right.returnRate);
    if (returnRateCompare !== 0) {
      return returnRateCompare;
    }

    return compareNullableNumberDesc(left.holdingQuantity, right.holdingQuantity);
  });

  return sorted;
}

function HoldingRows({ items }: { items: PortfolioHolding[] }) {
  return (
    <>
      <div className="grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] gap-4 border-b border-[color:var(--color-border-secondary)] px-2 py-4">
        <span className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">종목명 / 정보</span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">매입가</span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">현재가</span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">
          <span className="block">보유 일수</span>
          <span className="block">/보유 수량</span>
        </span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">수익률</span>
      </div>

      {items.map((item) => (
        <Link
          key={`${item.ticker}-${item.stockId}`}
          href={`/portfolio/${item.stockId}`}
          className="grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] items-center gap-4 rounded-2xl px-2 py-6 transition-colors hover:bg-[color:var(--color-bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-base)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg-primary)]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-bg-interactive-primary)] text-xs font-semibold text-[color:var(--color-text-base)]">
              {item.name.slice(0, 2)}
            </div>
            <span className="min-w-0 truncate text-base font-semibold leading-6 text-[color:var(--color-text-primary)]">
              {item.name}
            </span>
          </div>
          <span className="text-right text-base font-semibold leading-6 text-[color:var(--color-text-secondary)]">
            {formatCurrency(item.buyPrice)}
          </span>
          <span className="text-right text-base font-extrabold leading-6 text-[color:var(--color-text-primary)]">
            {formatCurrency(item.currentPrice)}
          </span>
          <div className="text-right">
            <span className="block text-base font-medium leading-6 text-[color:var(--color-text-secondary)]">
              {item.holdingDays == null ? "-" : `${item.holdingDays}일`}
            </span>
            <span className="block text-sm font-medium leading-5 text-[color:var(--color-text-tertiary)]">
              {item.holdingQuantity == null ? "-" : `${formatInteger(item.holdingQuantity)}개`}
            </span>
          </div>
          <span className={cn("text-right text-base font-semibold leading-6", getDeltaTextClassName(item.returnRate))}>
            {formatSignedValue(item.returnRate, 2, "%")}
          </span>
        </Link>
      ))}
    </>
  );
}

function TradeRows({ items }: { items: PortfolioTodayTrade[] }) {
  return (
    <>
      <div className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr] gap-4 border-b border-[color:var(--color-border-secondary)] px-2 py-4">
        <span className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">종목명 / 액션</span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">체결가</span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">현재가</span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">매매 수량</span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">성과</span>
      </div>

      {items.map((item) => (
        <div
          key={`${item.id}-${item.ticker}`}
          className="grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr] items-center gap-4 rounded-2xl px-2 py-6 transition-colors hover:bg-[color:var(--color-bg-secondary)]"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <Link
                href={`/stocks/${item.stockId}`}
                className="truncate text-base font-semibold leading-6 text-[color:var(--color-text-primary)] hover:text-[color:var(--color-text-secondary)]"
              >
                {item.name}
              </Link>
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-1 text-xs font-semibold",
                  item.action === "BUY"
                    ? "bg-[color:var(--color-bg-danger-subtle)] text-[color:var(--color-text-danger-bold)]"
                    : "bg-[color:var(--color-bg-info-subtle)] text-[color:var(--color-text-info)]",
                )}
              >
                {getTradeActionLabel(item.action)}
              </span>
            </div>
            <p className="typo-body-xs mt-1 text-[color:var(--color-text-tertiary)]">{item.ticker}</p>
          </div>
          <span className="text-right text-base font-semibold leading-6 text-[color:var(--color-text-secondary)]">
            {formatCurrency(item.executedPrice)}
          </span>
          <span className="text-right text-base font-extrabold leading-6 text-[color:var(--color-text-primary)]">
            {formatCurrency(item.currentPrice)}
          </span>
          <span className="text-right text-base font-medium leading-6 text-[color:var(--color-text-secondary)]">
            {item.holdingQuantity == null ? "-" : `${formatInteger(item.holdingQuantity)}개`}
          </span>
          <span className={cn("text-right text-base font-semibold leading-6", getDeltaTextClassName(item.returnRate))}>
            {formatSignedValue(item.returnRate, 2, "%")}
          </span>
        </div>
      ))}
    </>
  );
}

function MobileHoldingCards({ items }: { items: PortfolioHolding[] }) {
  return items.map((item) => (
    <Link
      key={`${item.ticker}-${item.stockId}`}
      href={`/portfolio/${item.stockId}`}
      className="block border-b border-[color:var(--color-border-secondary)] px-2 py-6 transition-colors hover:bg-[color:var(--color-bg-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-border-base)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-bg-primary)] last:border-b-0"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-bg-interactive-primary)] text-[10px] font-semibold text-[color:var(--color-text-base)]">
            {item.name.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-5 text-[color:var(--color-text-primary)]">
              {item.name}
            </span>
            <p className="text-[10px] font-medium leading-4 text-[color:var(--color-text-secondary)]">
              {item.holdingDays == null ? "보유 일수 정보 없음" : `보유 일수 ${item.holdingDays}일`}
            </p>
            <p className="mt-0.5 text-[10px] font-medium leading-4 text-[color:var(--color-text-tertiary)]">
              {item.holdingQuantity == null ? "보유 수량 정보 없음" : `보유 수량 ${formatInteger(item.holdingQuantity)}개`}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">매입가</span>
            <span className="text-sm font-semibold leading-5 text-[color:var(--color-text-secondary)]">
              {formatCurrency(item.buyPrice)}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">현재가</span>
            <span className="text-sm font-extrabold leading-5 text-[color:var(--color-text-primary)]">
              {formatCurrency(item.currentPrice)}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">수익률</span>
            <span className={cn("text-sm font-semibold leading-5", getDeltaTextClassName(item.returnRate))}>
              {formatSignedValue(item.returnRate, 2, "%")}
            </span>
          </div>
        </div>
      </div>
    </Link>
  ));
}

function MobileTradeCards({ items }: { items: PortfolioTodayTrade[] }) {
  return items.map((item) => (
    <div key={`${item.id}-${item.ticker}`} className="border-b border-[color:var(--color-border-secondary)] px-2 py-6 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/stocks/${item.stockId}`}
              className="truncate text-sm font-semibold leading-5 text-[color:var(--color-text-primary)] hover:text-[color:var(--color-text-secondary)]"
            >
              {item.name}
            </Link>
            <span
              className={cn(
                "shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold leading-4",
                item.action === "BUY"
                  ? "bg-[color:var(--color-bg-danger-subtle)] text-[color:var(--color-text-danger-bold)]"
                  : "bg-[color:var(--color-bg-info-subtle)] text-[color:var(--color-text-info)]",
              )}
            >
              {getTradeActionLabel(item.action)}
            </span>
          </div>
          <p className="mt-1 text-[10px] font-medium leading-4 text-[color:var(--color-text-secondary)]">
            {item.holdingQuantity == null ? "매매 수량 정보 없음" : `매매 수량 ${formatInteger(item.holdingQuantity)}개`}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">체결가</span>
            <span className="text-sm font-semibold leading-5 text-[color:var(--color-text-secondary)]">
              {formatCurrency(item.executedPrice)}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">현재가</span>
            <span className="text-sm font-extrabold leading-5 text-[color:var(--color-text-primary)]">
              {formatCurrency(item.currentPrice)}
            </span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">성과</span>
            <span className={cn("text-sm font-semibold leading-5", getDeltaTextClassName(item.returnRate))}>
              {formatSignedValue(item.returnRate, 2, "%")}
            </span>
          </div>
        </div>
      </div>
    </div>
  ));
}

function EmptyTradeState() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-3xl bg-[color:var(--color-bg-secondary)] px-6 py-10 text-center outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]">
      <p className="text-sm font-semibold leading-5 text-[color:var(--color-text-secondary)] md:text-base md:leading-6">
        오늘 매매 내역이 없습니다.
      </p>
    </div>
  );
}

function MonthlyReturnBoard({ items }: { items: PortfolioMonthlyReturn[] }) {
  const maxRateMagnitude = Math.max(1, ...items.map((item) => Math.abs(item.portfolioReturnRate ?? 0)));

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => {
        const portfolioReturnRate = item.portfolioReturnRate ?? 0;
        const barWidth = Math.min(100, Math.max(12, (Math.abs(portfolioReturnRate) / maxRateMagnitude) * 100));

        return (
          <article
            key={item.month}
            className="rounded-2xl bg-[color:var(--color-bg-secondary)] p-4 outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)]"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-extrabold leading-6 text-[color:var(--color-text-primary)]">{item.month}</h3>
              <span className={cn("text-base font-extrabold leading-6", getDeltaTextClassName(item.portfolioReturnRate))}>
                {formatSignedValue(item.portfolioReturnRate, 1, "%")}
              </span>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[color:var(--color-bg-tertiary)]">
              <div
                className={cn(
                  "h-full rounded-full shadow-[0_0_0_1px_rgba(255,255,255,0.08)_inset]",
                  getDeltaChartBarClassName(item.portfolioReturnRate),
                )}
                style={{ width: `${barWidth}%` }}
              />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">월간 수익률</dt>
                <dd className={cn("mt-1 text-sm font-semibold leading-5", getDeltaTextClassName(item.portfolioReturnRate))}>
                  {formatSignedValue(item.portfolioReturnRate, 1, "%")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">월간 수익량</dt>
                <dd className="mt-1 text-sm font-semibold leading-5 text-[color:var(--color-text-primary)]">
                  {formatCurrency(item.realizedProfitAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">매수 횟수</dt>
                <dd className="mt-1 text-sm font-extrabold leading-5 text-[color:var(--color-text-primary)]">
                  {item.buyCount == null ? "-" : `${formatInteger(item.buyCount)}회`}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">매도 횟수</dt>
                <dd className="mt-1 text-sm font-extrabold leading-5 text-[color:var(--color-text-primary)]">
                  {item.sellCount == null ? "-" : `${formatInteger(item.sellCount)}회`}
                </dd>
              </div>
            </dl>
          </article>
        );
      })}
    </div>
  );
}

export default function PortfolioTabsSection({ holdings, todayTrades, monthlyReturns }: Props) {
  const [activeTab, setActiveTab] = useState<PortfolioBoardTab>("holdings");
  const [currentPage, setCurrentPage] = useState(1);
  const [holdingsSort, setHoldingsSort] = useState<HoldingsSortType>("holdingQuantityDesc");

  const sortedHoldings = useMemo(() => sortHoldings(holdings, holdingsSort), [holdings, holdingsSort]);
  const totalPages = Math.max(1, Math.ceil(sortedHoldings.length / holdingsPageSize));
  const pagedHoldings = sortedHoldings.slice((currentPage - 1) * holdingsPageSize, currentPage * holdingsPageSize);

  const handleTabChange = (tab: PortfolioBoardTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handleHoldingsSortChange = (sortType: HoldingsSortType) => {
    if (sortType === holdingsSort) {
      return;
    }

    setHoldingsSort(sortType);
    setCurrentPage(1);
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-6 overflow-x-auto border-b border-[color:var(--color-border-primary)]">
        {tabs.map((tab) => {
          const extraLabel = tab.id === "todayTrades" ? ` (${todayTrades.length})` : "";

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "whitespace-nowrap pb-3 text-sm font-semibold leading-5 transition-colors md:text-base md:leading-6",
                activeTab === tab.id
                  ? "border-b border-[color:var(--color-border-base)] text-[color:var(--color-text-primary)]"
                  : "text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-secondary)]",
              )}
            >
              {tab.label}
              {extraLabel}
            </button>
          );
        })}
      </div>

      {activeTab === "holdings" ? (
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          {holdingsSortOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleHoldingsSortChange(option.id)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-semibold transition-colors md:text-sm",
                option.id === holdingsSort
                  ? "bg-[color:var(--color-bg-info-subtle)] text-[color:var(--color-text-info)]"
                  : "bg-[color:var(--color-bg-secondary)] text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text-primary)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {activeTab === "holdings" ? (
        <>
          <div className="hidden border-b border-[color:var(--color-border-secondary)] lg:block">
            <HoldingRows items={pagedHoldings} />
          </div>

          <div className="border-b border-[color:var(--color-border-secondary)] lg:hidden">
            <MobileHoldingCards items={pagedHoldings} />
          </div>

          {totalPages > 1 ? (
            <div className="py-4 md:py-6">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          ) : null}
        </>
      ) : null}

      {activeTab === "todayTrades" ? (
        todayTrades.length > 0 ? (
          <>
            <div className="hidden border-b border-[color:var(--color-border-secondary)] lg:block">
              <TradeRows items={todayTrades} />
            </div>

            <div className="border-b border-[color:var(--color-border-secondary)] lg:hidden">
              <MobileTradeCards items={todayTrades} />
            </div>
          </>
        ) : (
          <EmptyTradeState />
        )
      ) : null}

      {activeTab === "monthlyReturns" ? <MonthlyReturnBoard items={monthlyReturns} /> : null}
    </section>
  );
}
