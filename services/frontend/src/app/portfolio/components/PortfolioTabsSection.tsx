"use client";

import Link from "next/link";
import { useState } from "react";
import type {
  PortfolioBoardTab,
  PortfolioHolding,
  PortfolioMonthlyReturn,
  PortfolioTodayTrade,
} from "../types/portfolio";
import {
  formatCurrency,
  formatSignedValue,
  getDeltaSurfaceClassName,
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

const tabs: Array<{ id: PortfolioBoardTab; label: string }> = [
  { id: "holdings", label: "현재 보유 종목" },
  { id: "todayTrades", label: "오늘 매매 내역" },
  { id: "monthlyReturns", label: "월간 수익률 추이" },
];

const holdingsPageSize = 6;

function HoldingRows({ items }: { items: PortfolioHolding[] }) {
  return (
    <>
      <div className="grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] gap-4 border-b border-[color:var(--color-border-secondary)] px-2 py-4">
        <span className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">종목명 / 정보</span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">매입가</span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">현재가</span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">보유 일수</span>
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">수익률</span>
      </div>

      {items.map((item) => (
        <div
          key={`${item.ticker}-${item.stockId}`}
          className="grid grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))] items-center gap-4 rounded-2xl px-2 py-6 transition-colors hover:bg-[color:var(--color-bg-secondary)]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-bg-interactive-primary)] text-xs font-semibold text-[color:var(--color-text-base)]">
              {item.name.slice(0, 2)}
            </div>
            <Link
              href={`/stocks/${item.ticker}`}
              className="min-w-0 truncate text-base font-semibold leading-6 text-[color:var(--color-text-primary)] hover:text-[color:var(--color-text-secondary)]"
            >
              {item.name}
            </Link>
          </div>
          <span className="text-right text-base font-semibold leading-6 text-[color:var(--color-text-secondary)]">{formatCurrency(item.buyPrice)}</span>
          <span className="text-right text-base font-extrabold leading-6 text-[color:var(--color-text-primary)]">{formatCurrency(item.currentPrice)}</span>
          <span className="text-right text-base font-medium leading-6 text-[color:var(--color-text-secondary)]">{item.holdingDays}일</span>
          <span className={cn("text-right text-base font-semibold leading-6", getDeltaTextClassName(item.returnRate))}>
            {formatSignedValue(item.returnRate, 2, "%")}
          </span>
        </div>
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
        <span className="typo-body-sm text-right font-semibold text-[color:var(--color-text-secondary)]">체결 시각</span>
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
                href={`/stocks/${item.ticker}`}
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
          <span className="text-right text-base font-semibold leading-6 text-[color:var(--color-text-secondary)]">{formatCurrency(item.executedPrice)}</span>
          <span className="text-right text-base font-extrabold leading-6 text-[color:var(--color-text-primary)]">{formatCurrency(item.currentPrice)}</span>
          <span className="text-right text-base font-medium leading-6 text-[color:var(--color-text-secondary)]">{item.executedAt}</span>
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
    <div key={`${item.ticker}-${item.stockId}`} className="border-b border-[color:var(--color-border-secondary)] px-2 py-6 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-bg-interactive-primary)] text-[10px] font-semibold text-[color:var(--color-text-base)]">
            {item.name.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <Link
              href={`/stocks/${item.ticker}`}
              className="block truncate text-sm font-semibold leading-5 text-[color:var(--color-text-primary)] hover:text-[color:var(--color-text-secondary)]"
            >
              {item.name}
            </Link>
            <p className="text-[10px] font-medium leading-4 text-[color:var(--color-text-secondary)]">{item.holdingDays}일째 보유중</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">매입가</span>
            <span className="text-sm font-semibold leading-5 text-[color:var(--color-text-secondary)]">{formatCurrency(item.buyPrice)}</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">현재가</span>
            <span className="text-sm font-extrabold leading-5 text-[color:var(--color-text-primary)]">{formatCurrency(item.currentPrice)}</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">수익률</span>
            <span className={cn("text-sm font-semibold leading-5", getDeltaTextClassName(item.returnRate))}>
              {formatSignedValue(item.returnRate, 2, "%")}
            </span>
          </div>
        </div>
      </div>
    </div>
  ));
}

function MobileTradeCards({ items }: { items: PortfolioTodayTrade[] }) {
  return items.map((item) => (
    <div key={`${item.id}-${item.ticker}`} className="border-b border-[color:var(--color-border-secondary)] px-2 py-6 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={`/stocks/${item.ticker}`}
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
          <p className="mt-1 text-[10px] font-medium leading-4 text-[color:var(--color-text-secondary)]">{item.executedAt} 체결</p>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">체결가</span>
            <span className="text-sm font-semibold leading-5 text-[color:var(--color-text-secondary)]">{formatCurrency(item.executedPrice)}</span>
          </div>
          <div className="flex items-center justify-end gap-2">
            <span className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">현재가</span>
            <span className="text-sm font-extrabold leading-5 text-[color:var(--color-text-primary)]">{formatCurrency(item.currentPrice)}</span>
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

function MonthlyReturnBoard({ items }: { items: PortfolioMonthlyReturn[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => {
        const barWidth = Math.min(100, Math.max(12, Math.abs(item.portfolioReturnRate) * 12));

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

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--color-bg-tertiary)]">
              <div
                className={cn("h-full rounded-full", getDeltaSurfaceClassName(item.portfolioReturnRate))}
                style={{ width: `${barWidth}%` }}
              />
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">포트폴리오</dt>
                <dd className={cn("mt-1 text-sm font-semibold leading-5", getDeltaTextClassName(item.portfolioReturnRate))}>
                  {formatSignedValue(item.portfolioReturnRate, 1, "%")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">KOSPI</dt>
                <dd className={cn("mt-1 text-sm font-semibold leading-5", getDeltaTextClassName(item.kospiReturnRate))}>
                  {formatSignedValue(item.kospiReturnRate, 1, "%")}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs font-semibold leading-4 text-[color:var(--color-text-secondary)]">초과 수익</dt>
                <dd className={cn("mt-1 text-sm font-extrabold leading-5", getDeltaTextClassName(item.excessReturnRate))}>
                  {formatSignedValue(item.excessReturnRate, 1, "%p")}
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

  const totalPages = Math.max(1, Math.ceil(holdings.length / holdingsPageSize));
  const pagedHoldings = holdings.slice((currentPage - 1) * holdingsPageSize, currentPage * holdingsPageSize);

  const handleTabChange = (tab: PortfolioBoardTab) => {
    setActiveTab(tab);
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
        <>
          <div className="hidden border-b border-[color:var(--color-border-secondary)] lg:block">
            <TradeRows items={todayTrades} />
          </div>

          <div className="border-b border-[color:var(--color-border-secondary)] lg:hidden">
            <MobileTradeCards items={todayTrades} />
          </div>
        </>
      ) : null}

      {activeTab === "monthlyReturns" ? <MonthlyReturnBoard items={monthlyReturns} /> : null}
    </section>
  );
}
